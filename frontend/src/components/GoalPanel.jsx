export default function GoalPanel({ goalText, setGoalText, session, busy, onSetGoal, onRun }) {
  const g = session?.goal
  return (
    <section className="panel goal">
      <h2>User goal</h2>
      <textarea value={goalText} onChange={(e) => setGoalText(e.target.value)} rows={2} />
      <div className="row">
        <button className="secondary" disabled={busy} onClick={onSetGoal}>Set goal</button>
        <button disabled={busy} onClick={onRun}>{busy ? 'Running…' : 'Run simulated agent'}</button>
      </div>
      {g && (
        <dl className="parsed">
          <dt>Objective</dt><dd>{g.objective}</dd>
          <dt>Budget</dt><dd>{g.budget_limit ? `₹${g.budget_limit.toLocaleString('en-IN')}` : 'none'}</dd>
          <dt>Requirements</dt><dd>{g.requirements.join(', ') || 'none'}</dd>
          <dt>Off limits</dt><dd>{g.restricted_domains.join(', ')}</dd>
        </dl>
      )}
    </section>
  )
}
