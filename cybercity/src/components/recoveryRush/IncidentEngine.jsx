import { useEffect, useRef, useState } from 'react'
import {
  getLevel,
  createInitialRunState,
  applyAction,
  applyDueEvents,
  computeBlastRadius,
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

/**
 * The Recovery Rush timer/action-menu/diagram engine, extracted out of the
 * standalone IncidentScenario page so the exact same mechanic can be
 * embedded in the capstone challenge's incident-response stage. Manages its
 * own intro -> running phases; the moment the incident concludes (contained
 * or time runs out) it calls onComplete(endData) exactly once and stops —
 * what happens after that (persistence, an EndScreen, a capstone summary)
 * is entirely up to the caller, which is what makes this reusable across
 * both contexts.
 */
export default function IncidentEngine({ levelId, onComplete }) {
  const level = getLevel(levelId)
  const [phase, setPhase] = useState('intro') // intro | running
  const [runState, setRunState] = useState(() => createInitialRunState(levelId))
  const [realSeconds, setRealSeconds] = useState(0)
  const [blastHistory, setBlastHistory] = useState([])
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
      endScenario(updated, true)
    } else if (combined >= level.timeLimitSeconds) {
      endScenario(updated, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [realSeconds, phase])

  function recordBlast(state) {
    const value = computeBlastRadius(state)
    setBlastHistory((prev) => (prev[prev.length - 1] === value ? prev : [...prev, value]))
  }

  function begin() {
    const fresh = createInitialRunState(levelId)
    setRunState(fresh)
    setRealSeconds(0)
    setBlastHistory([computeBlastRadius(fresh)])
    setPhase('running')
  }

  function handleAction(actionId) {
    const afterAction = applyAction(runStateRef.current, actionId)
    const combined = afterAction.elapsedSeconds + realSecondsRef.current
    const updated = applyDueEvents(afterAction, combined)
    setRunState(updated)
    recordBlast(updated)
    if (isContained(updated)) {
      endScenario(updated, true)
    } else if (combined >= level.timeLimitSeconds) {
      endScenario(updated, false)
    }
  }

  function endScenario(finalState, contained) {
    if (concludedRef.current) return // isContained + the time-limit check can both fire off the same update; only report once
    concludedRef.current = true
    const summary = computeEndSummary(finalState)
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

  // Exposure "temperature": a continuous red-to-green blend + size/glow scale
  // driven by how much of the original exposure is still outstanding, not a
  // flat static number.
  const initialExposure = blastHistory[0] || 1
  const exposureRatio = Math.max(0, Math.min(1, blastRadius / initialExposure))
  const gaugeColor = `color-mix(in srgb, var(--cc-danger) ${Math.round(exposureRatio * 100)}%, var(--cc-good))`
  const gaugeSize = 1.75 + exposureRatio * 1.75 // rem

  return (
    <div className="flex flex-col gap-5">
      <AmbientTension />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold m-0">{level.name}</h1>
        <div
          className={`cc-chrome text-2xl font-bold ${remaining <= 30 ? 'text-[var(--cc-danger)]' : 'text-[var(--cc-text)]'}`}
          role="timer"
          aria-label={`Time remaining: ${formatTime(remaining)}`}
          style={remaining <= 30 ? { textShadow: 'var(--cc-glow-danger)' } : undefined}
        >
          ⏱️ {formatTime(remaining)}
        </div>
      </div>

      <Panel className="text-center">
        <p className="text-sm text-[var(--cc-text-dim)] mb-1">Accounts still exposed</p>
        <p className="m-0 cc-chrome font-bold transition-[color,font-size] duration-500" style={{ color: gaugeColor, fontSize: `${gaugeSize}rem`, textShadow: `0 0 ${8 + exposureRatio * 20}px ${gaugeColor}` }}>
          {blastRadius === 0 ? 'CONTAINED' : blastRadius}
        </p>
        <p className="text-xs text-[var(--cc-text-dim)] mt-1 mb-0">
          {blastHistory.join(' → ')}
          {blastRadius === 0 && ' → CONTAINED'}
        </p>
      </Panel>

      <Panel>
        <h2 className="text-base font-semibold mt-0 mb-3">Account status</h2>
        <BlastRadiusDiagram graph={level.graph} rootId={level.rootId} nodes={runState.nodes} forwardingActive={runState.forwardingActive} />
        {/* Same information as the diagram above, available as text without visually duplicating it. */}
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-[var(--cc-text-dim)] select-none">View account status as text</summary>
          <ul className="list-none p-0 m-0 mt-2 flex flex-col gap-1.5">
            {level.graph.nodes.map((n) => (
              <li key={n.id} className="flex justify-between border-b border-[var(--cc-panel-border)] pb-1.5">
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

      <Panel>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold m-0">Activity feed</h2>
          <LiveIndicator />
        </div>
        <EventFeed events={firedEvents} />
      </Panel>

      <Panel>
        <h2 className="text-base font-semibold mt-0 mb-3">What do you do?</h2>
        <ActionMenu onAction={handleAction} disabled={phase !== 'running'} />
      </Panel>
    </div>
  )
}
