import { useEffect, useState } from 'react'
import { getPolicy, updatePolicy } from '../services/api.js'

export default function PolicyPanel() {
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    getPolicy()
      .then((p) => {
        setPolicy(p)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setErrorMsg('Failed to load current policy configuration.')
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
    setErrorMsg('')
    try {
      const updated = await updatePolicy(policy)
      setPolicy(updated)
      setMessage('Policy successfully updated and active.')
      setTimeout(() => setMessage(''), 4000)
    } catch (e) {
      setErrorMsg('Failed to update policy.')
      setTimeout(() => setErrorMsg(''), 4000)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !policy) {
    return (
      <div className="panel policy-loading-panel">
        <p className="empty">Loading firewall policy configuration...</p>
      </div>
    )
  }

  return (
    <div className="panel policy-panel">
      {/* Header */}
      <div className="policy-header">
        <div className="policy-header-text">
          <div className="policy-badge-row">
            <span className="policy-system-badge">RUNTIME FIREWALL</span>
            <span className="policy-status-pill">ACTIVE ENFORCEMENT</span>
          </div>
          <h2>Firewall Policy Configuration</h2>
          <p className="policy-subtitle">
            Configure decision thresholds, risk weights, and deterministic security enforcement rules.
          </p>
        </div>
      </div>

      {message && (
        <div className="policy-alert success" role="alert">
          <span>✓ {message}</span>
        </div>
      )}
      {errorMsg && (
        <div className="policy-alert error" role="alert">
          <span>⚠ {errorMsg}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="policy-grid">
        {/* Card 1: Risk Decision Thresholds */}
        <div className="policy-card">
          <div className="policy-card-title-group">
            <h3>⚡ Risk Decision Thresholds</h3>
            <p className="policy-card-desc">
              Define score boundaries for automatic allowances, manual human review, and blocking.
            </p>
          </div>

          <div className="policy-fields-list">
            <div className="policy-field-block">
              <div className="field-top-row">
                <div className="field-titles">
                  <span className="field-name allow">ALLOW Threshold (&lt; {policy.allow_threshold}%)</span>
                  <span className="field-desc">Actions with risk below this score are automatically permitted.</span>
                </div>
                <span className="threshold-val-badge allow">{policy.allow_threshold}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                value={policy.allow_threshold}
                onChange={(e) => handleThresholdChange('allow_threshold', e.target.value)}
                className="policy-slider slider-allow"
              />
            </div>

            <div className="policy-field-block">
              <div className="field-top-row">
                <div className="field-titles">
                  <span className="field-name block">BLOCK Threshold (&ge; {policy.review_threshold}%)</span>
                  <span className="field-desc">Actions exceeding this score are intercepted and prevented.</span>
                </div>
                <span className="threshold-val-badge block">{policy.review_threshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={policy.review_threshold}
                onChange={(e) => handleThresholdChange('review_threshold', e.target.value)}
                className="policy-slider slider-block"
              />
            </div>
          </div>

          <div className="oversight-band-callout">
            <div className="oversight-band-icon">⚖️</div>
            <div className="oversight-band-info">
              <div className="oversight-band-header">
                <strong>Review Oversight Band</strong>
                <span className="oversight-band-range">
                  {policy.allow_threshold}% – {policy.review_threshold - 1}% Risk
                </span>
              </div>
              <p>Actions landing in this score band pause execution and await human verification.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Deterministic Hard Rules */}
        <div className="policy-card">
          <div className="policy-card-title-group">
            <h3>🛡️ Deterministic Hard Rules</h3>
            <p className="policy-card-desc">
              Immediate zero-tolerance constraints that block dangerous tools before execution.
            </p>
          </div>

          <div className="rules-list">
            {[
              ['block_critical_sensitivity', 'Block Critical Assets', 'Instantly block access to banking, passwords, and credentials.'],
              ['block_severe_violation', 'Block Severe Constraint Violations', 'Block actions exceeding budget by >15% or breaching bounds.'],
              ['block_critical_drift', 'Block Critical Trajectory Drift', 'Block when agent demonstrates sustained divergence off-goal.'],
              ['block_prompt_injection', 'Block Prompt Injections', 'Block tools with detected indirect/direct prompt injection signatures.'],
              ['block_low_alignment', 'Block Severe Intent Misalignment', 'Block actions with alignment lower than 20%.'],
            ].map(([ruleKey, label, desc]) => {
              const isChecked = Boolean(policy.hard_rules?.[ruleKey])
              return (
                <label key={ruleKey} className={`rule-toggle-row ${isChecked ? 'active' : ''}`}>
                  <div className="custom-switch-wrap">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleRuleToggle(ruleKey)}
                      className="rule-checkbox-input"
                    />
                    <span className="custom-switch" />
                  </div>
                  <div className="rule-content">
                    <div className="rule-title-row">
                      <strong className="rule-title">{label}</strong>
                      <span className={`rule-tag ${isChecked ? 'enforced' : 'disabled'}`}>
                        {isChecked ? 'ENFORCED' : 'OFF'}
                      </span>
                    </div>
                    <p className="rule-desc">{desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Card 3: Contextual Risk Weights Distribution */}
        <div className="policy-card full-width">
          <div className="policy-card-title-group">
            <h3>📊 Contextual Risk Weights Distribution</h3>
            <p className="policy-card-desc">
              Relative importance of each telemetry dimension in composite risk scoring.
            </p>
          </div>

          <div className="weights-grid">
            {Object.entries(policy.weights || {}).map(([dim, wt]) => (
              <div key={dim} className="weight-card">
                <div className="weight-card-top">
                  <span className="weight-label">{dim.toUpperCase()}</span>
                  <span className="weight-val">{(wt * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.60"
                  step="0.05"
                  value={wt}
                  onChange={(e) => handleWeightChange(dim, e.target.value)}
                  className="policy-slider weight-slider"
                />
                <span className="weight-factor">Factor: {Number(wt).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save Policy Button arranged at the bottom of the card */}
      <div className="policy-footer">
        <div className="policy-footer-note">
          <span className="footer-note-icon">💡</span>
          <span>Saved policy changes apply in real-time to all future agent evaluations.</span>
        </div>
        <button className="primary save-policy-btn" disabled={saving} onClick={onSave}>
          {saving ? 'Saving Policy...' : '💾 Save Policy Changes'}
        </button>
      </div>
    </div>
  )
}
