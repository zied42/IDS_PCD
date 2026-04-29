from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime
from models.database import db, User

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Body: { "username": "admin", "password": "admin123" }
    Returns: { "token": "...", "username": "admin", "role": "admin" }
    """
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    user = User.query.filter_by(username=data['username']).first()

    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    # Update last login
    user.last_login = datetime.utcnow()
    db.session.commit()

    # Create JWT token — includes role so Angular can control access
    token = create_access_token(
        identity=user.username,
        additional_claims={'role': user.role}
    )

    return jsonify({
        'token': token,
        'username': user.username,
        'role': user.role
    }), 200


@auth_bp.route('/register', methods=['POST'])
@jwt_required()
def register():
    """
    POST /api/auth/register
    Body: { "username", "password", "role", "email", "full_name" }
    Admin-only: creates a new user account.
    """
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required to create users'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    if len(data['password']) < 4:
        return jsonify({'error': 'Password must be at least 4 characters'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409

    allowed_roles = ('admin', 'analyst')
    role = data.get('role', 'analyst')
    if role not in allowed_roles:
        return jsonify({'error': f'Role must be one of {allowed_roles}'}), 400

    user = User(
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        role=role,
        email=data.get('email', ''),
        full_name=data.get('full_name', '')
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict()
    }), 201


# ── User Management (Admin only) ─────────────────────────────────────────────
@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def list_users():
    """GET /api/auth/users — list all users (admin only)."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    users = User.query.order_by(User.id.asc()).all()
    return jsonify([u.to_dict() for u in users]), 200


@auth_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """DELETE /api/auth/users/<id> — admin deletes a user account."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    from flask_jwt_extended import get_jwt_identity
    current_user = get_jwt_identity()

    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Prevent admin from deleting themselves
    if user.username == current_user:
        return jsonify({'error': 'Cannot delete your own account'}), 400

    db.session.delete(user)
    db.session.commit()

    return jsonify({'message': f'User {user.username} deleted'}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    """GET /api/auth/me — current user info from JWT."""
    from flask_jwt_extended import get_jwt_identity
    username = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        'username': username,
        'role': claims.get('role')
    }), 200