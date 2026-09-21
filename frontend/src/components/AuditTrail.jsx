import { useState } from 'react'

export default function AuditTrail({ actions, onSelect }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = actions.filter((a) => {
    if (filter !== 'ALL' && a.decision !== filter) return false
    if (search) {
      const q = search.toLowerCase()
      const matchTarget = a.target?.toLowerCase().includes(q)
      const matchAction = a.action?.toLowerCase().includes(q)
      const matchReason = a.reason?.toLowerCase().includes(q)
      if (!matchTarget && !matchAction && !matchReason) return false
    }
    return true
  })

  return (
    <div className="panel audit-panel">
      <div className="audit-header">
        <div>
          <h2>Security Audit Trail</h2>
          <p className="audit-subtitle">
            Immutable runtime security log of all intercepted actions and policy decisions.
          </p>
        </div>
        <div className="audit-controls">
          <input
            type="text"
            placeholder="Search target, action or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="audit-search"
          />
          <div className="filter-buttons">
            {['ALL', 'ALLOW', 'REVIEW', 'BLOCK'].map((f) => (
              <button
                key={f}
                className={`filter-btn ${filter === f ? 'active' : ''} ${f.toLowerCase()}`}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!filtered.length ? (
        <p className="empty">No audit records match the current filter.</p>
      ) : (
        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
                <th>Action & Target</th>
                <th>Intent</th>
                <th>Risk</th>
                <th>Drift</th>
                <th>Decision</th>
                <th>Execution</th>
                <th>Human Review</th>
                <th>Reason Summary</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const dec = a.decision.toLowerCase()
                const drift = a.details?.drift?.severity || a.drift_level
                const timeStr = a.timestamp ? a.timestamp.split('T')[1]?.slice(0, 8) : '–'
                const explanation = a.details?.explanation?.summary || a.details?.reason_text || '–'

                return (
                  <tr
                    key={a.id}
                    className={`audit-row ${dec}`}
                    onClick={() => onSelect && onSelect(a)}
                    title="Click to view complete decision analysis"
                  >
                    <td className="mono">AG-{String(a.id).padStart(4, '0')}</td>
                    <td className="mono text-muted">{timeStr}</td>
                    <td>
                      <strong>{a.action}</strong> <span className="target-pill">{a.target}</span>
                    </td>
                    <td>{Math.round(a.intent_alignment)}%</td>
                    <td>
                      <span className={`risk-tag ${a.risk_score >= 65 ? 'high' : a.risk_score >= 30 ? 'med' : 'low'}`}>
                        {Math.round(a.risk_score)}%
                      </span>
                    </td>
                    <td>
                      <span className={`drift-badge ${drift.toLowerCase()}`}>{drift}</span>
                    </td>
                    <td>
                      <span className={`decision-pill ${dec}`}>{a.decision}</span>
                    </td>
                    <td>
                      <span className={`exec-badge ${a.executed ? 'yes' : 'no'}`}>
                        {a.executed ? 'Executed' : 'Blocked'}
                      </span>
                    </td>
                    <td>
                      <span className={`review-badge ${(a.human_review_status || 'none').toLowerCase()}`}>
                        {a.human_review_status || 'NONE'}
                      </span>
                    </td>
                    <td className="reason-cell" title={explanation}>
                      {explanation}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
