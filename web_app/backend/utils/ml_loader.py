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

# ── Scaler column groups (same for both XGBoost and CNN) ─────────────────────
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

# ── Model paths ───────────────────────────────────────────────────────────────
MODELS = {
    'xgboost': {
        'model_path'  : '../../ml_corr_drop/xgboost/model.pkl',
        'scalers_path': '../../ml_corr_drop/xgboost/scalers.pkl',
        'meta_path'   : '../../ml_corr_drop/xgboost/metadata.pkl',
        'type'        : 'sklearn'
    },
    'cnn': {
        'model_path'  : '../../dl_corr_drop/cnn/best_model.keras',
        'scalers_path': '../../dl_corr_drop/cnn/scalers.pkl',
        'meta_path'   : '../../dl_corr_drop/cnn/metadata.pkl',
        'type'        : 'keras'
    }
}

# ── Singleton cache ───────────────────────────────────────────────────────────
_model       = None
_scalers     = None
_metadata    = None
_model_name  = None
_model_type  = None   # 'sklearn' or 'keras'


def load_model(name: str = 'xgboost'):
    """Load a model by name. Call this at startup and when admin switches."""
    global _model, _scalers, _metadata, _model_name, _model_type

    name = name.lower()
    if name not in MODELS:
        raise ValueError(f"Unknown model '{name}'. Available: {list(MODELS.keys())}")

    cfg = MODELS[name]

    # Load scalers
    with open(cfg['scalers_path'], 'rb') as f:
        _scalers = pickle.load(f)

    # Load metadata
    with open(cfg['meta_path'], 'rb') as f:
        _metadata = pickle.load(f)

    # Load model — different loaders for sklearn vs keras
    if cfg['type'] == 'keras':
        from tensorflow import keras
        _model = keras.models.load_model(cfg['model_path'])
    else:
        with open(cfg['model_path'], 'rb') as f:
            _model = pickle.load(f)

    _model_name = name
    _model_type = cfg['type']

    print(f"[OK] Model loaded: {_metadata.get('model_name', name)}")
    print(f"   Type     : {_model_type}")
    print(f"   Features : {_metadata.get('n_features', 34)}")
    bal = _metadata.get('metrics', {}).get('balanced_accuracy', 0)
    f1  = _metadata.get('metrics', {}).get('f1_macro', 0)
    print(f"   Bal. Acc : {bal:.4f}")
    print(f"   F1 Macro : {f1:.4f}")
    return _model


def get_model():      return _model
def get_scalers():    return _scalers
def get_metadata():   return _metadata
def get_model_name(): return _model_name
def get_model_type(): return _model_type
def get_available_models(): return list(MODELS.keys())


def _apply_scalers(df: pd.DataFrame) -> pd.DataFrame:
    """Apply PowerTransformer then StandardScaler."""
    if _scalers is None:
        return df
    df = df.copy()
    if 'power' in _scalers:
        cols = [c for c in POWER_COLS if c in df.columns]
        if cols:
            df[cols] = _scalers['power'].transform(df[cols].values)
    if 'standard' in _scalers:
        cols = [c for c in STANDARD_COLS if c in df.columns]
        if cols:
            df[cols] = _scalers['standard'].transform(df[cols].values)
    return df


def preprocess(features: dict) -> np.ndarray:
    """Validate, order and scale a single feature dict."""
    missing = [c for c in FEATURE_COLUMNS if c not in features]
    if missing:
        raise ValueError(f"Missing features: {missing}")
    df = pd.DataFrame([features])[FEATURE_COLUMNS].astype(float)
    df = _apply_scalers(df)
    return df.values


def _raw_predict(X: np.ndarray):
    """
    Run raw prediction on numpy array.
    Returns (label, confidence) handling both sklearn and keras.
    """
    if _model_type == 'keras':
        # CNN output: sigmoid → single probability of being Attack
        proba_attack = float(_model.predict(X, verbose=0)[0][0])
        label        = 1 if proba_attack >= 0.5 else 0
        confidence   = proba_attack if label == 1 else 1 - proba_attack
    else:
        # XGBoost: predict_proba → [p_benign, p_attack]
        proba      = _model.predict_proba(X)[0]
        label      = int(np.argmax(proba))
        confidence = float(proba[label])
    return label, confidence


def predict_single(features: dict) -> dict:
    """Predict one network flow."""
    if _model is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")
    X          = preprocess(features)
    label, confidence = _raw_predict(X)
    return {
        'label':          label,
        'prediction':     'Attack' if label == 1 else 'Benign',
        'confidence':     confidence,
        'confidence_pct': round(confidence * 100, 2),
        'needs_review':   confidence < 0.70,
        'model_used':     _model_name
    }


def predict_batch(df: pd.DataFrame) -> pd.DataFrame:
    """Predict a whole CSV DataFrame."""
    if _model is None:
        raise RuntimeError("Model not loaded.")
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"CSV missing columns: {missing}")

    X = df[FEATURE_COLUMNS].astype(float).copy()
    X = _apply_scalers(X)

    if _model_type == 'keras':
        proba_attack = _model.predict(X.values, verbose=0).flatten()
        labels       = (proba_attack >= 0.5).astype(int)
        confidence   = np.where(labels == 1, proba_attack, 1 - proba_attack)
    else:
        proba      = _model.predict_proba(X.values)
        labels     = np.argmax(proba, axis=1)
        confidence = proba[np.arange(len(labels)), labels]

    result = df.copy()
    result['prediction']   = ['Attack' if l == 1 else 'Benign' for l in labels]
    result['confidence']   = (confidence * 100).round(2)
    result['needs_review'] = confidence < 0.70
    return result