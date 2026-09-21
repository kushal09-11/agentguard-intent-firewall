"""Context-Aware Risk Engine for AgentGuard.
Computes a transparent, weighted multi-signal risk score from:
- Intent alignment & progressive intent drift
- Resource & data sensitivity
- Tool/action criticality
- Constraint violations (budget, specs)
- Prompt injection & security signals
"""
from typing import Any, Dict, Optional

SENSITIVITY_SCORES = {"LOW": 10, "MEDIUM": 50, "HIGH": 80, "CRITICAL": 100}

ACTION_CRITICALITY = {
    "search": 10,
    "filter": 10,
    "compare": 15,
    "open": 20,
    "inspect": 25,
    "read": 40,
    "write": 60,
    "send": 70,
    "purchase": 90,
    "delete": 100,
}

VIOLATION_SCORES = {"none": 0, "mild": 60, "severe": 100}

DEFAULT_WEIGHTS = {
    "drift": 0.30,
    "sensitivity": 0.25,
    "criticality": 0.15,
    "violation": 0.15,
    "injection": 0.15,
}

# Current runtime weights (can be updated via policy API)
ACTIVE_WEIGHTS = dict(DEFAULT_WEIGHTS)


def set_risk_weights(new_weights: Dict[str, float]):
    global ACTIVE_WEIGHTS
    # Normalize weights so they sum to 1.0
    total = sum(new_weights.values())
    if total > 0:
        ACTIVE_WEIGHTS = {k: v / total for k, v in new_weights.items()}


def get_risk_weights() -> Dict[str, float]:
    return dict(ACTIVE_WEIGHTS)


def calculate_risk(
    intent_alignment: float,
    sensitivity: str,
    action_type: str,
    violation_severity: str,
    drift_score: Optional[float] = None,
    injection_detected: bool = False,
    injection_confidence: float = 0.0,
    custom_weights: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """Calculates transparent, multi-component risk score (0-100).

    Returns:
        Dict containing:
        - risk_score: float (0.0 - 100.0)
        - components: raw 0-100 values for each dimension
        - contributions: weighted contribution of each component
        - weights: active weight distribution
    """
    weights = custom_weights or ACTIVE_WEIGHTS

    # If drift_score is not passed, derive from intent alignment
    effective_drift = drift_score if drift_score is not None else max(0.0, 100.0 - intent_alignment)

    # Component raw scores (0 to 100 scale)
    parts = {
        "drift": float(max(0.0, min(100.0, effective_drift))),
        "sensitivity": float(SENSITIVITY_SCORES.get(sensitivity, 10)),
        "criticality": float(ACTION_CRITICALITY.get(action_type.lower(), 30)),
        "violation": float(VIOLATION_SCORES.get(violation_severity.lower(), 0)),
        "injection": float(min(100.0, injection_confidence * 100.0) if injection_detected else 0.0),
    }

    # Calculate weighted contributions
    contributions = {
        k: round(weights.get(k, 0.0) * parts[k], 1)
        for k in parts
    }

    total_score = sum(contributions.values())
    clamped_score = round(max(0.0, min(100.0, total_score)), 1)

    return {
        "risk_score": clamped_score,
        "components": parts,
        "contributions": contributions,
        "weights": weights,
    }
