const WARN_THRESHOLD = 34
const DANGER_THRESHOLD = 67

/**
 * "Stranger knowledge" meter — a threat climbing, not a score to maximize.
 * `percent` is pre-computed (see lib/scoring.js's computeExposurePercent,
 * weighted by fact/inference sensitivity tier) and passed in, so this stays
 * a pure display component. The pulse at high exposure reuses the shared
 * .cc-pulse class, which already collapses to a static glow under
 * prefers-reduced-motion (see index.css) — no separate fallback needed here.
 */
export default function ExposureMeter({ percent }) {
  const color = percent >= DANGER_THRESHOLD ? 'var(--cc-danger)' : percent >= WARN_THRESHOLD ? 'var(--cc-warn)' : 'var(--cc-good)'
  const inDanger = percent >= DANGER_THRESHOLD

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold uppercase tracking-wide ${inDanger ? 'cc-pulse' : ''}`}
          style={{ color }}
        >
          ⚠ Stranger knowledge: {percent}%
        </span>
      </div>
      <div
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            background: color,
            boxShadow: inDanger ? `0 0 8px ${color}` : 'none',
            transition: 'width 400ms ease, background 400ms ease',
          }}
        />
      </div>
      <p className="text-[11px] text-[var(--cc-text-dim)] m-0">
        How much a stranger could now piece together about "Alex" from public posts alone.
      </p>
    </div>
  )
}
