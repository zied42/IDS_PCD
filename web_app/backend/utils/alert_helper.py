from models.database import Alert


def create_alert_if_needed(pred) -> Alert | None:
    """
    Create an Alert from a Prediction if it's an Attack.
    Severity is based on confidence level:
        >= 0.90  → High
        >= 0.75  → Medium
        <  0.75  → Low
    """
    if pred.prediction != 'Attack':
        return None

    if pred.confidence >= 0.90:
        severity = 'High'
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