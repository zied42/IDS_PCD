from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.database import db, Alert

alerts_bp = Blueprint('alerts', __name__)


@alerts_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    # query Alert table
    # filter by: status, severity, date_from, date_to (from request.args)
    # order by timestamp desc, limit 500
    # return list of alert.to_dict()
    pass


@alerts_bp.route('/alerts/<int:alert_id>', methods=['PUT'])
@jwt_required()
def update_alert(alert_id):
    # get alert by id or 404
    # get new status from request.get_json()
    # allowed: 'open' | 'reviewed' | 'resolved'
    # save and return updated alert.to_dict()
    pass