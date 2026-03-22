# IDS Platform — API Documentation
> For the Angular Frontend Team

**Base URL:** `http://localhost:5000`

All endpoints except `/api/auth/login` require:
```
Authorization: Bearer <token>
Content-Type: application/json
```

---

## Quick Reference

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | /api/auth/login | ❌ | - | Login → get JWT token |
| POST | /api/auth/register | ✅ | Admin | Create new user |
| GET | /api/auth/me | ✅ | Any | Current user info |
| POST | /api/predict | ✅ | Any | Single flow prediction |
| POST | /api/predict/batch | ✅ | Any | Upload CSV → batch predict |
| GET | /api/predictions | ✅ | Any | Paginated prediction history |
| GET | /api/alerts | ✅ | Any | Get alerts with filters |
| PUT | /api/alerts/:id | ✅ | Any | Mark alert reviewed/resolved |
| GET | /api/alerts/summary | ✅ | Any | Alert counts for dashboard cards |
| GET | /api/stats/live | ✅ | Any | Today's counters vs yesterday |
| GET | /api/stats/hourly | ✅ | Any | Last 24h hourly data for chart |
| GET | /api/model/info | ✅ | Any | Active model metrics + features |
| PUT | /api/model/switch | ✅ | Admin | Switch between XGBoost and CNN |
| GET | /api/model/list | ✅ | Any | List available models |
| GET | /api/export/report | ✅ | Any | Download CSV or PDF report |

---

## 1. Authentication

### POST /api/auth/login
**Used for:** Login page

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
- Save the token — send it in every request header
- Token expires after 8 hours → redirect to login
- Roles: `admin` (full access) | `analyst` (view only, cannot switch models)

---

### POST /api/auth/register
**Used for:** Admin panel — create new users

**Request:**
```json
{
  "username": "zied",
  "password": "password123",
  "role": "analyst"
}
```

**Response 201:**
```json
{
  "message": "User created successfully",
  "user": { "id": 3, "username": "zied", "role": "analyst", "last_login": null }
}
```

---

### GET /api/auth/me
**Used for:** Show logged in user info in the top bar

**Response 200:**
```json
{
  "username": "admin",
  "role": "admin"
}
```

---

## 2. Predictions

### POST /api/predict
**Used for:** Simulator / real-time single flow prediction

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

**Field meanings:**
- `prediction` → `"Benign"` (green) or `"Attack"` (red)
- `confidence_pct` → 0 to 100 — how sure the model is
- `needs_review` → `true` if confidence < 70% — show yellow badge
- `src_ip` / `dst_ip` → optional, just for display in the table

---

### POST /api/predict/batch
**Used for:** Upload & Analyze page — user uploads a CSV file

**Request:** `multipart/form-data`
```
file: network_capture.csv   ← must contain the 34 feature columns
```

**Response 200:**
```json
{
  "batch_id": "550e8400-e29b-41d4-a716-446655440000",
  "total": 500,
  "attacks": 84,
  "benign": 416,
  "needs_review": 3
}
```

**Important:** Save the `batch_id` — use it to download the report for this specific upload.

---

### GET /api/predictions
**Used for:** Live Monitor table — shows all predictions paginated

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
      "timestamp": "2026-03-22T15:10:46",
      "src_ip": "192.168.1.1",
      "dst_ip": "10.0.0.43",
      "src_port": null,
      "dst_port": 443,
      "protocol": 6,
      "prediction": "Benign",
      "confidence": 97.84,
      "model_used": "xgboost",
      "needs_review": false
    }
  ]
}
```

**Tip:** Poll this every 3 seconds for live monitor effect.

---

## 3. Alerts

### GET /api/alerts
**Used for:** Alerts page — show all attack alerts

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
  "total": 6,
  "page": 1,
  "pages": 1,
  "summary": {
    "open": 6,
    "high_severity": 6,
    "resolved_today": 0
  },
  "alerts": [
    {
      "id": 1,
      "timestamp": "2026-03-22T15:05:28",
      "src_ip": "192.168.1.6",
      "dst_ip": "10.0.0.4",
      "confidence": 99.98,
      "severity": "High",
      "status": "open",
      "prediction_id": 1
    }
  ]
}
```

**Severity logic:**
- `High` → confidence ≥ 90% → red badge
- `Medium` → confidence ≥ 75% → orange badge
- `Low` → confidence < 75% → yellow badge

---

### PUT /api/alerts/:id
**Used for:** "Mark Reviewed" and "Resolve" buttons in alerts table

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
    "severity": "High",
    "confidence": 99.98
  }
}
```

---

### GET /api/alerts/summary
**Used for:** Dashboard header cards (open alerts count)

**Response 200:**
```json
{
  "total_open": 6,
  "high": 6,
  "medium": 0,
  "low": 0,
  "resolved_today": 0
}
```

---

## 4. Statistics

### GET /api/stats/live
**Used for:** Dashboard summary cards — total flows, attack rate, etc.

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
  "open_alerts": 6
}
```

**Tip:** Poll every 5 seconds to keep cards live.

---

### GET /api/stats/hourly
**Used for:** Line chart — attacks vs benign over last 24 hours

**Response 200:**
```json
[
  {
    "hour": "2026-03-22 14:00:00",
    "total": 88,
    "attacks": 13,
    "benign": 75
  },
  {
    "hour": "2026-03-22 15:00:00",
    "total": 14,
    "attacks": 6,
    "benign": 8
  }
]
```

**Notes:**
- Returns only hours that have data
- Use for Chart.js line chart with two datasets: attacks (red) and benign (green)

---

## 5. Model Info

### GET /api/model/info
**Used for:** Model Info page — show active model metrics

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
**Used for:** Admin panel — switch between XGBoost and CNN. **Admin only.**

**Request:**
```json
{ "model": "cnn" }
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

**Response 403:**
```json
{ "error": "Admin access required" }
```

---

### GET /api/model/list
**Used for:** Model switcher dropdown

**Response 200:**
```json
{
  "active": "xgboost",
  "available": ["xgboost", "cnn"]
}
```

---

## 6. Export

### GET /api/export/report
**Used for:** Download Report button in Upload & Analyze page

**Query params:**
| Param | Values | Description |
|-------|--------|-------------|
| format | csv (default), pdf | Output format |
| batch_id | UUID from batch upload | Export only that upload's data |
| from | 2026-01-01 | Start date filter |
| to | 2026-12-31 | End date filter |

**Examples:**
```
GET /api/export/report                                          → all data as CSV
GET /api/export/report?format=pdf                              → all data as PDF
GET /api/export/report?batch_id=550e8400-...&format=csv        → specific upload CSV
GET /api/export/report?batch_id=550e8400-...&format=pdf        → specific upload PDF
GET /api/export/report?from=2026-03-01&format=csv              → filtered by date
```

**Response:** File download

**CSV columns:**
```
ID | Timestamp | Src IP | Dst IP | Src Port | Dst Port | Protocol |
Prediction | Confidence (%) | Model Used | Needs Review
```

**Angular download button:**
```typescript
downloadReport(format: string, batchId: string) {
  const url = `http://localhost:5000/api/export/report?batch_id=${batchId}&format=${format}`;
  window.open(url, '_blank');
}
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — invalid or expired token |
| 403 | Forbidden — wrong role (admin required) |
| 404 | Not found |
| 422 | Validation error — missing features |
| 500 | Server error |
| 503 | Model not loaded |

**Error format:**
```json
{ "error": "description of the problem" }
```

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| analyst | analyst123 | analyst |

> ⚠️ Change these before deploying to production!

---

## Available Models

| Model | Type | Bal. Accuracy | Attack Recall |
|-------|------|--------------|---------------|
| xgboost | sklearn | 97.15% | 94.34% |
| cnn | keras (1D-CNN) | 97.03% | - |

> Admin can switch models live via `PUT /api/model/switch` — no restart needed.
