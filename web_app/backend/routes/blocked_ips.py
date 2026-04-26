from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from models.database import db, BlockedIP

blocked_ips_bp = Blueprint('blocked_ips', __name__)


@blocked_ips_bp.route('/blocked-ips', methods=['GET'])
@jwt_required()
def get_blocked_ips():
    """
    GET /api/blocked-ips
    Query params:
        status → active | unblocked (default: all)
        page   → default 1
        per_page → default 50
    """
    status   = request.args.get('status')
    page     = request.args.get('page',     1,  type=int)
    per_page = request.args.get('per_page', 50, type=int)

    query = BlockedIP.query
    if status:
        query = query.filter(BlockedIP.status == status)

    paged = query.order_by(BlockedIP.blocked_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    # Summary counts
    total_active   = BlockedIP.query.filter_by(status='active').count()
    total_unblocked= BlockedIP.query.filter_by(status='unblocked').count()
    auto_blocked   = BlockedIP.query.filter_by(status='active', auto_blocked=True).count()
    manual_blocked = BlockedIP.query.filter_by(status='active', auto_blocked=False).count()

    return jsonify({
        'total':        paged.total,
        'page':         paged.page,
        'pages':        paged.pages,
        'summary': {
            'active':        total_active,
            'unblocked':     total_unblocked,
            'auto_blocked':  auto_blocked,
            'manual_blocked':manual_blocked
        },
        'blocked_ips':  [ip.to_dict() for ip in paged.items]
    }), 200


@blocked_ips_bp.route('/blocked-ips', methods=['POST'])
@jwt_required()
def block_ip():
    """
    POST /api/blocked-ips
    Body: { "ip_address": "192.168.1.100", "reason": "Suspicious activity" }
    Manually block an IP address.
    """
    data = request.get_json()
    if not data or not data.get('ip_address'):
        return jsonify({'error': 'ip_address is required'}), 400

    ip_addr = data['ip_address'].strip()

    # Check if already blocked
    existing = BlockedIP.query.filter_by(ip_address=ip_addr, status='active').first()
    if existing:
        return jsonify({
            'error': f'IP {ip_addr} is already blocked',
            'blocked_ip': existing.to_dict()
        }), 409

    blocked = BlockedIP(
        ip_address   = ip_addr,
        reason       = data.get('reason', 'Manually blocked by admin'),
        confidence   = None,
        auto_blocked = False,
        status       = 'active',
        attack_count = 0
    )
    db.session.add(blocked)
    db.session.commit()

    return jsonify({
        'message':    f'IP {ip_addr} blocked successfully',
        'blocked_ip': blocked.to_dict()
    }), 201


@blocked_ips_bp.route('/blocked-ips/<int:block_id>', methods=['DELETE'])
@jwt_required()
def unblock_ip(block_id):
    """
    DELETE /api/blocked-ips/<id>
    Unblock an IP address (sets status to 'unblocked').
    """
    blocked = BlockedIP.query.get_or_404(block_id)

    if blocked.status == 'unblocked':
        return jsonify({'error': 'IP is already unblocked'}), 400

    blocked.status = 'unblocked'
    blocked.unblocked_at = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message':    f'IP {blocked.ip_address} unblocked',
        'blocked_ip': blocked.to_dict()
    }), 200


@blocked_ips_bp.route('/blocked-ips/check/<ip_address>', methods=['GET'])
@jwt_required()
def check_ip(ip_address):
    """
    GET /api/blocked-ips/check/<ip>
    Check if an IP is currently blocked.
    """
    blocked = BlockedIP.query.filter_by(
        ip_address=ip_address,
        status='active'
    ).first()

    return jsonify({
        'ip_address': ip_address,
        'is_blocked': blocked is not None,
        'details':    blocked.to_dict() if blocked else None
    }), 200


@blocked_ips_bp.route('/blocked-ips/summary', methods=['GET'])
@jwt_required()
def blocked_ips_summary():
    """GET /api/blocked-ips/summary — counts for dashboard cards."""
    return jsonify({
        'total_active':   BlockedIP.query.filter_by(status='active').count(),
        'auto_blocked':   BlockedIP.query.filter_by(status='active', auto_blocked=True).count(),
        'manual_blocked': BlockedIP.query.filter_by(status='active', auto_blocked=False).count(),
        'total_unblocked':BlockedIP.query.filter_by(status='unblocked').count()
    }), 200
