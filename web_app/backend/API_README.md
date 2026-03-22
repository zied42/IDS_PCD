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
| POST | /api/auth/login | ❌ | — | Login → JWT token |
| POST | /api/auth/register | ✅ | Admin | Create new user |
| GET | /api/auth/me | ✅ | Any | Current user info |
| POST | /api/auth/change-password | ✅ | Any | Change password |
| POST | /api/predict | ✅ | Any | Single flow prediction |
| POST | /api/predict/batch | ✅ | Any | Upload CSV → batch predict |
| GET | /api/predictions | ✅ | Any | Paginated prediction history |
| GET | /api/batches | ✅ | Any | List all batch uploads |
| DELETE | /api/batches/:batch_id | ✅ | Any | Delete a batch upload |
| GET | /api/analyze/status/:jobId | ✅ | Any | Poll upload job status |
| GET | /api/analyze/results/:jobId | ✅ | Any | Get batch upload results |
| GET | /api/alerts | ✅ | Any | Get alerts with filters |
| PUT | /api/alerts/:id | ✅ | Any | Mark alert reviewed/resolved |
| GET | /api/alerts/summary | ✅ | Any | Alert counts for dashboard |
| GET | /api/stats/live | ✅ | Any | Today's counters vs yesterday |
| GET | /api/stats/hourly | ✅ | Any | Last 24h hourly chart data |
| GET | /api/stats/distribution | ✅ | Any | Benign vs attack pie chart |
| GET | /api/model/info | ✅ | Any | Active model metrics + features |
| PUT | /api/model/switch | ✅ | Admin | Switch XGBoost or CNN |
| GET | /api/model/list | ✅ | Any | Available models |
| GET | /api/export/report | ✅ | Any | Download CSV or PDF report |
| GET | /api/settings | ✅ | Any | Get user settings |
| PUT | /api/settings | ✅ | Any | Update user settings |

---

## 1. Authentication

### POST /api/auth/login
**Used for:** Login page

**Request:**
```json
{ "username": "admin", "password": "admin123" }
```

**Response 200:**
```json
{
  "token": "eyJhbGci...",
  "username": "admin",
  "role": "admin"
}
```

**Angular service fix:**
```typescript
login(credentials).subscribe(res => {
  localStorage.setItem('token', res.token);
  localStorage.setItem('username', res.username);  // NOT res.user.username
  localStorage.setItem('role', res.role);           // NOT res.user.role
});
```

**Notes:**
- Token expires after 8 hours → redirect to login on 401
- Roles: `admin` (full access) | `analyst` (cannot switch models or manage users)

---

### POST /api/auth/register
**Used for:** Admin panel — create new users. Admin only.

**Request:**
```json
{ "username": "zied", "password": "pass123", "role": "analyst" }
```

**Response 201:**
```json
{
  "message": "User created successfully",
  "user": { "id": 3, "username": "zied", "role": "analyst" }
}
```

---

### GET /api/auth/me
**Used for:** Show logged in user in top bar

**Response 200:**
```json
{ "username": "admin", "role": "admin" }
```

---

### POST /api/auth/change-password
**Used for:** Settings page — change password

**Request:**
```json
{
  "currentPassword": "admin123",
  "newPassword": "newpassword456"
}
```

**Response 200:**
```json
{ "message": "Password changed successfully" }
```

**Response 401:**
```json
{ "error": "Current password is incorrect" }
```

---

## 2. Predictions

### POST /api/predict
**Used for:** Simulator / real-time single flow

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
- `prediction` → `"Benign"` = green badge | `"Attack"` = red badge
- `confidence_pct` → 0–100%
- `needs_review` → true if confidence < 70% → yellow badge
- ⚠️ `Dst Port` is both display and a model feature — never remove it from the body

---

### POST /api/predict/batch
**Used for:** Upload & Analyze page
**Angular service:** was `POST /api/analyze/upload` → change to `POST /api/predict/batch`

**Request:** `multipart/form-data`
```
field name: file
file type:  .csv (must contain the 34 feature columns)
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

**Important:** Save `batch_id` — use it to poll status, get results, and download report.

---

### GET /api/analyze/status/:jobId
**Used for:** Frontend polls after upload to check progress

**Response 200:**
```json
{
  "jobId": "550e8400-...",
  "status": "completed",
  "progress": 100,
  "total": 500
}
```

**Note:** Our batch processing is synchronous — it always returns `completed` immediately.
No need to poll, but the endpoint exists for compatibility with the Angular code.

---

### GET /api/analyze/results/:jobId
**Used for:** Get full results after upload completes

**Response 200:**
```json
{
  "jobId": "550e8400-...",
  "status": "completed",
  "total": 500,
  "attacks": 84,
  "benign": 416,
  "needs_review": 3,
  "results": [
    {
      "id": 1,
      "timestamp": "2026-03-22T15:05:28",
      "src_ip": "192.168.1.6",
      "dst_ip": "10.0.0.4",
      "prediction": "Attack",
      "confidence": 99.98,
      "model_used": "xgboost",
      "needs_review": false
    }
  ]
}
```

---

### GET /api/predictions
**Used for:** Live Monitor table
**Angular service:** was `GET /api/flows/live` → change to `GET /api/predictions`

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

**Tip:** Poll every 3 seconds for live monitor effect.

---

### GET /api/batches
**Used for:** Upload history table
**Angular service:** was `GET /api/upload/history` → change to `GET /api/batches`

**Response 200:**
```json
[
  {
    "batch_id": "550e8400-...",
    "uploaded_at": "2026-03-22T15:05:00",
    "total": 500,
    "attacks": 84,
    "benign": 416,
    "model_used": "xgboost"
  }
]
```

---

### DELETE /api/batches/:batch_id
**Used for:** Delete button in upload history
**Angular service:** was `DELETE /api/upload/{id}` → change to `DELETE /api/batches/:batch_id`

**Response 200:**
```json
{ "message": "Batch 550e8400-... deleted", "deleted": 500 }
```

---

## 3. Alerts

### GET /api/alerts
**Used for:** Alerts page

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

**Severity:** High ≥ 90% | Medium ≥ 75% | Low < 75%

---

### PUT /api/alerts/:id
**Used for:** Mark Reviewed / Resolve buttons
**Angular service:** was `PATCH /api/alerts/{id}/status` → change to `PUT /api/alerts/:id`

**Request:**
```json
{ "status": "reviewed" }
```

**Response 200:**
```json
{ "message": "Alert 1 marked as reviewed", "alert": { "id": 1, "status": "reviewed" } }
```

---

### GET /api/alerts/summary
**Used for:** Dashboard header cards

**Response 200:**
```json
{
  "total_open": 13,
  "high": 13,
  "medium": 0,
  "low": 0,
  "resolved_today": 0
}
```

---

## 4. Statistics

### GET /api/stats/live
**Used for:** Dashboard summary cards. Poll every 5 seconds.
**Angular service:** was `GET /api/stats/summary` → change to `GET /api/stats/live`

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

---

### GET /api/stats/hourly
**Used for:** Line chart — last 24h traffic

**Response 200:**
```json
[
  { "hour": "2026-03-22 14:00:00", "total": 88, "attacks": 13, "benign": 75 },
  { "hour": "2026-03-22 15:00:00", "total": 14, "attacks": 6,  "benign": 8  }
]
```

---

### GET /api/stats/distribution
**Used for:** Pie chart — benign vs attack split

**Response 200:**
```json
{
  "total": 93,
  "attacks": 13,
  "benign": 80,
  "attack_pct": 14.0,
  "benign_pct": 86.0,
  "distribution": [
    { "label": "Benign", "value": 80, "color": "#22c55e" },
    { "label": "Attack", "value": 13, "color": "#ef4444" }
  ]
}
```

**Tip:** Colors are already included — use them directly in Chart.js.

---

## 5. Model Info

### GET /api/model/info
**Used for:** Model Info page

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
**Used for:** Model switcher — Admin only
**Angular service:** was `POST /api/model/switch` → change to `PUT /api/model/switch`

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
**Response 200:**
```json
{ "active": "xgboost", "available": ["xgboost", "cnn"] }
```

---

## 6. Export

### GET /api/export/report
**Used for:** Download report button
**Angular service:** was `GET /api/analyze/export/{jobId}` → change to `GET /api/export/report?batch_id={jobId}`

**Query params:**
| Param | Values | Description |
|-------|--------|-------------|
| format | csv (default), pdf | Output format |
| batch_id | UUID | Export only that upload |
| from | 2026-01-01 | Start date filter |
| to | 2026-12-31 | End date filter |

**Angular download button:**
```typescript
downloadReport(format: string, batchId: string) {
  const token = localStorage.getItem('token');
  const url = `http://localhost:5000/api/export/report?batch_id=${batchId}&format=${format}`;
  window.open(url + `&token=${token}`, '_blank');
  // OR use HttpClient with responseType: 'blob'
}
```

---

## 7. Settings

### GET /api/settings
**Used for:** Settings page — load user preferences

**Response 200:**
```json
{
  "username": "admin",
  "role": "admin",
  "theme": "dark",
  "language": "en",
  "notifications": true
}
```

---

### PUT /api/settings
**Used for:** Settings page — save preferences

**Request:**
```json
{
  "theme": "dark",
  "language": "en",
  "notifications": true
}
```

**Response 200:**
```json
{ "message": "Settings updated", "settings": { ... } }
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request — missing or invalid fields |
| 401 | Unauthorized — wrong password or expired token |
| 403 | Forbidden — wrong role |
| 404 | Not found |
| 422 | Validation error — missing features |
| 500 | Server error |
| 503 | Model not loaded |

**Error format:**
```json
{ "error": "description of what went wrong" }
```

---

## Default Credentials

| Username | Password | Role |
|----------|----------|------|
| admin | admin123 | admin |
| analyst | analyst123 | analyst |

---

## Available Models

| Model | Type | Bal. Accuracy | Default |
|-------|------|--------------|---------|
| xgboost | sklearn | 97.15% | Yes |
| cnn | keras 1D-CNN | 97.03% | No |

Admin switches via `PUT /api/model/switch` — no restart needed.
