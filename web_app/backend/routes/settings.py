from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from models.database import db, User, UserSettings

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
    
    settings = UserSettings.query.filter_by(user_id=user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.session.add(settings)
        db.session.commit()

    return jsonify({
        'username':      user.username,
        'role':          user.role,
        'theme':         settings.theme,
        'language':      settings.language,
        'notifications': settings.notifications,
        'auto_block_enabled': settings.auto_block_enabled,
        'auto_block_threshold': round(settings.auto_block_threshold * 100)
    }), 200


@settings_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    """
    PUT /api/settings
    Body: { "theme": "dark", "language": "en", "notifications": true, "auto_block_enabled": true, "auto_block_threshold": 90 }
    """
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first_or_404()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    settings = UserSettings.query.filter_by(user_id=user.id).first()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.session.add(settings)

    if 'theme' in data:
        settings.theme = data['theme']
    if 'language' in data:
        settings.language = data['language']
    if 'notifications' in data:
        settings.notifications = bool(data['notifications'])
    if 'auto_block_enabled' in data:
        settings.auto_block_enabled = bool(data['auto_block_enabled'])
    if 'auto_block_threshold' in data:
        settings.auto_block_threshold = float(data['auto_block_threshold']) / 100.0

    db.session.commit()

    return jsonify({
        'message':  'Settings updated',
        'settings': settings.to_dict()
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
