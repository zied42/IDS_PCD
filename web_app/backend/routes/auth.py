from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
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
def register():
    """
    POST /api/auth/register
    Body: { "username": "zied", "password": "1234", "role": "analyst" }
    Roles: admin | analyst | viewer
    """
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 409

    allowed_roles = ('admin', 'analyst')
    role = data.get('role', 'analyst')
    if role not in allowed_roles:
        return jsonify({'error': f'Role must be one of {allowed_roles}'}), 400

    user = User(
        username=data['username'],
        password_hash=generate_password_hash(data['password']),
        role=role
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'message': 'User created successfully',
        'user': user.to_dict()
    }), 201





"""
zeyda  taw na7ida just for debugging 

"""
@auth_bp.route('/me', methods=['GET'])
def me():
    """
    GET /api/auth/me
    Returns current user info from JWT token.
    """
    from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

    @jwt_required()
    def _me():
        username = get_jwt_identity()
        claims = get_jwt()
        return jsonify({
            'username': username,
            'role': claims.get('role')
        }), 200

    return _me()