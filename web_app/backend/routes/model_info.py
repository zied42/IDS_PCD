from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models.database import db, MLModel
from utils.ml_loader import (
    load_model, get_model_name, get_metadata,
    get_model_type, get_available_models, FEATURE_COLUMNS, MODELS
)
import os
from datetime import datetime

model_bp = Blueprint('model', __name__)


@model_bp.route('/info', methods=['GET'])
@jwt_required()
def model_info():
    """GET /api/model/info — active model name, metrics, features."""
    meta = get_metadata()
    if not meta:
        return jsonify({'error': 'No model loaded'}), 503

    # Get trained date from model file modification time
    model_name = get_model_name()
    trained_date = None
    if model_name and model_name in MODELS:
        model_path = MODELS[model_name]['model_path']
        try:
            mtime = os.path.getmtime(model_path)
            trained_date = datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
        except OSError:
            trained_date = '2026-03-01'  # fallback

    return jsonify({
        'model_name':   get_model_name(),
        'model_type':   get_model_type(),
        'version':      meta.get('version', '1.0'),
        'bal_accuracy': round(meta['metrics']['balanced_accuracy'] * 100, 2),
        'f1_macro':     round(meta['metrics']['f1_macro'] * 100, 2),
        'attack_recall':round(float(meta['metrics']['attack_recall']) * 100, 2),
        'benign_recall':round(float(meta['metrics']['benign_recall']) * 100, 2),
        'n_features':   meta.get('n_features', 34),
        'features':     FEATURE_COLUMNS,
        'available_models': get_available_models(),
        'trainedDate':  trained_date
    }), 200


@model_bp.route('/switch', methods=['PUT'])
@jwt_required()
def switch_model():
    """
    PUT /api/model/switch
    Body: { "model": "cnn" } or { "model": "xgboost" }
    Admin only.
    """
    # Check admin role
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    data = request.get_json()
    if not data or not data.get('model'):
        return jsonify({'error': 'model name required'}), 400

    model_name = data['model'].lower()
    available  = get_available_models()

    if model_name not in available:
        return jsonify({
            'error': f"Unknown model '{model_name}'",
            'available': available
        }), 400

    if model_name == get_model_name():
        return jsonify({'message': f'{model_name} is already active'}), 200

    try:
        load_model(model_name)
    except Exception as e:
        return jsonify({'error': f'Failed to load model: {str(e)}'}), 500

    # Update is_active in MySQL models table
    MLModel.query.update({'is_active': False})
    active = MLModel.query.filter_by(name=model_name.upper()).first() or \
             MLModel.query.filter(MLModel.name.ilike(model_name)).first()
    if active:
        active.is_active = True
        db.session.commit()

    meta = get_metadata()
    return jsonify({
        'message':      f'Switched to {model_name}',
        'model_name':   model_name,
        'model_type':   get_model_type(),
        'bal_accuracy': round(meta['metrics']['balanced_accuracy'] * 100, 2),
    }), 200


@model_bp.route('/list', methods=['GET'])
@jwt_required()
def list_models():
    """GET /api/model/list — all available models with their metrics."""
    return jsonify({
        'active': get_model_name(),
        'available': get_available_models()
    }), 200