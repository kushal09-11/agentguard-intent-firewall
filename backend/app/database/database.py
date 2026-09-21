"""SQLite persistence. Swap for Postgres later by replacing only this file."""
import json, os, sqlite3, uuid
from contextlib import closing
from datetime import datetime, timezone

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
                timestamp TEXT, details TEXT);
            """
        )
        c.commit()


def create_session(goal_text, goal):
    sid = uuid.uuid4().hex[:12]
    with closing(_conn()) as c:
        c.execute("INSERT INTO sessions VALUES(?,?,?,?)", (sid, goal_text, json.dumps(goal), _now()))
        c.commit()
    return sid


def _session_row(r):
    return {"session_id": r["id"], "goal_text": r["goal_text"], "goal": json.loads(r["goal_json"])} if r else None


def get_session(sid):
    with closing(_conn()) as c:
        return _session_row(c.execute("SELECT * FROM sessions WHERE id=?", (sid,)).fetchone())


def latest_session():
    with closing(_conn()) as c:
        return _session_row(c.execute("SELECT * FROM sessions ORDER BY rowid DESC LIMIT 1").fetchone())


def insert_action(sid, rec):
    with closing(_conn()) as c:
        cur = c.execute(
            "INSERT INTO agent_actions(session_id,action,target,reason,intent_alignment,risk_score,"
            "decision,drift_level,constraint_violation,timestamp,details) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
            (sid, rec["action"], rec["target"], rec["reason"], rec["intent_alignment"], rec["risk_score"],
             rec["decision"], rec["drift_level"], int(rec["constraint_violation"]), _now(),
             json.dumps(rec["details"])),
        )
        c.commit()
        return cur.lastrowid


def _action_row(r):
    d = dict(r)
    d["constraint_violation"] = bool(d["constraint_violation"])
    d["details"] = json.loads(d["details"] or "{}")
    return d


def get_alignments(sid):
    with closing(_conn()) as c:
        rows = c.execute("SELECT intent_alignment FROM agent_actions WHERE session_id=? ORDER BY id", (sid,))
        return [r[0] for r in rows]


def list_actions(sid=None, limit=500):
    with closing(_conn()) as c:
        if sid:
            rows = c.execute("SELECT * FROM agent_actions WHERE session_id=? ORDER BY id LIMIT ?", (sid, limit))
        else:
            rows = c.execute("SELECT * FROM agent_actions ORDER BY id DESC LIMIT ?", (limit,))
        return [_action_row(r) for r in rows.fetchall()]


def get_action(aid):
    with closing(_conn()) as c:
        r = c.execute("SELECT * FROM agent_actions WHERE id=?", (aid,)).fetchone()
        return _action_row(r) if r else None
