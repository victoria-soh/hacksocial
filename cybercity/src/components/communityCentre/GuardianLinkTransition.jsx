import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

const CONNECT_MS = 1300
const HOLD_MS = 900

/**
 * A purely decorative beat played once, on every fresh visit to Guardian
 * Mode's route, before its existing intro screen — two nodes labeled YOU
 * and PARTNER draw a connecting line and resolve to "LINK ESTABLISHED".
 * There is no real pairing, network call, or session behind this: Guardian
 * Mode is still (and only ever) two people sharing one device and one
 * screen, exactly as before — this just dramatizes that setup for a
 * second. Mirrors Privacy Mirror's RoleReversalTransition/Digital
 * Breadcrumbs' CaseFileBootUp: reduced-motion skips straight to onDone().
 */
export default function GuardianLinkTransition({ onDone }) {
  const reducedMotion = usePrefersReducedMotion()
  const [linked, setLinked] = useState(false)

  useEffect(() => {
    if (reducedMotion) {
      onDone()
      return undefined
    }
    const toLinked = setTimeout(() => setLinked(true), CONNECT_MS)
    const finish = setTimeout(onDone, CONNECT_MS + HOLD_MS)
    return () => {
      clearTimeout(toLinked)
      clearTimeout(finish)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  if (reducedMotion) return null

  const nodeColor = linked ? 'var(--cc-good)' : 'var(--cc-guardian-accent)'

  return (
    <div className="flex flex-col items-center justify-center gap-6 py-16" style={{ minHeight: '280px' }}>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-2">
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ border: `2px solid ${nodeColor}`, boxShadow: `0 0 14px ${nodeColor}`, transition: 'border-color 300ms, box-shadow 300ms' }}
            aria-hidden="true"
          >
            🧑
          </span>
          <span className="text-xs font-bold uppercase tracking-wide cc-chrome" style={{ color: nodeColor }}>
            You
          </span>
        </div>

        <div className="w-16 sm:w-24 h-0.5 relative overflow-hidden" style={{ background: 'var(--cc-panel-border)' }}>
          <div
            className="absolute inset-y-0 left-0 cc-guardian-link-sweep"
            style={{ background: nodeColor, boxShadow: `0 0 8px ${nodeColor}` }}
          />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ border: `2px solid ${nodeColor}`, boxShadow: `0 0 14px ${nodeColor}`, transition: 'border-color 300ms, box-shadow 300ms' }}
            aria-hidden="true"
          >
            🧑
          </span>
          <span className="text-xs font-bold uppercase tracking-wide cc-chrome" style={{ color: nodeColor }}>
            Partner
          </span>
        </div>
      </div>

      <p className="text-base font-bold m-0 min-h-[1.5em]" aria-live="polite">
        {linked && (
          <span className="cc-chrome cc-role-reversal-line" style={{ color: nodeColor, textShadow: `0 0 10px ${nodeColor}` }}>
            🔗 LINK ESTABLISHED
          </span>
        )}
      </p>
    </div>
  )
}
