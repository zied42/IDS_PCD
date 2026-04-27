"""
Quick migration: add firewall_blocked column to blocked_ips table.
Run once:  python migrate_firewall.py
"""
import sys, os
os.environ['PYTHONIOENCODING'] = 'utf-8'
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import text

# Connect directly to DB without loading the full app
from config.settings import Config

from flask import Flask
from models.database import db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(text(
                "ALTER TABLE blocked_ips ADD COLUMN firewall_blocked TINYINT(1) DEFAULT 0"
            ))
            conn.commit()
        print("OK - Column 'firewall_blocked' added to blocked_ips table.")
    except Exception as e:
        if 'Duplicate column' in str(e) or 'already exists' in str(e).lower():
            print("OK - Column 'firewall_blocked' already exists.")
        else:
            print(f"Error: {e}")
