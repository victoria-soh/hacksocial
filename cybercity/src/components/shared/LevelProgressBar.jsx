import { getLevelProgress } from '../../data/levels'

/**
 * variant="compact": for the nav bar — level name + a thin bar.
 * variant="full": for the dashboard — the exact "[xp] / [next threshold] XP
 * to [next level]" text called for by the retention-loop spec, plus a
 * larger bar.
 */
export default function LevelProgressBar({ xp, variant = 'full' }) {
  const progress = getLevelProgress(xp)
  const pct = Math.round(progress.progressFraction * 100)
  const label = progress.isMaxLevel
    ? `${xp} XP — max level reached (${progress.name})`
    : `${xp} / ${progress.xpForNext} XP to ${progress.nextLevelName}`

  if (variant === 'compact') {
    return (
      <div className="flex flex-col items-end gap-0.5" title={label}>
        <span className="flex items-center gap-1 text-xs">
          <span aria-hidden="true">🧠</span>
          Lv.{progress.level} {progress.name}
        </span>
        <div
          className="w-24 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{ width: `${pct}%`, background: 'var(--cc-accent)', boxShadow: 'var(--cc-glow-cyan)' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="font-semibold flex items-center gap-2">
          <span aria-hidden="true">🧠</span> Level {progress.level} — {progress.name}
        </span>
        <span className="text-sm text-[var(--cc-text-dim)]">{label}</span>
      </div>
      <div
        className="w-full h-3 rounded-full overflow-hidden"
        style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: 'var(--cc-accent)', boxShadow: 'var(--cc-glow-cyan)' }}
        />
      </div>
    </div>
  )
}
