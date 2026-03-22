import pickle
import numpy as np
import pandas as pd

# ── Exact 34 features from metadata.pkl ──────────────────────────────────────
FEATURE_COLUMNS = [
    'Dst Port', 'Protocol', 'Flow Duration', 'Tot Bwd Pkts',
    'TotLen Fwd Pkts', 'Fwd Pkt Len Max', 'Fwd Pkt Len Mean',
    'Bwd Pkt Len Mean', 'Flow Byts/s', 'Flow Pkts/s',
    'Flow IAT Std', 'Flow IAT Max', 'Fwd IAT Mean', 'Fwd IAT Std',
    'Bwd IAT Tot', 'Bwd IAT Mean', 'Bwd IAT Std', 'Bwd IAT Max',
    'Bwd IAT Min', 'Fwd Pkts/s', 'Bwd Pkts/s', 'Pkt Len Max',
    'Pkt Len Var', 'RST Flag Cnt', 'PSH Flag Cnt', 'ACK Flag Cnt',
    'URG Flag Cnt', 'Down/Up Ratio', 'Pkt Size Avg', 'Init Fwd Win Byts',
    'Init Bwd Win Byts', 'Fwd Act Data Pkts', 'Fwd Seg Size Min', 'Idle Max'
]
POWER_COLS = [
    'Dst Port', 'Flow Duration', 'TotLen Fwd Pkts', 'Fwd Pkt Len Max',
    'Fwd Pkt Len Mean', 'Bwd Pkt Len Mean', 'Flow Byts/s', 'Flow Pkts/s',
    'Flow IAT Std', 'Flow IAT Max', 'Fwd IAT Mean', 'Fwd IAT Std',
    'Bwd IAT Tot', 'Bwd IAT Mean', 'Bwd IAT Std', 'Bwd IAT Max', 'Bwd IAT Min',
    'Fwd Pkts/s', 'Bwd Pkts/s', 'Pkt Len Max', 'Pkt Len Var', 'Down/Up Ratio',
    'Pkt Size Avg', 'Init Fwd Win Byts', 'Init Bwd Win Byts',
    'Fwd Act Data Pkts', 'Idle Max', 'Tot Bwd Pkts'
]
STANDARD_COLS = ['Fwd Seg Size Min']
"""

hena il path li model il 3andou 34  feature hubrid  lezmik tranih bech te5ou paramtre metadate w scaler w tnajem testi endpoint  bih 

"""
MODEL_PATH   = '../../ml_corr_drop/xgboost/model.pkl'
SCALERS_PATH = '../../ml_corr_drop/xgboost/scalers.pkl'
META_PATH    = '../../ml_corr_drop/xgboost/metadata.pkl'

# Singleton cache
_model    = None
_scalers  = None
_metadata = None


def load_model():
    """Load model, scalers and metadata from disk. Call once at startup."""
    global _model, _scalers, _metadata

    with open(MODEL_PATH, 'rb') as f:
        _model = pickle.load(f)

    with open(SCALERS_PATH, 'rb') as f:
        _scalers = pickle.load(f)   # {'power': ..., 'standard': ...}

    with open(META_PATH, 'rb') as f:
        _metadata = pickle.load(f)

    print(f"✅ Model loaded: {_metadata['model_name']}")
    print(f"   Features : {_metadata['n_features']}")
    print(f"   Bal. Acc : {_metadata['metrics']['balanced_accuracy']:.4f}")
    print(f"   F1 Macro : {_metadata['metrics']['f1_macro']:.4f}")
    return _model


def get_model():    return _model
def get_scalers():  return _scalers
def get_metadata(): return _metadata


def _apply_scalers(df: pd.DataFrame) -> pd.DataFrame:
    if _scalers is None:
        return df

    df = df.copy()

    if 'power' in _scalers:
        cols = [c for c in POWER_COLS if c in df.columns]
        if cols:
            df[cols] = _scalers['power'].transform(df[cols].values)  # ← .values here

    if 'standard' in _scalers:
        cols = [c for c in STANDARD_COLS if c in df.columns]
        if cols:
            df[cols] = _scalers['standard'].transform(df[cols].values)  # ← .values here

    return df

def preprocess(features: dict) -> np.ndarray:
    """
    Validate, order and scale a single feature dict.
    Returns 2D numpy array ready for model.predict_proba().
    """
    missing = [c for c in FEATURE_COLUMNS if c not in features]
    if missing:
        raise ValueError(f"Missing features: {missing}")

    df = pd.DataFrame([features])[FEATURE_COLUMNS].astype(float)
    df = _apply_scalers(df)
    return df.values


def predict_single(features: dict) -> dict:
    """
    Predict one network flow.
    Returns: { prediction, confidence, needs_review, label }
    """
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")

    X = preprocess(features)

    proba      = _model.predict_proba(X)[0]   # [p_benign, p_attack]
    label      = int(np.argmax(proba))
    confidence = float(proba[label])

    return {
        'label':          label,
        'prediction':     'Attack' if label == 1 else 'Benign',
        'confidence':     confidence,
        'confidence_pct': round(confidence * 100, 2),
        'needs_review':   confidence < 0.70
    }


def predict_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Predict a whole CSV DataFrame.
    Adds columns: prediction, confidence, needs_review.
    """
    if _model is None:
        raise RuntimeError("Model not loaded.")

    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")

    X = df[FEATURE_COLUMNS].astype(float).copy()
    X = _apply_scalers(X)

    proba      = _model.predict_proba(X.values)
    labels     = np.argmax(proba, axis=1)
    confidence = proba[np.arange(len(labels)), labels]

    result = df.copy()
    result['prediction']   = ['Attack' if l == 1 else 'Benign' for l in labels]
    result['confidence']   = (confidence * 100).round(2)
    result['needs_review'] = confidence < 0.70

    return result