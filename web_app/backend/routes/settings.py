from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from werkzeug.security import check_password_hash, generate_password_hash
from models.database import db, User, UserSettings

settings_bp = Blueprint('settings', __name__)


def _get_or_create_settings(user_id: int) -> UserSettings:
    """Return existing UserSettings row or create a default one."""
    settings = UserSettings.query.filter_by(user_id=user_id).first()
    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
        db.session.flush()
    return settings


@settings_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    """GET /api/settings"""
    username = get_jwt_identity()
    user     = User.query.filter_by(username=username).first_or_404()
    settings = _get_or_create_settings(user.id)
    db.session.commit()

    return jsonify({
        'username':             user.username,
        'role':                 user.role,
        'theme':                settings.theme,
        'language':             settings.language,
        'notifications':        settings.notifications,
        'auto_block_enabled':   settings.auto_block_enabled,
        'auto_block_threshold': round(settings.auto_block_threshold * 100),
        'system_mode':          settings.system_mode or 'ids'
    }), 200


@settings_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    """
    PUT /api/settings
    Admin-only fields: auto_block_enabled, auto_block_threshold, system_mode
    """
    username = get_jwt_identity()
    claims   = get_jwt()
    is_admin = claims.get('role') == 'admin'

    user     = User.query.filter_by(username=username).first_or_404()
    data     = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    settings = _get_or_create_settings(user.id)

    # Fields available to all users
    if 'theme' in data:
        settings.theme = data['theme']
    if 'language' in data:
        settings.language = data['language']
    if 'notifications' in data:
        settings.notifications = bool(data['notifications'])

    # Admin-only fields
    if 'auto_block_enabled' in data:
        if not is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        settings.auto_block_enabled = bool(data['auto_block_enabled'])

    if 'auto_block_threshold' in data:
        if not is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        val = float(data['auto_block_threshold'])
        settings.auto_block_threshold = val / 100.0 if val > 1 else val

    if 'system_mode' in data:
        if not is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        mode = data['system_mode'].lower()
        if mode not in ('ids', 'ips'):
            return jsonify({'error': "system_mode must be 'ids' or 'ips'"}), 400
        settings.system_mode = mode

    db.session.commit()

    return jsonify({
        'message':  'Settings updated',
        'settings': settings.to_dict()
    }), 200


@settings_bp.route('/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """POST /api/auth/change-password"""
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
