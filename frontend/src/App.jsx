import { useState } from 'react'
import GoalPanel from './components/GoalPanel.jsx'
import AgentAction from './components/AgentAction.jsx'
import ExecutionTimeline from './components/ExecutionTimeline.jsx'
import DecisionCard from './components/DecisionCard.jsx'
import DriftTrajectory from './components/DriftTrajectory.jsx'
import ExecutionGraph from './components/ExecutionGraph.jsx'
import AuditTrail from './components/AuditTrail.jsx'
import SecurityAnalytics from './components/SecurityAnalytics.jsx'
import PolicyPanel from './components/PolicyPanel.jsx'
import {
  createGoal,
  evaluateAction,
  runAgent,
  reviewAction,
  errorMessage,
} from './services/api.js'

const DEMO_GOAL_DEFAULT = 'Find a programming laptop under ₹60,000 with 16GB RAM.'

export default function App() {
  const [goalText, setGoalText] = useState(DEMO_GOAL_DEFAULT)
  const [session, setSession] = useState(null)
  const [actions, setActions] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard') // Default: 5-panel layout from sketch
  const [bannerNotice, setBannerNotice] = useState('')

  const guard = (fn) => async (...args) => {
    setBusy(true)
    setError('')
    try {
      await fn(...args)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  // 1. Set / Initialize Goal Baseline
  const onSetGoal = guard(async () => {
    const s = await createGoal(goalText)
    setSession(s)
    setActions([])
    setSelected(null)
    setBannerNotice('Goal baseline established. Ready to evaluate actions.')
    setTimeout(() => setBannerNotice(''), 3500)
  })

  // 2. Run Full 8-Step Security Demo (Updates on same page)
  const onRunFullDemo = guard(async () => {
    const d = await runAgent(goalText)
    setSession(d.session)
    setActions(d.actions)
    const reviewAct = d.actions.find((a) => a.decision === 'REVIEW')
    setSelected(reviewAct || d.actions[d.actions.length - 1])
    setBannerNotice('Security Demo executed: 8 actions evaluated against firewall policies.')
    setTimeout(() => setBannerNotice(''), 5000)
  })

  // 3. Evaluate Custom Action (Updates on same page)
  const onEvaluate = guard(async (payload) => {
    let activeSession = session
    if (!activeSession) {
      activeSession = await createGoal(goalText)
      setSession(activeSession)
      setActions([])
    }
    const a = await evaluateAction({ ...payload, session_id: activeSession.session_id })
    setActions((prev) => [...prev, a])
    setSelected(a)
    setBannerNotice(`Action AG-${String(a.id).padStart(4, '0')} evaluated: ${a.decision}`)
    setTimeout(() => setBannerNotice(''), 3500)
  })

  // 4. Human-in-the-loop Review (Approve or Deny)
  const onReview = guard(async (actionId, decision, notes = '') => {
    const updated = await reviewAction(actionId, decision, notes)
    setActions((prev) => prev.map((a) => (a.id === actionId ? updated : a)))
    setSelected(updated)
    setBannerNotice(`Action AG-${String(actionId).padStart(4, '0')} was ${decision}. Tool ${updated.executed ? 'executed' : 'blocked'}.`)
    setTimeout(() => setBannerNotice(''), 4000)
  })

  return (
    <div className="app-shell">
      {/* Top Bar / Header */}
      <header className="app-header">
        <div className="brand-group">
          <div className="shield-icon">🛡️</div>
          <div className="brand-texts">
            <h1>AGENTGUARD</h1>
            <span className="tagline">Intent-Aware Runtime Firewall for AI Agents</span>
          </div>
        </div>

        <div className="header-status-group">
          <span className="badge-system-live">● FIREWALL LIVE</span>
          {session && <span className="badge-session">Session AG-{session.session_id}</span>}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          🛡️ Firewall Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'graph' ? 'active' : ''}`}
          onClick={() => setActiveTab('graph')}
        >
          📊 Execution Graph
        </button>
        <button
          className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          📈 Security Analytics
        </button>
        <button
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          📋 Audit Trail {actions.length > 0 ? `(${actions.length})` : ''}
        </button>
        <button
          className={`tab-btn ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveTab('policy')}
        >
          ⚙️ Policy Config
        </button>
      </nav>

      {bannerNotice && (
        <div className="system-notice-banner" role="status">
          <span>ℹ️ {bannerNotice}</span>
          <button className="close-notice-btn" onClick={() => setBannerNotice('')}>✕</button>
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          <strong>Security Error:</strong> {error}
        </div>
      )}

      {/* Main View Area */}
      <div className="app-view-container">
        {/* PRIMARY PAGE: 5 Components in exact layout from sketch */}
        {activeTab === 'dashboard' && (
          <div className="wireframe-dashboard-layout">
            {/* ROW 1: User Goal Specification (Left) & Live Action Evaluator (Right) */}
            <div className="wireframe-row-top">
              <div className="wireframe-col">
                <GoalPanel
                  goalText={goalText}
                  setGoalText={setGoalText}
                  session={session}
                  busy={busy}
                  onSetGoal={onSetGoal}
                  onRunFullDemo={onRunFullDemo}
                />
              </div>
              <div className="wireframe-col">
                <AgentAction disabled={busy} onSubmit={onEvaluate} />
              </div>
            </div>

            {/* ROW 2: Action Execution Stream (Left) & Firewall Security Analysis (Right) */}
            <div className="wireframe-row-mid">
              <div className="wireframe-col">
                <section className="panel execution-stream-panel">
                  <div className="panel-heading-row">
                    <h2>Action Execution</h2>
                    <span className="count-pill">{actions.length} Total</span>
                  </div>
                  <div className="stream-scroll-container">
                    <ExecutionTimeline
                      actions={actions}
                      selectedId={selected?.id}
                      onSelect={setSelected}
                    />
                  </div>
                </section>
              </div>

              <div className="wireframe-col">
                <section className="panel security-analysis-panel">
                  <div className="panel-heading-row">
                    <h2>Firewall Security Analysis</h2>
                    {selected && <span className="mono-sub">Action AG-{String(selected.id).padStart(4, '0')}</span>}
                  </div>
                  <div className="analysis-scroll-container">
                    <DecisionCard action={selected} onReview={onReview} />
                  </div>
                </section>
              </div>
            </div>

            {/* ROW 3: Drift Trajectory (Full Width) */}
            <div className="wireframe-row-bottom">
              <section className="panel drift-trajectory-panel">
                <div className="panel-heading-row">
                  <h2>Drift Trajectory</h2>
                  {actions.length > 0 && (
                    <span className="subtitle-inline">Sequential Intent Drift Telemetry</span>
                  )}
                </div>
                <DriftTrajectory
                  actions={actions}
                  selectedId={selected?.id}
                  onSelect={setSelected}
                />
              </section>
            </div>
          </div>
        )}

        {/* Tab 2: Execution Graph */}
        {activeTab === 'graph' && (
          <div className="panel graph-view-panel">
            <div className="panel-heading-row">
              <div>
                <h2>Agent Execution Graph</h2>
                <p className="subtitle-compact">Interactive node visualization of agent intent trajectory</p>
              </div>
              <div className="legend-pills">
                <span className="pill-allow">ALLOW</span>
                <span className="pill-review">REVIEW</span>
                <span className="pill-block">BLOCK</span>
              </div>
            </div>
            <div className="graph-split-wrapper">
              <div className="graph-scroll-area">
                <ExecutionGraph
                  goal={session?.goal}
                  actions={actions}
                  selectedId={selected?.id}
                  onSelect={setSelected}
                />
              </div>
              <div className="graph-inspector-area">
                <DecisionCard action={selected} onReview={onReview} />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Security Analytics */}
        {activeTab === 'analytics' && (
          <div className="analytics-scroll-wrapper">
            <SecurityAnalytics actions={actions} />
          </div>
        )}

        {/* Tab 4: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="audit-tab-wrapper">
            <AuditTrail
              actions={actions}
              onSelect={(a) => {
                setSelected(a)
                setActiveTab('dashboard')
              }}
            />
          </div>
        )}

        {/* Tab 5: Policy Config */}
        {activeTab === 'policy' && (
          <div className="policy-tab-wrapper">
            <PolicyPanel />
          </div>
        )}
      </div>
    </div>
  )
}
