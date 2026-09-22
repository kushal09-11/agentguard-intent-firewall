import { useState } from 'react'

export default function SecurityAnalytics({ actions = [], onSelect }) {
  const [hoveredIdx, setHoveredIdx] = useState(null)

  if (!actions.length) {
    return (
      <div className="panel chart-panel">
        <h2>Security Analytics</h2>
        <p className="empty">No session data to analyze yet. Run the security demo or execute agent actions to view telemetry.</p>
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

  // SVG Chart Dimensions (1000 x 280 viewBox keeps fonts crisp at 10-12px)
  const svgWidth = 1000
  const svgHeight = 280
  const padLeft = 60
  const padRight = 50
  const padTop = 35
  const padBottom = 50
  const chartW = svgWidth - padLeft - padRight
  const chartH = svgHeight - padTop - padBottom

  const getY = (val) => padTop + chartH - (Math.max(0, Math.min(100, val)) / 100) * chartH
  const getX = (i) => (actions.length > 1 ? padLeft + (i * chartW) / (actions.length - 1) : padLeft + chartW / 2)

  const alignmentValues = actions.map((a) => Math.round(a.intent_alignment))
  const riskValues = actions.map((a) => Math.round(a.risk_score))
  const driftValues = actions.map((a) => Math.round(a.details?.drift?.drift_score || 0))

  const getPointsStr = (values) => values.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' ')

  const getAreaPath = (values) => {
    if (values.length < 2) return ''
    const baselineY = (padTop + chartH).toFixed(1)
    const pts = values.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`)
    return `M ${getX(0).toFixed(1)},${baselineY} L ${pts.join(' L ')} L ${getX(values.length - 1).toFixed(1)},${baselineY} Z`
  }

  const yBlock = getY(65)
  const yReview = getY(30)

  const activeAction = hoveredIdx !== null ? actions[hoveredIdx] : null

  return (
    <div className="analytics-view">
      {/* Primary KPI Strip */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Actions</span>
          <strong className="kpi-value">{total}</strong>
          <span className="kpi-sub">Runtime Intercepted</span>
        </div>
        <div className="kpi-card allow">
          <span className="kpi-label">Allowed</span>
          <strong className="kpi-value text-green">{allowed}</strong>
          <span className="kpi-sub">{Math.round((allowed / total) * 100)}% Execution rate</span>
        </div>
        <div className="kpi-card review">
          <span className="kpi-label">Reviewed</span>
          <strong className="kpi-value text-amber">{reviewed}</strong>
          <span className="kpi-sub">Human Oversight Required</span>
        </div>
        <div className="kpi-card block">
          <span className="kpi-label">Blocked</span>
          <strong className="kpi-value text-red">{blocked}</strong>
          <span className="kpi-sub">Threat Interceptions</span>
        </div>
      </div>

      {/* Secondary KPI Strip */}
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
          <strong className="kpi-value text-red">{sensitiveAttempts + injectionAttempts}</strong>
          <span className="kpi-sub">
            {sensitiveAttempts} Sensitive · {injectionAttempts} Injections
          </span>
        </div>
      </div>

      {/* Trajectory Telemetry Chart Card */}
      <div className="panel chart-panel">
        <div className="chart-header">
          <div>
            <h2>Intent Drift &amp; Risk Trajectory Telemetry</h2>
            <p className="chart-desc">
              Real-time correlation showing intent degradation, increasing drift, and risk escalation triggering firewall intervention.
            </p>
          </div>
          <div className="chart-legend">
            <span className="legend-item">
              <span className="legend-marker align" /> Intent Alignment
            </span>
            <span className="legend-item">
              <span className="legend-marker risk" /> Contextual Risk
            </span>
            <span className="legend-item">
              <span className="legend-marker drift" /> Intent Drift
            </span>
            <span className="legend-item">
              <span className="legend-marker thresh-block" /> Block (≥65%)
            </span>
            <span className="legend-item">
              <span className="legend-marker thresh-review" /> Review (≥30%)
            </span>
          </div>
        </div>

        {/* Real-time Hover Telemetry HUD */}
        <div className="telemetry-hover-hud">
          {activeAction ? (
            <div className="hud-content">
              <span className="hud-step">
                STEP {hoveredIdx + 1}: AG-{String(activeAction.id).padStart(4, '0')}
              </span>
              <span className="hud-action">
                {activeAction.action?.toUpperCase()} &ldquo;{activeAction.target}&rdquo;
              </span>
              <span className={`hud-badge ${activeAction.decision.toLowerCase()}`}>
                {activeAction.decision}
              </span>
              <div className="hud-metrics">
                <span className="hud-metric align">
                  Alignment: <strong>{alignmentValues[hoveredIdx]}%</strong>
                </span>
                <span className="hud-metric risk">
                  Risk: <strong>{riskValues[hoveredIdx]}%</strong>
                </span>
                <span className="hud-metric drift">
                  Drift: <strong>{driftValues[hoveredIdx]}</strong>
                </span>
              </div>
            </div>
          ) : (
            <div className="hud-idle">
              <span>💡 Hover over any step column or data point to inspect instant security telemetry.</span>
            </div>
          )}
        </div>

        {actions.length >= 2 ? (
          <div className="svg-container">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="telemetry-chart"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Security Telemetry Trajectory Chart"
            >
              <defs>
                <linearGradient id="alignFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="riskFillGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y-Axis Grid Lines & Percentage Labels */}
              {[0, 25, 50, 75, 100].map((val) => {
                const y = getY(val)
                return (
                  <g key={val}>
                    <line
                      x1={padLeft}
                      y1={y}
                      x2={padLeft + chartW}
                      y2={y}
                      stroke="rgba(255, 255, 255, 0.06)"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padLeft - 12}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="#64748b"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                    >
                      {val}%
                    </text>
                  </g>
                )
              })}

              {/* Threshold Lines & Badges */}
              {/* BLOCK Threshold (65%) */}
              <line
                x1={padLeft}
                y1={yBlock}
                x2={padLeft + chartW}
                y2={yBlock}
                stroke="rgba(239, 68, 68, 0.5)"
                strokeDasharray="5 4"
                strokeWidth="1.5"
              />
              <g transform={`translate(${padLeft + chartW - 136}, ${yBlock - 17})`}>
                <rect
                  width="136"
                  height="17"
                  rx="4"
                  fill="rgba(239, 68, 68, 0.16)"
                  stroke="rgba(239, 68, 68, 0.35)"
                  strokeWidth="1"
                />
                <text
                  x="68"
                  y="12"
                  textAnchor="middle"
                  fill="#f87171"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  BLOCK THRESHOLD (65%)
                </text>
              </g>

              {/* REVIEW Threshold (30%) */}
              <line
                x1={padLeft}
                y1={yReview}
                x2={padLeft + chartW}
                y2={yReview}
                stroke="rgba(245, 158, 11, 0.5)"
                strokeDasharray="5 4"
                strokeWidth="1.5"
              />
              <g transform={`translate(${padLeft + chartW - 136}, ${yReview - 17})`}>
                <rect
                  width="136"
                  height="17"
                  rx="4"
                  fill="rgba(245, 158, 11, 0.16)"
                  stroke="rgba(245, 158, 11, 0.35)"
                  strokeWidth="1"
                />
                <text
                  x="68"
                  y="12"
                  textAnchor="middle"
                  fill="#fbbf24"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  REVIEW THRESHOLD (30%)
                </text>
              </g>

              {/* Area Gradient Fills */}
              <path d={getAreaPath(alignmentValues)} fill="url(#alignFillGrad)" />
              <path d={getAreaPath(riskValues)} fill="url(#riskFillGrad)" />

              {/* Polylines for Trajectories (fill="none" strictly enforced) */}
              <polyline
                points={getPointsStr(alignmentValues)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={getPointsStr(riskValues)}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                points={getPointsStr(driftValues)}
                fill="none"
                stroke="#818cf8"
                strokeWidth="2"
                strokeDasharray="4 3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Step X-Guides & Labels */}
              {actions.map((a, i) => {
                const x = getX(i)
                const isHovered = hoveredIdx === i
                return (
                  <g key={`step-${i}`}>
                    <line
                      x1={x}
                      y1={padTop}
                      x2={x}
                      y2={padTop + chartH}
                      stroke={isHovered ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.05)'}
                      strokeDasharray={isHovered ? 'none' : '3 3'}
                      strokeWidth={isHovered ? '1.5' : '1'}
                    />
                    <text
                      x={x}
                      y={padTop + chartH + 18}
                      textAnchor="middle"
                      fill={isHovered ? '#38bdf8' : '#94a3b8'}
                      fontSize="11"
                      fontWeight={isHovered ? '700' : '600'}
                      fontFamily="var(--font-mono)"
                    >
                      Step {i + 1}
                    </text>
                    <text
                      x={x}
                      y={padTop + chartH + 32}
                      textAnchor="middle"
                      fill={isHovered ? '#e2e8f0' : '#64748b'}
                      fontSize="9"
                      fontWeight="600"
                      fontFamily="var(--font-mono)"
                    >
                      {a.action?.toUpperCase().slice(0, 7)}
                    </text>
                  </g>
                )
              })}

              {/* Data Node Points */}
              {actions.map((a, i) => {
                const x = getX(i)
                const yAlign = getY(alignmentValues[i])
                const yRisk = getY(riskValues[i])
                const yDrift = getY(driftValues[i])
                const isHovered = hoveredIdx === i

                return (
                  <g key={`nodes-${i}`}>
                    <circle
                      cx={x}
                      cy={yAlign}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#10b981"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <circle
                      cx={x}
                      cy={yRisk}
                      r={isHovered ? 5.5 : 3.5}
                      fill="#ef4444"
                      stroke="#0f172a"
                      strokeWidth="2"
                    />
                    <circle
                      cx={x}
                      cy={yDrift}
                      r={isHovered ? 4.5 : 2.5}
                      fill="#818cf8"
                      stroke="#0f172a"
                      strokeWidth="1.5"
                    />
                  </g>
                )
              })}

              {/* Invisible Hit Boxes for Clean Mouse Hover Interactivity */}
              {actions.map((a, i) => {
                const x = getX(i)
                const colW = actions.length > 1 ? chartW / (actions.length - 1) : chartW
                return (
                  <rect
                    key={`hitbox-${i}`}
                    x={x - colW / 2}
                    y={padTop}
                    width={colW}
                    height={chartH + padBottom}
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredIdx(i)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => onSelect && onSelect(a)}
                  />
                )
              })}
            </svg>
          </div>
        ) : (
          <p className="empty">Chart activates after 2 or more actions are evaluated.</p>
        )}
      </div>

      {/* Enforcement Distribution Bar */}
      <div className="panel breakdown-panel">
        <div className="breakdown-header">
          <h3>Enforcement Distribution</h3>
          <span className="breakdown-total">{total} Total Interceptions Analyzed</span>
        </div>
        <div className="distribution-bar">
          <div
            className="dist-seg allow"
            style={{ width: `${(allowed / total) * 100}%` }}
            title={`Allowed: ${allowed} (${Math.round((allowed / total) * 100)}%)`}
          />
          <div
            className="dist-seg review"
            style={{ width: `${(reviewed / total) * 100}%` }}
            title={`Reviewed: ${reviewed} (${Math.round((reviewed / total) * 100)}%)`}
          />
          <div
            className="dist-seg block"
            style={{ width: `${(blocked / total) * 100}%` }}
            title={`Blocked: ${blocked} (${Math.round((blocked / total) * 100)}%)`}
          />
        </div>
        <div className="dist-labels">
          <span className="dist-badge allow">✓ {allowed} Allowed ({Math.round((allowed / total) * 100)}%)</span>
          <span className="dist-badge review">⚠ {reviewed} Under Review ({Math.round((reviewed / total) * 100)}%)</span>
          <span className="dist-badge block">✕ {blocked} Blocked ({Math.round((blocked / total) * 100)}%)</span>
        </div>
      </div>
    </div>
  )
}
