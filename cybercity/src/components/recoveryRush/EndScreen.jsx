import { useEffect, useState } from 'react'
import { explainRecoveryMistakes } from '../../lib/ai'
import Panel from '../shared/Panel'
import WhatsNextPrompt from '../shared/WhatsNextPrompt'

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function EndScreen({ summary, score, grade, contained, mistakeReport, onContinue }) {
  const [explanation, setExplanation] = useState(null)
  const [explanationSource, setExplanationSource] = useState(null) // 'model' | 'heuristic'

  useEffect(() => {
    let cancelled = false
    explainRecoveryMistakes(mistakeReport).then((res) => {
      if (!cancelled) {
        setExplanation(res.text)
        setExplanationSource(res.source)
      }
    })
    return () => {
      cancelled = true
    }
  }, [mistakeReport])

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Panel className="text-center">
        <h1 className="text-2xl font-bold mt-0 mb-4">{contained ? 'INCIDENT CONTAINED' : 'INCIDENT — TIME EXPIRED'}</h1>
        <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-left m-0 max-w-sm mx-auto">
          <dt className="text-[var(--cc-text-dim)]">Time</dt>
          <dd className="m-0 font-mono">{formatTime(summary.secondsUsed)}</dd>
          <dt className="text-[var(--cc-text-dim)]">Accounts lost</dt>
          <dd className="m-0">{summary.accountsLost}</dd>
          <dt className="text-[var(--cc-text-dim)]">Accounts exposed</dt>
          <dd className="m-0">{summary.accountsExposedAtEnd}</dd>
          <dt className="text-[var(--cc-text-dim)]">Incident-response score</dt>
          <dd className="m-0">{score} / 100</dd>
          <dt className="text-[var(--cc-text-dim)]">Grade</dt>
          <dd className="m-0 font-semibold">
            {grade.label} <span aria-hidden="true">{grade.icon}</span>
          </dd>
        </dl>
      </Panel>

      <Panel>
        <h2 className="text-base font-semibold mt-0 mb-2">What happened</h2>
        {explanation ? (
          <>
            <p className="text-sm text-[var(--cc-text-dim)] m-0">{explanation}</p>
            {explanationSource === 'heuristic' && (
              <p className="text-xs text-[var(--cc-text-dim)] mt-2 mb-0">
                AI service unavailable — using CyberCity's built-in local analyzer.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--cc-text-dim)] m-0">Analyzing your response…</p>
        )}
      </Panel>

      <WhatsNextPrompt />

      <button
        onClick={onContinue}
        className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
      >
        Back to Recovery Rush
      </button>
    </div>
  )
}
