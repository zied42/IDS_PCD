# ============================================================
# config.py — Central configuration (IEEE reproducibility)
# All notebooks import this file to ensure consistency
# ============================================================

import os

# ── Paths ────────────────────────────────────────────────────
DATA_PATH      = "archive/full_df_binary_labels.csv"
MODEL_DIR      = "models/"
OUTPUT_DIR     = "outputs/"
GRAPH_DIR      = "outputs/graphs/"
LOG_DIR        = "outputs/logs/"

for d in [MODEL_DIR, OUTPUT_DIR, GRAPH_DIR, LOG_DIR,
          "models/ml", "models/dl", "models/hybrid"]:
    os.makedirs(d, exist_ok=True)

# ── Reproducibility (IEEE requirement) ───────────────────────
RANDOM_STATE   = 42
TARGET_RECALL  = 0.95      # IDS threshold policy

# ── Split ratios ─────────────────────────────────────────────
TRAIN_RATIO    = 0.70
VAL_RATIO      = 0.15
TEST_RATIO     = 0.15

# ── Chunk size for data loading ──────────────────────────────
CHUNK_SIZE     = 100_000

# ── Subsample sizes for heavy models ─────────────────────────
SAMPLE_KNN     = 80_000
SAMPLE_SVM     = 100_000
SAMPLE_NB      = 80_000
SAMPLE_PSO     = 50_000
SAMPLE_SMOTE   = 150_000

# ── Optuna ───────────────────────────────────────────────────
N_TRIALS       = 30

# ── MLP ──────────────────────────────────────────────────────
MLP_EPOCHS     = 30
MLP_BATCH      = 2048
MLP_LR         = 1e-3

# ── PSO ──────────────────────────────────────────────────────
PSO_PARTICLES  = 10
PSO_ITERS      = 20
PSO_TOP_N      = 30        # feature importance top-N

# ── Ensemble weights ─────────────────────────────────────────
ENSEMBLE_WEIGHTS = {
    "xgb" : 0.40,
    "rf"  : 0.20,
    "lgbm": 0.20,
    "mlp" : 0.20
}

print("Config loaded successfully")