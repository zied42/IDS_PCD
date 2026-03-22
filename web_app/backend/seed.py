"""
Run once to create default users in MySQL.
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

    # ── Default users ─────────────────────────────────────────────────────────
    users = [
        {'username': 'admin',   'password': 'admin123',   'role': 'admin'},
        {'username': 'analyst', 'password': 'analyst123', 'role': 'analyst'},
    ]

    for u in users:
        if User.query.filter_by(username=u['username']).first():
            print(f"⏭️  User already exists: {u['username']}")
        else:
            user = User(
                username      = u['username'],
                password_hash = generate_password_hash(u['password']),
                role          = u['role']
            )
            db.session.add(user)
            print(f"✅ Created user: {u['username']} ({u['role']})")

    # ── Register XGBoost model in DB ──────────────────────────────────────────
    if MLModel.query.filter_by(name='XGBoost').first():
        print("⏭️  Model already registered: XGBoost")
    else:
        model = MLModel(
            name         = 'XGBoost',
            version      = '1.0',
            bal_accuracy = 0.9715,
            f1_macro     = 0.9820,
            file_path    = '../../ml_corr_drop/xgboost/model.pkl',
            is_active    = True
        )
        db.session.add(model)
        print("✅ Registered model: XGBoost v1.0")

    db.session.commit()

    print("\n" + "=" * 40)
    print("✅ Database seeded!")
    print("=" * 40)
    print("\nLogin credentials:")
    print("  admin   / admin123")
    print("  analyst / analyst123")