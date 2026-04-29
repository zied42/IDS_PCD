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
    batch_id      = db.Column(db.String(36),  nullable=True, index=True)
    batch_filename= db.Column(db.String(255), nullable=True)
    features_json = db.Column(db.Text, nullable=True)

    # Raw 34 features stored as JSON (for SHAP explanation later)

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
    role          = db.Column(db.String(20), default='analyst')  # admin | analyst
    email         = db.Column(db.String(120), nullable=True)
    full_name     = db.Column(db.String(120), nullable=True)
    last_login    = db.Column(db.DateTime,   nullable=True)

    def to_dict(self):
        return {
            'id':         self.id,
            'username':   self.username,
            'role':       self.role,
            'email':      self.email,
            'full_name':  self.full_name,
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


# ── 6. Blocked IPs (auto-blocked on high-confidence attacks) ─────────────────
class BlockedIP(db.Model):
    __tablename__ = 'blocked_ips'

    id            = db.Column(db.Integer,    primary_key=True)
    ip_address    = db.Column(db.String(45), nullable=False, index=True)
    reason        = db.Column(db.String(255),nullable=False)
    confidence    = db.Column(db.Float,      nullable=True)
    blocked_at    = db.Column(db.DateTime,   default=datetime.utcnow)
    auto_blocked  = db.Column(db.Boolean,    default=True)     # True = system, False = manual
    status        = db.Column(db.String(20), default='active') # active | unblocked
    prediction_id    = db.Column(db.Integer,    nullable=True)
    unblocked_at     = db.Column(db.DateTime,   nullable=True)
    attack_count     = db.Column(db.Integer,    default=1)        # how many attacks from this IP
    firewall_blocked = db.Column(db.Boolean,    default=False)    # True = actually blocked in Windows Firewall

    def to_dict(self):
        return {
            'id':               self.id,
            'ip_address':       self.ip_address,
            'reason':           self.reason,
            'confidence':       round(self.confidence * 100, 2) if self.confidence else None,
            'blocked_at':       self.blocked_at.isoformat() if self.blocked_at else None,
            'auto_blocked':     self.auto_blocked,
            'status':           self.status,
            'prediction_id':    self.prediction_id,
            'unblocked_at':     self.unblocked_at.isoformat() if self.unblocked_at else None,
            'attack_count':     self.attack_count,
            'firewall_blocked': self.firewall_blocked
        }


# ── 7. User Settings (persistent preferences) ────────────────────────────────
class UserSettings(db.Model):
    __tablename__ = 'user_settings'

    id            = db.Column(db.Integer,    primary_key=True)
    user_id       = db.Column(db.Integer,    db.ForeignKey('users.id'), unique=True, nullable=False)
    theme         = db.Column(db.String(20), default='dark')
    language      = db.Column(db.String(10), default='en')
    notifications = db.Column(db.Boolean,    default=True)
    auto_block_enabled   = db.Column(db.Boolean, default=True)
    auto_block_threshold = db.Column(db.Float,   default=0.90)  # confidence threshold for auto-blocking
    system_mode          = db.Column(db.String(10), default='ids')  # 'ids' | 'ips'

    def to_dict(self):
        return {
            'theme':                self.theme,
            'language':             self.language,
            'notifications':        self.notifications,
            'auto_block_enabled':   self.auto_block_enabled,
            'auto_block_threshold': round(self.auto_block_threshold * 100),
            'system_mode':          self.system_mode or 'ids'
        }