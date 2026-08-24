import { scoreTierColor } from '../../lib/scoring'

const RING_SIZE = 132
const RING_STROKE = 11
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/**
 * A glowing 0-100 score ring, colored by the same good/warn/danger tier
 * language used throughout the app, instead of delivering a score as plain
 * "N / 100" text. Originally built for Recovery Rush's debrief screen;
 * extracted here once Community Centre's mission-outcome screen needed the
 * exact same visual contract, so both stay in sync rather than drifting
 * apart as two lookalike copies.
 *
 * `label`/`icon` are an optional caption shown under the ring (e.g. a
 * grade name) — omit them for a plain score-only ring.
 */
export default function ScoreRing({ score, label, icon, ariaLabel }) {
  const color = scoreTierColor(score)
  const dash = (Math.max(0, Math.min(100, score)) / 100) * RING_CIRCUMFERENCE
  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative" style={{ width: RING_SIZE, height: RING_SIZE }}>
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          className="-rotate-90"
          role="img"
          aria-label={ariaLabel ?? `Score: ${score} out of 100${label ? `, ${label}` : ''}`}
        >
          <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="var(--cc-panel-border)" strokeWidth={RING_STROKE} />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 800ms ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold cc-chrome" style={{ color, textShadow: `0 0 10px ${color}` }}>
            {score}
          </span>
          <span className="text-[10px] text-[var(--cc-text-dim)] cc-chrome">/ 100</span>
        </div>
      </div>
      {label && (
        <p className="m-0 font-semibold text-sm flex items-center gap-1.5" style={{ color }}>
          {icon && <span aria-hidden="true">{icon}</span>} {label}
        </p>
      )}
    </div>
  )
}
