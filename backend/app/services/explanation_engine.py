"""Explainable Security Decisions Engine for AgentGuard.
Synthesizes intent alignment, drift trajectory, sensitivity classification,
constraint violations, and prompt injection signals into transparent,
human-readable security rationales.
"""
from typing import Any, Dict, List


def generate_explanation(
    decision: str,
    action: Dict[str, Any],
    alignment_data: Dict[str, Any],
    drift_data: Dict[str, Any],
    sensitivity_data: Dict[str, Any],
    constraints_data: Dict[str, Any],
    injection_data: Dict[str, Any],
    risk_data: Dict[str, Any],
) -> Dict[str, Any]:
    """Generates structured, dynamic security explanations for dashboard & audit logs."""
    action_name = f"{action.get('action')} {action.get('target')}"
    reasons: List[str] = []

    align_score = alignment_data.get("alignment_score", 0)
    risk_score = risk_data.get("risk_score", 0)
    drift_level = drift_data.get("drift_level", "STABLE")
    sens_level = sensitivity_data.get("level", "LOW")

    if decision == "BLOCK":
        summary = f"BLOCKED: Action '{action_name}' was intercepted to protect user safety and privacy."

        # Specific Block Factors
        if injection_data.get("detected"):
            reasons.append(f"Prompt injection detected: {injection_data.get('explanation')}")

        if sens_level in ("CRITICAL", "HIGH"):
            reasons.append(f"Sensitive data access: Target touches {sens_level}-tier assets ({', '.join(sensitivity_data.get('matched_keywords', [])) or action.get('target')}).")

        if constraints_data.get("restricted_access"):
            reasons.append("Restricted domain violation: Target is listed as strictly off-limits in the user's goal specification.")

        if constraints_data.get("violated"):
            for v in constraints_data.get("violations", []):
                reasons.append(f"Constraint breached: {v.get('detail')}")

        if drift_level == "CRITICAL":
            reasons.append(f"Critical intent drift: Agent has diverged across {drift_data.get('consecutive_off_goal_actions', 0)} consecutive actions.")
        elif align_score < 20:
            reasons.append(f"Severe goal misalignment: Action intent alignment is only {align_score}%.")

        if not reasons:
            reasons.append(f"High operational risk ({risk_score}%) exceeds the security threshold.")

    elif decision == "REVIEW":
        summary = f"REVIEW REQUIRED: Action '{action_name}' requires human approval before proceeding."

        if constraints_data.get("violated"):
            for v in constraints_data.get("violations", []):
                reasons.append(f"Constraint warning: {v.get('detail')}")

        if drift_level in ("HIGH", "MODERATE"):
            reasons.append(f"Progressive drift warning: Trend is {drift_data.get('trend')} with alignment dropping to {align_score}%.")

        if sens_level == "MEDIUM":
            reasons.append("Accesses moderate-sensitivity user account information.")

        if 30 <= align_score < 60:
            reasons.append(f"Divergence note: '{action.get('target')}' is only tangentially related to the original goal.")

        if not reasons:
            reasons.append(f"Moderate composite risk ({risk_score}%) is within the human oversight review band (30-65%).")

    else:  # ALLOW
        summary = f"ALLOWED: Action '{action_name}' aligns with user intent and is safe to execute."
        reasons.append(f"High intent alignment ({align_score}%) with expected task workflow.")
        reasons.append(f"Low composite risk ({risk_score}%) with no constraint or sensitivity violations.")

    return {
        "summary": summary,
        "reasons": reasons,
        "key_factors": {
            "intent_alignment": f"{align_score}%",
            "risk_score": f"{risk_score}%",
            "drift_severity": drift_level,
            "resource_sensitivity": sens_level,
            "constraints_violated": constraints_data.get("violated", False),
            "prompt_injection": injection_data.get("detected", False),
        }
    }
