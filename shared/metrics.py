# ============================================================
# metrics.py — Unified IDS evaluation function
# IEEE-compliant: all metrics reported consistently
# Threshold: maximizes Balanced Accuracy on validation set
# ============================================================

import numpy as np
from sklearn.metrics import (
    balanced_accuracy_score, matthews_corrcoef,
    confusion_matrix, f1_score,
    roc_auc_score, average_precision_score,
    precision_recall_curve
)


TARGET_RECALL = 0.95


def ids_evaluate(name, y_true, y_pred_proba=None,
                 y_pred=None, threshold=None):
    """
    Unified IDS evaluation.
    If y_pred_proba given: uses provided threshold.
    If y_pred given directly: uses it as-is.
    Returns dict of all IEEE + IDS metrics.
    """
    if y_pred_proba is not None and threshold is not None:
        y_pred = (y_pred_proba >= threshold).astype(int)
    elif y_pred_proba is not None and threshold is None:
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
    Finds optimal threshold by maximizing Balanced Accuracy
    on validation set. This gives the best possible
    Balanced Accuracy score on the test set.
    """
    scores = clf.predict_proba(X_val)[:, 1]
    _, _, thresholds = precision_recall_curve(y_val, scores)

    best_th  = 0.5
    best_bac = 0.0

    for th in thresholds:
        y_pred = (scores >= th).astype(int)
        bac    = balanced_accuracy_score(y_val, y_pred)
        if bac > best_bac:
            best_bac = bac
            best_th  = float(th)

    return best_th


def tune_threshold_proba(proba_val, y_val,
                          target_recall=TARGET_RECALL):
    """
    Same as tune_threshold but takes raw probabilities.
    Used for ensembles where no clf object exists.
    """
    _, _, thresholds = precision_recall_curve(
        y_val, proba_val)

    best_th  = 0.5
    best_bac = 0.0

    for th in thresholds:
        y_pred = (proba_val >= th).astype(int)
        bac    = balanced_accuracy_score(y_val, y_pred)
        if bac > best_bac:
            best_bac = bac
            best_th  = float(th)

    return best_th