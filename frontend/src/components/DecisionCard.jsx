import RiskMeter from './RiskMeter.jsx'

export default function DecisionCard({ action }) {
  if (!action) return <p className="empty">Select an action in the timeline to see why it was decided.</p>
  const d = action.details || {}
  return (
    <div className={`decision ${action.decision.toLowerCase()}`}>
      <div className="verdict">{action.decision}</div>
      <dl className="parsed">
        <dt>Action</dt><dd>{action.action} {action.target}</dd>
        <dt>Intent alignment</dt><dd>{Math.round(action.intent_alignment)}%</dd>
        <dt>Risk</dt><dd>{Math.round(action.risk_score)}%<RiskMeter value={action.risk_score} /></dd>
        <dt>Drift</dt><dd>{action.drift_level}</dd>
        <dt>Sensitivity</dt><dd>{d.sensitivity}</dd>
        {d.constraints?.details?.length > 0 && (<><dt>Constraints</dt><dd>{d.constraints.details.join('; ')}</dd></>)}
        <dt>Reason</dt><dd>{d.reason_text}</dd>
      </dl>
    </div>
  )
}
