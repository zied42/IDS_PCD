# ============================================================
# plots.py — Reusable plotting functions
# Consistent style across all notebooks
# ============================================================

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from sklearn.metrics import (confusion_matrix,
                              ConfusionMatrixDisplay,
                              precision_recall_curve)


COLORS = {
    "blue"  : "#378ADD",
    "green" : "#1D9E75",
    "purple": "#7F77DD",
    "coral" : "#D85A30",
    "amber" : "#BA7517",
    "gray"  : "#5F5E5A",
    "teal"  : "#1D9E75",
}

PALETTE = list(COLORS.values())


def plot_confusion_matrix(y_true, y_pred, title,
                           cmap="Blues", save_path=None):
    cm = confusion_matrix(y_true, y_pred)
    fig, ax = plt.subplots(figsize=(5, 4))
    ConfusionMatrixDisplay(
        cm, display_labels=["Benign", "Attack"]
    ).plot(ax=ax, colorbar=False, cmap=cmap)
    ax.set_title(title, fontweight="bold")
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    plt.show()


def plot_pr_curve(y_true, proba_dict,
                  title="Precision–Recall Curve",
                  save_path=None):
    fig, ax = plt.subplots(figsize=(6, 5))
    for (label, proba), color in zip(
            proba_dict.items(), PALETTE):
        prec, rec, _ = precision_recall_curve(y_true, proba)
        ax.plot(rec, prec, label=label, color=color)
    ax.set_xlabel("Recall")
    ax.set_ylabel("Precision")
    ax.set_title(title, fontweight="bold")
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    plt.show()


def plot_metrics_bar(results_dict, metrics,
                     title="Metric Comparison",
                     save_path=None):
    models = list(results_dict.keys())
    x = np.arange(len(metrics))
    w = 0.8 / len(models)

    fig, ax = plt.subplots(figsize=(10, 5))
    for i, (model, m) in enumerate(results_dict.items()):
        vals = [m[k] for k in metrics]
        offset = (i - len(models)/2 + 0.5) * w
        ax.bar(x + offset, vals, w,
               label=model, color=PALETTE[i % len(PALETTE)])

    ax.set_xticks(x)
    ax.set_xticklabels(metrics, rotation=15, ha="right")
    ax.set_ylim(0, 1.1)
    ax.set_title(title, fontweight="bold")
    ax.legend(fontsize=8)
    ax.grid(True, axis="y", alpha=0.3)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    plt.show()


def plot_frontier(results_dict, title="IDS Operating Frontier",
                  save_path=None):
    fig, ax = plt.subplots(figsize=(8, 6))
    for (name, m), color in zip(
            results_dict.items(), PALETTE):
        ax.scatter(m["FAR"], m["Attack Recall"],
                   s=130, color=color, zorder=3)
        ax.annotate(name,
                    (m["FAR"], m["Attack Recall"]),
                    textcoords="offset points",
                    xytext=(6, 4), fontsize=8)
    ax.set_xlabel("False Alert Rate (FAR) — lower is better")
    ax.set_ylabel("Attack Recall — higher is better")
    ax.set_title(title, fontweight="bold")
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    if save_path:
        plt.savefig(save_path, dpi=150)
    plt.show()