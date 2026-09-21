from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class GoalRequest(BaseModel):
    goal: str


class ActionRequest(BaseModel):
    session_id: Optional[str] = None  # defaults to the most recent session
    action: str
    target: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    reason: str = ""


class AgentRunRequest(BaseModel):
    goal: Optional[str] = None  # defaults to the demo goal


class GoalResponse(BaseModel):
    session_id: str
    goal_text: str
    goal: Dict[str, Any]


class ActionRecord(BaseModel):
    id: int
    session_id: str
    action: str
    target: str
    reason: str
    intent_alignment: float
    risk_score: float
    decision: str
    drift_level: str
    constraint_violation: bool
    timestamp: str
    details: Dict[str, Any] = Field(default_factory=dict)


class SessionResponse(GoalResponse):
    actions: List[ActionRecord]
    summary: Dict[str, Any]


class AgentRunResponse(BaseModel):
    session: GoalResponse
    actions: List[ActionRecord]
    summary: Dict[str, Any]
