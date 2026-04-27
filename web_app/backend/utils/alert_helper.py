from datetime import datetime
import subprocess
import logging
from models.database import Alert, BlockedIP

logger = logging.getLogger(__name__)


def create_alert_if_needed(pred) -> Alert | None:
    """
    Create an Alert from a Prediction if it's an Attack.
    ALL attacks generate alerts. Severity is based on confidence:
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


# ── Windows Firewall helpers ─────────────────────────────────────────────────
def _block_ip_in_firewall(ip_address: str) -> bool:
    """
    Add an inbound block rule to Windows Firewall for the given IP.
    Returns True if the rule was added successfully, False otherwise.
    """
    rule_name = f"IDS_AutoBlock_{ip_address}"
    cmd = [
        "netsh", "advfirewall", "firewall", "add", "rule",
        f"name={rule_name}",
        "dir=in",
        "action=block",
        f"remoteip={ip_address}",
        "enable=yes"
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            logger.info(f"🛡️  Firewall rule added: blocked {ip_address}")
            return True
        else:
            logger.warning(
                f"⚠️  Firewall command failed for {ip_address}: {result.stderr.strip()}"
            )
            return False
    except subprocess.TimeoutExpired:
        logger.error(f"⏱️  Firewall command timed out for {ip_address}")
        return False
    except Exception as e:
        logger.error(f"❌  Firewall error for {ip_address}: {e}")
        return False


def _unblock_ip_in_firewall(ip_address: str) -> bool:
    """
    Remove the IDS block rule from Windows Firewall for the given IP.
    Returns True if the rule was removed successfully, False otherwise.
    """
    rule_name = f"IDS_AutoBlock_{ip_address}"
    cmd = [
        "netsh", "advfirewall", "firewall", "delete", "rule",
        f"name={rule_name}"
    ]
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=10
        )
        if result.returncode == 0:
            logger.info(f"🔓  Firewall rule removed: unblocked {ip_address}")
            return True
        else:
            logger.warning(
                f"⚠️  Firewall unblock failed for {ip_address}: {result.stderr.strip()}"
            )
            return False
    except Exception as e:
        logger.error(f"❌  Firewall unblock error for {ip_address}: {e}")
        return False


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

    # Execute real Windows Firewall block
    firewall_ok = _block_ip_in_firewall(pred.src_ip)

    # New block
    blocked = BlockedIP(
        ip_address       = pred.src_ip,
        reason           = f'Auto-blocked: Attack detected with {round(pred.confidence * 100, 1)}% confidence',
        confidence       = pred.confidence,
        auto_blocked     = True,
        status           = 'active',
        prediction_id    = pred.id,
        attack_count     = 1,
        firewall_blocked = firewall_ok
    )
    return blocked