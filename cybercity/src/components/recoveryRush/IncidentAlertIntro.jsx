import { formatTime } from '../../lib/format'

const SIREN_BUILDINGS = [
  { x: 10, w: 40, h: 60, flicker: false },
  { x: 55, w: 55, h: 90, flicker: true },
  { x: 115, w: 35, h: 45, flicker: false },
  { x: 155, w: 50, h: 100, flicker: false },
  { x: 210, w: 40, h: 65, flicker: true },
  { x: 255, w: 60, h: 110, flicker: false },
  { x: 320, w: 45, h: 55, flicker: true },
  { x: 370, w: 50, h: 80, flicker: false },
  { x: 425, w: 35, h: 50, flicker: false },
  { x: 465, w: 55, h: 95, flicker: true },
]

export default function IncidentAlertIntro({ level, onBegin }) {
  return (
    <div className="relative left-1/2 -translate-x-1/2 w-screen -mt-6 mb-6 overflow-hidden">
      {/* Pulsing red vignette + dark cityscape silhouette reacting to the alert */}
      <div
        className="absolute inset-0 pointer-events-none cc-vignette-pulse"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, rgba(255,45,79,0.35) 0%, rgba(255,45,79,0) 55%), radial-gradient(ellipse at 50% 100%, rgba(255,45,79,0.25) 0%, rgba(255,45,79,0) 60%)',
        }}
        aria-hidden="true"
      />
      <svg
        viewBox="0 0 520 110"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl opacity-70"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        {SIREN_BUILDINGS.map((b, i) => (
          <g key={i}>
            <rect x={b.x} y={110 - b.h} width={b.w} height={b.h} fill="#05070e" stroke="#24304d" />
            <rect
              className={b.flicker ? 'cc-flicker' : undefined}
              x={b.x + b.w / 2 - 3}
              y={110 - b.h + 10}
              width="6"
              height="8"
              fill="var(--cc-danger)"
              opacity={b.flicker ? undefined : 0.5}
            />
          </g>
        ))}
      </svg>

      <div className="relative flex flex-col items-center gap-5 px-4 py-16 sm:py-24 text-center">
        {/* Same frame/typography as the dashboard's "CYBERCITY PROTECTED" /
            "CITY UNDER ATTACK" banner (see CityGraphic.jsx) swapped into its
            alert-mode coloring, so this reads as the same city's status
            readout escalating, not a separate banner design. */}
        <div
          className="cc-alert-entrance px-4 py-2 rounded-lg text-sm sm:text-base font-bold cc-chrome"
          style={{ background: 'var(--cc-danger)', color: '#050a08', boxShadow: 'var(--cc-glow-danger)' }}
        >
          ⚠️ CYBERCITY ALERT: BREACH DETECTED
        </div>
        <span className="cc-alert-entrance text-6xl sm:text-7xl" aria-hidden="true">
          🚨
        </span>
        <h1
          className="cc-alert-entrance text-2xl sm:text-4xl font-bold max-w-2xl m-0"
          style={{ color: 'var(--cc-text)', textShadow: '0 0 18px rgba(255,45,79,0.85), 0 0 4px rgba(0,0,0,0.8)' }}
        >
          {level.openingAlert}
        </h1>

        <div className="flex flex-wrap items-center justify-center gap-3 cc-chrome text-sm text-[var(--cc-text-dim)]">
          <span className="px-2.5 py-1 rounded-full border border-[var(--cc-panel-border)]">
            Difficulty: {'⭐'.repeat(level.difficultyStars)}
          </span>
          <span className="px-2.5 py-1 rounded-full border border-[var(--cc-panel-border)]">
            Countdown starts at {formatTime(level.timeLimitSeconds)} once you begin
          </span>
        </div>

        <button
          onClick={onBegin}
          className="mt-2 px-8 py-3.5 rounded-lg font-bold text-lg min-h-11 cc-chrome"
          style={{ background: 'var(--cc-danger)', color: '#1a0206', boxShadow: 'var(--cc-glow-danger)' }}
        >
          Begin response
        </button>
      </div>
    </div>
  )
}
