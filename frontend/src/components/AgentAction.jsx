import { useState } from 'react'

const ACTIONS = ['search', 'filter', 'compare', 'open', 'read', 'write', 'send', 'purchase', 'delete']

export default function AgentAction({ disabled, onSubmit }) {
  const [f, setF] = useState({ action: 'search', target: 'laptops', price: '', reason: '' })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const send = () =>
    onSubmit({
      action: f.action,
      target: f.target,
      parameters: f.price ? { price: Number(f.price) } : {},
      reason: f.reason,
    })
  return (
    <section className="panel">
      <h2>Send an action</h2>
      <div className="row">
        <select value={f.action} onChange={set('action')}>{ACTIONS.map((a) => <option key={a}>{a}</option>)}</select>
        <input value={f.target} onChange={set('target')} placeholder="Target, e.g. laptops" />
        <input value={f.price} onChange={set('price')} placeholder="Price (₹)" type="number" />
      </div>
      <input value={f.reason} onChange={set('reason')} placeholder="Agent's stated reason" />
      <button disabled={disabled} onClick={send}>Evaluate action</button>
    </section>
  )
}
