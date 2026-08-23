import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

const BOOT_LINES = ['ACCESSING CASE FILE...', 'Pulling public posts...', 'Case board ready.']
const LINE_INTERVAL_MS = 480
const HOLD_AFTER_MS = 500

/**
 * A brief terminal-style boot-up moment before the case board itself
 * appears — mirrors Recovery Rush's dramatic alert intro (IncidentAlertIntro.jsx),
 * reskinned for Digital Breadcrumbs' investigation framing instead of a
 * security siren. Calls onDone() once (after the sequence finishes, or
 * immediately under reduced motion, in which case this renders nothing and
 * the caller shows the real content with a simple fade instead).
 */
export default function CaseFileBootUp({ onDone }) {
  const reducedMotion = usePrefersReducedMotion()
  const [lineCount, setLineCount] = useState(0)

  useEffect(() => {
    if (reducedMotion) {
      onDone()
      return undefined
    }
    const timers = BOOT_LINES.map((_, i) => setTimeout(() => setLineCount(i + 1), i * LINE_INTERVAL_MS))
    const finalTimer = setTimeout(onDone, (BOOT_LINES.length - 1) * LINE_INTERVAL_MS + HOLD_AFTER_MS)
    return () => {
      timers.forEach(clearTimeout)
      clearTimeout(finalTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-left" style={{ minHeight: '280px' }}>
      <div className="w-full max-w-md cc-chrome">
        {BOOT_LINES.slice(0, lineCount).map((line, i) => {
          const isLast = i === lineCount - 1
          return (
            <p key={line} className="m-0 mb-1 text-sm" style={{ color: 'var(--cc-accent)', textShadow: 'var(--cc-glow-cyan)' }}>
              &gt; {line}
              {isLast && <span className="cc-dossier-cursor" aria-hidden="true" />}
            </p>
          )
        })}
      </div>
    </div>
  )
}
