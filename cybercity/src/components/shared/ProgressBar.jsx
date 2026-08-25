// `glow`: false by default (every existing call site renders exactly as
// before). Set true to have the track itself — not just the fill — pick up
// a border and glow in `color`, for contexts (like Privacy Mirror's risk
// bars) that want the same neon-panel treatment used elsewhere in the app
// rather than a plain flat track.
export default function ProgressBar({ label, value, max = 100, color = 'var(--cc-accent)', glow = false }) {
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
        className="h-3 w-full rounded-full bg-[var(--cc-bg-alt)] border overflow-hidden"
        style={
          glow
            ? { borderColor: color, boxShadow: `0 0 8px -2px ${color}` }
            : { borderColor: 'var(--cc-panel-border)' }
        }
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px 0 ${color}` }}
        />
      </div>
    </div>
  )
}
