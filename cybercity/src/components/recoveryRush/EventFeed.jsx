import { formatTime } from '../../lib/format'

export function LiveIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs cc-chrome" style={{ color: 'var(--cc-danger)' }}>
      <span className="cc-pulse inline-block w-2 h-2 rounded-full" style={{ background: 'var(--cc-danger)' }} aria-hidden="true" />
      LIVE
    </span>
  )
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
        const isGood = e.tone === 'good'
        return (
          <li
            key={e.id}
            className="cc-feed-entry flex items-start gap-2 rounded px-1.5 py-1"
            style={{ color: isGood ? 'var(--cc-good)' : 'var(--cc-warn)' }}
          >
            <span aria-hidden="true">{isGood ? '🟢' : '⚡'}</span>
            <span className="text-[var(--cc-text-dim)] shrink-0">[{formatTime(e.atSeconds)}]</span>
            <span>{e.text}</span>
          </li>
        )
      })}
    </ul>
  )
}
