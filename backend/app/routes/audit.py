"""Audit Trail & Human-in-the-Loop Review API Routes for AgentGuard."""
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException

from app.database import database as db
from app.models.schemas import ActionRecord, ReviewActionRequest
from app.services.tool_registry import execute_tool_call

router = APIRouter(prefix="/api", tags=["audit"])


@router.get("/audit/{session_id}", response_model=List[ActionRecord])
def get_audit_trail(session_id: str):
    sess = db.get_session(session_id)
    if not sess:
        raise HTTPException(404, f"Session '{session_id}' not found.")
    return db.list_actions(session_id)


@router.post("/review/{action_id}", response_model=ActionRecord)
def review_action(action_id: int, req: ReviewActionRequest):
    act = db.get_action(action_id)
    if not act:
        raise HTTPException(404, f"Action #{action_id} not found.")

    decision_choice = req.decision.upper().strip()
    if decision_choice not in ("APPROVED", "DENIED"):
        raise HTTPException(400, "Review decision must be 'APPROVED' or 'DENIED'.")

    if decision_choice == "APPROVED":
        # Execute tool upon human security approval
        output = execute_tool_call(act["action"], act["target"], act.get("parameters", {}))
        output["human_review_note"] = req.notes or "Approved by security operator."
        updated = db.update_action_review(
            action_id=action_id,
            review_status="APPROVED",
            decision="ALLOW",
            executed=True,
            execution_output=output,
        )
    else:  # DENIED
        output = {
            "status": "denied",
            "message": f"Action was rejected by human security reviewer. Reason: {req.notes or 'Denied by operator.'}",
            "tool_executed": False,
        }
        updated = db.update_action_review(
            action_id=action_id,
            review_status="DENIED",
            decision="BLOCK",
            executed=False,
            execution_output=output,
        )

    return updated
