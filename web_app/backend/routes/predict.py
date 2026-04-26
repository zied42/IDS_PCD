import io
import uuid
import os
import csv
import json
import pandas as pd
from datetime import datetime, timedelta
from sqlalchemy import func
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.database import db, Prediction
from utils.ml_loader import predict_single, predict_batch, get_model_name, FEATURE_COLUMNS
from utils.alert_helper import create_alert_if_needed, auto_block_ip_if_needed

predict_bp = Blueprint('predict', __name__)

CSV_LOG = os.path.join(os.path.dirname(__file__), '..', 'logs', 'predictions.csv')
CSV_HEADERS = ['timestamp', 'src_ip', 'dst_ip', 'src_port', 'dst_port',
               'protocol', 'prediction', 'confidence', 'needs_review', 'model_used']


def _ensure_csv():
    os.makedirs(os.path.dirname(CSV_LOG), exist_ok=True)
    if not os.path.exists(CSV_LOG):
        with open(CSV_LOG, 'w', newline='') as f:
            csv.writer(f).writerow(CSV_HEADERS)


def _append_csv(pred):
    _ensure_csv()
    with open(CSV_LOG, 'a', newline='') as f:
        csv.writer(f).writerow([
            pred.timestamp.isoformat(),
            pred.src_ip, pred.dst_ip,
            pred.src_port, pred.dst_port, pred.protocol,
            pred.prediction,
            round(pred.confidence * 100, 2),
            pred.needs_review,
            pred.model_used
        ])


def _cleanup_old_predictions():
    """Delete MySQL rows older than 7 days — CSV keeps full history."""
    from models.database import Alert
    cutoff = datetime.utcnow() - timedelta(days=7)
    
    old_preds = Prediction.query.filter(Prediction.timestamp < cutoff).with_entities(Prediction.id).all()
    if old_preds:
        pred_ids = [p[0] for p in old_preds]
        Alert.query.filter(Alert.prediction_id.in_(pred_ids)).delete(synchronize_session=False)
        Prediction.query.filter(Prediction.id.in_(pred_ids)).delete(synchronize_session=False)


# ── Single prediction ─────────────────────────────────────────────────────────
@predict_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    """POST /api/predict — single flow prediction."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Extract display fields — pop src_ip/dst_ip (not features)
    # Use get for src_port/dst_port — Dst Port IS a feature, never pop it
    src_ip   = data.pop('src_ip',   None) or data.pop('Src IP',   None)
    dst_ip   = data.pop('dst_ip',   None) or data.pop('Dst IP',   None)
    src_port = data.get('src_port') or data.get('Src Port')
    dst_port = data.get('dst_port') or data.get('Dst Port')

    try:
        result = predict_single(data)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503

    # Save features_json ONLY for attacks (saves 83% space — used for SHAP)
    features_json = json.dumps(data) if result['prediction'] == 'Attack' else None

    pred = Prediction(
        src_ip        = src_ip,
        dst_ip        = dst_ip,
        src_port      = int(src_port) if src_port else None,
        dst_port      = int(dst_port) if dst_port else None,
        protocol      = int(data.get('Protocol', 0)),
        prediction    = result['prediction'],
        confidence    = result['confidence'],
        model_used    = get_model_name() or 'xgboost',
        needs_review  = result['needs_review'],
        features_json = features_json,
        batch_id      = None    # single predictions have no batch
    )
    db.session.add(pred)
    db.session.flush()

    alert = create_alert_if_needed(pred)
    if alert:
        db.session.add(alert)

    blocked = auto_block_ip_if_needed(pred)
    if blocked:
        db.session.add(blocked)

    _cleanup_old_predictions()
    db.session.commit()
    _append_csv(pred)

    return jsonify({
        'prediction_id':  pred.id,
        'prediction':     result['prediction'],
        'confidence_pct': result['confidence_pct'],
        'needs_review':   result['needs_review']
    }), 200


# ── Batch prediction ──────────────────────────────────────────────────────────
@predict_bp.route('/predict/batch', methods=['POST'])
@jwt_required()
def predict_batch_endpoint():
    """POST /api/predict/batch — CSV upload, batch prediction."""
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not file.filename.endswith('.csv'):
        return jsonify({'error': 'Only CSV files accepted'}), 400

    try:
        df = pd.read_csv(io.StringIO(file.read().decode('utf-8')))
    except Exception as e:
        return jsonify({'error': f'CSV parse error: {str(e)}'}), 422

    try:
        result_df = predict_batch(df)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503

    model_name = get_model_name() or 'xgboost'
    batch_id   = str(uuid.uuid4())  # one unique ID for the whole upload
    filename   = file.filename       # save original filename

    for _, row in result_df.iterrows():
        is_attack     = row['prediction'] == 'Attack'
        features_json = json.dumps(
            {c: row[c] for c in FEATURE_COLUMNS if c in row}
        ) if is_attack else None

        pred = Prediction(
            src_ip         = row.get('Src IP') or row.get('src_ip'),
            dst_ip         = row.get('Dst IP') or row.get('dst_ip'),
            src_port       = int(row['Src Port']) if 'Src Port' in row else None,
            dst_port       = int(row['Dst Port']) if 'Dst Port' in row else None,
            protocol       = int(row.get('Protocol', 0)),
            prediction     = row['prediction'],
            confidence     = row['confidence'] / 100,
            model_used     = model_name,
            needs_review   = bool(row['needs_review']),
            features_json  = features_json,
            batch_id       = batch_id,
            batch_filename = filename
        )
        db.session.add(pred)
        db.session.flush()

        alert = create_alert_if_needed(pred)
        if alert:
            db.session.add(alert)

        blocked = auto_block_ip_if_needed(pred)
        if blocked:
            db.session.add(blocked)

        _append_csv(pred)

    _cleanup_old_predictions()
    db.session.commit()

    return jsonify({
        'batch_id':     batch_id,
        'total':        len(result_df),
        'attacks':      int((result_df['prediction'] == 'Attack').sum()),
        'benign':       int((result_df['prediction'] == 'Benign').sum()),
        'needs_review': int(result_df['needs_review'].sum()),
    }), 200


# ── Prediction history (paginated) ────────────────────────────────────────────
@predict_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_predictions():
    """GET /api/predictions — paginated prediction history for live monitor."""
    page     = request.args.get('page',     1,  type=int)
    per_page = request.args.get('per_page', 50, type=int)

    paged = Prediction.query.order_by(
        Prediction.timestamp.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'total':       paged.total,
        'page':        paged.page,
        'pages':       paged.pages,
        'predictions': [p.to_dict() for p in paged.items]
    }), 200


# ── Batch upload history ──────────────────────────────────────────────────────
@predict_bp.route('/batches', methods=['GET'])
@jwt_required()
def get_batches():
    """
    GET /api/batches
    Returns list of all batch uploads grouped by batch_id.
    Used for the Upload & Analyze page — shows upload history
    so user can pick which one to download.
    """
    rows = db.session.query(
        Prediction.batch_id,
        func.min(Prediction.timestamp).label('uploaded_at'),
        func.count(Prediction.id).label('total'),
        func.sum(db.case(
            (Prediction.prediction == 'Attack', 1), else_=0
        )).label('attacks'),
        func.sum(db.case(
            (Prediction.prediction == 'Benign', 1), else_=0
        )).label('benign'),
        func.max(Prediction.model_used).label('model_used')
    ).filter(
        Prediction.batch_id.isnot(None)
    ).group_by(
        Prediction.batch_id
    ).order_by(
        func.min(Prediction.timestamp).desc()
    ).all()

    # Get filenames for each batch
    batch_filenames = {}
    for row in rows:
        fn = Prediction.query.filter_by(batch_id=row.batch_id).first()
        batch_filenames[row.batch_id] = fn.batch_filename if fn and fn.batch_filename else 'upload.csv'

    return jsonify([
        {
            'batch_id':    row.batch_id,
            'uploaded_at': row.uploaded_at.isoformat(),
            'total':       row.total,
            'attacks':     int(row.attacks or 0),
            'benign':      int(row.benign  or 0),
            'model_used':  row.model_used,
            'filename':    batch_filenames.get(row.batch_id, 'upload.csv')
        }
        for row in rows
    ]), 200
@predict_bp.route('/batches/<batch_id>', methods=['DELETE'])
@jwt_required()
def delete_batch(batch_id):
    """
    DELETE /api/batches/<batch_id>
    Deletes all predictions belonging to a specific batch upload.
    """
    count = Prediction.query.filter_by(batch_id=batch_id).count()

    if count == 0:
        return jsonify({'error': 'Batch not found'}), 404

    # Delete alerts linked to these predictions first
    from models.database import Alert
    pred_ids = [p.id for p in Prediction.query.filter_by(batch_id=batch_id).all()]
    Alert.query.filter(Alert.prediction_id.in_(pred_ids)).delete(synchronize_session=False)

    # Delete predictions
    Prediction.query.filter_by(batch_id=batch_id).delete()
    db.session.commit()

    return jsonify({
        'message':  f'Batch {batch_id} deleted',
        'deleted':  count
    }), 200


# ── Batch analysis status (compatibility) ─────────────────────────────────────
@predict_bp.route('/analyze/status/<batch_id>', methods=['GET'])
@jwt_required()
def analyze_status(batch_id):
    """
    GET /api/analyze/status/<batch_id>
    Our batch processing is synchronous, so this always returns 'completed'.
    Endpoint exists for compatibility with the Angular frontend.
    """
    count = Prediction.query.filter_by(batch_id=batch_id).count()
    if count == 0:
        return jsonify({'error': 'Batch not found'}), 404
    return jsonify({
        'jobId':    batch_id,
        'status':   'completed',
        'progress': 100,
        'total':    count
    }), 200


# ── Batch analysis results ────────────────────────────────────────────────────
@predict_bp.route('/analyze/results/<batch_id>', methods=['GET'])
@jwt_required()
def analyze_results(batch_id):
    """
    GET /api/analyze/results/<batch_id>
    Returns full results for a batch upload.
    """
    predictions = Prediction.query.filter_by(batch_id=batch_id).all()
    if not predictions:
        return jsonify({'error': 'Batch not found'}), 404

    attacks      = sum(1 for p in predictions if p.prediction == 'Attack')
    benign       = len(predictions) - attacks
    needs_review = sum(1 for p in predictions if p.needs_review)

    return jsonify({
        'jobId':        batch_id,
        'status':       'completed',
        'total':        len(predictions),
        'attacks':      attacks,
        'benign':       benign,
        'needs_review': needs_review,
        'results': [
            {
                'id':           p.id,
                'timestamp':    p.timestamp.isoformat(),
                'src_ip':       p.src_ip,
                'dst_ip':       p.dst_ip,
                'protocol':     p.protocol,
                'prediction':   p.prediction,
                'confidence':   round(p.confidence * 100, 2),
                'model_used':   p.model_used,
                'needs_review': p.needs_review
            }
            for p in predictions
        ]
    }), 200
