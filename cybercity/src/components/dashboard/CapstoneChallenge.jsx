import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAPSTONE_POSTS,
  CAPSTONE_NODES,
  CAPSTONE_EDGES,
  CAPSTONE_DEDUCTION_MAX_SCORE,
  CAPSTONE_INCIDENT_LEVEL_ID,
  CAPSTONE_COMMS_SCENARIO,
} from '../../data/capstone'
import { capstoneUnlockRequirements, combineCapstoneScore, normalizeDeductionScore } from '../../lib/capstone'
import { useDeductionBoard } from '../../lib/useDeductionBoard'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import ConnectionMap from '../breadcrumbs/ConnectionMap'
import Dossier from '../breadcrumbs/Dossier'
import IncidentEngine from '../recoveryRush/IncidentEngine'
import ChatMissionEngine from '../communityCentre/ChatMissionEngine'

/**
 * The capstone "Final Challenge" — the game's proper ending moment, not
 * just another mission in a list. Chains all three district mechanics
 * (deduction board, incident engine, chat mission engine) into one
 * narrative about a single fictional person, Jordan, and combines all
 * three stage scores into one Cyber Guardian Certification result.
 */
export default function CapstoneChallenge() {
  const { state, capstoneUnlocked, completeCapstone } = useGame()
  const navigate = useNavigate()
  const [stage, setStage] = useState('intro') // intro -> deduction -> incident -> comms -> result
  const [incidentResult, setIncidentResult] = useState(null)
  const [commsResult, setCommsResult] = useState(null)
  const [finalResult, setFinalResult] = useState(null)

  const board = useDeductionBoard(CAPSTONE_EDGES, CAPSTONE_NODES)

  if (!capstoneUnlocked) {
    const requirements = capstoneUnlockRequirements(state)
    return (
      <div className="max-w-xl mx-auto flex flex-col gap-4">
        <Panel className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold mt-0 flex items-center justify-center gap-2">
            <span aria-hidden="true">🔒</span> Final Challenge locked
          </h1>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            This is the game's capstone — complete all three districts at least once to unlock it:
          </p>
          <ul className="list-none p-0 m-0 flex flex-col gap-1 text-sm text-left mt-2">
            {requirements.map((r) => (
              <li key={r.label} className="flex items-center gap-2">
                <span aria-hidden="true">{r.done ? '✅' : '⬜'}</span> {r.label}
              </li>
            ))}
          </ul>
        </Panel>
        <button
          onClick={() => navigate('/dashboard')}
          className="self-center px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
        >
          Back to dashboard
        </button>
      </div>
    )
  }

  function finishDeduction() {
    setStage('incident')
  }

  function handleIncidentComplete(data) {
    setIncidentResult(data)
    setStage('comms')
  }

  function handleCommsComplete(data) {
    setCommsResult(data)
    const combined = combineCapstoneScore({
      deductionScore: normalizeDeductionScore(board.score, CAPSTONE_DEDUCTION_MAX_SCORE),
      incidentScore: incidentResult.score,
      commsScore: data.score,
    })
    completeCapstone(combined)
    setFinalResult(combined)
    setStage('result')
  }

  if (stage === 'intro') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <Panel className="cc-hud-panel text-center flex flex-col gap-3" style={{ borderColor: 'var(--cc-accent-2)', boxShadow: 'var(--cc-glow-magenta)' }}>
          <p className="cc-chrome text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
            The Final Challenge
          </p>
          <h1 className="text-2xl font-bold mt-0 mb-0">🎓 Cyber Guardian Certification</h1>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            Everything you've learned, in one story. You'll investigate a fictional coworker, Jordan — then respond
            live when what you found becomes exactly the vulnerability that gets exploited — then explain it all to
            Jordan afterward, in plain language.
          </p>
          <ol className="text-sm text-left list-decimal pl-5 m-0 flex flex-col gap-1">
            <li>Deduction — piece together Jordan's public posts</li>
            <li>Incident response — contain the breach that follows</li>
            <li>Communication — explain what happened, and what to do</li>
          </ol>
        </Panel>
        <button
          onClick={() => setStage('deduction')}
          className="self-center px-6 py-3 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-bold min-h-11"
        >
          Begin the Final Challenge
        </button>
      </div>
    )
  }

  if (stage === 'deduction') {
    return (
      <div className="flex flex-col gap-6">
        <div aria-live="assertive" className="sr-only">
          {board.liveMessage}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
            Final Challenge · Stage 1 of 3
          </p>
          <h1 className="text-xl font-bold mb-1">What can you find out about Jordan?</h1>
          <p className="text-[var(--cc-text-dim)] m-0">
            "Jordan" is a fictional practice profile. Connect all the clues below to reveal a real vulnerability.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start min-w-0">
          <div className="flex flex-col gap-4 min-w-0">
            <div className="grid gap-3 sm:grid-cols-2">
              {CAPSTONE_POSTS.map((post) => (
                <Panel
                  key={post.id}
                  as="button"
                  onClick={() => board.toggleSelect(post.id)}
                  className={`text-left w-full ${board.selected.has(post.id) ? 'border-[var(--cc-accent-2)] ring-2 ring-[var(--cc-accent-2)]' : ''}`}
                >
                  <p className="text-xs text-[var(--cc-text-dim)] m-0 flex items-center gap-1">
                    <span aria-hidden="true">{post.icon}</span> {post.platform} · {post.handle}
                  </p>
                  <p className="font-medium my-1">{post.caption}</p>
                </Panel>
              ))}
            </div>

            <Panel className="cc-circuit-texture">
              <h2 className="text-base font-semibold mt-0">Case board</h2>
              <p className="text-xs text-[var(--cc-text-dim)] mt-0 mb-2">
                Press and drag a clue onto a slot to connect it. Keyboard: select clue(s) with Enter/Space, then
                activate a slot the same way.
              </p>
              <ConnectionMap
                posts={CAPSTONE_POSTS}
                nodes={CAPSTONE_NODES}
                edges={CAPSTONE_EDGES}
                unlockedNodeIds={board.unlockedNodeIds}
                completedEdges={board.completedEdges}
                selectedSourceIds={board.selected}
                attachedByTarget={board.attachedByTarget}
                errorSignal={board.errorSignal}
                onToggleSelect={board.toggleSelect}
                onAttempt={board.attemptConnection}
              />
            </Panel>
          </div>

          <Dossier unlockOrder={board.unlockOrder} nodes={CAPSTONE_NODES} name="Jordan" icon="🧑‍💻" />
        </div>

        <button
          onClick={finishDeduction}
          disabled={!board.allDone}
          className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 disabled:opacity-40"
        >
          {board.allDone ? 'Continue to incident response →' : `Connect all the clues to continue (${board.completedEdgeIds.size}/${CAPSTONE_EDGES.length})`}
        </button>
      </div>
    )
  }

  if (stage === 'incident') {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
          Final Challenge · Stage 2 of 3
        </p>
        <IncidentEngine levelId={CAPSTONE_INCIDENT_LEVEL_ID} onComplete={handleIncidentComplete} />
      </div>
    )
  }

  if (stage === 'comms') {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <p className="text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
          Final Challenge · Stage 3 of 3
        </p>
        <h1 className="text-xl font-bold mt-0 mb-0 flex items-center gap-2">
          <span aria-hidden="true">🧑‍💻</span> Debrief Jordan
        </h1>
        <ChatMissionEngine scenario={CAPSTONE_COMMS_SCENARIO} onComplete={handleCommsComplete} />
      </div>
    )
  }

  // stage === 'result'
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <Panel
        className="text-center flex flex-col gap-3"
        style={{ borderColor: 'var(--cc-accent-2)', boxShadow: 'var(--cc-glow-magenta)' }}
      >
        <p className="cc-chrome text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
          Final Challenge complete
        </p>
        <span className="text-5xl" aria-hidden="true">
          {finalResult.certification.icon}
        </span>
        <h1 className="text-2xl font-bold mt-0 mb-0">{finalResult.certification.title}</h1>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">Combined score: {finalResult.finalScore} / 100</p>
      </Panel>

      <Panel>
        <h2 className="text-base font-semibold mt-0 mb-3">Stage breakdown</h2>
        <dl className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm m-0">
          <dt className="text-[var(--cc-text-dim)]">1. Deduction</dt>
          <dd className="m-0">{finalResult.deductionScore} / 100</dd>
          <dt className="text-[var(--cc-text-dim)]">2. Incident response</dt>
          <dd className="m-0">
            {finalResult.incidentScore} / 100 — {incidentResult?.grade?.label}
          </dd>
          <dt className="text-[var(--cc-text-dim)]">3. Communication</dt>
          <dd className="m-0">
            {finalResult.commsScore} / 100 {commsResult?.correctChoice ? '' : '(not the safest first response)'}
          </dd>
        </dl>
      </Panel>

      <Panel>
        <p className="text-sm m-0">
          You investigated a public footprint, contained a live compromise, and explained it clearly to someone
          non-technical — the same three skills the whole game has been building toward. That's everything CyberCity
          set out to teach.
        </p>
      </Panel>

      <button
        onClick={() => navigate('/dashboard')}
        className="self-center px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
      >
        Back to dashboard
      </button>
    </div>
  )
}
