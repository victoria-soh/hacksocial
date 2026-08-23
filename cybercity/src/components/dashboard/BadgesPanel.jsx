import { BADGES } from '../../data/badges'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

export default function BadgesPanel() {
  const { badges } = useGame()

  return (
    <Panel>
      <h2 className="text-base font-semibold mt-0 mb-3 flex items-center gap-2">
        <span aria-hidden="true">🏅</span> Guardian Badges ({badges.length} / {BADGES.length})
      </h2>
      <ul className="list-none p-0 m-0 grid gap-2 sm:grid-cols-2">
        {BADGES.map((b) => {
          const earned = badges.includes(b.id)
          return (
            <li
              key={b.id}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                earned ? 'border-[var(--cc-good)] bg-[var(--cc-good)]/10' : 'border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)] opacity-70'
              }`}
            >
              <span className="text-xl" aria-hidden="true">
                {earned ? b.icon : '🔒'}
              </span>
              <span>
                <span className="block font-medium text-sm">
                  {b.name} {earned && <span className="text-[var(--cc-good)]">(earned)</span>}
                </span>
                <span className="block text-xs text-[var(--cc-text-dim)]">{b.description}</span>
              </span>
            </li>
          )
        })}
      </ul>
    </Panel>
  )
}
