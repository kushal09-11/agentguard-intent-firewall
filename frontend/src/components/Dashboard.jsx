import ExecutionTimeline from './ExecutionTimeline.jsx'
import DecisionCard from './DecisionCard.jsx'
import RiskMeter from './RiskMeter.jsx'

export function DriftChart({ actions }) {
  if (actions.length < 2) {
    return <p className="empty-sub">Drift trajectory activates after 2+ actions.</p>
  }

  const values = actions.map((a) => Math.round(a.intent_alignment))
  const last = actions[actions.length - 1]
  const driftData = last.details?.drift || {}
  const trend = driftData.trend || 'STABLE'
  const severity = driftData.severity || last.drift_level || 'STABLE'

  const pts = values.map((v, i) => [12 + (i * 276) / (values.length - 1), 75 - v * 0.65])

  return (
    <div className="drift-mini-wrapper">
      <div className="drift-chart-meta-compact">
        <span className={`drift-badge-small ${severity.toLowerCase()}`}>{severity}</span>
        <span className="drift-trend-text">Trend: <strong>{trend}</strong></span>
        {driftData.consecutive_off_goal_actions > 0 && (
          <span className="drift-streak-text">Off-goal: {driftData.consecutive_off_goal_actions}</span>
        )}
      </div>

      <svg viewBox="0 0 300 80" className="chart-mini" role="img" aria-label="Intent alignment trend">
        <line x1="8" x2="292" y1="20" y2="20" className="thresh" strokeDasharray="3 3" />
        <line x1="8" x2="292" y1="60" y2="60" className="thresh-danger" strokeDasharray="3 3" />
        <polyline points={pts.map((p) => p.join(',')).join(' ')} className="line" />
        {pts.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="3" className="dot" />
            <text x={x} y={y - 6} textAnchor="middle" className="chart-text">
              {values[i]}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function Dashboard({ actions, selected, onSelect, onReview }) {
  const last = actions[actions.length - 1]
  const blocked = actions.filter((a) => a.decision === 'BLOCK').length
  const reviewed = actions.filter((a) => a.decision === 'REVIEW').length

  return (
    <div className="dashboard-subview">
      <div className="stats-strip">
        <div className="mini-stat">
          <span>Alignment</span>
          <strong>{last ? `${Math.round(last.intent_alignment)}%` : '–'}</strong>
        </div>
        <div className="mini-stat">
          <span>Risk</span>
          <strong className={last && last.risk_score >= 65 ? 'text-red' : last && last.risk_score >= 30 ? 'text-amber' : 'text-green'}>
            {last ? `${Math.round(last.risk_score)}%` : '–'}
          </strong>
        </div>
        <div className="mini-stat">
          <span>Evaluated</span>
          <strong>{actions.length}</strong>
        </div>
        <div className="mini-stat">
          <span>Block / Review</span>
          <strong>{blocked} / {reviewed}</strong>
        </div>
      </div>
      {last && <RiskMeter value={last.risk_score} />}

      <div className="dashboard-split-grid">
        <div className="split-timeline-panel">
          <div className="panel-heading-row">
            <h2>Timeline</h2>
            <span className="count-pill">{actions.length}</span>
          </div>
          <div className="timeline-scroll-container">
            <ExecutionTimeline actions={actions} selectedId={selected?.id} onSelect={onSelect} />
          </div>
        </div>

        <div className="split-decision-panel">
          <div className="panel-heading-row">
            <h2>Decision Telemetry</h2>
          </div>
          <div className="inspector-scroll-container">
            <DecisionCard action={selected} onReview={onReview} />
          </div>
        </div>
      </div>
    </div>
  )
}
