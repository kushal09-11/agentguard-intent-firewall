import { useState } from 'react'
import GoalPanel from './components/GoalPanel.jsx'
import AgentAction from './components/AgentAction.jsx'
import Dashboard from './components/Dashboard.jsx'
import { createGoal, evaluateAction, runAgent, errorMessage } from './services/api.js'

export default function App() {
  const [goalText, setGoalText] = useState('Find a programming laptop under ₹60,000 with 16GB RAM.')
  const [session, setSession] = useState(null)
  const [actions, setActions] = useState([])
  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const guard = (fn) => async (...args) => {
    setBusy(true); setError('')
    try { await fn(...args) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  const onSetGoal = guard(async () => {
    setSession(await createGoal(goalText)); setActions([]); setSelected(null)
  })
  const onRun = guard(async () => {
    const d = await runAgent(goalText)
    setSession(d.session); setActions(d.actions); setSelected(d.actions[d.actions.length - 1])
  })
  const onEvaluate = guard(async (payload) => {
    if (!session) throw { response: { data: { detail: 'Set a goal first.' } } }
    const a = await evaluateAction({ ...payload, session_id: session.session_id })
    setActions((prev) => [...prev, a]); setSelected(a)
  })

  return (
    <main>
      <header>
        <h1>AgentGuard</h1>
        <p>Checks every agent action against what the user actually asked for.</p>
      </header>
      {error && <div className="error" role="alert">{error}</div>}
      <div className="top">
        <GoalPanel {...{ goalText, setGoalText, session, busy, onSetGoal, onRun }} />
        <AgentAction disabled={busy} onSubmit={onEvaluate} />
      </div>
      <Dashboard actions={actions} selected={selected} onSelect={setSelected} />
    </main>
  )
}
