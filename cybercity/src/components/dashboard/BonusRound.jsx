import { useEffect, useMemo, useState } from 'react'
import { generateScamExample, checkAiAvailable } from '../../lib/ai'
import { computeDifficultyTier, scoreBonusRoundSelection } from '../../lib/scoring'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

const BONUS_XP = { beginner: 15, intermediate: 25, advanced: 40 }
const DIFFICULTY_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }

function shuffled(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export default function BonusRound() {
  const { performance, recordAttempt, addXP } = useGame()
  const difficulty = computeDifficultyTier(performance.recentAttempts)
  const [example, setExample] = useState(null)
  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [aiAvailable, setAiAvailable] = useState(true) // optimistic default avoids a flash of the notice while the check resolves

  useEffect(() => {
    let cancelled = false
    checkAiAvailable().then((available) => {
      if (!cancelled) setAiAvailable(available)
    })
    return () => {
      cancelled = true
    }
  }, [])

  async function start() {
    setLoading(true)
    setResult(null)
    setSelected(new Set())
    const ex = await generateScamExample(difficulty)
    setExample(ex)
    setOptions(shuffled([...ex.redFlags, ...ex.plausibleButSafe]))
    setLoading(false)
  }

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function submit() {
    const redFlagIds = example.redFlags.map((f) => f.id)
    const outcome = scoreBonusRoundSelection([...selected], redFlagIds)
    setResult(outcome)
    recordAttempt(outcome.correct)
    addXP(BONUS_XP[difficulty] ?? 15)
  }

  const trueRedFlagIds = useMemo(() => new Set((example?.redFlags ?? []).map((f) => f.id)), [example])

  return (
    <Panel className="flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-base font-semibold m-0 flex items-center gap-2">
          <span aria-hidden="true">🧪</span> Bonus round: spot the red flags
        </h2>
        <span className="text-xs px-2 py-1 rounded-full border border-[var(--cc-panel-border)] text-[var(--cc-text-dim)]">
          Your level: {DIFFICULTY_LABEL[difficulty]}
        </span>
      </div>

      {!example && (
        <>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            Generate a fresh scam example matched to your recent accuracy, and pick out what's actually suspicious.
          </p>
          <button
            onClick={start}
            disabled={loading}
            className="self-start px-4 py-2.5 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] font-semibold min-h-11 disabled:opacity-40"
          >
            {loading ? 'Generating…' : 'Generate a challenge for my level'}
          </button>
          {!aiAvailable && (
            <p className="text-xs text-[var(--cc-text-dim)] m-0">AI service unavailable — using a built-in example pool.</p>
          )}
        </>
      )}

      {example && (
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-[var(--cc-text-dim)] m-0 mb-1">Message from: {example.message.sender}</p>
            <p className="bg-[var(--cc-bg-alt)] rounded-lg p-3 m-0 text-sm">{example.message.text}</p>
            {example.source === 'heuristic' && (
              <p className="text-xs text-[var(--cc-text-dim)] mt-1.5 mb-0">
                AI service unavailable — this example is from the built-in pool.
              </p>
            )}
          </div>

          <p className="text-sm m-0">Select every detail below that's an actual red flag:</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {options.map((opt) => {
              const isSelected = selected.has(opt.id)
              const showAnswer = result != null
              const isTrueFlag = trueRedFlagIds.has(opt.id)
              return (
                <li key={opt.id}>
                  <label
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm ${
                      showAnswer
                        ? isTrueFlag
                          ? 'border-[var(--cc-good)] bg-[var(--cc-good)]/10'
                          : isSelected
                            ? 'border-[var(--cc-danger)] bg-[var(--cc-danger)]/10'
                            : 'border-[var(--cc-panel-border)]'
                        : isSelected
                          ? 'border-[var(--cc-accent)] bg-[var(--cc-bg-alt)]'
                          : 'border-[var(--cc-panel-border)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={result != null}
                      onChange={() => toggle(opt.id)}
                      className="h-5 w-5"
                    />
                    {opt.text}
                    {showAnswer && (
                      <span className="ml-auto text-xs shrink-0" aria-hidden="true">
                        {isTrueFlag ? '🚩' : '—'}
                      </span>
                    )}
                  </label>
                </li>
              )
            })}
          </ul>

          {result == null ? (
            <button
              onClick={submit}
              disabled={selected.size === 0}
              className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 disabled:opacity-40"
            >
              Submit
            </button>
          ) : (
            <div className="flex flex-col gap-2">
              <p className={`font-semibold m-0 ${result.correct ? 'text-[var(--cc-good)]' : 'text-[var(--cc-warn)]'}`}>
                {result.correct
                  ? `✅ Correct — found ${result.hits}/${result.total} red flags, no false positives.`
                  : `❓ Found ${result.hits}/${result.total} red flags${result.falsePositives > 0 ? `, with ${result.falsePositives} false positive(s)` : ''}.`}
              </p>
              <button
                onClick={start}
                className="self-start px-4 py-2.5 rounded-lg border border-[var(--cc-panel-border)] text-sm min-h-11"
              >
                Try another
              </button>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
