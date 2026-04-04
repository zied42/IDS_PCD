from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from models.database import db, User

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """
    GET /api/settings
    Returns user preferences (theme, language, notifications).
    """
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first_or_404()
    return jsonify({
        'username':      user.username,
        'role':          user.role,
        'theme':         'dark',
        'language':      'en',
        'notifications': True
    }), 200


@settings_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    """
    PUT /api/settings
    Body: { "theme": "dark", "language": "en", "notifications": true }
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    return jsonify({
        'message':  'Settings updated',
        'settings': data
    }), 200


@settings_bp.route('/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """
    POST /api/auth/change-password
    Body: { "currentPassword": "old", "newPassword": "new" }
    """
    username = get_jwt_identity()
    data     = request.get_json()

    if not data or not data.get('currentPassword') or not data.get('newPassword'):
        return jsonify({'error': 'currentPassword and newPassword required'}), 400

    user = User.query.filter_by(username=username).first_or_404()

    if not check_password_hash(user.password_hash, data['currentPassword']):
        return jsonify({'error': 'Current password is incorrect'}), 401

    if len(data['newPassword']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user.password_hash = generate_password_hash(data['newPassword'])
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'}), 200
