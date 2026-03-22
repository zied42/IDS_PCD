from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models.database import db, MLModel
from utils.ml_loader import get_model_name, get_metadata, FEATURE_COLUMNS

model_bp = Blueprint('model', __name__)


@model_bp.route('/info', methods=['GET'])
@jwt_required()
def model_info():
    # get metadata from get_metadata()
    # return model name, bal_accuracy, f1_macro, feature_count, features list
    pass