export default function GoalPanel({
  goalText,
  setGoalText,
  session,
  busy,
  onSetGoal,
  onRunFullDemo,
}) {
  const g = session?.goal

  return (
    <section className="panel goal-panel">
      <div className="panel-heading-row">
        <h2>User Goal Specification</h2>
        {session && <span className="session-id-pill">AG-{session.session_id}</span>}
      </div>

      <textarea
        value={goalText}
        onChange={(e) => setGoalText(e.target.value)}
        rows={2}
        placeholder="Enter user goal e.g. Find a programming laptop under ₹60,000 with 16GB RAM."
        className="goal-textarea"
      />

      <div className="goal-actions-row">
        <button className="secondary" disabled={busy} onClick={onSetGoal} title="Set Goal">
          Set Goal
        </button>
        <button className="primary demo-btn" disabled={busy} onClick={onRunFullDemo} title="Run Security">
          {busy ? 'Evaluating...' : '🛡️ Run Security'}
        </button>
      </div>

      {g && (
        <div className="parsed-intent-box">
          <div className="intent-chips-row">
            <span className="intent-chip">
              <span className="chip-key">Objective:</span> {g.objective}
            </span>
            {g.budget_limit && (
              <span className="intent-chip highlight">
                <span className="chip-key">Budget:</span> ₹{g.budget_limit.toLocaleString('en-IN')}
              </span>
            )}
            {g.requirements?.length > 0 && (
              <span className="intent-chip">
                <span className="chip-key">Specs:</span> {g.requirements.join(' • ')}
              </span>
            )}
            {g.restricted_domains?.length > 0 && (
              <span className="intent-chip restricted">
                <span className="chip-key">Off-limits:</span> {g.restricted_domains.slice(0, 3).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
