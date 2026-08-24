import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from '../../../lib/usePrefersReducedMotion'

const HOLD_MS = 1100

/**
 * A brief two-line beat between Privacy Mirror's first two screens and the
 * switch-sides investigation — mirrors Digital Breadcrumbs' CaseFileBootUp,
 * reskinned for this feature's own role-reversal framing. Calls onDone()
 * once (after the sequence finishes, or immediately under reduced motion,
 * in which case this renders nothing and the caller shows the investigation
 * screen directly).
 */
export default function RoleReversalTransition({ onDone }) {
  const reducedMotion = usePrefersReducedMotion()
  const [phase, setPhase] = useState('complete') // complete -> reversal

  useEffect(() => {
    if (reducedMotion) {
      onDone()
      return undefined
    }
    const toReversal = setTimeout(() => setPhase('reversal'), HOLD_MS)
    const finish = setTimeout(onDone, HOLD_MS * 2)
    return () => {
      clearTimeout(toReversal)
      clearTimeout(finish)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion])

  if (reducedMotion) return null

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center" style={{ minHeight: '280px' }}>
      {phase === 'complete' ? (
        <p
          key="complete"
          className="cc-role-reversal-line text-base font-bold m-0 cc-chrome"
          style={{ color: 'var(--cc-good)', textShadow: '0 0 10px var(--cc-good)' }}
        >
          ✅ PRIVACY MIRROR COMPLETE
        </p>
      ) : (
        <p
          key="reversal"
          className="cc-role-reversal-line text-xl font-bold m-0 cc-chrome"
          style={{ color: 'var(--cc-accent-2)', textShadow: '0 0 12px var(--cc-accent-2)' }}
        >
          🎭 ROLE REVERSAL — YOU ARE THE INVESTIGATOR
        </p>
      )}
    </div>
  )
}
