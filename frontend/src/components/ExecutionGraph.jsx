import React from 'react'

const ICON = {
  ALLOW: '✓',
  REVIEW: '⚠',
  BLOCK: '✕',
}

export default function ExecutionGraph({ goal, actions, selectedId, onSelect }) {
  if (!actions.length && !goal) {
    return (
      <div className="empty-graph">
        <p>No actions evaluated yet. Set a goal and run the security demo or evaluate an action.</p>
      </div>
    )
  }

  return (
    <div className="exec-graph-container">
      {goal && (
        <div className="graph-root-node">
          <div className="node-badge">USER GOAL</div>
          <div className="node-title">{goal.objective || 'Primary Objective'}</div>
          <div className="node-specs">
            {goal.budget_limit && <span>Max: ₹{goal.budget_limit.toLocaleString('en-IN')}</span>}
            {goal.requirements?.length > 0 && <span>Specs: {goal.requirements.join(' • ')}</span>}
          </div>
        </div>
      )}

      {actions.length > 0 && <div className="graph-stem" />}

      <div className="graph-nodes-flow">
        {actions.map((act, idx) => {
          const dec = act.decision.toLowerCase()
          const isSel = act.id === selectedId
          const isReview = act.decision === 'REVIEW' || act.human_review_status === 'PENDING'
          const reviewStatus = act.human_review_status
          const drift = act.details?.drift?.severity || act.drift_level

          return (
            <React.Fragment key={act.id}>
              <div
                className={`graph-node ${dec} ${isSel ? 'active-node' : ''}`}
                onClick={() => onSelect(act)}
                role="button"
                tabIndex={0}
              >
                <div className="node-header">
                  <span className={`node-status-icon ${dec}`}>{ICON[act.decision] || '•'}</span>
                  <span className="node-step-idx">Step {idx + 1}</span>
                  <span className="node-action-verb">{act.action}</span>
                  <span className={`node-decision-pill ${dec}`}>{act.decision}</span>
                  {reviewStatus && reviewStatus !== 'NONE' && (
                    <span className={`node-review-pill ${reviewStatus.toLowerCase()}`}>
                      {reviewStatus}
                    </span>
                  )}
                </div>

                <div className="node-body">
                  <div className="node-target-name">{act.target}</div>
                  {act.reason && <div className="node-reason-text">"{act.reason}"</div>}
                </div>

                <div className="node-metrics-bar">
                  <span className="metric-pill alignment">
                    Intent: <strong>{Math.round(act.intent_alignment)}%</strong>
                  </span>
                  <span className="metric-pill risk">
                    Risk: <strong>{Math.round(act.risk_score)}%</strong>
                  </span>
                  <span className={`metric-pill drift ${drift.toLowerCase()}`}>
                    Drift: {drift}
                  </span>
                  <span className={`metric-pill execution ${act.executed ? 'exec-yes' : 'exec-no'}`}>
                    {act.executed ? 'Tool Executed' : 'Execution Blocked'}
                  </span>
                </div>
              </div>

              {idx < actions.length - 1 && (
                <div className="graph-arrow-connector">
                  <span className="arrow-line" />
                  <span className="arrow-head">▼</span>
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
