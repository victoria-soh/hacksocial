import { useState } from 'react'
import { formatTime } from '../../lib/format'
import { JARGON_GLOSSARY } from '../../data/recoveryRush'

export function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs cc-chrome" style={{ color: 'var(--cc-danger)' }}>
      <span className="cc-pulse inline-block w-2 h-2 rounded-full" style={{ background: 'var(--cc-danger)' }} aria-hidden="true" />
      LIVE
    </span>
  )
}

// Same three-way status-color convention used on the account graph:
// compromised (red/magenta) = something just got worse, at-risk (amber) =
// an ongoing/ambient danger signal that didn't flip a new account,
// protected (cyan) = good news. Falls back to inferring from the event
// shape for the level-authored scripted events, which don't carry an
// explicit tone — only the reactive/synthetic ones (attacker backing off,
// a deferred fix being undone) do.
function eventTone(e) {
  if (e.tone === 'good') return 'good'
  if (e.tone === 'bad') return 'bad'
  if (e.appliesTo) return 'bad' // this event is what compromises that account
  return 'warn'
}

const TONE_COLOR = { good: 'var(--cc-good)', bad: 'var(--cc-danger)', warn: 'var(--cc-warn)' }
const TONE_ICON = { good: '🟢', bad: '🔴', warn: '🟡' }

const SORTED_TERMS = [...JARGON_GLOSSARY].sort((a, b) => b.term.length - a.term.length)
const TERM_PATTERN = new RegExp(`(${SORTED_TERMS.map((t) => t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')

/**
 * Renders event text with any known jargon term (see data/recoveryRush.js's
 * JARGON_GLOSSARY) turned into a tap-to-reveal explanation, so the scenario
 * teaches vocabulary as it comes up instead of requiring it upfront.
 */
function JargonText({ text }) {
  const [openTerm, setOpenTerm] = useState(null)
  if (SORTED_TERMS.length === 0) return text

  const parts = text.split(TERM_PATTERN)
  return parts.map((part, i) => {
    const match = SORTED_TERMS.find((t) => t.term.toLowerCase() === part.toLowerCase())
    if (!match) return <span key={i}>{part}</span>
    const isOpen = openTerm === match.term
    return (
      <span key={i}>
        <button
          type="button"
          onClick={() => setOpenTerm(isOpen ? null : match.term)}
          aria-expanded={isOpen}
          className="underline decoration-dotted underline-offset-2 font-bold"
          style={{ color: 'inherit' }}
        >
          {part}
        </button>
        {isOpen && (
          // Explicitly back to the sans-serif "content" role, not the
          // monospace "chrome" role inherited from the feed's <ul> — this
          // is prose meant to be read, not a status readout.
          <span
            className="block text-xs mt-0.5 mb-1 text-[var(--cc-text-dim)]"
            style={{ fontFamily: 'var(--font-content)' }}
          >
            💡 {match.explanation}
          </span>
        )}
      </span>
    )
  })
}

export default function EventFeed({ events }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--cc-text-dim)] m-0 cc-chrome">
        &gt; monitoring for suspicious activity<span aria-hidden="true">…</span>
      </p>
    )
  }
  return (
    <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-sm cc-chrome" aria-live="polite">
      {events.map((e) => {
        const tone = eventTone(e)
        const color = TONE_COLOR[tone]
        return (
          <li
            key={e.id}
            className="cc-feed-entry flex items-start gap-2 rounded px-1.5 py-1"
            style={{ color }}
          >
            <span aria-hidden="true">{TONE_ICON[tone]}</span>
            <span className="text-[var(--cc-text-dim)] shrink-0">[{formatTime(e.atSeconds)}]</span>
            <span>
              <JargonText text={e.text} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}
