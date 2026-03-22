# IDS Platform — API Documentation
> For the Angular frontend team

Base URL: `http://localhost:5000`  
All endpoints except `/api/auth/login` require a JWT token in the header:
```
Authorization: Bearer <token>
```

---

## Authentication

### POST /api/auth/login
Login and get a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "username": "admin",
  "role": "admin"
}
```

**Notes:**
- Store the token in memory or localStorage
- Token expires after 8 hours
- Roles: `admin` | `analyst`
- Admin can switch models, analyst can only view

---

### POST /api/auth/register
Create a new user. Requires admin token.

**Request:**
```json
{
  "username": "newuser",
  "password": "password123",
  "role": "analyst"
}
```

**Response 201:**
```json
{
  "message": "User created successfully",
  "user": { "id": 3, "username": "newuser", "role": "analyst" }
}
```

---

### GET /api/auth/me
Get current logged in user info from token.

**Response 200:**
```json
{
  "username": "admin",
  "role": "admin"
}
```

---

## Predictions

### POST /api/predict
Send a single network flow for prediction.

**Request body:** 34 features + optional display fields
```json
{
  "src_ip": "192.168.1.1",
  "dst_ip": "10.0.0.5",
  "Dst Port": 443,
  "Protocol": 6,
  "Flow Duration": 1500000,
  "Tot Bwd Pkts": 10,
  "TotLen Fwd Pkts": 5000,
  "Fwd Pkt Len Max": 1500,
  "Fwd Pkt Len Mean": 500,
  "Bwd Pkt Len Mean": 300,
  "Flow Byts/s": 1200.5,
  "Flow Pkts/s": 10.0,
  "Flow IAT Std": 500,
  "Flow IAT Max": 1000,
  "Fwd IAT Mean": 200,
  "Fwd IAT Std": 100,
  "Bwd IAT Tot": 5000,
  "Bwd IAT Mean": 500,
  "Bwd IAT Std": 200,
  "Bwd IAT Max": 1000,
  "Bwd IAT Min": 100,
  "Fwd Pkts/s": 5.0,
  "Bwd Pkts/s": 5.0,
  "Pkt Len Max": 1500,
  "Pkt Len Var": 50000,
  "RST Flag Cnt": 0,
  "PSH Flag Cnt": 1,
  "ACK Flag Cnt": 1,
  "URG Flag Cnt": 0,
  "Down/Up Ratio": 1.0,
  "Pkt Size Avg": 400,
  "Init Fwd Win Byts": 65535,
  "Init Bwd Win Byts": 65535,
  "Fwd Act Data Pkts": 5,
  "Fwd Seg Size Min": 20,
  "Idle Max": 0
}
```

**Response 200:**
```json
{
  "prediction_id": 1,
  "prediction": "Benign",
  "confidence_pct": 99.81,
  "needs_review": false
}
```

**Notes:**
- `prediction` → `"Benign"` or `"Attack"`
- `confidence_pct` → 0 to 100
- `needs_review: true` → confidence < 70%, flag for analyst review
- `src_ip`, `dst_ip` are optional display fields — not used by model

---

### POST /api/predict/batch
Upload a CSV file for batch prediction.

**Request:** `multipart/form-data` with field `file` containing a CSV

**Response 200:**
```json
{
  "total": 500,
  "attacks": 84,
  "benign": 416,
  "needs_review": 3
}
```

---

### GET /api/predictions
Get paginated prediction history for the live monitor table.

**Query params:**
| Param | Default | Description |
|-------|---------|-------------|
| page | 1 | Page number |
| per_page | 50 | Rows per page |

**Response 200:**
```json
{
  "total": 93,
  "page": 1,
  "pages": 2,
  "predictions": [
    {
      "id": 93,
      "timestamp": "2026-03-22T14:26:51",
      "src_ip": "192.168.1.25",
      "dst_ip": "10.0.0.49",
      "src_port": null,
      "dst_port": 443,
      "protocol": 6,
      "prediction": "Attack",
      "confidence": 99.99,
      "model_used": "xgboost",
      "needs_review": false
    }
  ]
}
```

**Notes:**
- Use for the Live Monitor table
- Poll this endpoint every 3 seconds for real-time effect
- `confidence` is already in percentage (0–100)

---

## Alerts

### GET /api/alerts
Get attack alerts with optional filters.

**Query params:**
| Param | Values | Description |
|-------|--------|-------------|
| status | open, reviewed, resolved | Filter by status |
| severity | High, Medium, Low | Filter by severity |
| from | 2026-01-01 | Start date |
| to | 2026-12-31 | End date |
| page | 1 | Page number |
| per_page | 50 | Rows per page |

**Response 200:**
```json
{
  "total": 13,
  "page": 1,
  "pages": 1,
  "summary": {
    "open": 13,
    "high_severity": 13,
    "resolved_today": 0
  },
  "alerts": [
    {
      "id": 1,
      "timestamp": "2026-03-22T14:26:00",
      "src_ip": "192.168.1.6",
      "dst_ip": "10.0.0.13",
      "confidence": 99.98,
      "severity": "High",
      "status": "open",
      "prediction_id": 72
    }
  ]
}
```

**Severity levels:**
- `High` → confidence ≥ 90%
- `Medium` → confidence ≥ 75%
- `Low` → confidence < 75%

---

### PUT /api/alerts/:id
Mark an alert as reviewed or resolved.

**Request:**
```json
{ "status": "reviewed" }
```
or
```json
{ "status": "resolved" }
```

**Response 200:**
```json
{
  "message": "Alert 1 marked as reviewed",
  "alert": {
    "id": 1,
    "status": "reviewed",
    ...
  }
}
```

---

### GET /api/alerts/summary
Get alert counts for dashboard header cards.

**Response 200:**
```json
{
  "total_open": 13,
  "high": 10,
  "medium": 2,
  "low": 1,
  "resolved_today": 0
}
```

---

## Statistics

### GET /api/stats/live
Get today's traffic counters vs yesterday. Use for the dashboard summary cards.

**Response 200:**
```json
{
  "today": {
    "total": 93,
    "attacks": 13,
    "benign": 80,
    "attack_rate": 14.0
  },
  "yesterday": {
    "total": 0,
    "attacks": 0,
    "attack_rate": 0
  },
  "open_alerts": 13
}
```

**Notes:**
- Poll every 5 seconds to keep dashboard live
- `attack_rate` is a percentage

---

### GET /api/stats/hourly
Get last 24h traffic grouped by hour. Use for the line chart.

**Response 200:**
```json
[
  {
    "hour": "2026-03-22 13:00:00",
    "total": 5,
    "attacks": 0,
    "benign": 5
  },
  {
    "hour": "2026-03-22 14:00:00",
    "total": 88,
    "attacks": 13,
    "benign": 75
  }
]
```

**Notes:**
- Returns array of hourly buckets
- Use for Chart.js line chart with two lines: attacks and benign
- Only hours with data are returned (no empty hours)

---

## Model Info

### GET /api/model/info
Get active model information and feature list.

**Response 200:**
```json
{
  "model_name": "xgboost",
  "model_type": "sklearn",
  "version": "1.0",
  "bal_accuracy": 97.15,
  "f1_macro": 98.2,
  "attack_recall": 94.34,
  "benign_recall": 99.96,
  "n_features": 34,
  "features": ["Dst Port", "Protocol", "Flow Duration", "..."],
  "available_models": ["xgboost", "cnn"]
}
```

---

### PUT /api/model/switch
Switch the active model. **Admin only.**

**Request:**
```json
{ "model": "cnn" }
```
or
```json
{ "model": "xgboost" }
```

**Response 200:**
```json
{
  "message": "Switched to cnn",
  "model_name": "cnn",
  "model_type": "keras",
  "bal_accuracy": 97.03
}
```

**Response 403** (if not admin):
```json
{ "error": "Admin access required" }
```

---

### GET /api/model/list
Get all available models.

**Response 200:**
```json
{
  "active": "xgboost",
  "available": ["xgboost", "cnn"]
}
```

---

## Export

### GET /api/export/report
Download predictions as CSV or PDF.

**Query params:**
| Param | Values | Description |
|-------|--------|-------------|
| format | csv (default), pdf | Output format |
| from | 2026-01-01 | Start date filter |
| to | 2026-12-31 | End date filter |

**Examples:**
```
GET /api/export/report                          → CSV, all data
GET /api/export/report?format=pdf              → PDF, all data
GET /api/export/report?format=csv&from=2026-03-01  → CSV from March
```

**Response:** File download (CSV or PDF)

**CSV columns:**
`ID, Timestamp, Src IP, Dst IP, Src Port, Dst Port, Protocol, Prediction, Confidence (%), Model Used, Needs Review`

**Notes:**
- Max 10,000 rows per export
- PDF capped at 500 rows for performance
- Use as the "Download Report" button in the Upload & Analyze page

---

## Error Responses

All endpoints return consistent error format:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (missing/invalid fields) |
| 401 | Invalid credentials |
| 403 | Forbidden (wrong role) |
| 404 | Not found |
| 422 | Unprocessable (validation error) |
| 503 | Model not loaded |

**Error format:**
```json
{ "error": "description of what went wrong" }
```

---

## Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/login | ❌ | Login → get token |
| POST | /api/auth/register | ✅ Admin | Create user |
| GET | /api/auth/me | ✅ | Current user info |
| POST | /api/predict | ✅ | Single prediction |
| POST | /api/predict/batch | ✅ | CSV batch prediction |
| GET | /api/predictions | ✅ | Prediction history |
| GET | /api/alerts | ✅ | Get alerts |
| PUT | /api/alerts/:id | ✅ | Update alert status |
| GET | /api/alerts/summary | ✅ | Alert counts |
| GET | /api/stats/live | ✅ | Today's counters |
| GET | /api/stats/hourly | ✅ | Hourly chart data |
| GET | /api/model/info | ✅ | Active model info |
| PUT | /api/model/switch | ✅ Admin | Switch model |
| GET | /api/model/list | ✅ | Available models |
| GET | /api/export/report | ✅ | Download CSV/PDF |
