# IDS Platform — Flask Backend

> Intrusion Detection System | XGBoost | Flask REST API | MySQL | CIC-IDS-2018

---

## What This Is

A Flask REST API backend for a real-time network intrusion detection platform.
It loads a trained XGBoost model (97.15% balanced accuracy) and exposes endpoints
for prediction, alerting, statistics, and reporting.

---

## Project Structure

```
web_app/backend/
│
├── app.py                        # Flask entry point — run this
├── seed.py                       # Creates default users in MySQL (run once)
├── simulator.py                  # Feeds test CSV row by row to simulate real-time traffic
├── requirements.txt              # All pip dependencies
│
├── config/
│   └── settings.py               # DB URL, JWT secret, confidence thresholds
│
├── models/
│   └── database.py               # SQLAlchemy ORM — 5 MySQL tables
│
├── routes/
│   ├── auth.py                   # Login + JWT token
│   ├── predict.py                # Single + batch prediction
│   ├── alerts.py                 # Get + update attack alerts
│   ├── stats.py                  # Live dashboard counters + hourly chart
│   ├── model_info.py             # Active model info + features
│   └── export.py                 # Download CSV / PDF report
│
├── utils/
│   ├── ml_loader.py              # Loads XGBoost model + scalers, runs predictions
│   └── alert_helper.py           # Creates alert from a prediction if it's an attack
│
└── logs/
    └── predictions.csv           # Full prediction history (never deleted)
```

---

## How It Works

```
Test CSV / Live Traffic
        ↓
simulator.py  (row by row)
        ↓
POST /api/predict
        ↓
ml_loader.py  →  XGBoost model  →  Benign / Attack + confidence
        ↓
Save to MySQL (last 7 days) + CSV log (forever)
        ↓
If Attack → create Alert (High / Medium / Low severity)
        ↓
Angular Dashboard fetches predictions + alerts
```

---

## MySQL Tables

| Table | What it stores |
|-------|---------------|
| `predictions` | Every flow analysed (src_ip, dst_ip, prediction, confidence) |
| `alerts` | Attack-only rows with severity + status (open/reviewed/resolved) |
| `traffic_stats` | Hourly aggregates for the line chart |
| `users` | Admin + Analyst users with hashed passwords |
| `models` | Registered ML models (name, version, metrics, active flag) |

> **Storage strategy:** MySQL keeps only the last 7 days (auto-cleaned).
> The `logs/predictions.csv` file keeps the full history forever.
> `features_json` (34 raw features) is saved only for Attack predictions — saves ~83% space.

---

## ML Model

- **Model:** XGBoost (trained on CIC-IDS-2018, 16M rows)
- **Features:** 34 (after correlation drop — 57 → 34, 23 redundant removed)
- **Balanced Accuracy:** 97.15%
- **Attack Recall:** 94.34%
- **Benign Recall:** 99.96%
- **Files:** `model.pkl`, `scalers.pkl`, `metadata.pkl`
- **Location:** `../../ml_corr_drop/xgboost/`

### The 34 Features

```
Dst Port, Protocol, Flow Duration, Tot Bwd Pkts, TotLen Fwd Pkts,
Fwd Pkt Len Max, Fwd Pkt Len Mean, Bwd Pkt Len Mean, Flow Byts/s,
Flow Pkts/s, Flow IAT Std, Flow IAT Max, Fwd IAT Mean, Fwd IAT Std,
Bwd IAT Tot, Bwd IAT Mean, Bwd IAT Std, Bwd IAT Max, Bwd IAT Min,
Fwd Pkts/s, Bwd Pkts/s, Pkt Len Max, Pkt Len Var, RST Flag Cnt,
PSH Flag Cnt, ACK Flag Cnt, URG Flag Cnt, Down/Up Ratio, Pkt Size Avg,
Init Fwd Win Byts, Init Bwd Win Byts, Fwd Act Data Pkts,
Fwd Seg Size Min, Idle Max
```

### Scaling Groups

| Scaler | Applied to |
|--------|-----------|
| PowerTransformer (Yeo-Johnson) | 28 features (flow stats, byte rates, IAT values) |
| StandardScaler | `Fwd Seg Size Min` only |
| No scaling | `Protocol`, `RST/PSH/ACK/URG Flag Cnt` (binary flags) |

---

## API Endpoints

All endpoints except login require `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login → returns JWT token |
| POST | `/api/auth/register` | Create user (admin or analyst only) |
| GET | `/api/auth/me` | Get current user info from token |

**Login example:**
```json
POST /api/auth/login
{ "username": "admin", "password": "admin123" }

Response:
{ "token": "eyJ...", "username": "admin", "role": "admin" }
```

### Predictions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/predict` | Single flow prediction |
| POST | `/api/predict/batch` | Upload CSV → batch prediction |
| GET | `/api/predictions` | Paginated prediction history |

**Single predict example:**
```json
POST /api/predict
{
  "src_ip": "192.168.1.1",
  "dst_ip": "10.0.0.5",
  "Dst Port": 443,
  "Protocol": 6,
  "Flow Duration": 1500000,
  ... (34 features total)
}

Response:
{
  "prediction_id": 42,
  "prediction": "Benign",
  "confidence_pct": 99.69,
  "needs_review": false
}
```

**Batch predict:** Send multipart/form-data with a `file` field containing a CSV.
The CSV must include the 34 feature columns + optionally `Src IP`, `Dst IP`, `Src Port`, `Dst Port`.

**Get predictions (paginated):**
```
GET /api/predictions?page=1&per_page=50
```

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Get alerts (filter by status/severity/date) |
| PUT | `/api/alerts/<id>` | Mark alert as reviewed or resolved |

**Severity levels:**
- `High` → confidence ≥ 90%
- `Medium` → confidence ≥ 75%
- `Low` → confidence < 75%

**Filter example:**
```
GET /api/alerts?status=open&severity=High&from=2026-01-01&to=2026-12-31
```

**Update alert:**
```json
PUT /api/alerts/5
{ "status": "resolved" }
```

### Statistics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stats/live` | Today's counters vs yesterday |
| GET | `/api/stats/hourly` | Last 24h hourly data for line chart |

**Live stats response:**
```json
{
  "today": { "total": 1500, "attacks": 120, "benign": 1380, "attack_rate": 8.0 },
  "yesterday": { "total": 1200, "attacks": 90, "attack_rate": 7.5 },
  "open_alerts": 15
}
```

### Model Info

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/model/info` | Active model name, metrics, features |

### Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/report?format=csv` | Download predictions as CSV |
| GET | `/api/export/report?format=pdf` | Download predictions as PDF |

---

## Setup & Installation

### 1. Create virtual environment
```powershell
cd web_app/backend
python -m venv venv
venv\Scripts\activate
```

### 2. Install dependencies
```powershell
pip install -r requirements.txt
```

### 3. Create MySQL database
```sql
CREATE DATABASE ids_platform;
```

### 4. Configure database connection
Edit `config/settings.py`:
```python
SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/ids_platform'
```

### 5. Seed the database (run once)
```powershell
python seed.py
```

### 6. Start the server
```powershell
python app.py
```
Server runs at `http://localhost:5000`

---

## Default Users

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| analyst | analyst123 | analyst |

> **Change these passwords in production!**

---

## Simulating Real-Time Traffic

```powershell
python simulator.py
```

This feeds the test split of the dataset row by row to `/api/predict` with a small delay
between each row — simulates live network traffic on the Angular dashboard.

---

## Confidence & Review System

| Confidence | Result |
|-----------|--------|
| ≥ 90% | High confidence — trusted prediction |
| 70–90% | Normal — prediction is valid |
| < 70% | `needs_review: true` — flagged for analyst review |

---

## File Locations

| File | Path from project root |
|------|----------------------|
| XGBoost model | `ml_corr_drop/xgboost/model.pkl` |
| Scalers | `ml_corr_drop/xgboost/scalers.pkl` |
| Metadata | `ml_corr_drop/xgboost/metadata.pkl` |
| Prediction log | `web_app/backend/logs/predictions.csv` |
| Flask backend | `web_app/backend/` |

---

## Dependencies

```
flask, flask-cors, flask-jwt-extended, flask-sqlalchemy
pymysql, werkzeug
pandas, numpy, scikit-learn, xgboost
shap, reportlab, gunicorn
```

---

