"""Configurable Policy Engine for AgentGuard.
Applies deterministic security rules, hard constraints, and risk thresholds
to produce ALLOW, REVIEW, or BLOCK enforcement decisions.
Policy rules and thresholds are centralized and configurable at runtime.
"""
from typing import Any, Dict, List, Optional, Tuple
from app.services.risk_engine import get_risk_weights, set_risk_weights

ORDER = {"ALLOW": 0, "REVIEW": 1, "BLOCK": 2}

DEFAULT_POLICY = {
    "allow_threshold": 30.0,
    "review_threshold": 65.0,
    "hard_rules": {
        "block_critical_sensitivity": True,
        "block_severe_violation": True,
        "block_critical_drift": True,
        "block_prompt_injection": True,
        "block_low_alignment": True,
    }
}

ACTIVE_POLICY = dict(DEFAULT_POLICY)
ACTIVE_POLICY["hard_rules"] = dict(DEFAULT_POLICY["hard_rules"])


def get_policy() -> Dict[str, Any]:
    return {
        "allow_threshold": ACTIVE_POLICY["allow_threshold"],
        "review_threshold": ACTIVE_POLICY["review_threshold"],
        "hard_rules": dict(ACTIVE_POLICY["hard_rules"]),
        "weights": get_risk_weights(),
    }


def update_policy(config: Dict[str, Any]) -> Dict[str, Any]:
    global ACTIVE_POLICY
    if "allow_threshold" in config:
        ACTIVE_POLICY["allow_threshold"] = float(config["allow_threshold"])
    if "review_threshold" in config:
        ACTIVE_POLICY["review_threshold"] = float(config["review_threshold"])
    if "hard_rules" in config and isinstance(config["hard_rules"], dict):
        ACTIVE_POLICY["hard_rules"].update(config["hard_rules"])
    if "weights" in config and isinstance(config["weights"], dict):
        set_risk_weights(config["weights"])
    return get_policy()


def evaluate_policy(
    risk_score: float,
    intent_alignment: float,
    sensitivity: str,
    constraints: Dict[str, Any],
    drift_level: str,
    prompt_injection: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Evaluates security policy and returns verdict (ALLOW, REVIEW, BLOCK) with explanations.

    Rules evaluate in priority order:
    1. Critical Hard Rules (Critical Sensitive Data, Severe Injections, Severe Constraints)
    2. Intent Alignment Bounds (Alignment < 20 => BLOCK, Alignment < 60 => REVIEW)
    3. Constraint Violations
    4. Progressive Intent Drift Level (CRITICAL => BLOCK, HIGH => REVIEW)
    5. Contextual Risk Score Thresholds (< 30 => ALLOW, 30-64 => REVIEW, >= 65 => BLOCK)
    """
    rules = ACTIVE_POLICY.get("hard_rules", DEFAULT_POLICY["hard_rules"])
    allow_th = ACTIVE_POLICY.get("allow_threshold", 30.0)
    review_th = ACTIVE_POLICY.get("review_threshold", 65.0)

    triggers: List[Tuple[str, str]] = []  # (decision, explanation)

    # 1. Critical Sensitivity Rule
    if rules.get("block_critical_sensitivity", True) and sensitivity == "CRITICAL":
        triggers.append(("BLOCK", "Hard rule triggered: Action accesses CRITICAL sensitivity asset (credentials or banking)."))

    # 2. Prompt Injection Rule
    if prompt_injection and prompt_injection.get("detected"):
        if rules.get("block_prompt_injection", True):
            signals_desc = ", ".join(prompt_injection.get("signals", ["unknown"]))
            triggers.append(("BLOCK", f"Security violation: Adversarial prompt injection detected ({signals_desc})."))

    # 3. Restricted Domain / Data Access
    if constraints.get("restricted_access"):
        triggers.append(("BLOCK", "Restricted domain policy triggered: Action attempts access to off-limit resources."))

    # 4. Severe Constraint Violations (Budget overages, spec mismatches)
    if constraints.get("violated"):
        for v in constraints.get("violations", []):
            if v.get("type") != "RESTRICTED_DOMAIN":  # already handled above
                sev = v.get("severity", "mild")
                if sev == "severe" and rules.get("block_severe_violation", True):
                    triggers.append(("BLOCK", f"Severe constraint violation: {v.get('detail')}."))
                else:
                    triggers.append(("REVIEW", f"Constraint warning: {v.get('detail')}."))

    # 5. Low Intent Alignment Rule
    if rules.get("block_low_alignment", True) and intent_alignment < 20:
        triggers.append(("BLOCK", f"Goal divergence: Intent alignment ({intent_alignment:.0f}%) is below minimum threshold (20%)."))
    elif intent_alignment < 60:
        triggers.append(("REVIEW", f"Intent drift warning: Action is only loosely related to original goal (alignment {intent_alignment:.0f}%)."))

    # 6. Progressive Intent Drift Trajectory Rule
    if drift_level == "CRITICAL" and rules.get("block_critical_drift", True):
        triggers.append(("BLOCK", "Trajectory drift: Agent has drifted critically far from the user's initial objective."))
    elif drift_level == "HIGH":
        triggers.append(("REVIEW", "Trajectory drift warning: Agent is continuously drifting off-goal."))

    # 7. Contextual Risk Score Thresholds
    if risk_score >= review_th:
        triggers.append(("BLOCK", f"Composite risk score ({risk_score:.0f}%) exceeds block threshold ({review_th:.0f}%)."))
    elif risk_score >= allow_th:
        triggers.append(("REVIEW", f"Composite risk score ({risk_score:.0f}%) requires human approval (threshold {allow_th:.0f}% - {review_th:.0f}%)."))

    # Determine final verdict: BLOCK > REVIEW > ALLOW
    decision = max((d for d, _ in triggers), key=ORDER.get, default="ALLOW")

    if decision == "ALLOW":
        reasons = [f"Action matches the user's goal ({intent_alignment:.0f}% alignment) with low operational risk ({risk_score:.0f}%)."]
    else:
        reasons = [msg for d, msg in triggers if d == decision]
        # If there were also review warnings on a block, include them for context
        if decision == "BLOCK":
            other_reasons = [msg for d, msg in triggers if d == "REVIEW"]
            if other_reasons:
                reasons.extend(other_reasons)

    combined_reason = " ".join(reasons)
    return {
        "decision": decision,
        "reason": combined_reason,
        "reasons": reasons,
        "triggered_count": len(triggers)
    }
