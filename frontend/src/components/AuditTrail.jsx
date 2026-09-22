import { useState } from 'react'

export default function AuditTrail({ actions = [], onSelect }) {
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const allowedCount = actions.filter((a) => a.decision === 'ALLOW').length
  const reviewCount = actions.filter((a) => a.decision === 'REVIEW').length
  const blockedCount = actions.filter((a) => a.decision === 'BLOCK').length

  const filtered = actions.filter((a) => {
    if (filter !== 'ALL' && a.decision !== filter) return false
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      const matchId = `ag-${String(a.id).padStart(4, '0')}`.includes(q)
      const matchTarget = a.target?.toLowerCase().includes(q)
      const matchAction = a.action?.toLowerCase().includes(q)
      const matchReason = a.reason?.toLowerCase().includes(q)
      const matchExpl = (a.details?.explanation?.summary || a.details?.reason_text || '').toLowerCase().includes(q)
      if (!matchId && !matchTarget && !matchAction && !matchReason && !matchExpl) return false
    }
    return true
  })

  return (
    <div className="panel audit-panel">
      {/* Header with Title and Subtitle */}
      <div className="audit-header">
        <div className="audit-header-titles">
          <div className="audit-badge-row">
            <span className="audit-system-badge">SECURITY AUDIT ENGINE</span>
            <span className="audit-count-badge">{actions.length} Total Events</span>
          </div>
          <h2>Security Audit Trail</h2>
          <p className="audit-subtitle">
            Immutable runtime security log of all intercepted actions, intent evaluations, and firewall decisions.
          </p>
        </div>

        {/* Search & Filter Controls */}
        <div className="audit-controls">
          <div className="audit-search-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search ID, action, target, or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="audit-search-input"
            />
            {search && (
              <button className="clear-search-btn" onClick={() => setSearch('')} title="Clear search">
                ✕
              </button>
            )}
          </div>

          <div className="audit-filter-pills">
            <button
              className={`audit-filter-btn ${filter === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilter('ALL')}
            >
              All <span className="pill-count">{actions.length}</span>
            </button>
            <button
              className={`audit-filter-btn allow ${filter === 'ALLOW' ? 'active' : ''}`}
              onClick={() => setFilter('ALLOW')}
            >
              Allow <span className="pill-count">{allowedCount}</span>
            </button>
            <button
              className={`audit-filter-btn review ${filter === 'REVIEW' ? 'active' : ''}`}
              onClick={() => setFilter('REVIEW')}
            >
              Review <span className="pill-count">{reviewCount}</span>
            </button>
            <button
              className={`audit-filter-btn block ${filter === 'BLOCK' ? 'active' : ''}`}
              onClick={() => setFilter('BLOCK')}
            >
              Block <span className="pill-count">{blockedCount}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Strip */}
      <div className="audit-summary-strip">
        <div className="audit-summary-card">
          <span className="summary-label">TOTAL ACTIONS</span>
          <strong className="summary-val">{actions.length}</strong>
          <span className="summary-hint">Captured in session</span>
        </div>
        <div className="audit-summary-card allow">
          <span className="summary-label">AUTOMATIC ALLOW</span>
          <strong className="summary-val text-green">{allowedCount}</strong>
          <span className="summary-hint">{actions.length ? Math.round((allowedCount / actions.length) * 100) : 0}% of traffic</span>
        </div>
        <div className="audit-summary-card review">
          <span className="summary-label">HUMAN REVIEW</span>
          <strong className="summary-val text-amber">{reviewCount}</strong>
          <span className="summary-hint">Required oversight</span>
        </div>
        <div className="audit-summary-card block">
          <span className="summary-label">INTERCEPTED / BLOCKED</span>
          <strong className="summary-val text-red">{blockedCount}</strong>
          <span className="summary-hint">Threats prevented</span>
        </div>
      </div>

      {/* Main Grid Logs Content */}
      {!filtered.length ? (
        <div className="audit-empty-box">
          <div className="empty-icon">📂</div>
          <p className="empty-title">No audit records match the current filter</p>
          <p className="empty-sub">
            {search ? `No records found for query "${search}". Try resetting the search or filter.` : 'Execute actions or run the security demo to generate audit telemetry.'}
          </p>
          {(filter !== 'ALL' || search) && (
            <button
              className="secondary reset-filter-btn"
              onClick={() => {
                setFilter('ALL')
                setSearch('')
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="audit-table-wrapper">
          {/* Header Row */}
          <div className="audit-grid-header">
            <span className="col-id">Action ID</span>
            <span className="col-action">Action & Target</span>
            <span className="col-decision">Decision</span>
            <span className="col-scores">Scores</span>
            <span className="col-drift">Drift</span>
            <span className="col-exec">Execution</span>
            <span className="col-reason">Reason Summary</span>
            <span className="col-details">Details</span>
          </div>

          {/* Log Rows */}
          <div className="audit-grid-body">
            {filtered.map((a) => {
              const dec = a.decision.toLowerCase()
              const drift = (a.details?.drift?.severity || a.drift_level || 'STABLE').toUpperCase()
              const timeStr = a.timestamp ? a.timestamp.split('T')[1]?.slice(0, 8) : '–'
              const explanation = a.details?.explanation?.summary || a.details?.reason_text || a.reason || 'Standard policy evaluation.'
              const price = a.parameters?.price

              return (
                <div
                  key={a.id}
                  className={`audit-grid-row ${dec}`}
                  onClick={() => onSelect && onSelect(a)}
                  title="Click to inspect telemetry in firewall dashboard"
                >
                  {/* ID & Timestamp */}
                  <div className="col-id">
                    <span className="audit-id-badge">AG-{String(a.id).padStart(4, '0')}</span>
                    <span className="audit-time-text">{timeStr}</span>
                  </div>

                  {/* Action & Target */}
                  <div className="col-action">
                    <div className="action-target-row">
                      <span className="action-verb-badge">{a.action}</span>
                      <span className="target-name" title={a.target}>{a.target}</span>
                    </div>
                    {price && (
                      <span className="param-sub-pill">
                        Param: ₹{Number(price).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Decision */}
                  <div className="col-decision">
                    <span className={`decision-pill-badge ${dec}`}>
                      {dec === 'allow' && <span className="decision-icon">✓</span>}
                      {dec === 'review' && <span className="decision-icon">⚠</span>}
                      {dec === 'block' && <span className="decision-icon">✕</span>}
                      {a.decision}
                    </span>
                  </div>

                  {/* Scores */}
                  <div className="col-scores">
                    <div className="score-stacked">
                      <div className="score-row">
                        <span className="score-label">Intent:</span>
                        <span className="score-num align">{Math.round(a.intent_alignment)}%</span>
                      </div>
                      <div className="score-row">
                        <span className="score-label">Risk:</span>
                        <span className={`score-num risk ${a.risk_score >= 65 ? 'high' : a.risk_score >= 30 ? 'med' : 'low'}`}>
                          {Math.round(a.risk_score)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Drift */}
                  <div className="col-drift">
                    <span className={`audit-drift-pill ${drift.toLowerCase()}`}>
                      {drift}
                    </span>
                  </div>

                  {/* Execution */}
                  <div className="col-exec">
                    <span className={`audit-exec-pill ${a.executed ? 'yes' : 'no'}`}>
                      {a.executed ? '✓ Executed' : '✕ Blocked'}
                    </span>
                  </div>

                  {/* Reason Summary */}
                  <div className="col-reason">
                    <p className="reason-summary-text" title={explanation}>
                      {explanation}
                    </p>
                  </div>

                  {/* Details / Inspect */}
                  <div className="col-details">
                    <button
                      className="audit-expand-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelect && onSelect(a)
                      }}
                      title="Inspect full telemetry in dashboard"
                    >
                      Inspect →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
