from datetime import datetime
from models.database import Alert, BlockedIP


def create_alert_if_needed(pred) -> Alert | None:
    """
    Create an Alert from a Prediction if it's an Attack.
    Alerts are only created if confidence < 90%.
    Severity is based on confidence level:
        >= 0.75  → Medium
        <  0.75  → Low
    """
    if pred.prediction != 'Attack':
        return None

    if pred.confidence >= 0.90:
        return None
    elif pred.confidence >= 0.75:
        severity = 'Medium'
    else:
        severity = 'Low'

    return Alert(
        src_ip        = pred.src_ip,
        dst_ip        = pred.dst_ip,
        confidence    = pred.confidence,
        severity      = severity,
        status        = 'open',
        prediction_id = pred.id
    )


def auto_block_ip_if_needed(pred, threshold=0.0):
    """
    Automatically block the source IP if:
      1) prediction is 'Attack'
      2) confidence >= threshold (default 0%)
      3) src_ip is not None/empty

    If the IP is already blocked (active), just increment attack_count.
    Returns the BlockedIP object or None.
    """
    if pred.prediction != 'Attack':
        return None
    if pred.confidence < threshold:
        return None
    if not pred.src_ip:
        return None

    # Check if already blocked
    existing = BlockedIP.query.filter_by(
        ip_address=pred.src_ip,
        status='active'
    ).first()

    if existing:
        # Already blocked — increment attack counter
        existing.attack_count += 1
        existing.confidence = max(existing.confidence or 0, pred.confidence)
        return existing

    # New block
    blocked = BlockedIP(
        ip_address    = pred.src_ip,
        reason        = f'Auto-blocked: Attack detected with {round(pred.confidence * 100, 1)}% confidence',
        confidence    = pred.confidence,
        auto_blocked  = True,
        status        = 'active',
        prediction_id = pred.id,
        attack_count  = 1
    )
    return blocked