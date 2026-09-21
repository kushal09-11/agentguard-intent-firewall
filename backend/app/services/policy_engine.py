"""Deterministic policy: hard rules first, then risk thresholds. TODO(Antigravity): configurable/DSL policies."""
from typing import Dict

ORDER = {"ALLOW": 0, "REVIEW": 1, "BLOCK": 2}


def evaluate_policy(risk_score: float, intent_alignment: float, sensitivity: str,
                    constraints: Dict, drift_level: str) -> Dict:
    t = []  # (decision, explanation)
    if sensitivity == "CRITICAL":
        t.append(("BLOCK", "Action touches critical data (credentials/banking)."))
    elif constraints["restricted_access"]:
        t.append(("BLOCK", "Action accesses sensitive data outside the user's task."))
    if intent_alignment < 20:
        t.append(("BLOCK", f"Action is highly unrelated to the user's goal (alignment {intent_alignment:.0f}%)."))
    elif intent_alignment < 60:
        t.append(("REVIEW", f"Action is only loosely related to the user's goal (alignment {intent_alignment:.0f}%)."))
    for d in constraints["details"]:
        if not d.startswith("Accesses"):
            t.append(("BLOCK" if constraints["severity"] == "severe" else "REVIEW", d + "."))
    if drift_level == "CRITICAL":
        t.append(("BLOCK", "Agent has drifted critically far from the original objective."))
    elif drift_level == "HIGH":
        t.append(("REVIEW", "Agent is drifting away from the original objective."))
    if risk_score >= 65:
        t.append(("BLOCK", f"Risk score {risk_score:.0f} is above the block threshold (65)."))
    elif risk_score >= 30:
        t.append(("REVIEW", f"Risk score {risk_score:.0f} is in the review range (30-65)."))
    decision = max((d for d, _ in t), key=ORDER.get, default="ALLOW")
    if decision == "ALLOW":
        reason = f"Action matches the user's goal (alignment {intent_alignment:.0f}%) with low risk."
    else:
        reason = " ".join(m for d, m in t if d == decision)
    return {"decision": decision, "reason": reason}
