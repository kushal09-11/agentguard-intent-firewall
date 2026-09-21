import ExecutionTimeline from './ExecutionTimeline.jsx'
import DecisionCard from './DecisionCard.jsx'
import RiskMeter from './RiskMeter.jsx'

function DriftChart({ values }) {
  if (values.length < 2) return <p className="empty">Drift appears after two actions.</p>
  const pts = values.map((v, i) => [10 + (i * 280) / (values.length - 1), 90 - v * 0.8])
  return (
    <div>
      <svg viewBox="0 0 300 100" className="chart" role="img" aria-label="Intent alignment over time">
        <line x1="10" x2="290" y1="26" y2="26" className="thresh" />
        <polyline points={pts.map((p) => p.join(',')).join(' ')} className="line" />
        {pts.map(([x, y], i) => (<g key={i}><circle cx={x} cy={y} r="3" className="dot" /><text x={x} y={y - 7} textAnchor="middle">{values[i]}</text></g>))}
      </svg>
      <p className="trail">{values.join(' → ')}</p>
    </div>
  )
}

export default function Dashboard({ actions, selected, onSelect }) {
  const last = actions[actions.length - 1]
  const blocked = actions.filter((a) => a.decision === 'BLOCK').length
  const stats = [
    ['Intent alignment', last ? `${Math.round(last.intent_alignment)}%` : '–'],
    ['Current risk', last ? `${Math.round(last.risk_score)}%` : '–'],
    ['Actions evaluated', actions.length],
    ['Blocked actions', blocked],
  ]
  return (
    <>
      <div className="stats">
        {stats.map(([k, v]) => (<div className="stat" key={k}><span>{k}</span><strong>{v}</strong></div>))}
        {last && <RiskMeter value={last.risk_score} />}
      </div>
      <div className="grid">
        <section className="panel"><h2>Execution timeline</h2>
          <ExecutionTimeline actions={actions} selectedId={selected?.id} onSelect={onSelect} /></section>
        <section className="panel"><h2>Decision</h2><DecisionCard action={selected} /></section>
      </div>
      <section className="panel"><h2>Intent drift</h2><DriftChart values={actions.map((a) => Math.round(a.intent_alignment))} /></section>
    </>
  )
}
