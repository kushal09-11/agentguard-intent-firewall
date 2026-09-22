# AgentGuard — Backend Service Architecture

The backend of AgentGuard is a high-performance asynchronous security engine built with Python 3.11+ and FastAPI. It intercepts proposed AI agent actions, evaluates them against the active user intent session, and issues real-time enforcement decisions (`ALLOW`, `REVIEW`, `BLOCK`).

---

## 🛠️ Technology Stack
- **Framework:** FastAPI (REST API with asynchronous request handlers)
- **Validation:** Pydantic v2 (Strict type verification and schema contracts)
- **Database:** SQLite with WAL mode (`agentguard.db`)
- **Server:** Uvicorn ASGI production server
- **Testing:** Python `unittest` suite (22 automated tests)

---

## 🚀 Quickstart

### 1. Environment Setup
```powershell
# Windows
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Run API Server (Port 8000)
```powershell
python run.py
```
- Swagger API Docs: `http://127.0.0.1:8000/docs`
- ReDoc Docs: `http://127.0.0.1:8000/redoc`

### 3. Run Automated Tests
```powershell
.\.venv\Scripts\python.exe -m unittest discover tests -v
```

---

## 🧱 Module Architecture

- `app/routes/`: REST controllers (`firewall.py`, `goal.py`, `agent.py`, `audit.py`, `analytics.py`, `policy.py`).
- `app/services/`: Core security intelligence engines:
  - `intent_engine.py`: Natural language goal parser and domain ontology mapper.
  - `semantic_aligner.py`: Cosine similarity & concept alignment calculations.
  - `constraint_checker.py`: Deterministic budget caps and hardware specification validator.
  - `drift_detector.py`: Sliding-window temporal drift trajectory tracking.
  - `sensitivity_classifier.py`: Resource sensitivity tier categorization (`PUBLIC`, `INTERNAL`, `HIGH`, `CRITICAL`).
  - `injection_detector.py`: Heuristic & pattern scanning for adversarial prompt overrides.
  - `risk_engine.py`: Composite risk index calculator.
  - `policy_engine.py`: Tri-state verdict gateway and runtime threshold enforcement.
- `app/database/`: SQLite session store and immutable audit log manager.
- `tests/`: 22 unit and integration tests.
