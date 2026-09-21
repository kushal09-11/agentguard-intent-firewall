"""Weighted risk scoring. TODO(Antigravity): learned/contextual risk models."""
from typing import Dict

SENSITIVITY = {"LOW": 10, "MEDIUM": 50, "HIGH": 80, "CRITICAL": 100}
CRITICALITY = {"search": 10, "filter": 10, "compare": 15, "open": 20, "read": 40,
               "write": 60, "send": 70, "purchase": 90, "delete": 100}
VIOLATION = {"none": 0, "mild": 60, "severe": 100}
WEIGHTS = {"drift": 0.35, "sensitivity": 0.25, "criticality": 0.20, "violation": 0.20}


def calculate_risk(intent_alignment: float, sensitivity: str, action_type: str, violation_severity: str) -> Dict:
    parts = {
        "drift": max(0, min(100, 100 - intent_alignment)),
        "sensitivity": SENSITIVITY[sensitivity],
        "criticality": CRITICALITY.get(action_type, 30),
        "violation": VIOLATION[violation_severity],
    }
    score = sum(WEIGHTS[k] * v for k, v in parts.items())
    return {"risk_score": round(max(0, min(100, score)), 1), "components": parts, "weights": WEIGHTS}
