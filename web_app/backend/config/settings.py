import os
from datetime import timedelta

class Config:
    # Flask
    SECRET_KEY      = os.environ.get('SECRET_KEY', 'change-this-in-production')

    # MySQL
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'mysql+pymysql://root:panzer@localhost:3306/ids_platform'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT
    JWT_SECRET_KEY          = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES= timedelta(hours=8)

    # Confidence thresholds
    HIGH_CONFIDENCE   = 0.90
    MEDIUM_CONFIDENCE = 0.75
    NEEDS_REVIEW      = 0.70