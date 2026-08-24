import { BADGES } from '../../data/badges'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

/**
 * All 9 badges, always visible right here — no click-through to a separate
 * page (the previous round's "recent 3 + link to /badges" hid most of the
 * set behind navigation, which is exactly the problem this replaces). Dense
 * icon grid instead of BadgesPanel's old full-width row-per-badge layout:
 * earned badges show their real icon with a glow, locked ones show a
 * dimmed lock — full name and description are still available via
 * title/aria-label without needing the row layout's space.
 */
export default function BadgesSummary() {
  const { badges } = useGame()
  const earnedSet = new Set(badges)

  return (
    <Panel className="h-full flex flex-col gap-3">
      <h2 className="text-base font-semibold m-0 flex items-center gap-2">
        <span aria-hidden="true">🏅</span> Guardian Badges ({badges.length} / {BADGES.length})
      </h2>
      <ul className="list-none p-0 m-0 grid grid-cols-5 sm:grid-cols-9 gap-2" role="list">
        {BADGES.map((b) => {
          const earned = earnedSet.has(b.id)
          return (
            <li key={b.id}>
              <span
                title={`${b.name} — ${earned ? 'earned' : 'locked'}. ${b.description}`}
                aria-label={`${b.name}, ${earned ? 'earned' : 'locked'}: ${b.description}`}
                tabIndex={0}
                className="flex items-center justify-center w-10 h-10 rounded-full border text-lg"
                style={
                  earned
                    ? {
                        borderColor: 'var(--cc-good)',
                        background: 'color-mix(in srgb, var(--cc-good) 14%, transparent)',
                        boxShadow: '0 0 6px -1px var(--cc-good)',
                      }
                    : {
                        borderColor: 'var(--cc-panel-border)',
                        background: 'var(--cc-bg-alt)',
                        opacity: 0.55,
                        filter: 'grayscale(1)',
                      }
                }
              >
                {earned ? b.icon : '🔒'}
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
