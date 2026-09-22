# AgentGuard — Intent-Aware Runtime Firewall for AI Agents

> **AgentGuard** is a runtime security firewall that monitors AI agents in real time. Before an agent executes any tool, AgentGuard checks whether the action is safe and actually matches the user's original goal.

---

## 📊 Work Completed & Project Status

### **Current Status: Core MVP Completed (100%)**

| Component | Status | Description |
| :--- | :---: | :--- |
| **Intent Engine & Goal Parser** | ✅ Completed | Natural language parser for budgets, specifications, and domains (Laptops, Flights, Hotels, etc.). |
| **Semantic Alignment Engine** | ✅ Completed | 100% offline concept matching and domain ontology to calculate 0–100% alignment score. |
| **Constraint Violation Engine** | ✅ Completed | Enforces budget caps (e.g., ₹20,000 limit) and technical specifications. |
| **Progressive Drift Detector** | ✅ Completed | Tracks agent trajectory over time to catch gradual drift away from the goal. |
| **Resource Sensitivity Classifier** | ✅ Completed | Flags access to `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` assets (banking, history, credentials). |
| **Prompt Injection Detection** | ✅ Completed | Detects indirect instruction overrides embedded in third-party web content. |
| **Runtime Tool Interception** | ✅ Completed | Physically blocks disallowed tools, pauses review actions, and executes allowed tools. |
| **Dynamic Goal Simulation** | ✅ Completed | Generates realistic 8-step agent action sequences tailored to whatever goal the user enters. |
| **Human-in-the-Loop Review** | ✅ Completed | Dashboard buttons to manually `Approve` or `Deny` paused actions in real time. |
| **Interactive Dashboard (UI)** | ✅ Completed | React UI with timeline stream, telemetry inspector, execution graph, and policy controls. |
| **Automated Test Suite** | ✅ Completed | 22 tests verifying core firewall rules, dynamic goal simulations, and live API endpoints. |

---

## 🚀 Features Implemented So Far

### 1. Dynamic Goal-Aware Simulation
- Supports any user goal (e.g. *"Find a programming laptop under ₹60,000"* or *"Find flights from hyd to delhi under 20000 rupees"*).
- Automatically adapts the simulated agent's actions to the user's exact subject, budget, and route.
- Adapts quick presets in the UI to match the current goal.

### 2. Runtime Decision Pipeline
For every proposed agent action, AgentGuard returns one of three decisions:
- **ALLOW**: Safe and aligned with the goal. The tool executes automatically.
- **REVIEW**: Tangential action or mild drift (e.g., looking at accessories or lounge passes). Execution is paused until a human approves or denies it.
- **BLOCK**: Dangerous, over-budget, off-limits, or prompt-injected action. Tool execution is prevented.

### 3. Progressive Intent Drift Tracking
- Analyzes past action history to detect if an agent is slowly wandering off-task over multiple steps.
- Categorizes drift level into `STABLE`, `MILD`, `MODERATE`, `HIGH`, or `CRITICAL`.

### 4. Deterministic Constraint Checks
- Checks hard boundaries like maximum price/budget limits and specific requirements (e.g., 16GB RAM).
- Flags violations with expected vs. actual values and percentage over budget.

### 5. Sensitive Data & Injection Defense
- Blocks unauthorized reads to bank accounts, credentials, and purchase history.
- Scans parameters, URLs, and incoming webpage text for adversarial prompt injection strings.

### 6. Full Interactive Web Dashboard
- **Firewall Dashboard**: Live goal input, quick action evaluator, action timeline stream, and security analysis card.
- **Execution Graph**: Visual flow diagram showing each step's security verdict.
- **Security Analytics**: Real-time charts of intent alignment trends and threat counters.
- **Audit Trail**: Complete record of all evaluated and reviewed actions.
- **Policy Config**: Easy sliders and toggles to adjust risk thresholds and sensitivity rules.

---

## 🧪 Example 8-Step Demo Scenarios

AgentGuard demonstrates an 8-step security progression for any goal:

### Scenario A: Flights (`"Find flights from hyd to delhi under 20000 rupees"`)
1. **Search flights from HYD to Delhi** -> `ALLOW` (Aligned, low risk)
2. **Filter flights under ₹20,000** -> `ALLOW` (Within budget)
3. **Compare flight timings & airlines** -> `ALLOW` (IndiGo, Air India, Vistara)
4. **Search airport lounge & luggage** -> `REVIEW` (Mild drift / add-ons)
5. **Open ₹32,000 Business Class flight** -> `BLOCK` (Over budget violation)
6. **Read travel booking history** -> `BLOCK` (Sensitive user data)
7. **Access banking / payment cards** -> `BLOCK` (Critical financial resource)
8. **Encounter prompt injection in travel deal** -> `BLOCK` (Malicious payload detected)

### Scenario B: Laptops (`"Find a programming laptop under ₹60,000 with 16GB RAM"`)
1. **Search programming laptops** -> `ALLOW`
2. **Filter laptops under ₹60,000** -> `ALLOW`
3. **Compare CPU and RAM benchmarks** -> `ALLOW`
4. **Search laptop accessories** -> `REVIEW`
5. **Open ₹85,000 gaming laptop** -> `BLOCK`
6. **Read purchase history** -> `BLOCK`
7. **Access banking** -> `BLOCK`
8. **Encounter prompt injection in tech review** -> `BLOCK`

---

## 💻 How to Run

### 1. Start Backend (Port 8000)
```powershell
cd backend
.\.venv\Scripts\python.exe run.py
```
*API documentation available at:* `http://127.0.0.1:8000/docs`

### 2. Start Frontend (Port 5173)
```powershell
cd frontend
npm run dev
```
*Dashboard available at:* `http://localhost:5173`

### 3. Run Automated Tests
```powershell
cd backend
.\.venv\Scripts\python.exe -m unittest discover tests -v
```
*(Runs all 22 tests covering core firewall rules, constraints, intent drift, dynamic goal simulations, and live API endpoints).*

---

## 📁 Repository Structure

```
agentguard-intent-firewall/
├── backend/
│   ├── app/
│   │   ├── routes/        # API endpoints (agent, firewall, goal, audit, analytics)
│   │   ├── services/      # Core engines (intent, semantic, constraints, drift, risk, policy)
│   │   └── database/      # SQLite storage for sessions and actions
│   ├── tests/             # Automated test suite (15 unit tests)
│   └── run.py             # Backend entry point
├── frontend/
│   ├── src/
│   │   ├── components/    # UI panels (Dashboard, Graph, Analytics, Audit, Policy)
│   │   ├── services/      # API communication layer
│   │   └── App.jsx        # Main application layout
│   └── package.json
└── README.md
```
