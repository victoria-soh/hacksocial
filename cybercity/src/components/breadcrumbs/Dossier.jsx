import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import Panel from '../shared/Panel'

const TYPE_SPEED_MS = 16 // per character

function buildLines(unlockOrder, nodes, name) {
  return unlockOrder
    .map((id, i) => {
      const fragment = nodes[id]?.dossierFragment
      if (!fragment) return null
      return { id, text: i === 0 ? `${name} ${fragment}.` : ` ...${fragment}.` }
    })
    .filter(Boolean)
}

/**
 * Generic "what a stranger has pieced together" profile panel — driven by
 * `nodes` (dossierFragment per revealed node id) and `unlockOrder`, so the
 * same component renders both the Find Alex mission's dossier and the
 * capstone deduction stage's smaller one.
 *
 * Each NEW line types out character-by-character, like a terminal
 * compiling a profile live, with a blinking cursor parked at the end of
 * the dossier throughout. Whatever was already unlocked when this mounts
 * (or reduced motion is on) just fades in instead — there's nothing "new"
 * happening in that case, so nothing types.
 */
export default function Dossier({ unlockOrder, nodes, name, subtitle, icon = '🧑', emptyMessage }) {
  const reducedMotion = usePrefersReducedMotion()
  const lines = buildLines(unlockOrder, nodes, name)

  const [typingLineId, setTypingLineId] = useState(null)
  const [typedChars, setTypedChars] = useState(0)
  const prevLineCountRef = useRef(lines.length)
  // Permanent record of which lines actually played the typing reveal —
  // once true for a line, always true, so a later line starting to type
  // never retroactively changes an earlier, already-settled line's
  // treatment (that would replay its fade-in, which looks like a glitch).
  const typedLineIdsRef = useRef(new Set())

  useEffect(() => {
    if (reducedMotion) {
      prevLineCountRef.current = lines.length
      return undefined
    }
    if (lines.length > prevLineCountRef.current) {
      const newLine = lines[lines.length - 1]
      prevLineCountRef.current = lines.length
      setTypingLineId(newLine.id)
      setTypedChars(0)
      let count = 0
      const interval = setInterval(() => {
        count += 1
        setTypedChars(count)
        if (count >= newLine.text.length) {
          clearInterval(interval)
          typedLineIdsRef.current.add(newLine.id)
          setTypingLineId(null)
        }
      }, TYPE_SPEED_MS)
      return () => clearInterval(interval)
    }
    prevLineCountRef.current = lines.length
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length, reducedMotion])

  const lastLineId = lines[lines.length - 1]?.id

  return (
    <Panel className="flex flex-col gap-3 lg:sticky lg:top-4 self-start">
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] text-2xl shrink-0"
        >
          {icon}
        </span>
        <div>
          <h2 className="text-base font-bold m-0">{subtitle ?? name}</h2>
          <p className="text-xs text-[var(--cc-text-dim)] m-0">What a stranger has pieced together so far</p>
        </div>
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          {emptyMessage ?? 'Nothing yet — make your first connection below to start building this profile.'}
        </p>
      ) : (
        <p className="text-sm leading-relaxed m-0">
          {lines.map((line) => {
            const isTypingThis = typingLineId === line.id
            const shown = isTypingThis ? line.text.slice(0, typedChars) : line.text
            const useFade = !typedLineIdsRef.current.has(line.id) && !isTypingThis
            return (
              <span key={line.id} className={useFade ? 'cc-dossier-line inline' : 'inline'}>
                {shown}
                {line.id === lastLineId && <span className="cc-dossier-cursor" aria-hidden="true" />}
              </span>
            )
          })}
        </p>
      )}
    </Panel>
  )
}
