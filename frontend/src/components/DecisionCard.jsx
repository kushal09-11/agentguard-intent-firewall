import { useState } from 'react'
import RiskMeter from './RiskMeter.jsx'

export default function DecisionCard({ action, onReview }) {
  const [reviewing, setReviewing] = useState(false)
  const [notes, setNotes] = useState('')

  if (!action) {
    return (
      <div className="empty-decision">
        <p className="empty">Select an action in the timeline or execution graph to inspect security telemetry.</p>
      </div>
    )
  }

  const d = action.details || {}
  const sem = d.semantic || {}
  const cons = d.constraints || {}
  const inj = d.prompt_injection || {}
  const drift = d.drift || {}
  const riskComps = d.risk_components || {}
  const reasons = d.explanation?.reasons || (d.reason_text ? [d.reason_text] : [])
  const isPendingReview = action.decision === 'REVIEW' || action.human_review_status === 'PENDING'

  const handleReview = async (decision) => {
    if (!onReview) return
    setReviewing(true)
    try {
      await onReview(action.id, decision, notes)
    } finally {
      setReviewing(false)
    }
  }

  return (
    <div className={`decision-card ${action.decision.toLowerCase()}`}>
      <div className="decision-header-row">
        <div>
          <span className="action-id-tag">AG-{String(action.id).padStart(4, '0')}</span>
          <div className="verdict-banner">{action.decision}</div>
        </div>
        <div className="action-badge-group">
          <span className={`pill-badge ${action.executed ? 'success' : 'danger'}`}>
            {action.executed ? '● Tool Executed' : '○ Execution Prevented'}
          </span>
          {action.human_review_status && action.human_review_status !== 'NONE' && (
            <span className={`pill-badge review-${action.human_review_status.toLowerCase()}`}>
              Human: {action.human_review_status}
            </span>
          )}
        </div>
      </div>

      {/* Human In The Loop Review Callout */}
      {isPendingReview && (
        <div className="review-callout-box">
          <div className="review-callout-header">
            <span className="warning-icon">⚠️</span>
            <div>
              <strong>HUMAN OVERSIGHT REQUIRED</strong>
              <p>Firewall paused tool execution. A human operator must approve or reject this action.</p>
            </div>
          </div>
          <input
            type="text"
            placeholder="Reviewer notes (optional)..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="review-notes-input"
          />
          <div className="review-actions-row">
            <button
              className="btn-approve"
              disabled={reviewing}
              onClick={() => handleReview('APPROVED')}
            >
              ✓ Approve & Execute Tool
            </button>
            <button
              className="btn-deny"
              disabled={reviewing}
              onClick={() => handleReview('DENIED')}
            >
              ✕ Deny & Block Action
            </button>
          </div>
        </div>
      )}

      {/* Prompt Injection Alert Banner */}
      {inj.detected && (
        <div className="injection-alert-box">
          <div className="inj-title">🚨 ADVERSARIAL PROMPT INJECTION DETECTED</div>
          <p className="inj-desc">{inj.explanation}</p>
          {inj.signals?.length > 0 && (
            <div className="inj-signals">
              Signals: {inj.signals.map((s) => <span key={s} className="tag-signal">{s}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Core Telemetry Grid */}
      <div className="telemetry-summary-grid">
        <div className="telemetry-cell">
          <span className="cell-label">Intent Alignment</span>
          <strong className="cell-value">{Math.round(action.intent_alignment)}%</strong>
          <span className="cell-sub">{sem.matched_concepts?.length || 0} matched concepts</span>
        </div>
        <div className="telemetry-cell">
          <span className="cell-label">Contextual Risk</span>
          <strong className="cell-value">{Math.round(action.risk_score)}%</strong>
          <RiskMeter value={action.risk_score} />
        </div>
        <div className="telemetry-cell">
          <span className="cell-label">Drift Severity</span>
          <strong className={`cell-value drift-${(drift.severity || action.drift_level || 'STABLE').toLowerCase()}`}>
            {drift.severity || action.drift_level || 'STABLE'}
          </strong>
          <span className="cell-sub">
            {drift.trend ? `Trend: ${drift.trend}` : 'Trajectory'}
          </span>
        </div>
        <div className="telemetry-cell">
          <span className="cell-label">Resource Sensitivity</span>
          <strong className={`cell-value sens-${(d.sensitivity || 'LOW').toLowerCase()}`}>
            {d.sensitivity || 'LOW'}
          </strong>
          <span className="cell-sub">
            {d.sensitivity_data?.is_sensitive ? 'Sensitive Asset' : 'Public Domain'}
          </span>
        </div>
      </div>

      {/* Dynamic Security Explanation */}
      <div className="section-block">
        <h4 className="section-title">Explainable Security Rationale</h4>
        <ul className="reasons-list">
          {reasons.map((r, i) => (
            <li key={i} className="reason-item">{r}</li>
          ))}
        </ul>
      </div>

      {/* Risk Components Breakdown */}
      {riskComps && Object.keys(riskComps).length > 0 && (
        <div className="section-block">
          <h4 className="section-title">Risk Signal Contributions</h4>
          <div className="risk-bars-container">
            {[
              ['Intent Drift', riskComps.drift || 0],
              ['Data Sensitivity', riskComps.sensitivity || 0],
              ['Action Criticality', riskComps.criticality || 0],
              ['Constraint Violation', riskComps.violation || 0],
              ['Prompt Injection', riskComps.injection || 0],
            ].map(([label, val]) => (
              <div key={label} className="risk-bar-row">
                <span className="bar-label">{label}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Math.min(100, val)}%` }} />
                </div>
                <span className="bar-score">{Math.round(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Semantic Concept Matching */}
      <div className="section-block">
        <h4 className="section-title">Semantic Concept Alignment</h4>
        <div className="concepts-group">
          <div>
            <span className="concept-type">Matched Concepts:</span>
            {sem.matched_concepts?.length ? (
              sem.matched_concepts.map((c) => <span key={c} className="concept-tag matched">{c}</span>)
            ) : (
              <span className="concept-none">None</span>
            )}
          </div>
          {sem.unmatched_concepts?.length > 0 && (
            <div>
              <span className="concept-type">Unmatched / Divergent:</span>
              {sem.unmatched_concepts.map((c) => <span key={c} className="concept-tag unmatched">{c}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Constraints Breakdown */}
      {cons.violated && cons.violations?.length > 0 && (
        <div className="section-block">
          <h4 className="section-title text-red">Constraint Breaches</h4>
          <ul className="violations-list">
            {cons.violations.map((v, i) => (
              <li key={i}>
                <strong>[{v.type}]</strong> Expected: {v.expected}, Actual: {v.actual} — {v.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tool Execution Interception Output */}
      {action.execution_output && (
        <div className="section-block">
          <h4 className="section-title">Simulated Tool Execution Output</h4>
          <pre className="tool-output-json">
            {JSON.stringify(action.execution_output, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
