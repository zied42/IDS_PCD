# Backend — TODO List
> Priority ordered — implement top to bottom

---

## 🔴 HIGH PRIORITY (frontend blocked without these)

### 1. CREATE `routes/settings.py`

```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.security import check_password_hash, generate_password_hash
from models.database import db, User

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/settings', methods=['GET'])
@jwt_required()
def get_settings():
    username = get_jwt_identity()
    user = User.query.filter_by(username=username).first_or_404()
    return jsonify({
        'username':      user.username,
        'role':          user.role,
        'theme':         'dark',
        'language':      'en',
        'notifications': True
    }), 200


@settings_bp.route('/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    data = request.get_json()
    return jsonify({'success': True, 'settings': data}), 200


@settings_bp.route('/auth/change-password', methods=['POST'])
@jwt_required()
def change_password():
    username = get_jwt_identity()
    data     = request.get_json()

    if not data.get('currentPassword') or not data.get('newPassword'):
        return jsonify({'error': 'currentPassword and newPassword required'}), 400

    user = User.query.filter_by(username=username).first_or_404()

    if not check_password_hash(user.password_hash, data['currentPassword']):
        return jsonify({'error': 'Current password is incorrect'}), 401

    if len(data['newPassword']) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    user.password_hash = generate_password_hash(data['newPassword'])
    db.session.commit()
    return jsonify({'success': True}), 200
```

**Register in `app.py`:**
```python
from routes.settings import settings_bp
app.register_blueprint(settings_bp, url_prefix='/api')
```

---

### 2. ADD `GET /stats/distribution` to `routes/stats.py`

```python
@stats_bp.route('/distribution', methods=['GET'])
@jwt_required()
def distribution():
    from datetime import datetime
    from models.database import Prediction

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    total   = Prediction.query.filter(Prediction.timestamp >= today_start).count()
    attacks = Prediction.query.filter(
        Prediction.timestamp >= today_start,
        Prediction.prediction == 'Attack'
    ).count()
    benign = total - attacks

    return jsonify([
        {'label': 'Benign', 'value': benign,  'color': '#22c55e'},
        {'label': 'Attack', 'value': attacks, 'color': '#ef4444'},
    ]), 200
```

---

### 3. ADD two batch endpoints to `routes/predict.py`

```python
@predict_bp.route('/analyze/status/<batch_id>', methods=['GET'])
@jwt_required()
def analyze_status(batch_id):
    count = Prediction.query.filter_by(batch_id=batch_id).count()
    if count == 0:
        return jsonify({'error': 'Batch not found'}), 404
    return jsonify({
        'progress': 100,
        'status':   'completed',
        'total':    count
    }), 200


@predict_bp.route('/analyze/results/<batch_id>', methods=['GET'])
@jwt_required()
def analyze_results(batch_id):
    predictions = Prediction.query.filter_by(batch_id=batch_id).all()
    if not predictions:
        return jsonify({'error': 'Not found'}), 404

    attacks = sum(1 for p in predictions if p.prediction == 'Attack')
    return jsonify({
        'batchId':     batch_id,
        'status':      'completed',
        'total':       len(predictions),
        'attackCount': attacks,
        'benignCount': len(predictions) - attacks,
        'needsReview': sum(1 for p in predictions if p.needs_review),
        'results': [
            {
                'id':         p.id,
                'timestamp':  p.timestamp.isoformat(),
                'srcIp':      p.src_ip,
                'dstIp':      p.dst_ip,
                'prediction': p.prediction,
                'confidence': round(p.confidence * 100, 2),
                'status':     'Needs Review' if p.needs_review else 'Processed'
            }
            for p in predictions
        ]
    }), 200
```

---

## 🟡 MEDIUM PRIORITY (dashboard incomplete without these)

### 4. ADD `avgConfidence` to `GET /stats/live` in `routes/stats.py`

Find the `/stats/live` endpoint and add this query:
```python
from sqlalchemy import func

avg_conf = db.session.query(
    func.avg(Prediction.confidence)
).filter(Prediction.timestamp >= today_start).scalar()
```

Then add to the return:
```python
'avgConfidence': round(float(avg_conf or 0) * 100, 1)
```

Full response becomes:
```python
return jsonify({
    'today': {
        'total':       today_total,
        'attacks':     today_attacks,
        'benign':      today_benign,
        'attack_rate': attack_rate_today
    },
    'yesterday': {
        'total':       yesterday_total,
        'attacks':     yesterday_attacks,
        'attack_rate': attack_rate_yesterday
    },
    'open_alerts':    open_alerts,
    'avgConfidence':  round(float(avg_conf or 0) * 100, 1)   # ← add this
}), 200
```

---

### 5. SAVE `filename` when batch is uploaded in `routes/predict.py`

In `predict_batch_endpoint()` find this line:
```python
batch_id = str(uuid.uuid4())
```

Add below it:
```python
filename = file.filename   # save original filename
```

Then in `get_batches()` — currently filename is not stored in DB.
Two options:

**Option A (easy — no DB change):** Store filename in the first prediction row's unused field.
Not recommended.

**Option B (clean — add column to Prediction model):**
Add to `database.py` Prediction class:
```python
batch_filename = db.Column(db.String(255), nullable=True)
```

Then in batch endpoint set it:
```python
pred = Prediction(
    ...
    batch_id       = batch_id,
    batch_filename = filename    # ← add this
)
```

Then in `get_batches()` return it:
```python
'filename': row.batch_filename or 'upload.csv'
```

⚠️ If you add a column — drop and recreate DB then run `python seed.py` again.

---

## 🟢 LOW PRIORITY (nice to have)

### 6. ADD `trainedDate` to `/model/info` in `routes/model_info.py`

Quick fix — hardcode it from metadata file date:
```python
import os
model_path = '../../ml_corr_drop/xgboost/model.pkl'
trained_date = '2026-03-01'   # hardcode or use os.path.getmtime(model_path)
```

Add to response:
```python
'trainedDate': trained_date
```

---

## Summary

| # | Priority | File | What to do |
|---|----------|------|-----------|
| 1 | 🔴 HIGH | `routes/settings.py` | CREATE — 3 endpoints |
| 2 | 🔴 HIGH | `routes/stats.py` | ADD `/distribution` endpoint |
| 3 | 🔴 HIGH | `routes/predict.py` | ADD `/analyze/status` + `/analyze/results` |
| 4 | 🟡 MEDIUM | `routes/stats.py` | ADD `avgConfidence` to `/stats/live` |
| 5 | 🟡 MEDIUM | `routes/predict.py` + `models/database.py` | SAVE filename in batch upload |
| 6 | 🟢 LOW | `routes/model_info.py` | ADD `trainedDate` to `/model/info` |
| — | — | `app.py` | REGISTER `settings_bp` (needed for #1) |

**Total: 6 tasks across 5 files.**
