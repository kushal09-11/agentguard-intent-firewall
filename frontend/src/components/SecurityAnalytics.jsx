export default function SecurityAnalytics({ actions }) {
  if (!actions.length) {
    return (
      <div className="panel">
        <h2>Security Analytics</h2>
        <p className="empty">No session data to analyze yet. Run the security demo to view telemetry.</p>
      </div>
    )
  }

  const total = actions.length
  const allowed = actions.filter((a) => a.decision === 'ALLOW').length
  const reviewed = actions.filter((a) => a.decision === 'REVIEW').length
  const blocked = actions.filter((a) => a.decision === 'BLOCK').length

  const avgAlign = Math.round(actions.reduce((acc, a) => acc + a.intent_alignment, 0) / total)
  const avgRisk = Math.round(actions.reduce((acc, a) => acc + a.risk_score, 0) / total)

  let maxDrift = 0
  let sensitiveAttempts = 0
  let injectionAttempts = 0

  actions.forEach((a) => {
    const d = a.details || {}
    const driftScore = d.drift?.drift_score || 0
    if (driftScore > maxDrift) maxDrift = driftScore
    if (d.sensitivity === 'HIGH' || d.sensitivity === 'CRITICAL') sensitiveAttempts++
    if (d.prompt_injection?.detected) injectionAttempts++
  })

  // SVG Chart points for multi-line comparison over steps
  const width = 500
  const height = 180
  const padding = 30

  const getPoints = (values) => {
    if (values.length < 2) return ''
    return values
      .map((v, i) => {
        const x = padding + (i * (width - 2 * padding)) / (values.length - 1)
        const y = height - padding - (v * (height - 2 * padding)) / 100
        return `${x},${y}`
      })
      .join(' ')
  }

  const alignmentValues = actions.map((a) => Math.round(a.intent_alignment))
  const riskValues = actions.map((a) => Math.round(a.risk_score))
  const driftValues = actions.map((a) => Math.round(a.details?.drift?.drift_score || 0))

  return (
    <div className="analytics-view">
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Actions</span>
          <strong className="kpi-value">{total}</strong>
          <span className="kpi-sub">Runtime Intercepted</span>
        </div>
        <div className="kpi-card allow">
          <span className="kpi-label">Allowed</span>
          <strong className="kpi-value">{allowed}</strong>
          <span className="kpi-sub">{Math.round((allowed / total) * 100)}% Execution rate</span>
        </div>
        <div className="kpi-card review">
          <span className="kpi-label">Reviewed</span>
          <strong className="kpi-value">{reviewed}</strong>
          <span className="kpi-sub">Human Oversight Required</span>
        </div>
        <div className="kpi-card block">
          <span className="kpi-label">Blocked</span>
          <strong className="kpi-value">{blocked}</strong>
          <span className="kpi-sub">Threat Interceptions</span>
        </div>
      </div>

      <div className="kpi-grid secondary">
        <div className="kpi-card">
          <span className="kpi-label">Average Alignment</span>
          <strong className="kpi-value">{avgAlign}%</strong>
          <span className="kpi-sub">Intent Trajectory</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Average Risk</span>
          <strong className="kpi-value">{avgRisk}%</strong>
          <span className="kpi-sub">Operational Safety</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Max Drift Score</span>
          <strong className="kpi-value text-red">{Math.round(maxDrift)}</strong>
          <span className="kpi-sub">Trajectory Divergence</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Security Threats</span>
          <strong className="kpi-value text-red">
            {sensitiveAttempts + injectionAttempts}
          </strong>
          <span className="kpi-sub">
            {sensitiveAttempts} Sensitive · {injectionAttempts} Injections
          </span>
        </div>
      </div>

      <div className="panel chart-panel">
        <div className="chart-header">
          <div>
            <h2>Intent Drift & Risk Trajectory Telemetry</h2>
            <p className="chart-desc">
              Real-time correlation showing intent degradation, increasing drift, and risk escalation triggering firewall intervention.
            </p>
          </div>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-dot align" /> Intent Alignment</span>
            <span className="legend-item"><span className="legend-dot risk" /> Contextual Risk</span>
            <span className="legend-item"><span className="legend-dot drift" /> Intent Drift</span>
          </div>
        </div>

        {actions.length >= 2 ? (
          <div className="svg-container">
            <svg viewBox={`0 0 ${width} ${height}`} className="telemetry-chart">
              {/* Threshold lines */}
              <line x1={padding} y1={height - padding - (65 * (height - 2 * padding)) / 100} x2={width - padding} y2={height - padding - (65 * (height - 2 * padding)) / 100} className="thresh-block" />
              <text x={width - padding - 80} y={height - padding - (65 * (height - 2 * padding)) / 100 - 4} className="thresh-label">BLOCK (65%)</text>

              <line x1={padding} y1={height - padding - (30 * (height - 2 * padding)) / 100} x2={width - padding} y2={height - padding - (30 * (height - 2 * padding)) / 100} className="thresh-review" />
              <text x={width - padding - 80} y={height - padding - (30 * (height - 2 * padding)) / 100 - 4} className="thresh-label">REVIEW (30%)</text>

              {/* Data polylines */}
              <polyline points={getPoints(alignmentValues)} className="line-align" />
              <polyline points={getPoints(riskValues)} className="line-risk" />
              <polyline points={getPoints(driftValues)} className="line-drift" />

              {/* Data points */}
              {actions.map((_, i) => {
                const x = padding + (i * (width - 2 * padding)) / (actions.length - 1)
                const yAlign = height - padding - (alignmentValues[i] * (height - 2 * padding)) / 100
                const yRisk = height - padding - (riskValues[i] * (height - 2 * padding)) / 100
                return (
                  <g key={i}>
                    <circle cx={x} cy={yAlign} r="3.5" className="dot-align" />
                    <circle cx={x} cy={yRisk} r="3.5" className="dot-risk" />
                    <text x={x} y={height - 10} className="axis-label" textAnchor="middle">
                      Step {i + 1}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        ) : (
          <p className="empty">Chart activates after 2 or more actions are evaluated.</p>
        )}
      </div>

      <div className="panel breakdown-panel">
        <h2>Enforcement Ratio</h2>
        <div className="distribution-bar">
          <div className="dist-seg allow" style={{ width: `${(allowed / total) * 100}%` }} title={`Allowed: ${allowed}`} />
          <div className="dist-seg review" style={{ width: `${(reviewed / total) * 100}%` }} title={`Reviewed: ${reviewed}`} />
          <div className="dist-seg block" style={{ width: `${(blocked / total) * 100}%` }} title={`Blocked: ${blocked}`} />
        </div>
        <div className="dist-labels">
          <span>{allowed} Allowed ({Math.round((allowed / total) * 100)}%)</span>
          <span>{reviewed} Under Review ({Math.round((reviewed / total) * 100)}%)</span>
          <span>{blocked} Blocked ({Math.round((blocked / total) * 100)}%)</span>
        </div>
      </div>
    </div>
  )
}
