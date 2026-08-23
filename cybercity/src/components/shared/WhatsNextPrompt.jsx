import { Link } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import { computeWhatsNext } from '../../lib/whatsNext'
import Panel from './Panel'

/** Shown after any mission completion — one contextual next action instead of a generic "back to menu". */
export default function WhatsNextPrompt() {
  const { state, districts, capstoneUnlocked } = useGame()
  const next = computeWhatsNext({ state, districts, capstoneUnlocked })

  return (
    <Panel className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-sm m-0 flex items-center gap-2">
        <span aria-hidden="true">➡️</span> {next.text}
      </p>
      <Link
        to={next.to}
        className="no-underline text-center px-4 py-2 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] text-sm font-semibold min-h-11 flex items-center shrink-0"
      >
        Go
      </Link>
    </Panel>
  )
}
