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
    human_review_status: str = "NONE"  # NONE, PENDING, APPROVED, DENIED
    executed: bool = False
    execution_output: Optional[Dict[str, Any]] = None


class SessionResponse(GoalResponse):
    actions: List[ActionRecord]
    summary: Dict[str, Any]


class AgentRunResponse(BaseModel):
    session: GoalResponse
    actions: List[ActionRecord]
    summary: Dict[str, Any]


class ReviewActionRequest(BaseModel):
    decision: str  # APPROVED or DENIED
    notes: Optional[str] = ""


class StepRunRequest(BaseModel):
    session_id: str
    step_index: int


class PolicyConfigModel(BaseModel):
    allow_threshold: float = 30.0
    review_threshold: float = 65.0
    weights: Dict[str, float] = Field(
        default_factory=lambda: {
            "drift": 0.30,
            "sensitivity": 0.25,
            "criticality": 0.15,
            "violation": 0.15,
            "injection": 0.15,
        }
    )
    hard_rules: Dict[str, bool] = Field(
        default_factory=lambda: {
            "block_critical_sensitivity": True,
            "block_severe_violation": True,
            "block_critical_drift": True,
            "block_prompt_injection": True,
            "block_low_alignment": True,
        }
    )
