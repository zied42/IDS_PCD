from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config.settings import Config
from models.database import db
from utils.ml_loader import load_model

# Import blueprints
from routes.auth      import auth_bp
from routes.predict   import predict_bp
from routes.alerts    import alerts_bp

from routes.stats     import stats_bp
from routes.model_info import model_bp
from routes.export    import export_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Extensions
    CORS(app)
    JWTManager(app)
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp,    url_prefix='/api/auth')
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(alerts_bp,  url_prefix='/api')
    app.register_blueprint(stats_bp,   url_prefix='/api/stats')
    app.register_blueprint(model_bp,   url_prefix='/api/model')
    app.register_blueprint(export_bp,  url_prefix='/api/export')

    # Create DB tables
    with app.app_context():
        db.create_all()
        # Load ML model once at startup
        load_model()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5000)