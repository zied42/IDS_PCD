import io
import os
import csv
import json
import pandas as pd
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.database import db, Prediction
from utils.ml_loader import predict_single, predict_batch, get_model_name, FEATURE_COLUMNS
from utils.alert_helper import create_alert_if_needed

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
    cutoff = datetime.utcnow() - timedelta(days=7)
    Prediction.query.filter(Prediction.timestamp < cutoff).delete()


@predict_bp.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    src_ip   = data.pop('src_ip',   None) or data.pop('Src IP',   None)
    dst_ip   = data.pop('dst_ip',   None) or data.pop('Dst IP',   None)
    src_port = data.pop('src_port', None) or data.pop('Src Port', None)
    dst_port = data.pop('dst_port', None) or data.pop('Dst Port', None)

    try:
        result = predict_single(data)
    except ValueError as e:
        return jsonify({'error': str(e)}), 422
    except RuntimeError as e:
        return jsonify({'error': str(e)}), 503

    # Save features_json ONLY for attacks (saves 83% space)
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
        features_json = features_json
    )
    db.session.add(pred)
    db.session.flush()

    alert = create_alert_if_needed(pred)
    if alert:
        db.session.add(alert)

    _cleanup_old_predictions()
    db.session.commit()
    _append_csv(pred)

    return jsonify({
        'prediction_id':  pred.id,
        'prediction':     result['prediction'],
        'confidence_pct': result['confidence_pct'],
        'needs_review':   result['needs_review']
    }), 200


@predict_bp.route('/predict/batch', methods=['POST'])
@jwt_required()
def predict_batch_endpoint():
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
    for _, row in result_df.iterrows():
        is_attack     = row['prediction'] == 'Attack'
        features_json = json.dumps({c: row[c] for c in FEATURE_COLUMNS if c in row}) if is_attack else None

        pred = Prediction(
            src_ip        = row.get('Src IP') or row.get('src_ip'),
            dst_ip        = row.get('Dst IP') or row.get('dst_ip'),
            src_port      = int(row['Src Port']) if 'Src Port' in row else None,
            dst_port      = int(row['Dst Port']) if 'Dst Port' in row else None,
            protocol      = int(row.get('Protocol', 0)),
            prediction    = row['prediction'],
            confidence    = row['confidence'] / 100,
            model_used    = model_name,
            needs_review  = bool(row['needs_review']),
            features_json = features_json
        )
        db.session.add(pred)
        db.session.flush()
        alert = create_alert_if_needed(pred)
        if alert:
            db.session.add(alert)
        _append_csv(pred)

    _cleanup_old_predictions()
    db.session.commit()

    return jsonify({
        'total':        len(result_df),
        'attacks':      int((result_df['prediction'] == 'Attack').sum()),
        'benign':       int((result_df['prediction'] == 'Benign').sum()),
        'needs_review': int(result_df['needs_review'].sum()),
    }), 200


@predict_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_predictions():
    page     = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    paged    = Prediction.query.order_by(
        Prediction.timestamp.desc()
    ).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'total':       paged.total,
        'page':        paged.page,
        'pages':       paged.pages,
        'predictions': [p.to_dict() for p in paged.items]
    }), 200