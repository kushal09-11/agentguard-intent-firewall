"""SQLite persistence for AgentGuard.
Handles sessions, actions, execution states, review status, and audit history.
"""
import json, os, sqlite3, uuid
from contextlib import closing
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "agentguard.db")


def _conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def _now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def init_db():
    with closing(_conn()) as c:
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS sessions(
                id TEXT PRIMARY KEY, goal_text TEXT, goal_json TEXT, created_at TEXT);
            CREATE TABLE IF NOT EXISTS agent_actions(
                id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, action TEXT,
                target TEXT, reason TEXT, intent_alignment REAL, risk_score REAL,
                decision TEXT, drift_level TEXT, constraint_violation INTEGER,
                timestamp TEXT, details TEXT,
                human_review_status TEXT DEFAULT 'NONE',
                executed INTEGER DEFAULT 0,
                execution_output TEXT DEFAULT '{}');
            """
        )
        c.commit()

        # Migrate existing tables if columns are missing
        existing_cols = {r["name"] for r in c.execute("PRAGMA table_info(agent_actions)").fetchall()}
        if "human_review_status" not in existing_cols:
            c.execute("ALTER TABLE agent_actions ADD COLUMN human_review_status TEXT DEFAULT 'NONE'")
        if "executed" not in existing_cols:
            c.execute("ALTER TABLE agent_actions ADD COLUMN executed INTEGER DEFAULT 0")
        if "execution_output" not in existing_cols:
            c.execute("ALTER TABLE agent_actions ADD COLUMN execution_output TEXT DEFAULT '{}'")
        c.commit()


def create_session(goal_text: str, goal: Dict[str, Any]) -> str:
    sid = uuid.uuid4().hex[:12]
    with closing(_conn()) as c:
        c.execute("INSERT INTO sessions VALUES(?,?,?,?)", (sid, goal_text, json.dumps(goal), _now()))
        c.commit()
    return sid


def _session_row(r):
    return {"session_id": r["id"], "goal_text": r["goal_text"], "goal": json.loads(r["goal_json"])} if r else None


def get_session(sid: str):
    with closing(_conn()) as c:
        return _session_row(c.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone())


def latest_session():
    with closing(_conn()) as c:
        return _session_row(c.execute("SELECT * FROM sessions ORDER BY rowid DESC LIMIT 1").fetchone())


def insert_action(sid: str, rec: Dict[str, Any]) -> int:
    with closing(_conn()) as c:
        cur = c.execute(
            """INSERT INTO agent_actions(
                session_id, action, target, reason, intent_alignment, risk_score,
                decision, drift_level, constraint_violation, timestamp, details,
                human_review_status, executed, execution_output
            ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (
                sid,
                rec["action"],
                rec["target"],
                rec.get("reason", ""),
                rec["intent_alignment"],
                rec["risk_score"],
                rec["decision"],
                rec["drift_level"],
                int(rec["constraint_violation"]),
                _now(),
                json.dumps(rec.get("details", {})),
                rec.get("human_review_status", "NONE"),
                int(rec.get("executed", False)),
                json.dumps(rec.get("execution_output") or {}),
            ),
        )
        c.commit()
        return cur.lastrowid


def update_action_review(action_id: int, review_status: str, decision: str, executed: bool, execution_output: Optional[Dict[str, Any]] = None):
    with closing(_conn()) as c:
        c.execute(
            """UPDATE agent_actions
               SET human_review_status = ?, decision = ?, executed = ?, execution_output = ?
               WHERE id = ?""",
            (review_status, decision, int(executed), json.dumps(execution_output or {}), action_id),
        )
        c.commit()
    return get_action(action_id)


def _action_row(r):
    if not r:
        return None
    d = dict(r)
    d["constraint_violation"] = bool(d.get("constraint_violation", 0))
    d["details"] = json.loads(d.get("details") or "{}")
    d["human_review_status"] = d.get("human_review_status") or "NONE"
    d["executed"] = bool(d.get("executed", 0))
    d["execution_output"] = json.loads(d.get("execution_output") or "{}")
    return d


def get_alignments(sid: str) -> List[float]:
    with closing(_conn()) as c:
        rows = c.execute("SELECT intent_alignment FROM agent_actions WHERE session_id=? ORDER BY id", (sid,))
        return [r[0] for r in rows]


def list_actions(sid: Optional[str] = None, limit: int = 500) -> List[Dict[str, Any]]:
    with closing(_conn()) as c:
        if sid:
            rows = c.execute("SELECT * FROM agent_actions WHERE session_id=? ORDER BY id LIMIT ?", (sid, limit))
        else:
            rows = c.execute("SELECT * FROM agent_actions ORDER BY id DESC LIMIT ?", (limit,))
        return [_action_row(r) for r in rows.fetchall()]


def get_action(aid: int) -> Optional[Dict[str, Any]]:
    with closing(_conn()) as c:
        r = c.execute("SELECT * FROM agent_actions WHERE id=?", (aid,)).fetchone()
        return _action_row(r) if r else None


def get_session_analytics(sid: str) -> Dict[str, Any]:
    actions = list_actions(sid)
    if not actions:
        return {
            "total_actions": 0,
            "allowed": 0,
            "reviewed": 0,
            "blocked": 0,
            "approved": 0,
            "denied": 0,
            "average_alignment": 0.0,
            "average_risk": 0.0,
            "max_drift": 0.0,
            "sensitive_attempts": 0,
            "injection_attempts": 0,
            "timeline": [],
        }

    total = len(actions)
    allowed = sum(1 for a in actions if a["decision"] == "ALLOW")
    reviewed = sum(1 for a in actions if a["decision"] == "REVIEW")
    blocked = sum(1 for a in actions if a["decision"] == "BLOCK")
    approved = sum(1 for a in actions if a.get("human_review_status") == "APPROVED")
    denied = sum(1 for a in actions if a.get("human_review_status") == "DENIED")
    avg_align = round(sum(a["intent_alignment"] for a in actions) / total, 1)
    avg_risk = round(sum(a["risk_score"] for a in actions) / total, 1)

    max_drift = 0.0
    sensitive_attempts = 0
    injection_attempts = 0
    timeline = []

    for a in actions:
        det = a.get("details", {})
        drift_data = det.get("drift", {})
        drift_score = drift_data.get("drift_score", 0.0)
        if drift_score > max_drift:
            max_drift = drift_score

        sens = det.get("sensitivity", "LOW")
        if sens in ("HIGH", "CRITICAL"):
            sensitive_attempts += 1

        inj = det.get("prompt_injection", {})
        if inj.get("detected"):
            injection_attempts += 1

        timeline.append({
            "id": a["id"],
            "action": a["action"],
            "target": a["target"],
            "alignment": round(a["intent_alignment"], 1),
            "risk": round(a["risk_score"], 1),
            "drift_score": round(drift_score, 1),
            "decision": a["decision"],
            "human_review_status": a.get("human_review_status", "NONE"),
            "timestamp": a["timestamp"],
        })

    return {
        "total_actions": total,
        "allowed": allowed,
        "reviewed": reviewed,
        "blocked": blocked,
        "approved": approved,
        "denied": denied,
        "average_alignment": avg_align,
        "average_risk": avg_risk,
        "max_drift": round(max_drift, 1),
        "sensitive_attempts": sensitive_attempts,
        "injection_attempts": injection_attempts,
        "timeline": timeline,
    }
