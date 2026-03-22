from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.database import db, Alert

alerts_bp = Blueprint('alerts', __name__)


@alerts_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    """
    GET /api/alerts
    Query params:
        status   → open | reviewed | resolved
        severity → High | Medium | Low
        from     → 2026-01-01
        to       → 2026-12-31
        page     → default 1
        per_page → default 50
    """
    query    = Alert.query
    status   = request.args.get('status')
    severity = request.args.get('severity')
    date_from= request.args.get('from')
    date_to  = request.args.get('to')
    page     = request.args.get('page',     1,  type=int)
    per_page = request.args.get('per_page', 50, type=int)

    if status:    query = query.filter(Alert.status   == status)
    if severity:  query = query.filter(Alert.severity == severity)
    if date_from: query = query.filter(Alert.timestamp >= date_from)
    if date_to:   query = query.filter(Alert.timestamp <= date_to)

    paged = query.order_by(Alert.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'total': paged.total,
        'page':  paged.page,
        'pages': paged.pages,
        'summary': {
            'open':           Alert.query.filter_by(status='open').count(),
            'high_severity':  Alert.query.filter_by(status='open', severity='High').count(),
            'resolved_today': Alert.query.filter(
                Alert.status == 'resolved',
                Alert.timestamp >= db.func.curdate()
            ).count()
        },
        'alerts': [a.to_dict() for a in paged.items]
    }), 200


@alerts_bp.route('/alerts/<int:alert_id>', methods=['PUT'])
@jwt_required()
def update_alert(alert_id):
    """
    PUT /api/alerts/<id>
    Body: { "status": "reviewed" } or { "status": "resolved" }
    """
    alert = Alert.query.get_or_404(alert_id)
    data  = request.get_json()

    if not data or not data.get('status'):
        return jsonify({'error': 'status field required'}), 400

    allowed = ('open', 'reviewed', 'resolved')
    if data['status'] not in allowed:
        return jsonify({'error': f'status must be one of {allowed}'}), 400

    alert.status = data['status']
    db.session.commit()

    return jsonify({
        'message': f'Alert {alert_id} marked as {alert.status}',
        'alert':   alert.to_dict()
    }), 200


@alerts_bp.route('/alerts/summary', methods=['GET'])
@jwt_required()
def alerts_summary():
    """GET /api/alerts/summary — counts for dashboard cards."""
    return jsonify({
        'total_open':     Alert.query.filter_by(status='open').count(),
        'high':           Alert.query.filter_by(status='open', severity='High').count(),
        'medium':         Alert.query.filter_by(status='open', severity='Medium').count(),
        'low':            Alert.query.filter_by(status='open', severity='Low').count(),
        'resolved_today': Alert.query.filter(
            Alert.status == 'resolved',
            Alert.timestamp >= db.func.curdate()
        ).count()
    }), 200