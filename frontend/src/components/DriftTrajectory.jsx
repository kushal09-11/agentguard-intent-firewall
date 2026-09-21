export default function DriftTrajectory({ actions = [], selectedId, onSelect }) {
  const hasActions = actions.length > 0
  const last = hasActions ? actions[actions.length - 1] : null
  const driftData = last?.details?.drift || {}
  const trend = driftData.trend || 'STABLE'
  const severity = (driftData.severity || last?.drift_level || 'STABLE').toUpperCase()
  const streak = driftData.consecutive_off_goal_actions || 0
  const currentAlignment = last ? Math.round(last.intent_alignment) : 100

  // Chart dimensions
  const svgWidth = 960
  const svgHeight = 160
  const padLeft = 50
  const padRight = 40
  const padTop = 25
  const padBottom = 35
  const chartW = svgWidth - padLeft - padRight
  const chartH = svgHeight - padTop - padBottom

  // Y-scale: 0% -> padTop + chartH, 100% -> padTop
  const getY = (val) => padTop + chartH - (val / 100) * chartH
  const safeY = getY(70)
  const warnY = getY(40)

  // Points calculation
  const points = actions.map((a, i) => {
    const x = actions.length === 1
      ? padLeft + chartW / 2
      : padLeft + (i * chartW) / (actions.length - 1)
    const val = Math.round(a.intent_alignment)
    const y = getY(val)
    return {
      x,
      y,
      val,
      action: a,
      decision: a.decision,
      index: i + 1,
    }
  })

  const polylineStr = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPathStr = points.length > 1
    ? `M ${points[0].x.toFixed(1)},${(padTop + chartH).toFixed(1)} ` +
      points.map((p) => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L ${points[points.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`
    : ''

  const getDecisionColor = (decision) => {
    if (decision === 'ALLOW') return '#2ea043'
    if (decision === 'REVIEW') return '#d29922'
    return '#f85149'
  }

  return (
    <div className="drift-trajectory-container">
      <div className="drift-telemetry-header">
        <div className="drift-meta-left">
          <div className="drift-metric-item">
            <span className="drift-label">CURRENT ALIGNMENT</span>
            <strong className={`drift-value ${currentAlignment < 40 ? 'text-red' : currentAlignment < 70 ? 'text-amber' : 'text-green'}`}>
              {currentAlignment}%
            </strong>
          </div>
          <div className="drift-metric-item">
            <span className="drift-label">STATUS</span>
            <span className={`drift-badge-pill ${severity.toLowerCase()}`}>
              {severity}
            </span>
          </div>
          <div className="drift-metric-item">
            <span className="drift-label">TRAJECTORY TREND</span>
            <strong className="drift-trend-val">{trend}</strong>
          </div>
          {streak > 0 && (
            <div className="drift-metric-item">
              <span className="drift-label">OFF-GOAL STREAK</span>
              <span className="drift-streak-badge">{streak} actions</span>
            </div>
          )}
        </div>

        <div className="drift-legend">
          <span className="legend-item"><span className="legend-dot safe" /> Safe Zone (≥70%)</span>
          <span className="legend-item"><span className="legend-dot warn" /> Review / Caution (40-70%)</span>
          <span className="legend-item"><span className="legend-dot crit" /> Critical Drift (&lt;40%)</span>
        </div>
      </div>

      <div className="drift-svg-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="drift-svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Intent alignment drift trajectory"
        >
          <defs>
            <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#388bfd" stopOpacity="0.35" />
              <stop offset="70%" stopColor="#a371f7" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#a371f7" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#388bfd" />
              <stop offset="50%" stopColor="#a371f7" />
              <stop offset="100%" stopColor="#f85149" />
            </linearGradient>
          </defs>

          {/* Background grid lines */}
          <line x1={padLeft} x2={svgWidth - padRight} y1={padTop} y2={padTop} stroke="#30363d" strokeDasharray="3 3" opacity="0.5" />
          <text x={padLeft - 8} y={padTop + 4} textAnchor="end" className="svg-axis-label">100%</text>

          <line x1={padLeft} x2={svgWidth - padRight} y1={safeY} y2={safeY} stroke="rgba(46, 160, 67, 0.4)" strokeDasharray="4 4" />
          <text x={padLeft - 8} y={safeY + 4} textAnchor="end" className="svg-axis-label text-green">70%</text>

          <line x1={padLeft} x2={svgWidth - padRight} y1={warnY} y2={warnY} stroke="rgba(248, 81, 73, 0.4)" strokeDasharray="4 4" />
          <text x={padLeft - 8} y={warnY + 4} textAnchor="end" className="svg-axis-label text-red">40%</text>

          <line x1={padLeft} x2={svgWidth - padRight} y1={padTop + chartH} y2={padTop + chartH} stroke="#30363d" />
          <text x={padLeft - 8} y={padTop + chartH + 4} textAnchor="end" className="svg-axis-label">0%</text>

          {/* Area fill */}
          {areaPathStr && (
            <path d={areaPathStr} fill="url(#driftGradient)" />
          )}

          {/* Trajectory line */}
          {points.length > 1 && (
            <polyline
              points={polylineStr}
              fill="none"
              stroke="#58a6ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Points */}
          {points.map((p) => {
            const isSel = p.action.id === selectedId
            const color = getDecisionColor(p.decision)
            return (
              <g
                key={p.action.id}
                className="drift-point-group"
                onClick={() => onSelect && onSelect(p.action)}
                style={{ cursor: 'pointer' }}
              >
                {/* Selection halo */}
                {isSel && (
                  <circle cx={p.x} cy={p.y} r="10" fill="none" stroke="#fff" strokeWidth="1.5" opacity="0.8" />
                )}
                <circle cx={p.x} cy={p.y} r={isSel ? 5.5 : 4} fill={color} stroke="#161b22" strokeWidth="2" />
                <text
                  x={p.x}
                  y={p.y - 10}
                  textAnchor="middle"
                  className="svg-point-label"
                  fill={color}
                >
                  {p.val}%
                </text>
                <text
                  x={p.x}
                  y={padTop + chartH + 16}
                  textAnchor="middle"
                  className="svg-step-label"
                >
                  #{p.index} {p.action.action}
                </text>
              </g>
            )
          })}

          {/* Empty state overlay */}
          {!hasActions && (
            <g>
              <line
                x1={padLeft}
                x2={svgWidth - padRight}
                y1={getY(100)}
                y2={getY(100)}
                stroke="#388bfd"
                strokeWidth="2"
                strokeDasharray="5 5"
                opacity="0.6"
              />
              <circle cx={padLeft + chartW / 2} cy={getY(100)} r="5" fill="#388bfd" />
              <text
                x={padLeft + chartW / 2}
                y={padTop + chartH / 2 + 4}
                textAnchor="middle"
                className="svg-empty-msg"
              >
                Baseline established at 100% intent alignment. Sequential actions will plot real-time trajectory.
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
