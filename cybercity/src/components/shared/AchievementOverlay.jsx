import { useEffect, useRef, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { BADGES } from '../../data/badges'
import { LEVELS, getLevelProgress } from '../../data/levels'

const DISPLAY_MS = 4200

/**
 * Watches badges + xp for real, newly-earned changes and shows a genuine
 * celebratory moment for each — never a silent list update. Mounted once
 * inside Layout (which persists across route changes), so it catches
 * achievements regardless of which mission screen triggered them.
 *
 * The first render after mount only records a baseline and never pops —
 * otherwise a returning player with existing badges/level would get
 * celebration overlays for progress they made in a previous session.
 */
export default function AchievementOverlay() {
  const { badges, xp } = useGame()
  const initializedRef = useRef(false)
  const prevBadgesRef = useRef(badges)
  const prevLevelRef = useRef(getLevelProgress(xp).level)
  const [queue, setQueue] = useState([])

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true
      prevBadgesRef.current = badges
      prevLevelRef.current = getLevelProgress(xp).level
      return
    }

    const newEvents = []
    const newBadgeIds = badges.filter((id) => !prevBadgesRef.current.includes(id))
    for (const id of newBadgeIds) {
      const badge = BADGES.find((b) => b.id === id)
      if (badge) {
        newEvents.push({
          key: `badge-${id}-${Date.now()}`,
          icon: badge.icon,
          eyebrow: 'Badge earned',
          title: badge.name,
          description: badge.description,
        })
      }
    }

    const newLevel = getLevelProgress(xp).level
    if (newLevel > prevLevelRef.current) {
      const info = LEVELS.find((l) => l.level === newLevel)
      if (info) {
        newEvents.push({
          key: `level-${newLevel}-${Date.now()}`,
          icon: '⬆️',
          eyebrow: 'Level up',
          title: `Level ${info.level} — ${info.name}`,
          description: info.unlockLabel,
        })
      }
    }

    if (newEvents.length > 0) setQueue((q) => [...q, ...newEvents])
    prevBadgesRef.current = badges
    prevLevelRef.current = newLevel
  }, [badges, xp])

  const current = queue[0]

  useEffect(() => {
    if (!current) return undefined
    const timer = setTimeout(() => setQueue((q) => q.slice(1)), DISPLAY_MS)
    return () => clearTimeout(timer)
  }, [current])

  if (!current) return null

  return (
    <div className="fixed top-4 inset-x-4 sm:inset-x-auto sm:right-4 z-50 flex justify-center sm:justify-end pointer-events-none">
      <div
        role="status"
        aria-live="polite"
        className="cc-achievement-pop pointer-events-auto cc-hud-panel relative flex items-center gap-4 max-w-sm w-full rounded-2xl border p-5"
        style={{ background: 'var(--cc-panel)', borderColor: 'var(--cc-accent)', boxShadow: 'var(--cc-glow-cyan)' }}
      >
        <button
          onClick={() => setQueue((q) => q.slice(1))}
          aria-label="Dismiss"
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full text-[var(--cc-text-dim)] hover:text-[var(--cc-text)]"
        >
          ✕
        </button>
        <span className="cc-achievement-icon text-4xl shrink-0" aria-hidden="true">
          {current.icon}
        </span>
        <div>
          <p className="cc-chrome text-xs uppercase tracking-wide m-0 text-[var(--cc-accent)]">{current.eyebrow}</p>
          <p className="font-bold text-lg m-0 mt-0.5">{current.title}</p>
          <p className="text-sm text-[var(--cc-text-dim)] m-0 mt-0.5">{current.description}</p>
        </div>
      </div>
    </div>
  )
}
