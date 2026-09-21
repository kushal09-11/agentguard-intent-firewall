export default function RiskMeter({ value = 0 }) {
  const band = value >= 65 ? 'block' : value >= 30 ? 'review' : 'allow'
  return (
    <div className="meter" role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`meter-fill ${band}`} style={{ width: `${value}%` }} />
    </div>
  )
}
