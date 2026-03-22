from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models.database import db, Prediction, Alert

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/live', methods=['GET'])
@jwt_required()
def live_stats():
    # query Prediction table for today (since midnight)
    # count total, attacks, benign
    # query yesterday for comparison
    # count open alerts
    # return { today: {total, attacks, benign, attack_rate}, yesterday: {...}, open_alerts }
    pass


@stats_bp.route('/hourly', methods=['GET'])
@jwt_required()
def hourly_stats():
    # query Prediction table for last 24h
    # group by hour using func.date_format
    # return list of { hour, total, attacks, benign }
    pass