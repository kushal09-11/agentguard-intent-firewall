from fastapi import APIRouter, HTTPException
from app.database import database as db
from app.models.schemas import GoalRequest, GoalResponse, SessionResponse
from app.routes.firewall import summarize
from app.services.intent_engine import parse_goal

router = APIRouter(prefix="/api", tags=["goal"])


def new_session(text: str) -> dict:
    if not text or not text.strip():
        raise HTTPException(400, "Goal must not be empty.")
    goal = parse_goal(text)
    sid = db.create_session(text.strip(), goal)
    return {"session_id": sid, "goal_text": text.strip(), "goal": goal}


@router.post("/goal", response_model=GoalResponse)
def create_goal(req: GoalRequest):
    return new_session(req.goal)


@router.get("/session/{session_id}", response_model=SessionResponse)
def get_session(session_id: str):
    sess = db.get_session(session_id)
    if not sess:
        raise HTTPException(404, f"Session '{session_id}' not found.")
    acts = db.list_actions(session_id)
    return {**sess, "actions": acts, "summary": summarize(acts)}
