import { useEffect, useRef, useState } from 'react'
import {
  getLevel,
  createInitialRunState,
  applyAction,
  applyDueEvents,
  computeBlastRadius,
  getNextAttackerActionSeconds,
  isContained,
  computeEndSummary,
  buildMistakeReport,
} from '../../data/recoveryRush'
import { scoreRecoveryRun, gradeForScore } from '../../lib/scoring'
import { formatTime } from '../../lib/format'
import Panel from '../shared/Panel'
import BlastRadiusDiagram from './BlastRadiusDiagram'
import ActionMenu from './ActionMenu'
import EventFeed, { LiveIndicator } from './EventFeed'
import IncidentAlertIntro from './IncidentAlertIntro'
import AmbientTension from './AmbientTension'

const STATUS_TAG = { compromised: '🔴 COMPROMISED', 'at-risk': '🟡 AT RISK', secured: '🟢 SECURED' }
const BLAST_CUE_MS = 600

/**
 * The Recovery Rush timer/action-menu/diagram engine, extracted out of the
 * standalone IncidentScenario page so the exact same mechanic can be
 * embedded in the capstone challenge's incident-response stage. Manages its
 * own intro -> running phases; the moment the incident concludes (contained
 * or time runs out) it calls onComplete(endData) exactly once and stops —
 * what happens after that (persistence, an EndScreen, a capstone summary)
 * is entirely up to the caller, which is what makes this reusable across
 * both contexts.
 *
 * Layout note: everything in the 'running' phase (map, log, actions) is
 * built to fit a single desktop viewport with no scrolling — breaking that
 * up during a timed scenario kills the urgency this screen is meant to
 * create. Only the incident log gets its own internal scroll, since it
 * accumulates indefinitely; the page itself never does.
 */
export default function IncidentEngine({ levelId, onComplete }) {
  const level = getLevel(levelId)
  const [phase, setPhase] = useState('intro') // intro | running
  const [runState, setRunState] = useState(() => createInitialRunState(levelId))
  const [realSeconds, setRealSeconds] = useState(0)
  const [blastHistory, setBlastHistory] = useState([])
  const [lastResult, setLastResult] = useState(null) // { actionId, resultText }
  const [blastCue, setBlastCue] = useState(null) // 'grow' | 'shrink' | null
  const concludedRef = useRef(false)

  const runStateRef = useRef(runState)
  const realSecondsRef = useRef(0)
  useEffect(() => {
    runStateRef.current = runState
  }, [runState])
  useEffect(() => {
    realSecondsRef.current = realSeconds
  }, [realSeconds])

  useEffect(() => {
    if (phase !== 'running') return undefined
    const interval = setInterval(() => setRealSeconds((r) => r + 1), 1000)
    return () => clearInterval(interval)
  }, [phase])

  useEffect(() => {
    if (phase !== 'running') return
    const combined = runStateRef.current.elapsedSeconds + realSeconds
    const updated = applyDueEvents(runStateRef.current, combined)
    setRunState(updated)
    recordBlast(updated)
    if (isContained(updated)) {
      endScenario(updated, true, combined)
    } else if (combined >= level.timeLimitSeconds) {
      endScenario(updated, false, combined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realSeconds, phase])

  function recordBlast(state) {
    const value = computeBlastRadius(state)
    setBlastHistory((prev) => {
      if (prev[prev.length - 1] === value) return prev
      if (prev.length > 0) {
        setBlastCue(value > prev[prev.length - 1] ? 'grow' : 'shrink')
        setTimeout(() => setBlastCue(null), BLAST_CUE_MS)
      }
      return [...prev, value]
    })
  }

  function begin() {
    const fresh = createInitialRunState(levelId)
    setRunState(fresh)
    setRealSeconds(0)
    setBlastHistory([computeBlastRadius(fresh)])
    setLastResult(null)
    setPhase('running')
  }

  function handleAction(actionId) {
    const afterAction = applyAction(runStateRef.current, actionId)
    const combined = afterAction.elapsedSeconds + realSecondsRef.current
    const updated = applyDueEvents(afterAction, combined)
    setRunState(updated)
    recordBlast(updated)
    const justLogged = updated.log[updated.log.length - 1]
    setLastResult({ actionId, resultText: justLogged.resultText })
    if (isContained(updated)) {
      endScenario(updated, true, combined)
    } else if (combined >= level.timeLimitSeconds) {
      endScenario(updated, false, combined)
    }
  }

  // `totalElapsedSeconds` is the SAME combined value (action time-costs +
  // real seconds ticked) the on-screen timer uses to compute `remaining` —
  // never runState.elapsedSeconds alone, which only tracks action costs and
  // silently ignores any time spent just watching the clock. Passing it
  // through explicitly is what keeps the debrief's "Time" value honest.
  function endScenario(finalState, contained, totalElapsedSeconds) {
    if (concludedRef.current) return // isContained + the time-limit check can both fire off the same update; only report once
    concludedRef.current = true
    const summary = computeEndSummary(finalState, totalElapsedSeconds)
    const score = scoreRecoveryRun({ ...summary, timeLimitSeconds: level.timeLimitSeconds })
    const grade = gradeForScore(score)
    onComplete({ summary, score, grade, contained, mistakeReport: buildMistakeReport(finalState) })
  }

  if (!level) return <p>Unknown level.</p>

  if (phase === 'intro') {
    return <IncidentAlertIntro level={level} onBegin={begin} />
  }

  const combinedElapsed = runState.elapsedSeconds + realSeconds
  const remaining = level.timeLimitSeconds - combinedElapsed
  const blastRadius = computeBlastRadius(runState)
  const firedEvents = [...level.events.filter((e) => runState.firedEventIds.includes(e.id)), ...runState.syntheticEvents].sort(
    (a, b) => a.atSeconds - b.atSeconds,
  )

  const initialExposure = blastHistory[0] || 1
  const exposureRatio = Math.max(0, Math.min(1, blastRadius / initialExposure))
  const gaugeColor = `color-mix(in srgb, var(--cc-danger) ${Math.round(exposureRatio * 100)}%, var(--cc-good))`
  const timerDanger = remaining <= 30
  const nextAttackSeconds = getNextAttackerActionSeconds(runState, combinedElapsed)

  return (
    <div className="flex flex-col gap-1.5">
      <AmbientTension />

      {/* Header: the timer is the single most urgent readout on screen, the
          next-attack countdown sits right beside it as a distinct warning,
          and blast radius folds in as a compact inline readout rather than
          its own full-width bar — no duplicated number, no bordered strip
          for a single value. */}
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <h1 className="text-base sm:text-lg font-bold m-0 text-[var(--cc-text-dim)]">{level.name}</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div
            className="cc-lcd"
            role="timer"
            aria-label={`Time remaining: ${formatTime(remaining)}`}
            style={{ color: timerDanger ? 'var(--cc-danger)' : 'var(--cc-accent)' }}
          >
            <span
              className={`text-3xl sm:text-4xl font-bold ${timerDanger ? 'cc-pulse' : ''}`}
              style={{ textShadow: timerDanger ? 'var(--cc-glow-danger)' : 'var(--cc-glow-cyan)' }}
            >
              ⏱️ {formatTime(remaining)}
            </span>
          </div>
          {nextAttackSeconds != null && (
            <div className="cc-lcd" style={{ color: 'var(--cc-warn)' }} aria-live="off">
              <span className="text-sm font-bold" style={{ textShadow: 'var(--cc-glow-warn)' }}>
                ⚔️ NEXT ATTACK {formatTime(nextAttackSeconds)}
              </span>
            </div>
          )}
          <div
            className={`cc-lcd ${blastCue === 'grow' ? 'cc-node-error-shake' : ''} ${blastCue === 'shrink' ? 'cc-blast-shrink' : ''}`}
            style={{ color: gaugeColor }}
          >
            <span className="text-sm font-bold" style={{ textShadow: `0 0 8px ${gaugeColor}` }}>
              💥 BLAST RADIUS {blastRadius === 0 ? 'CONTAINED' : blastRadius}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-2 lg:grid-cols-[2fr_1fr] min-h-0">
        <Panel className="!p-2.5">
          <h2 className="text-sm font-semibold mt-0 mb-2 cc-chrome">Account map</h2>
          <BlastRadiusDiagram graph={level.graph} rootId={level.rootId} nodes={runState.nodes} forwardingActive={runState.forwardingActive} />
          {/* Same information as the diagram above, available as text without visually duplicating it — closed by default so it never costs vertical space. */}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-[var(--cc-text-dim)] select-none">View account status as text</summary>
            <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-1">
              {level.graph.nodes.map((n) => (
                <li key={n.id} className="flex justify-between border-b border-[var(--cc-panel-border)] pb-1">
                  <span>
                    <span aria-hidden="true">{n.icon}</span> {n.label}
                  </span>
                  <span>{STATUS_TAG[runState.nodes[n.id].status]}</span>
                </li>
              ))}
              {runState.forwardingActive && (
                <li className="text-[var(--cc-warn)]">⚠️ Email forwarding rule still active on {level.rootId}</li>
              )}
            </ul>
          </details>
        </Panel>

        <Panel className="!p-2.5 flex flex-col min-h-0" brackets={false}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-sm font-semibold m-0 cc-chrome">Live incident log</h2>
            <LiveIndicator />
          </div>
          <div className="overflow-y-auto min-h-0 pr-1" style={{ maxHeight: '340px' }}>
            <EventFeed events={firedEvents} />
          </div>
        </Panel>
      </div>

      <Panel className="!p-2.5" brackets={false}>
        <h2 className="text-sm font-semibold mt-0 mb-2 cc-chrome">What do you do?</h2>
        <ActionMenu onAction={handleAction} disabled={phase !== 'running'} lastResult={lastResult} />
      </Panel>
    </div>
  )
}
