from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()


# ── 1. Predictions ────────────────────────────────────────────────────────────
class Prediction(db.Model):
    __tablename__ = 'predictions'

    id            = db.Column(db.Integer,     primary_key=True)
    timestamp     = db.Column(db.DateTime,    default=datetime.utcnow, index=True)

    # IPs from the CSV (not used by model, just for display)
    src_ip        = db.Column(db.String(45),  nullable=True)
    dst_ip        = db.Column(db.String(45),  nullable=True)
    src_port      = db.Column(db.Integer,     nullable=True)
    dst_port      = db.Column(db.Integer,     nullable=True)
    protocol      = db.Column(db.Integer,     nullable=True)

    # Model output
    prediction    = db.Column(db.String(20),  nullable=False)   # 'Benign' | 'Attack'
    confidence    = db.Column(db.Float,       nullable=False)   # 0.0 → 1.0
    model_used    = db.Column(db.String(50),  nullable=False)
    needs_review  = db.Column(db.Boolean,     default=False)

    # Raw 34 features stored as JSON (for SHAP explanation later)
    features_json = db.Column(db.Text,        nullable=True)

    def to_dict(self):
        return {
            'id':           self.id,
            'timestamp':    self.timestamp.isoformat(),
            'src_ip':       self.src_ip,
            'dst_ip':       self.dst_ip,
            'src_port':     self.src_port,
            'dst_port':     self.dst_port,
            'protocol':     self.protocol,
            'prediction':   self.prediction,
            'confidence':   round(self.confidence * 100, 2),
            'model_used':   self.model_used,
            'needs_review': self.needs_review
        }


# ── 2. Alerts (attacks only) ──────────────────────────────────────────────────
class Alert(db.Model):
    __tablename__ = 'alerts'

    id            = db.Column(db.Integer,    primary_key=True)
    timestamp     = db.Column(db.DateTime,   default=datetime.utcnow, index=True)
    src_ip        = db.Column(db.String(45), nullable=True)
    dst_ip        = db.Column(db.String(45), nullable=True)
    confidence    = db.Column(db.Float,      nullable=False)
    severity      = db.Column(db.String(10), nullable=False)   # High | Medium | Low
    status        = db.Column(db.String(20), default='open')   # open | reviewed | resolved
    prediction_id = db.Column(db.Integer,    db.ForeignKey('predictions.id'), nullable=True)

    def to_dict(self):
        return {
            'id':            self.id,
            'timestamp':     self.timestamp.isoformat(),
            'src_ip':        self.src_ip,
            'dst_ip':        self.dst_ip,
            'confidence':    round(self.confidence * 100, 2),
            'severity':      self.severity,
            'status':        self.status,
            'prediction_id': self.prediction_id
        }


# ── 3. Traffic Stats (hourly aggregates) ──────────────────────────────────────
class TrafficStat(db.Model):
    __tablename__ = 'traffic_stats'

    id             = db.Column(db.Integer,  primary_key=True)
    hour           = db.Column(db.DateTime, nullable=False, index=True)
    total_flows    = db.Column(db.Integer,  default=0)
    attack_count   = db.Column(db.Integer,  default=0)
    benign_count   = db.Column(db.Integer,  default=0)
    avg_confidence = db.Column(db.Float,    default=0.0)

    def to_dict(self):
        return {
            'hour':           self.hour.isoformat(),
            'total_flows':    self.total_flows,
            'attack_count':   self.attack_count,
            'benign_count':   self.benign_count,
            'avg_confidence': round(self.avg_confidence * 100, 2)
        }


# ── 4. Users ──────────────────────────────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer,    primary_key=True)
    username      = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(255),nullable=False)
    role          = db.Column(db.String(20), default='analyst')  # admin | analyst | viewer
    last_login    = db.Column(db.DateTime,   nullable=True)

    def to_dict(self):
        return {
            'id':         self.id,
            'username':   self.username,
            'role':       self.role,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


# ── 5. ML Models registry ─────────────────────────────────────────────────────
class MLModel(db.Model):
    __tablename__ = 'models'

    id           = db.Column(db.Integer,     primary_key=True)
    name         = db.Column(db.String(80),  nullable=False)
    version      = db.Column(db.String(20),  nullable=False)
    bal_accuracy = db.Column(db.Float,       nullable=True)
    f1_macro     = db.Column(db.Float,       nullable=True)
    file_path    = db.Column(db.String(255), nullable=False)
    is_active    = db.Column(db.Boolean,     default=False)

    def to_dict(self):
        return {
            'id':           self.id,
            'name':         self.name,
            'version':      self.version,
            'bal_accuracy': self.bal_accuracy,
            'f1_macro':     self.f1_macro,
            'is_active':    self.is_active
        }