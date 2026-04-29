"""
DB migration helper - adds missing columns to existing tables.
Run: python migrate_db.py
"""
from app import create_app
from models.database import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    migrations = [
        "ALTER TABLE user_settings ADD COLUMN system_mode VARCHAR(10) DEFAULT 'ids'",
        "ALTER TABLE blocked_ips ADD COLUMN firewall_blocked BOOLEAN DEFAULT FALSE",
        "ALTER TABLE users ADD COLUMN email VARCHAR(120) DEFAULT ''",
        "ALTER TABLE users ADD COLUMN full_name VARCHAR(120) DEFAULT ''",
    ]
    for sql in migrations:
        try:
            db.session.execute(text(sql))
            db.session.commit()
            print(f"  [OK] {sql}")
        except Exception as e:
            db.session.rollback()
            if '1060' in str(e) or 'Duplicate' in str(e) or 'already exists' in str(e):
                col = sql.split('ADD COLUMN')[1].split()[0] if 'ADD COLUMN' in sql else ''
                print(f"  [SKIP] Column already exists: {col}")
            else:
                print(f"  [WARN] {e}")

    print("\nMigration complete.")
