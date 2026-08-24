import { useState } from 'react'

/**
 * A small tap-to-reveal disclosure for the moments a generative feature
 * fell back to a local/heuristic pool or wording instead of calling a
 * model. Useful for development, but a permanently visible "AI service
 * unavailable" line breaks immersion sitting in the middle of an
 * in-fiction scenario or a game panel — so this is an "ⓘ" the player can
 * tap, not body text. One shared component so every occurrence of this
 * pattern in the app (Privacy Mirror's screens, the dashboard's Bonus
 * Round, Recovery Rush's debrief) looks and behaves identically, and any
 * future fix to it only has to happen once.
 *
 * `show`: true only when THIS specific piece of content actually came
 * from the fallback — pass `!aiAvailable` or `source === 'heuristic'`,
 * whichever signal the caller already has.
 */
export default function AiFallbackNotice({ show, message, className = '' }) {
  const [open, setOpen] = useState(false)
  if (!show) return null
  return (
    <div className={`flex items-start gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="About this content's wording"
        className="shrink-0 w-5 h-5 rounded-full border text-[10px] flex items-center justify-center leading-none"
        style={{ borderColor: 'var(--cc-panel-border)', color: 'var(--cc-text-dim)' }}
      >
        ⓘ
      </button>
      {open && <p className="text-xs text-[var(--cc-text-dim)] m-0">{message}</p>}
    </div>
  )
}
