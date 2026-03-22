"""
Run once to create default users + register models in MySQL.
    cd web_app/backend
    python seed.py
"""
import sys
sys.path.insert(0, '.')

from app import create_app
from models.database import db, User, MLModel
from werkzeug.security import generate_password_hash

app = create_app()

with app.app_context():
    db.create_all()
    print("✅ Tables created\n")

    # ── Users ─────────────────────────────────────────────────────────────────
    users = [
        {'username': 'admin',   'password': 'admin123',   'role': 'admin'},
        {'username': 'analyst', 'password': 'analyst123', 'role': 'analyst'},
    ]
    for u in users:
        if User.query.filter_by(username=u['username']).first():
            print(f"⏭️  User exists: {u['username']}")
        else:
            db.session.add(User(
                username      = u['username'],
                password_hash = generate_password_hash(u['password']),
                role          = u['role']
            ))
            print(f"✅ Created user: {u['username']} ({u['role']})")

    # ── Models ────────────────────────────────────────────────────────────────
    models = [
        {
            'name':         'xgboost',
            'version':      '1.0',
            'bal_accuracy': 0.9715,
            'f1_macro':     0.9820,
            'file_path':    '../../ml_corr_drop/xgboost/model.pkl',
            'is_active':    True    # ← default model
        },
        {
            'name':         'cnn',
            'version':      '1.0',
            'bal_accuracy': None,   # fill after checking metadata
            'f1_macro':     None,
            'file_path':    '../../dl_corr_drop/cnn/best_model.keras',
            'is_active':    False
        }
    ]
    for m in models:
        if MLModel.query.filter_by(name=m['name']).first():
            print(f"⏭️  Model exists: {m['name']}")
        else:
            db.session.add(MLModel(**m))
            print(f"✅ Registered model: {m['name']}")

    db.session.commit()

    print("\n" + "=" * 40)
    print("✅ Database seeded!")
    print("=" * 40)
    print("\nCredentials:")
    print("  admin   / admin123")
    print("  analyst / analyst123")
    print("\nModels registered:")
    print("  xgboost (active)")
    print("  cnn     (inactive)")
    print("\nAdmin can switch via: PUT /api/model/switch")