# AgentGuard — Intent-Aware Runtime Firewall for AI Agents

## Problem
Permission systems ask "may the agent do this?" but not "does this help the user's goal?". Agents can drift into unrelated or sensitive actions while staying technically permitted.

## Solution
AgentGuard checks every agent action for **permission and intent**: it scores alignment with the user's goal, tracks drift over the session, computes risk, and returns ALLOW / REVIEW / BLOCK with an explanation. The foundation is fully deterministic (no LLM) and uses a simulated agent.

## Architecture
`React dashboard → FastAPI → intent_engine → drift_detector → risk_engine → policy_engine → SQLite`

## Features
Rule-based goal parser · intent alignment (0-100) · budget/restricted-data constraint checks · session drift detector (STABLE→CRITICAL) · weighted risk score · hard-rule policy engine · execution history · simulated agent · dashboard with timeline, drift chart and decision panel.

## Tech stack
React + Vite + Axios · FastAPI + Pydantic · SQLite

## Folder structure
`backend/app/{routes,services,models,database}` (services are the swappable modules) and `frontend/src/{components,services}`.

## Run backend
```
cd backend
pip install -r requirements.txt
python run.py          # http://localhost:8000/docs
```
## Run frontend
```
cd frontend
npm install
npm run dev            # http://localhost:5173
```
## Example API request
```
curl -X POST localhost:8000/api/goal -H "Content-Type: application/json" -d '{"goal":"Find a programming laptop under ₹60,000 with 16GB RAM."}'
curl -X POST localhost:8000/api/firewall/evaluate -H "Content-Type: application/json" \
  -d '{"session_id":"<id>","action":"read","target":"purchase_history","parameters":{},"reason":"Check previous purchases"}'
```
Endpoints: `POST /api/goal`, `POST /api/firewall/evaluate`, `POST /api/agent/run`, `GET /api/actions`, `GET /api/session/{id}`, `GET /api/health`.

## Demo scenario
Click **Run simulated agent**. Goal: "Find a programming laptop under ₹60,000."
1. search laptops → ALLOW · 2. filter under ₹60K → ALLOW · 3. compare CPU/RAM → ALLOW · 4. search accessories → REVIEW · 5. open ₹85K gaming laptop → BLOCK (budget + off-goal) · 6. read purchase history → BLOCK.

## Future enhancements (not implemented)
LLM-based intent extraction · embedding-based semantic alignment · real AI agent integration · MCP tool integration · real-time tool interception · advanced policy engine · prompt injection detection · sensitive data detection · React Flow execution graph · explainable AI decisions · agent behavior analytics
