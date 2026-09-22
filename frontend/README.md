# AgentGuard — Security Console Frontend

The frontend of AgentGuard is an interactive operator dashboard built with React 18, Vite, and a custom Cruip-inspired Cybersecurity Dark Design System. It delivers real-time telemetry inspection, execution workflow graphs, pure SVG multi-line trajectory analytics, audit trail logs, and runtime policy management.

---

## 🛠️ Technology Stack
- **Framework:** React 18 (Hooks-driven state and component lifecycle)
- **Tooling:** Vite (Rapid build, optimized production bundle)
- **Styling:** Vanilla CSS with custom tokens (HSL dark mode, glassmorphism, responsive grid)
- **Visualizations:** Custom mathematical SVG engines for execution graphs, telemetry curves, and dynamic hover HUDs (zero external charting library bloat)

---

## 🚀 Quickstart

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server (Port 5173)
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build & Verification
```bash
npm run build
```

---

## 🖥️ UI Component Architecture

- `src/components/Timeline.jsx`: Real-time sequential event stream of all agent tool actions.
- `src/components/DecisionCard.jsx`: Deep-dive telemetry card showing constraint deltas, risk breakdown, and HITL approve/deny buttons.
- `src/components/ExecutionGraph.jsx`: Node-based sequential workflow diagram with colored status borders and metric tags.
- `src/components/SecurityAnalytics.jsx`: High-precision SVG trajectory telemetry chart displaying Intent Alignment, Contextual Risk, and Intent Drift over time with interactive hover HUD.
- `src/components/AuditTrail.jsx`: CSS Grid compliance table with search, category filtering (`All`, `Allow`, `Review`, `Block`), and one-click telemetry inspection.
- `src/components/PolicyPanel.jsx`: Dynamic slider and toggle panel for updating runtime risk thresholds and resource sensitivity flags.
- `src/services/api.js`: REST client communicating with the backend FastAPI service.
