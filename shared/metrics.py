# ============================================================
# metrics.py — Unified IDS evaluation function
# IEEE-compliant: all metrics reported consistently
# ============================================================

import numpy as np
from sklearn.metrics import (
    balanced_accuracy_score, matthews_corrcoef,
    confusion_matrix, f1_score,
    roc_auc_score, average_precision_score,
    precision_recall_curve
)
from shared.config import TARGET_RECALL


def ids_evaluate(name, y_true, y_pred_proba=None,
                 y_pred=None, threshold=None):
    """
    Unified IDS evaluation.
    If y_pred_proba given: tunes threshold at TARGET_RECALL.
    If y_pred given directly: uses it as-is.
    Returns dict of all IEEE + IDS metrics.
    """
    if y_pred_proba is not None and threshold is not None:
        y_pred = (y_pred_proba >= threshold).astype(int)
    elif y_pred_proba is not None and threshold is None:
        # Default 0.5 — used for comparison
        y_pred = (y_pred_proba >= 0.5).astype(int)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()

    return {
        "Model"           : name,
        "Balanced Acc"    : round(balanced_accuracy_score(
                             y_true, y_pred), 4),
        "F1 Macro"        : round(f1_score(
                             y_true, y_pred,
                             average="macro"), 4),
        "MCC"             : round(matthews_corrcoef(
                             y_true, y_pred), 4),
        "Attack Recall"   : round(tp/(tp+fn), 4),
        "Benign Recall"   : round(tn/(tn+fp), 4),
        "Attack Precision": round(tp/(tp+fp), 4)
                             if (tp+fp) > 0 else 0.0,
        "Benign Precision": round(tn/(tn+fn), 4)
                             if (tn+fn) > 0 else 0.0,
        "FAR"             : round(fp/(fp+tn), 4),
        "FNR"             : round(fn/(fn+tp), 4),
        "ROC-AUC"         : round(roc_auc_score(
                             y_true, y_pred_proba), 4)
                             if y_pred_proba is not None
                             else "N/A",
        "PR-AUC"          : round(average_precision_score(
                             y_true, y_pred_proba), 4)
                             if y_pred_proba is not None
                             else "N/A",
    }


def tune_threshold(clf, X_val, y_val,
                   target_recall=TARGET_RECALL):
    """
    Finds optimal decision threshold on validation set.
    Returns threshold value.
    """
    scores = clf.predict_proba(X_val)[:, 1]
    prec, rec, thr = precision_recall_curve(y_val, scores)
    idx = np.where(rec >= target_recall)[0]
    return float(thr[idx[-1]]) if len(idx) > 0 else 0.5


def tune_threshold_proba(proba_val, y_val,
                          target_recall=TARGET_RECALL):
    """
    Same as tune_threshold but takes raw probabilities.
    Used for ensembles where no clf object exists.
    """
    prec, rec, thr = precision_recall_curve(y_val, proba_val)
    idx = np.where(rec >= target_recall)[0]
    return float(thr[idx[-1]]) if len(idx) > 0 else 0.5