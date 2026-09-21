from typing import List, Optional
from fastapi import APIRouter, HTTPException
from app.database import database as db
from app.models.schemas import ActionRecord, ActionRequest
from app.services.drift_detector import detect_drift
from app.services.intent_engine import calculate_intent_alignment, check_constraints, classify_sensitivity
from app.services.policy_engine import evaluate_policy
from app.services.risk_engine import CRITICALITY, calculate_risk

router = APIRouter(prefix="/api", tags=["firewall"])


def summarize(actions):
    return {
        "actions_evaluated": len(actions),
        "blocked": sum(a["decision"] == "BLOCK" for a in actions),
        "reviewed": sum(a["decision"] == "REVIEW" for a in actions),
        "allowed": sum(a["decision"] == "ALLOW" for a in actions),
        "current_alignment": actions[-1]["intent_alignment"] if actions else None,
        "current_risk": actions[-1]["risk_score"] if actions else None,
        "progression": [round(a["intent_alignment"]) for a in actions],
    }


def evaluate_action(req: ActionRequest) -> dict:
    sess = db.get_session(req.session_id) if req.session_id else db.latest_session()
    if not sess:
        raise HTTPException(404, f"Session '{req.session_id}' not found." if req.session_id
                            else "No active session. Create one with POST /api/goal.")
    action = req.action.strip().lower()
    if action not in CRITICALITY:
        raise HTTPException(400, f"Invalid action '{req.action}'. Allowed: {', '.join(sorted(CRITICALITY))}.")
    if not req.target.strip():
        raise HTTPException(400, "Action target must not be empty.")
    a = {"action": action, "target": req.target.strip(), "parameters": req.parameters, "reason": req.reason}
    goal, sid = sess["goal"], sess["session_id"]

    align = calculate_intent_alignment(goal, a)
    cons = check_constraints(goal, a)
    sens = classify_sensitivity(a)
    drift = detect_drift(db.get_alignments(sid), align)
    risk = calculate_risk(align, sens, action, cons["severity"])
    if not 0 <= risk["risk_score"] <= 100:
        raise HTTPException(500, "Invalid risk score computed.")
    policy = evaluate_policy(risk["risk_score"], align, sens, cons, drift["drift_level"])

    rec = {**a, "intent_alignment": align, "risk_score": risk["risk_score"], "decision": policy["decision"],
           "drift_level": drift["drift_level"], "constraint_violation": cons["constraint_violation"],
           "details": {"reason_text": policy["reason"], "sensitivity": sens, "parameters": req.parameters,
                       "constraints": cons, "drift": drift, "risk_components": risk["components"]}}
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
