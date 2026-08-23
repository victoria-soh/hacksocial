import { useEffect, useRef, useState } from 'react'
import { DAILY_CHALLENGE_SECONDS_PER_ITEM, getTodayRound } from '../../data/dailyChallengePool'
import { getNextMilestone } from '../../data/streakMilestones'
import { scoreDailyChallengeRound, gradeForScore } from '../../lib/scoring'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

const TICK_MS = 100

export default function DailyStreak() {
  const { streak, recordStreakCheckIn, recordAttempt, addXP } = useGame()
  const [phase, setPhase] = useState('intro') // intro -> playing -> done
  const [round] = useState(() => getTodayRound())
  const [itemIndex, setItemIndex] = useState(0)
  const [timeLeftMs, setTimeLeftMs] = useState(DAILY_CHALLENGE_SECONDS_PER_ITEM * 1000)
  const [results, setResults] = useState([])
  const [flash, setFlash] = useState(null) // { correct, explanation, exitDirection }
  const [finalResult, setFinalResult] = useState(null)

  const itemStartRef = useRef(0)
  const advanceTimerRef = useRef(null)

  const doneToday = streak.lastCompletedDate === todayISO()
  const nextMilestone = getNextMilestone(streak.milestonesClaimed)
  const item = round[itemIndex]

  useEffect(() => {
    if (phase !== 'playing') return undefined
    itemStartRef.current = Date.now()
    setTimeLeftMs(DAILY_CHALLENGE_SECONDS_PER_ITEM * 1000)
    const interval = setInterval(() => {
      setTimeLeftMs((prev) => Math.max(0, prev - TICK_MS))
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [phase, itemIndex])

  // Kept separate from the tick effect above so the timeout side effect
  // (multiple setState calls via answer()) never runs from inside another
  // state updater — it fires once, from its own effect, when time hits 0.
  useEffect(() => {
    if (phase !== 'playing' || flash) return
    if (timeLeftMs <= 0) answer(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeftMs, phase, flash])

  useEffect(() => () => clearTimeout(advanceTimerRef.current), [])

  function start() {
    setPhase('playing')
    setItemIndex(0)
    setResults([])
    setFlash(null)
    setFinalResult(null)
  }

  function answer(guessIsScam) {
    if (flash) return // already answered this item, awaiting auto-advance
    const timedOut = guessIsScam === null
    const responseMs = timedOut ? null : Date.now() - itemStartRef.current
    const correct = !timedOut && guessIsScam === item.isScam
    const entry = { id: item.id, correct, timedOut, responseMs }
    recordAttempt(correct)
    setFlash({ correct, timedOut, explanation: item.explanation, exitDirection: guessIsScam ? 'right' : 'left' })

    const nextResults = [...results, entry]
    setResults(nextResults)

    advanceTimerRef.current = setTimeout(() => {
      setFlash(null)
      if (itemIndex + 1 < round.length) {
        setItemIndex((i) => i + 1)
      } else {
        finishRound(nextResults)
      }
    }, 900)
  }

  function finishRound(finalResults) {
    const scored = scoreDailyChallengeRound(finalResults)
    recordStreakCheckIn()
    addXP(scored.xpEarned)
    setFinalResult(scored)
    setPhase('done')
  }

  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold m-0 flex items-center gap-2">
          <span aria-hidden="true">⚡</span> Daily Challenge — Scam or Legit?
        </h2>
        <span className="text-sm text-[var(--cc-text-dim)] text-right">
          Streak: {streak.current} day{streak.current === 1 ? '' : 's'}
          {nextMilestone && (
            <>
              <br />
              next milestone: {nextMilestone.days} days
            </>
          )}
        </span>
      </div>

      {streak.freezesAvailable > 0 && (
        <p className="text-xs text-[var(--cc-text-dim)] m-0 flex items-center gap-1">
          <span aria-hidden="true">🧊</span> Streak freeze available: {streak.freezesAvailable} — covers one missed day automatically.
        </p>
      )}

      {phase === 'intro' &&
        (doneToday ? (
          <p className="text-sm text-[var(--cc-good)] m-0">✓ Done for today — come back tomorrow.</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-sm m-0">
              {round.length} messages, {DAILY_CHALLENGE_SECONDS_PER_ITEM} seconds each — tap or use ← / → to call each one
              scam or legit. Under a minute, and it's what keeps your streak going today.
            </p>
            <button
              onClick={start}
              className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
            >
              Start Daily Challenge
            </button>
          </div>
        ))}

      {phase === 'playing' && item && (
        <DailyChallengeRound
          item={item}
          itemNumber={itemIndex + 1}
          totalItems={round.length}
          timeLeftMs={timeLeftMs}
          flash={flash}
          onAnswer={answer}
        />
      )}

      {phase === 'done' && finalResult && (
        <DailyChallengeResult result={finalResult} />
      )}
    </Panel>
  )
}

function DailyChallengeRound({ item, itemNumber, totalItems, timeLeftMs, flash, onAnswer }) {
  useEffect(() => {
    if (flash) return undefined
    function handleKey(e) {
      if (e.key === 'ArrowLeft') onAnswer(false)
      else if (e.key === 'ArrowRight') onAnswer(true)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flash, item])

  const secondsLeft = Math.ceil(timeLeftMs / 1000)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-[var(--cc-text-dim)]">
        <span>
          Message {itemNumber} of {totalItems}
        </span>
        <span aria-hidden="true">⏱️ {secondsLeft}s</span>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)' }}
        role="progressbar"
        aria-label={`${secondsLeft} seconds left to answer`}
        aria-valuenow={secondsLeft}
        aria-valuemin={0}
        aria-valuemax={DAILY_CHALLENGE_SECONDS_PER_ITEM}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.round((timeLeftMs / (DAILY_CHALLENGE_SECONDS_PER_ITEM * 1000)) * 100)}%`,
            background: timeLeftMs < 1500 ? 'var(--cc-danger)' : 'var(--cc-accent)',
            transition: 'width 100ms linear, background-color 300ms ease',
          }}
        />
      </div>

      {!flash ? (
        <>
          <div key={item.id} className="cc-swipe-card p-4 rounded-xl border" style={{ borderColor: 'var(--cc-panel-border)', background: 'var(--cc-bg-alt)' }}>
            <p className="text-xs text-[var(--cc-text-dim)] m-0 mb-1">{item.sender}</p>
            <p className="text-sm font-medium m-0">{item.text}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => onAnswer(false)}
              className="flex-1 px-4 py-3 rounded-lg border font-semibold min-h-11"
              style={{ borderColor: 'var(--cc-good)', color: 'var(--cc-good)' }}
            >
              ✅ Legit
            </button>
            <button
              onClick={() => onAnswer(true)}
              className="flex-1 px-4 py-3 rounded-lg border font-semibold min-h-11"
              style={{ borderColor: 'var(--cc-danger)', color: 'var(--cc-danger)' }}
            >
              🚫 Scam
            </button>
          </div>
        </>
      ) : (
        <div
          className={`cc-swipe-exit-${flash.exitDirection} p-4 rounded-xl border flex flex-col gap-1`}
          style={{
            borderColor: flash.timedOut ? 'var(--cc-warn)' : flash.correct ? 'var(--cc-good)' : 'var(--cc-danger)',
            background: 'var(--cc-bg-alt)',
          }}
          role="status"
        >
          <p className="font-semibold m-0" style={{ color: flash.timedOut ? 'var(--cc-warn)' : flash.correct ? 'var(--cc-good)' : 'var(--cc-danger)' }}>
            {flash.timedOut ? '⌛ Too slow — ' : flash.correct ? '✅ Correct — ' : '❌ Not quite — '}
            {item.isScam ? 'this was a scam.' : 'this was legit.'}
          </p>
          <p className="text-xs text-[var(--cc-text-dim)] m-0">{flash.explanation}</p>
        </div>
      )}
    </div>
  )
}

function DailyChallengeResult({ result }) {
  const grade = gradeForScore(result.accuracyScore)
  return (
    <div className="flex flex-col gap-2">
      <p className="font-semibold m-0">
        {result.correct} / {result.total} correct — {grade.label} <span aria-hidden="true">{grade.icon}</span>
      </p>
      {result.avgResponseMs != null && (
        <p className="text-sm text-[var(--cc-text-dim)] m-0">Average response time: {(result.avgResponseMs / 1000).toFixed(1)}s</p>
      )}
      <p className="text-sm text-[var(--cc-good)] m-0">✓ Streak updated — +{result.xpEarned} XP earned today.</p>
    </div>
  )
}
