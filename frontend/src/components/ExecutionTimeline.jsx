const ICON = { ALLOW: '✓', REVIEW: '⚠', BLOCK: '✕' }

export default function ExecutionTimeline({ actions, selectedId, onSelect }) {
  if (!actions.length) {
    return <p className="empty">No actions yet. Run the security demo or send a custom action above.</p>
  }

  return (
    <ol className="timeline">
      {actions.map((a, idx) => {
        const dec = a.decision.toLowerCase()
        const isSel = a.id === selectedId
        const review = a.human_review_status
        const drift = a.details?.drift?.severity || a.drift_level

        return (
          <li key={a.id}>
            <button
              className={`step ${dec} ${isSel ? 'sel' : ''}`}
              onClick={() => onSelect(a)}
              title={`Click to inspect action #${idx + 1}`}
            >
              <span className={`icon ${dec}`}>{ICON[a.decision] || '•'}</span>
              <span className="name">
                <span className="mono text-muted" style={{ marginRight: 6 }}>#{idx + 1}</span>
                {a.action} <strong>{a.target}</strong>
              </span>
              <span className="num">Intent: {Math.round(a.intent_alignment)}%</span>
              <span className="num">Risk: {Math.round(a.risk_score)}%</span>
              <span className={`tag ${dec}`}>{a.decision}</span>
              {review && review !== 'NONE' && (
                <span className={`review-badge ${review.toLowerCase()}`} style={{ marginLeft: 4 }}>
                  {review}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ol>
  )
}
