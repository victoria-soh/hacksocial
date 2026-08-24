import { useEffect, useRef, useState } from 'react'

const WARN_THRESHOLD = 50
const DANGER_THRESHOLD = 80

const REVEAL_DISPLAY_MS = 4500

/**
 * "Stranger knowledge" meter — a threat climbing, not a score to maximize.
 * `percent` is pre-computed (see lib/scoring.js's computeExposurePercent,
 * weighted by fact/inference sensitivity tier) and passed in, so this stays
 * mostly a display component. Two things make each increase legible instead
 * of just a number ticking up:
 *
 * - `revealReason` + `revealKey`: whenever the caller's newest unlocked node
 *   caused a genuine increase, it passes a fresh `revealKey` (any value that
 *   changes) alongside the explanation text — this briefly surfaces that
 *   text under the bar, then auto-fades, exactly once per key.
 * - Escalating framing: crossing 50% or 80% for the first time posts a
 *   standing warning line (replaced by the stronger one if both are crossed
 *   in the same jump), reinforcing what the percentage actually means
 *   rather than leaving it as an abstract number.
 *
 * The pulse at high exposure reuses the shared .cc-pulse class, which
 * already collapses to a static glow under prefers-reduced-motion (see
 * index.css) — no separate fallback needed here.
 */
export default function ExposureMeter({ percent, revealReason = null, revealKey = null }) {
  const color = percent >= DANGER_THRESHOLD ? 'var(--cc-danger)' : percent >= WARN_THRESHOLD ? 'var(--cc-warn)' : 'var(--cc-good)'
  const inDanger = percent >= DANGER_THRESHOLD

  const [showReveal, setShowReveal] = useState(false)
  useEffect(() => {
    if (revealKey == null) return undefined
    setShowReveal(true)
    const t = setTimeout(() => setShowReveal(false), REVEAL_DISPLAY_MS)
    return () => clearTimeout(t)
  }, [revealKey])

  const prevPercentRef = useRef(percent)
  const [thresholdMessage, setThresholdMessage] = useState(null)
  useEffect(() => {
    const prev = prevPercentRef.current
    if (percent >= DANGER_THRESHOLD && prev < DANGER_THRESHOLD) {
      setThresholdMessage("🚨 Alex's daily patterns are now predictable — this is what real-world stalking risk looks like.")
    } else if (percent >= WARN_THRESHOLD && prev < WARN_THRESHOLD) {
      setThresholdMessage('⚠ Alex is becoming identifiable from public posts alone.')
    }
    prevPercentRef.current = percent
  }, [percent])

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
      {showReveal && revealReason && (
        <p className="text-xs m-0 cc-dossier-line" style={{ color: 'var(--cc-accent)' }}>
          {revealReason}
        </p>
      )}
      {thresholdMessage && (
        <p className="text-xs font-semibold m-0" style={{ color: percent >= DANGER_THRESHOLD ? 'var(--cc-danger)' : 'var(--cc-warn)' }}>
          {thresholdMessage}
        </p>
      )}
    </div>
  )
}
