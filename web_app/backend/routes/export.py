import io
import csv
from flask import Blueprint, request, jsonify, send_file, Response
from flask_jwt_extended import jwt_required
from datetime import datetime
from models.database import Prediction

export_bp = Blueprint('export', __name__)


@export_bp.route('/report', methods=['GET'])
@jwt_required()
def export_report():
    # get format from request.args: 'csv' or 'pdf'
    # get optional date filters: from, to
    # query Prediction table with filters, limit 10000
    # if csv → call _export_csv(predictions)
    # if pdf → call _export_pdf(predictions)
    pass


def _export_csv(predictions):
    # build csv in memory using io.StringIO
    # write headers: ID, Timestamp, Src IP, Dst IP, Prediction, Confidence, Model, Needs Review
    # write one row per prediction
    # return Response with mimetype text/csv and Content-Disposition attachment
    pass


def _export_pdf(predictions):
    # use reportlab to build PDF in memory using io.BytesIO
    # add title + generated date
    # add summary: total, attacks, benign
    # add table with prediction rows (cap at 500)
    # return send_file with mimetype application/pdf
    pass