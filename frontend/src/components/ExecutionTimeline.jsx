const ICON = { ALLOW: '✓', REVIEW: '⚠', BLOCK: '✕' }

export default function ExecutionTimeline({ actions, selectedId, onSelect }) {
  if (!actions.length) return <p className="empty">No actions yet. Run the simulated agent or send one.</p>
  return (
    <ol className="timeline">
      {actions.map((a) => (
        <li key={a.id}>
          <button className={`step ${a.decision.toLowerCase()} ${a.id === selectedId ? 'sel' : ''}`} onClick={() => onSelect(a)}>
            <span className="icon">{ICON[a.decision]}</span>
            <span className="name">{a.action} {a.target}</span>
            <span className="num">Intent {Math.round(a.intent_alignment)}</span>
            <span className="num">Risk {Math.round(a.risk_score)}</span>
            <span className="tag">{a.decision}</span>
          </button>
        </li>
      ))}
    </ol>
  )
}
