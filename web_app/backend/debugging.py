import warnings
warnings.filterwarnings('ignore')
import sys
import os

# ── Step 1: Check paths exist ─────────────────────────────────────────────────
print("=" * 50)
print("STEP 1 — Checking file paths")
print("=" * 50)

paths = {
    'model.pkl'   : '../../ml_corr_drop/xgboost/model.pkl',
    'scalers.pkl' : '../../ml_corr_drop/xgboost/scalers.pkl',
    'metadata.pkl': '../../ml_corr_drop/xgboost/metadata.pkl',
}

all_ok = True
for name, path in paths.items():
    exists = os.path.exists(path)
    status = "✅ FOUND" if exists else "❌ NOT FOUND"
    print(f"  {status} — {path}")
    if not exists:
        all_ok = False

if not all_ok:
    print("\n❌ Fix the missing paths above before continuing.")
    sys.exit(1)

# ── Step 2: Load model ────────────────────────────────────────────────────────
print("\n" + "=" * 50)
print("STEP 2 — Loading model")
print("=" * 50)

sys.path.insert(0, '.')
from utils.ml_loader import load_model, predict_single, FEATURE_COLUMNS

load_model()

# ── Step 3: Check scalers structure ──────────────────────────────────────────
print("\n" + "=" * 50)
print("STEP 3 — Checking scalers")
print("=" * 50)

from utils.ml_loader import get_scalers, get_metadata
scalers = get_scalers()
print(f"  Scaler keys : {list(scalers.keys())}")
for k, v in scalers.items():
    print(f"  '{k}' type  : {type(v)}")

# ── Step 4: Dummy prediction ──────────────────────────────────────────────────
print("\n" + "=" * 50)
print("STEP 4 — Dummy prediction")
print("=" * 50)

dummy = {col: 0.0 for col in FEATURE_COLUMNS}
dummy.update({
    'Dst Port'         : 443,
    'Protocol'         : 6,
    'Flow Duration'    : 1500000,
    'Flow Byts/s'      : 1200.5,
    'Flow Pkts/s'      : 10.0,
    'Init Fwd Win Byts': 65535,
    'Init Bwd Win Byts': 65535,
})

result = predict_single(dummy)
print(f"  Prediction  : {result['prediction']}")
print(f"  Confidence  : {result['confidence_pct']}%")
print(f"  Needs Review: {result['needs_review']}")

# ── Step 5: Metadata ──────────────────────────────────────────────────────────
print("\n" + "=" * 50)
print("STEP 5 — Model metadata")
print("=" * 50)
meta = get_metadata()
print(f"  Model name  : {meta['model_name']}")
print(f"  N features  : {meta['n_features']}")
print(f"  Bal. Acc    : {meta['metrics']['balanced_accuracy']:.4f}")
print(f"  Attack Rec  : {meta['metrics']['attack_recall']:.4f}")
print(f"  Benign Rec  : {meta['metrics']['benign_recall']:.4f}")

print("\n" + "=" * 50)
print("✅ ALL STEPS PASSED — model is ready for Flask!")
print("=" * 50)
