"""Security Analytics and Policy Management API Routes for AgentGuard."""
from typing import Any, Dict
from fastapi import APIRouter, HTTPException

from app.database import database as db
from app.models.schemas import PolicyConfigModel
from app.services.policy_engine import get_policy, update_policy

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/analytics/{session_id}")
def get_analytics(session_id: str):
    sess = db.get_session(session_id)
    if not sess:
        raise HTTPException(404, f"Session '{session_id}' not found.")
    analytics = db.get_session_analytics(session_id)
    return {
        "session_id": session_id,
        "goal_text": sess["goal_text"],
        "goal": sess["goal"],
        "analytics": analytics,
    }


@router.get("/policy")
def get_active_policy():
    return get_policy()


@router.put("/policy")
def set_active_policy(config: PolicyConfigModel):
    updated = update_policy(config.model_dump())
    return updated
