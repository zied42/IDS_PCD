"""
Admin-only danger zone actions: clear alerts, reset stats.
"""
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from models.database import db, Alert, Prediction, BlockedIP

danger_bp = Blueprint('danger', __name__)


@danger_bp.route('/admin/clear-alerts', methods=['DELETE'])
@jwt_required()
def clear_alerts():
    """DELETE /api/admin/clear-alerts — remove all alerts."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    count = Alert.query.delete()
    db.session.commit()
    return jsonify({'message': f'{count} alerts cleared'}), 200


@danger_bp.route('/admin/reset-stats', methods=['DELETE'])
@jwt_required()
def reset_stats():
    """DELETE /api/admin/reset-stats — remove all predictions, alerts, blocked IPs."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    a = Alert.query.delete()
    b = BlockedIP.query.delete()
    p = Prediction.query.delete()
    db.session.commit()
    return jsonify({
        'message': f'Reset complete: {a} alerts, {b} blocked IPs, {p} predictions removed'
    }), 200
