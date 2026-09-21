import { useEffect, useState } from 'react'
import { getPolicy, updatePolicy } from '../services/api.js'

export default function PolicyPanel() {
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    getPolicy()
      .then((p) => {
        setPolicy(p)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  const handleThresholdChange = (key, val) => {
    setPolicy({ ...policy, [key]: Number(val) })
  }

  const handleRuleToggle = (rule) => {
    setPolicy({
      ...policy,
      hard_rules: {
        ...policy.hard_rules,
        [rule]: !policy.hard_rules[rule],
      },
    })
  }

  const handleWeightChange = (dim, val) => {
    setPolicy({
      ...policy,
      weights: {
        ...policy.weights,
        [dim]: Number(val),
      },
    })
  }

  const onSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const updated = await updatePolicy(policy)
      setPolicy(updated)
      setMessage('Policy successfully updated and active.')
      setTimeout(() => setMessage(''), 4000)
    } catch (e) {
      setMessage('Failed to update policy.')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !policy) {
    return (
      <div className="panel">
        <p className="empty">Loading firewall policy configuration...</p>
      </div>
    )
  }

  return (
    <div className="panel policy-panel">
      <div className="policy-header">
        <div>
          <h2>Firewall Policy Configuration</h2>
          <p className="audit-subtitle">
            Configure decision thresholds, risk weights, and deterministic security enforcement rules.
          </p>
        </div>
        <button className="primary" disabled={saving} onClick={onSave}>
          {saving ? 'Saving...' : 'Save Policy Changes'}
        </button>
      </div>

      {message && <div className="policy-alert">{message}</div>}

      <div className="policy-grid">
        <div className="policy-card">
          <h3>Risk Decision Thresholds</h3>
          <div className="policy-field">
            <label>
              ALLOW Threshold (&lt; {policy.allow_threshold}%)
              <span className="field-hint">Actions with risk below this score are automatically permitted.</span>
            </label>
            <input
              type="range"
              min="10"
              max="50"
              value={policy.allow_threshold}
              onChange={(e) => handleThresholdChange('allow_threshold', e.target.value)}
            />
            <span className="slider-val">{policy.allow_threshold}%</span>
          </div>

          <div className="policy-field">
            <label>
              BLOCK Threshold (&ge; {policy.review_threshold}%)
              <span className="field-hint">Actions exceeding this score are intercepted and prevented.</span>
            </label>
            <input
              type="range"
              min="50"
              max="90"
              value={policy.review_threshold}
              onChange={(e) => handleThresholdChange('review_threshold', e.target.value)}
            />
            <span className="slider-val">{policy.review_threshold}%</span>
          </div>
          <p className="band-summary">
            Review Oversight Band: {policy.allow_threshold}% – {policy.review_threshold - 1}%
          </p>
        </div>

        <div className="policy-card">
          <h3>Deterministic Hard Rules</h3>
          <div className="rules-list">
            {[
              ['block_critical_sensitivity', 'Block Critical Assets', 'Instantly block access to banking, passwords, and credentials.'],
              ['block_severe_violation', 'Block Severe Constraint Violations', 'Block actions exceeding budget by >15% or breaching bounds.'],
              ['block_critical_drift', 'Block Critical Trajectory Drift', 'Block when agent demonstrates sustained divergence off-goal.'],
              ['block_prompt_injection', 'Block Prompt Injections', 'Block tools with detected indirect/direct prompt injection signatures.'],
              ['block_low_alignment', 'Block Severe Intent Misalignment', 'Block actions with alignment lower than 20%.'],
            ].map(([ruleKey, label, desc]) => (
              <label key={ruleKey} className="rule-toggle-row">
                <input
                  type="checkbox"
                  checked={Boolean(policy.hard_rules?.[ruleKey])}
                  onChange={() => handleRuleToggle(ruleKey)}
                />
                <div>
                  <strong>{label}</strong>
                  <p>{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="policy-card full-width">
          <h3>Contextual Risk Weights Distribution</h3>
          <p className="audit-subtitle">
            Relative importance of each telemetry dimension in composite risk scoring.
          </p>
          <div className="weights-grid">
            {Object.entries(policy.weights || {}).map(([dim, wt]) => (
              <div key={dim} className="weight-col">
                <label className="weight-label">{dim.toUpperCase()}</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.05"
                  value={wt}
                  onChange={(e) => handleWeightChange(dim, e.target.value)}
                />
                <span className="weight-val">{(wt * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
