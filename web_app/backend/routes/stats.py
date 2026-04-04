from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from datetime import datetime, timedelta
from models.database import db, Prediction, Alert

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/live', methods=['GET'])
@jwt_required()
def live_stats():
    """GET /api/stats/live — today's counters vs yesterday."""
    today_start     = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)

    # Today
    today_total  = Prediction.query.filter(
        Prediction.timestamp >= today_start
    ).count()
    today_attacks= Prediction.query.filter(
        Prediction.timestamp >= today_start,
        Prediction.prediction == 'Attack'
    ).count()
    today_benign = today_total - today_attacks

    # Yesterday
    yesterday_total  = Prediction.query.filter(
        Prediction.timestamp >= yesterday_start,
        Prediction.timestamp <  today_start
    ).count()
    yesterday_attacks= Prediction.query.filter(
        Prediction.timestamp >= yesterday_start,
        Prediction.timestamp <  today_start,
        Prediction.prediction == 'Attack'
    ).count()

    # Open alerts
    open_alerts = Alert.query.filter_by(status='open').count()

    # Average confidence (today)
    avg_conf = db.session.query(
        func.avg(Prediction.confidence)
    ).filter(Prediction.timestamp >= today_start).scalar()

    attack_rate_today     = round(today_attacks / today_total * 100, 1) if today_total else 0
    attack_rate_yesterday = round(yesterday_attacks / yesterday_total * 100, 1) if yesterday_total else 0

    return jsonify({
        'today': {
            'total':       today_total,
            'attacks':     today_attacks,
            'benign':      today_benign,
            'attack_rate': attack_rate_today
        },
        'yesterday': {
            'total':       yesterday_total,
            'attacks':     yesterday_attacks,
            'attack_rate': attack_rate_yesterday
        },
        'open_alerts':   open_alerts,
        'avgConfidence': round(float(avg_conf or 0) * 100, 1)
    }), 200


@stats_bp.route('/hourly', methods=['GET'])
@jwt_required()
def hourly_stats():
    """GET /api/stats/hourly — last 24h traffic per hour for line chart."""
    since = datetime.utcnow() - timedelta(hours=24)

    rows = db.session.query(
        func.date_format(Prediction.timestamp, '%Y-%m-%d %H:00:00').label('hour'),
        func.count(Prediction.id).label('total'),
        func.sum(db.case(
            (Prediction.prediction == 'Attack', 1), else_=0
        )).label('attacks'),
        func.sum(db.case(
            (Prediction.prediction == 'Benign', 1), else_=0
        )).label('benign')
    ).filter(
        Prediction.timestamp >= since
    ).group_by('hour').order_by('hour').all()

    return jsonify([
        {
            'hour':    row.hour,
            'total':   row.total,
            'attacks': int(row.attacks or 0),
            'benign':  int(row.benign  or 0)
        }
        for row in rows
    ]), 200


@stats_bp.route('/distribution', methods=['GET'])
@jwt_required()
def distribution():
    """GET /api/stats/distribution — benign vs attack pie chart data."""
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total   = Prediction.query.filter(Prediction.timestamp >= today_start).count()
    attacks = Prediction.query.filter(
        Prediction.timestamp >= today_start,
        Prediction.prediction == 'Attack'
    ).count()
    benign = total - attacks

    attack_pct = round(attacks / total * 100, 1) if total else 0
    benign_pct = round(benign / total * 100, 1) if total else 0

    return jsonify({
        'total':      total,
        'attacks':    attacks,
        'benign':     benign,
        'attack_pct': attack_pct,
        'benign_pct': benign_pct,
        'distribution': [
            {'label': 'Benign', 'value': benign,  'color': '#22c55e'},
            {'label': 'Attack', 'value': attacks, 'color': '#ef4444'},
        ]
    }), 200