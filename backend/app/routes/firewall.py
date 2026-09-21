"""Central Firewall Engine and API routes for AgentGuard.
Intercepts all proposed agent actions, evaluates alignment, constraints, sensitivity,
progressive intent drift, and prompt injection, enforces security policies,
and gates tool execution.
"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException

from app.database import database as db
from app.models.schemas import ActionRecord, ActionRequest
from app.services.constraint_engine import evaluate_constraints
from app.services.drift_detector import detect_drift
from app.services.explanation_engine import generate_explanation
from app.services.injection_detector import detect_prompt_injection
from app.services.policy_engine import evaluate_policy
from app.services.risk_engine import calculate_risk
from app.services.semantic_engine import calculate_semantic_alignment
from app.services.sensitivity_engine import classify_resource_sensitivity
from app.services.tool_registry import execute_tool_call

router = APIRouter(prefix="/api", tags=["firewall"])


def summarize(actions: List[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "actions_evaluated": len(actions),
        "blocked": sum(1 for a in actions if a["decision"] == "BLOCK"),
        "reviewed": sum(1 for a in actions if a["decision"] == "REVIEW"),
        "allowed": sum(1 for a in actions if a["decision"] == "ALLOW"),
        "approved": sum(1 for a in actions if a.get("human_review_status") == "APPROVED"),
        "denied": sum(1 for a in actions if a.get("human_review_status") == "DENIED"),
        "current_alignment": actions[-1]["intent_alignment"] if actions else None,
        "current_risk": actions[-1]["risk_score"] if actions else None,
        "progression": [round(a["intent_alignment"]) for a in actions],
    }


def evaluate_action(req: ActionRequest) -> Dict[str, Any]:
    sess = db.get_session(req.session_id) if req.session_id else db.latest_session()
    if not sess:
        raise HTTPException(
            404,
            f"Session '{req.session_id}' not found."
            if req.session_id
            else "No active session. Create one with POST /api/goal.",
        )

    action_type = req.action.strip().lower()
    if not req.target.strip():
        raise HTTPException(400, "Action target must not be empty.")

    a = {
        "action": action_type,
        "target": req.target.strip(),
        "parameters": req.parameters or {},
        "reason": req.reason or "",
    }
    goal = sess["goal"]
    sid = sess["session_id"]

    # 1. Prompt Injection Detection (scans parameters, target, and reason)
    injection_content = f"{req.target} {req.reason} {' '.join(str(v) for v in (req.parameters or {}).values())}"
    injection = detect_prompt_injection(injection_content)

    # 2. Semantic Intent Alignment
    semantic = calculate_semantic_alignment(goal, a)
    align_score = float(semantic["alignment_score"])

    # 3. Explicit Constraints Check (Budget, Specs, Boundaries)
    constraints = evaluate_constraints(goal, a)

    # 4. Contextual Resource Sensitivity
    sensitivity = classify_resource_sensitivity(a)
    sens_level = sensitivity["level"]

    # 5. Progressive Intent Drift Trajectory (History + Current)
    history_alignments = db.get_alignments(sid)
    drift = detect_drift(history_alignments, align_score)

    # 6. Multi-Signal Contextual Risk Score
    risk = calculate_risk(
        intent_alignment=align_score,
        sensitivity=sens_level,
        action_type=action_type,
        violation_severity=constraints["severity"],
        drift_score=drift["drift_score"],
        injection_detected=injection["detected"],
        injection_confidence=injection["confidence"],
    )

    # 7. Configurable Policy Engine Evaluation
    policy = evaluate_policy(
        risk_score=risk["risk_score"],
        intent_alignment=align_score,
        sensitivity=sens_level,
        constraints=constraints,
        drift_level=drift["drift_level"],
        prompt_injection=injection,
    )
    decision = policy["decision"]

    # 8. Dynamic Security Explanation
    explanation = generate_explanation(
        decision=decision,
        action=a,
        alignment_data=semantic,
        drift_data=drift,
        sensitivity_data=sensitivity,
        constraints_data=constraints,
        injection_data=injection,
        risk_data=risk,
    )

    # 9. Tool Interception and Execution Gating
    # CRITICAL: A BLOCKED action must NOT execute.
    # An ALLOWED action executes.
    # A REVIEW action suspends execution waiting for human approval.
    if decision == "ALLOW":
        execution_output = execute_tool_call(action_type, req.target, req.parameters or {})
        executed = True
        human_review_status = "NONE"
    elif decision == "REVIEW":
        execution_output = {
            "status": "pending_review",
            "message": "Tool execution suspended. Waiting for human approval via Security Review.",
            "tool_executed": False,
        }
        executed = False
        human_review_status = "PENDING"
    else:  # BLOCK
        execution_output = {
            "status": "blocked",
            "message": f"AgentGuard Firewall BLOCKED execution of '{action_type} {req.target}'.",
            "tool_executed": False,
            "security_reasons": explanation["reasons"],
        }
        executed = False
        human_review_status = "NONE"

    # Assemble record
    rec = {
        **a,
        "intent_alignment": align_score,
        "risk_score": risk["risk_score"],
        "decision": decision,
        "drift_level": drift["drift_level"],
        "constraint_violation": constraints["violated"],
        "human_review_status": human_review_status,
        "executed": executed,
        "execution_output": execution_output,
        "details": {
            "reason_text": policy["reason"],
            "explanation": explanation,
            "semantic": semantic,
            "sensitivity": sens_level,
            "sensitivity_data": sensitivity,
            "parameters": req.parameters,
            "constraints": constraints,
            "drift": drift,
            "prompt_injection": injection,
            "risk_components": risk["components"],
            "risk_contributions": risk["contributions"],
        },
    }

    rec["id"] = db.insert_action(sid, rec)
    return db.get_action(rec["id"])


@router.post("/firewall/evaluate", response_model=ActionRecord)
def evaluate(req: ActionRequest):
    return evaluate_action(req)


@router.get("/actions", response_model=List[ActionRecord])
def actions(session_id: Optional[str] = None):
    if session_id and not db.get_session(session_id):
        raise HTTPException(404, f"Session '{session_id}' not found.")
    return db.list_actions(session_id)
