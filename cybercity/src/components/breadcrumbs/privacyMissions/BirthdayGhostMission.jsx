import { useState } from 'react'
import { BIRTHDAY_PROFILE_ELEMENTS } from '../../../data/privacyMissions'
import { scoreBirthdayGhost } from '../../../lib/scoring'

export default function BirthdayGhostMission({ onComplete }) {
  const [fixedIds, setFixedIds] = useState(new Set())
  const [result, setResult] = useState(null)

  function toggle(id) {
    if (result?.passed) return
    setFixedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setResult(null)
  }

  function checkProfile() {
    const outcome = scoreBirthdayGhost([...fixedIds], BIRTHDAY_PROFILE_ELEMENTS)
    setResult(outcome)
    if (outcome.passed) {
      setTimeout(() => onComplete(outcome), 1100)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm m-0">
        Some of these profile elements actually reveal your date of birth — others just look related. Tap to fix the
        ones that genuinely leak it.
      </p>

      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {BIRTHDAY_PROFILE_ELEMENTS.map((el) => {
          const isFixed = fixedIds.has(el.id)
          return (
            <li key={el.id}>
              <button
                onClick={() => toggle(el.id)}
                disabled={result?.passed}
                aria-pressed={isFixed}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-lg border min-h-11 ${
                  isFixed ? 'border-[var(--cc-good)] bg-[var(--cc-good)]/10' : 'border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)]'
                }`}
              >
                <span className="text-lg shrink-0" aria-hidden="true">
                  {isFixed ? '✅' : el.icon}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-medium">{el.label}</span>
                  <span className="block text-xs text-[var(--cc-text-dim)] mt-0.5">
                    {isFixed ? el.fixedNote : el.content}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {result && (
        <div role="status" className="flex flex-col gap-1">
          <p
            className="text-sm font-semibold m-0 flex items-center gap-1.5"
            style={{ color: result.passed ? 'var(--cc-good)' : 'var(--cc-warn)' }}
          >
            <span aria-hidden="true">{result.passed ? '✅' : '❌'}</span>
            {result.passed
              ? `Nice — you fixed all ${result.totalLeaks} real leaks.`
              : `Found ${result.leaksFixed} / ${result.totalLeaks} real leaks. Try again, no penalty.`}
          </p>
          {result.decoysFixed > 0 && (
            <p className="text-xs text-[var(--cc-text-dim)] m-0">
              You also touched {result.decoysFixed} element{result.decoysFixed === 1 ? '' : 's'} that didn't actually
              reveal your birthday — no harm done, but it doesn't count toward the score either.
            </p>
          )}
        </div>
      )}

      {!result?.passed && (
        <button
          onClick={checkProfile}
          disabled={fixedIds.size === 0}
          className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 disabled:opacity-40"
        >
          Check profile
        </button>
      )}
    </div>
  )
}
