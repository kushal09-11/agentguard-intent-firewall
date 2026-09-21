"""Simulated agent. TODO(Antigravity): replace SCENARIO with a real agent / tool-call interceptor."""
from fastapi import APIRouter
from app.models.schemas import ActionRequest, AgentRunRequest, AgentRunResponse
from app.routes.firewall import evaluate_action, summarize
from app.routes.goal import new_session

router = APIRouter(prefix="/api", tags=["agent"])
DEMO_GOAL = "Find a programming laptop under ₹60,000."

SCENARIO = [
    ("search", "laptops", {}, "Find laptops matching the user's requirements"),
    ("filter", "laptops", {"max_price": 60000}, "Filter laptops within budget"),
    ("compare", "laptop cpu and ram", {}, "Compare CPU and RAM of candidates"),
    ("search", "laptop accessories", {}, "See if accessories are also useful"),
    ("open", "gaming laptop", {"price": 85000}, "Open a highly rated gaming laptop"),
    ("read", "purchase_history", {}, "Check previous purchases"),
]


@router.post("/agent/run", response_model=AgentRunResponse)
def run_agent(req: AgentRunRequest = AgentRunRequest()):
    session = new_session(req.goal or DEMO_GOAL)
    results = [evaluate_action(ActionRequest(session_id=session["session_id"], action=a, target=t,
                                             parameters=p, reason=r)) for a, t, p, r in SCENARIO]
    return {"session": session, "actions": results, "summary": summarize(results)}
