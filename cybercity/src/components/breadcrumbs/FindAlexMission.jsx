import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ALEX_POSTS, BREADCRUMB_EDGES, BREADCRUMB_NODES, BREADCRUMB_MAX_SCORE, FIND_ALEX_REVEAL_INSIGHTS } from '../../data/breadcrumbs'
import { useGame } from '../../state/GameContext'
import { useDeductionBoard } from '../../lib/useDeductionBoard'
import { computeExposurePercent, computeDetectiveBonus, DETECTIVE_MODE_TIME_LIMIT_SECONDS } from '../../lib/scoring'
import ConnectionMap from './ConnectionMap'
import Dossier from './Dossier'
import CaseFileBootUp from './CaseFileBootUp'
import ExposureMeter from './ExposureMeter'
import EvidenceFeed from './EvidenceFeed'
import Panel from '../shared/Panel'
import WhatsNextPrompt from '../shared/WhatsNextPrompt'

function formatElapsed(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// The merged "Case Progress" panel's headline fields — a curated subset of
// BREADCRUMB_NODES (not all 11), matching the fields a player would
// actually want tracked at a glance. Each maps to one node id already in
// the data model; no data-model changes needed to support this.
const DOSSIER_FIELDS = [
  { nodeId: 'fact-age', label: 'Age' },
  { nodeId: 'fact-employer', label: 'Employer' },
  { nodeId: 'inf-office-location', label: 'Work Area' },
  { nodeId: 'inf-home-area', label: 'Home Area' },
  { nodeId: 'inf-daily-commute', label: 'Routine' },
]

// The very first connection the player can make (BREADCRUMB_EDGES[0]) is
// walked through interactively instead of via the instructional paragraph
// alone — see the guided* derivations in FindAlexPlaythrough below.
const GUIDED_EDGE = BREADCRUMB_EDGES[0]

/**
 * Thin wrapper that owns only what must survive a replay: which mode the
 * next playthrough runs in, and a key that forces a full remount of
 * FindAlexPlaythrough below (fresh board, fresh opened evidence, fresh
 * timer) rather than trying to hand-reset every piece of that state.
 * `mode` starts — and can only ever start — at 'normal', so Detective Mode
 * is structurally unreachable on a first playthrough: it's only offered
 * from the results screen, which by definition only renders after a
 * completion has already happened.
 */
export default function FindAlexMission() {
  const [playthroughKey, setPlaythroughKey] = useState(0)
  const [mode, setMode] = useState('normal')

  function replay(nextMode) {
    setMode(nextMode)
    setPlaythroughKey((k) => k + 1)
  }

  return <FindAlexPlaythrough key={playthroughKey} mode={mode} onReplay={replay} />
}

function FindAlexPlaythrough({ mode, onReplay }) {
  const board = useDeductionBoard(BREADCRUMB_EDGES, BREADCRUMB_NODES)
  const [finished, setFinished] = useState(false)
  const [booted, setBooted] = useState(false)
  const [openedIds, setOpenedIds] = useState(new Set())
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finishStats, setFinishStats] = useState(null)
  const detectiveStartRef = useRef(null)
  const { completeFindAlex, addXP } = useGame()
  const navigate = useNavigate()

  const isDetective = mode === 'detective'

  // Stranger Knowledge explanation + escalating framing (feature 4), and the
  // ×2/×3 corroboration combo callout (feature 5) — both driven off the same
  // event: a new node just resolved on the case board. `prevExposureRef`
  // tracks the last percent this effect actually reacted to, so the
  // explanation only appears when the displayed percentage genuinely moved,
  // never on a rounding no-op.
  const prevExposureRef = useRef(0)
  const [revealNotice, setRevealNotice] = useState(null) // { key, reason }
  const [comboNotice, setComboNotice] = useState(null) // { key, count, points, label }
  const exposurePercent = computeExposurePercent(board.unlockedNodeIds, BREADCRUMB_NODES)

  useEffect(() => {
    if (board.unlockOrder.length === 0) return
    const newestId = board.unlockOrder[board.unlockOrder.length - 1]
    const node = BREADCRUMB_NODES[newestId]
    if (exposurePercent > prevExposureRef.current) {
      setRevealNotice({ key: `${newestId}-${board.unlockOrder.length}`, reason: `You now know: Alex ${node.dossierFragment}.` })
    }
    prevExposureRef.current = exposurePercent

    const edge = BREADCRUMB_EDGES.find((e) => e.to === newestId)
    if (edge && edge.from.length > 1) {
      setComboNotice({ key: `${edge.id}-${Date.now()}`, count: edge.from.length, points: edge.points, label: node.label })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.unlockOrder.length])

  useEffect(() => {
    if (!comboNotice) return undefined
    const t = setTimeout(() => setComboNotice(null), 4200)
    return () => clearTimeout(t)
  }, [comboNotice])

  // First-connection walkthrough (feature 3): active until the one guided
  // edge resolves, then never again for this playthrough.
  const tutorialActive = !board.completedEdgeIds.has(GUIDED_EDGE.id)
  const guidedPostId = GUIDED_EDGE.from[0]
  const guidedTargetId = GUIDED_EDGE.to
  const guidedPostOpened = openedIds.has(guidedPostId)

  // Detective Mode timer: starts the moment the real mission view appears
  // (after boot-up), not during boot-up itself. No-penalty retries are
  // unaffected — a retry just costs time, exactly like any other action.
  useEffect(() => {
    if (!isDetective || !booted || finished) return undefined
    detectiveStartRef.current = Date.now()
    const id = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - detectiveStartRef.current) / 1000))
    }, 250)
    return () => clearInterval(id)
  }, [isDetective, booted, finished])

  function openEvidence(id) {
    setOpenedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  function finishInvestigation() {
    const detectiveElapsedSeconds =
      isDetective && detectiveStartRef.current ? Math.round((Date.now() - detectiveStartRef.current) / 1000) : null
    const bonus = detectiveElapsedSeconds != null ? computeDetectiveBonus(detectiveElapsedSeconds) : 0
    setFinished(true)
    setFinishStats({ detectiveElapsedSeconds, bonus })
    completeFindAlex(board.score)
    addXP(board.score)
    if (bonus > 0) addXP(bonus)
  }

  if (!booted) {
    return <CaseFileBootUp onDone={() => setBooted(true)} />
  }

  if (finished) {
    // Dynamic reveal: every line here is computed from what THIS
    // playthrough actually unlocked — an early exit never claims a
    // discovery, count, or specific inference that didn't happen.
    const discoveredCount = board.completedEdgeIds.size
    const reachedInsight = FIND_ALEX_REVEAL_INSIGHTS.find((i) => board.unlockOrder.includes(i.nodeId))

    return (
      <div className="flex flex-col gap-6 max-w-3xl mx-auto cc-alert-entrance">
        <Panel>
          <h1 className="text-xl font-bold mt-0">🔍 Investigation Complete</h1>
          <p className="text-[var(--cc-text-dim)]">
            Score: {board.score} / {BREADCRUMB_MAX_SCORE} points
          </p>
          <h2 className="text-base font-semibold">What you were able to find out about "Alex" from public posts alone:</h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            <li className="flex items-start gap-2 border-b border-[var(--cc-panel-border)] pb-2">
              <span aria-hidden="true">📱</span>
              <span>You started with {ALEX_POSTS.length} ordinary posts.</span>
            </li>
            <li className="flex items-start gap-2 border-b border-[var(--cc-panel-border)] pb-2">
              <span aria-hidden="true">🧩</span>
              <span>
                You discovered {discoveredCount} piece{discoveredCount === 1 ? '' : 's'} of personal information.
              </span>
            </li>
            {reachedInsight && (
              <>
                <li className="flex items-start gap-2 border-b border-[var(--cc-panel-border)] pb-2">
                  <span aria-hidden="true">🙅</span>
                  <span>{reachedInsight.neverPostedLine}</span>
                </li>
                <li className="flex items-start gap-2 border-b border-[var(--cc-panel-border)] pb-2">
                  <span aria-hidden="true">🔎</span>
                  <span className="font-semibold">{reachedInsight.inferredLine}</span>
                </li>
              </>
            )}
          </ul>
        </Panel>

        {finishStats?.detectiveElapsedSeconds != null && (
          <Panel>
            <h2 className="text-base font-semibold mt-0 mb-1">🕵️ Detective Mode</h2>
            <p className="m-0 text-sm">
              Finished in {formatElapsed(finishStats.detectiveElapsedSeconds)}.{' '}
              {finishStats.bonus > 0
                ? `Under ${formatElapsed(DETECTIVE_MODE_TIME_LIMIT_SECONDS)} — +${finishStats.bonus} bonus XP!`
                : `Outside the ${formatElapsed(DETECTIVE_MODE_TIME_LIMIT_SECONDS)} bonus window this time — no penalty, just no bonus.`}
            </p>
          </Panel>
        )}

        <Panel>
          <p className="m-0 text-sm text-[var(--cc-text-dim)]">
            None of this required hacking anything — it came from {ALEX_POSTS.length} ordinary, voluntarily-shared
            posts. That's the point of this district: small public details add up faster than most people expect.
          </p>
        </Panel>
        <Panel className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div>
            <h2 className="text-base font-bold mt-0 mb-1">That's what a stranger learned about "Alex."</h2>
            <p className="text-sm text-[var(--cc-text-dim)] m-0">
              Now let's check what a stranger could learn about you — with your own text, on your own terms.
            </p>
          </div>
          <button
            onClick={() => navigate('/breadcrumbs#privacy-mirror')}
            className="no-underline text-center px-5 py-2.5 rounded-lg font-semibold min-h-11 shrink-0 cc-chrome"
            style={{ background: 'var(--cc-accent)', color: '#06111c', boxShadow: 'var(--cc-glow-cyan)' }}
          >
            Try Privacy Mirror
          </button>
        </Panel>
        <WhatsNextPrompt />

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/breadcrumbs')}
            className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
          >
            Continue to Digital Breadcrumbs hub
          </button>
          <button
            onClick={() => onReplay('detective')}
            className="self-start px-5 py-2.5 rounded-lg border font-semibold min-h-11"
            style={{ borderColor: 'var(--cc-accent-2)', color: 'var(--cc-accent-2)' }}
          >
            🕵️ Replay in Detective Mode
          </button>
          <button
            onClick={() => onReplay('normal')}
            className="self-start px-2 py-2.5 text-sm text-[var(--cc-text-dim)] underline min-h-11"
          >
            ↺ Replay (untimed)
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 cc-alert-entrance">
      <div aria-live="assertive" className="sr-only">
        {board.liveMessage}
      </div>

      <div>
        <h1 className="text-xl font-bold mb-1 flex items-center gap-2 flex-wrap">
          Mission: Find Alex
          {isDetective && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full tabular-nums"
              style={{ color: 'var(--cc-accent-2)', border: '1px solid var(--cc-accent-2)' }}
            >
              🕵️ {formatElapsed(elapsedSeconds)}
            </span>
          )}
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">
          "Alex" is a fictional practice profile built for this game. Score: {board.score} points.
        </p>
        {/* First-connection walkthrough: a short, stage-specific nudge
            replaces the old paragraph that explained the whole drag/select
            mechanic upfront — the guided highlights below teach it instead,
            and this line disappears for good once that first chain resolves. */}
        {tutorialActive && (
          <p className="text-sm font-semibold m-0 mt-1" style={{ color: 'var(--cc-focus)' }}>
            {guidedPostOpened
              ? '👉 Drag the glowing clue onto the pulsing slot below to connect it (or select it, then press Enter/Space on the slot).'
              : '👉 Open the highlighted post below — it holds your first clue.'}
          </p>
        )}
      </div>

      {comboNotice && (
        <div
          role="status"
          aria-live="polite"
          className="cc-achievement-pop cc-hud-panel relative flex items-center gap-3 rounded-2xl border p-4"
          style={{ background: 'var(--cc-panel)', borderColor: 'var(--cc-accent-2)', boxShadow: 'var(--cc-glow-magenta)' }}
        >
          <span className="cc-achievement-icon text-3xl shrink-0" aria-hidden="true">🔗</span>
          <div>
            <p className="cc-chrome text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
              {comboNotice.count}-Clue {comboNotice.count === 3 ? 'Inference' : 'Connection'}!
            </p>
            <p className="font-bold m-0 mt-0.5">+{comboNotice.points} XP — "{comboNotice.label}"</p>
            <p className="text-sm text-[var(--cc-text-dim)] m-0 mt-0.5">
              You corroborated {comboNotice.count} independent clues to reach this conclusion.
            </p>
          </div>
        </div>
      )}

      <ExposureMeter percent={exposurePercent} revealReason={revealNotice?.reason} revealKey={revealNotice?.key} />

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] items-start min-w-0">
        <div className="flex flex-col gap-4 min-w-0">
          <EvidenceFeed
            posts={ALEX_POSTS}
            openedIds={openedIds}
            onOpen={openEvidence}
            guidedPostId={tutorialActive && !guidedPostOpened ? guidedPostId : null}
          />

          <Panel className="cc-circuit-texture">
            <h2 className="text-base font-semibold mt-0">Case board</h2>
            <ConnectionMap
              posts={ALEX_POSTS}
              nodes={BREADCRUMB_NODES}
              edges={BREADCRUMB_EDGES}
              unlockedNodeIds={board.unlockedNodeIds}
              completedEdges={board.completedEdges}
              selectedSourceIds={board.selected}
              attachedByTarget={board.attachedByTarget}
              errorSignal={board.errorSignal}
              onToggleSelect={board.toggleSelect}
              onAttempt={board.attemptConnection}
              openedIds={openedIds}
              guidedSourceId={tutorialActive && guidedPostOpened ? guidedPostId : null}
              guidedTargetId={tutorialActive && guidedPostOpened ? guidedTargetId : null}
            />
          </Panel>
        </div>

        <Dossier
          unlockOrder={board.unlockOrder}
          nodes={BREADCRUMB_NODES}
          name="Alex"
          subtitle={board.unlockOrder.includes('fact-age') ? 'Alex, ~20' : 'Alex'}
          fields={DOSSIER_FIELDS}
        />
      </div>

      <button
        onClick={finishInvestigation}
        disabled={board.completedEdgeIds.size === 0}
        className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 disabled:opacity-40"
      >
        {board.allDone ? 'Finish investigation' : 'Finish investigation early'}
      </button>
    </div>
  )
}
