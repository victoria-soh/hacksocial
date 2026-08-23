export default function ProgressBar({ label, value, max = 100, color = 'var(--cc-accent)' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm text-[var(--cc-text-dim)] mb-1">
        <span>{label}</span>
        <span aria-hidden="true">{Math.round(value)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        className="h-3 w-full rounded-full bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] overflow-hidden"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px 0 ${color}` }}
        />
      </div>
    </div>
  )
}
