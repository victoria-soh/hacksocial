import { Link } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import { computeWhatsNext } from '../../lib/whatsNext'
import Panel from './Panel'

/**
 * Shown after any mission completion — one contextual next action instead
 * of a generic "back to menu". This is reused across the entire app, so it
 * stays a routine status bar for every ordinary nudge; the one exception
 * is the capstone-ready milestone (computeWhatsNext flags it with
 * `milestone: true`), which gets the same glowing-panel treatment already
 * used for the Final Challenge entry point on the main dashboard — a
 * genuine "you earned this" moment shouldn't read as identical in weight
 * to "try today's daily challenge next."
 */
export default function WhatsNextPrompt() {
  const { state, districts, capstoneUnlocked } = useGame()
  const next = computeWhatsNext({ state, districts, capstoneUnlocked })

  if (next.milestone) {
    return (
      <Link
        to={next.to}
        className="cc-hud-panel no-underline relative flex items-center justify-between gap-3 flex-wrap rounded-2xl p-5 border cc-final-challenge-panel"
        style={{ background: 'var(--cc-panel)', borderColor: 'var(--cc-accent-2)', boxShadow: 'var(--cc-glow-magenta)' }}
      >
        <span className="cc-hud-bracket cc-hud-bracket--tl" aria-hidden="true" />
        <span className="cc-hud-bracket cc-hud-bracket--tr" aria-hidden="true" />
        <span className="cc-hud-bracket cc-hud-bracket--bl" aria-hidden="true" />
        <span className="cc-hud-bracket cc-hud-bracket--br" aria-hidden="true" />
        <p className="text-sm font-semibold m-0 flex items-center gap-2" style={{ color: 'var(--cc-text)' }}>
          <span className="text-xl" aria-hidden="true">
            🎓
          </span>{' '}
          {next.text}
        </p>
        <span
          className="text-center px-4 py-2 rounded-lg text-sm font-bold min-h-11 flex items-center shrink-0 cc-chrome"
          style={{ background: 'var(--cc-accent-2)', color: '#1a0620' }}
        >
          Begin →
        </span>
      </Link>
    )
  }

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
