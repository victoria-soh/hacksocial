import { useState } from 'react'
import Panel from './Panel'

/**
 * Shared collapsed/expanded disclosure trigger for secondary/optional
 * content that shouldn't carry the same visual weight as the panels around
 * it (the dashboard's "More Options" and its plain-text resilience view).
 * The trigger itself IS a compact Panel — the same HUD border/glow/corner-
 * bracket treatment as every other panel on the page — with a chevron that
 * rotates open, instead of a bare underlined link sitting on its own.
 * `children` render only once expanded; wrap them in whatever container
 * fits that content (a Panel, a group of Panels) — this component only
 * owns the trigger and the open/closed state.
 */
export default function Disclosure({ label, children, contentClassName = 'mt-3' }) {
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Panel
        as="button"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="!p-0 !px-4 !py-2.5 min-h-11 flex items-center gap-2 text-sm font-semibold text-left"
        style={{ color: 'var(--cc-text-dim)' }}
      >
        <span
          aria-hidden="true"
          className="inline-block transition-transform duration-200"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          ▸
        </span>
        {label}
      </Panel>
      {open && <div className={contentClassName}>{children}</div>}
    </div>
  )
}
