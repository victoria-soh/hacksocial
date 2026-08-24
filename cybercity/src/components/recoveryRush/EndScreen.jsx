import { useEffect, useState } from 'react'
import { explainRecoveryMistakes } from '../../lib/ai'
import { computeRecoveryBreakdown, scoreTierColor } from '../../lib/scoring'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import ScoreRing from '../shared/ScoreRing'
import WhatsNextPrompt from '../shared/WhatsNextPrompt'

function formatTime(seconds) {
  const clamped = Math.max(0, Math.round(seconds))
  const m = Math.floor(clamped / 60)
  const s = clamped % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const BREAKDOWN_LABELS = [
  { key: 'priority', label: 'Priority', icon: '🎯' },
  { key: 'containment', label: 'Containment', icon: '🧯' },
  { key: 'recovery', label: 'Recovery', icon: '🔓' },
  { key: 'speed', label: 'Speed', icon: '⏱️' },
]

// Every mistake or good decision the player actually made, colored by the
// SAME deterministic flags the live game already computed (trap/wrongOrder/
// effective, from data/recoveryRush.js's engine) — never re-judged here,
// just rendered. "Irrelevant" no-op actions carry no lesson either way and
// are skipped so the list stays scannable.
function actionMeta(a) {
  if (a.trap) return { color: 'var(--cc-danger)', label: 'Mistake' }
  if (a.wrongOrder) return { color: 'var(--cc-warn)', label: 'Mistake' }
  if (a.effective) return { color: 'var(--cc-accent)', label: 'Good decision' }
  return null
}

export default function EndScreen({ summary, score, grade, contained, mistakeReport, timeLimitSeconds, onContinue }) {
  const [explanation, setExplanation] = useState(null)
  const [explanationSource, setExplanationSource] = useState(null) // 'model' | 'heuristic'

  useEffect(() => {
    let cancelled = false
    explainRecoveryMistakes({ ...mistakeReport, contained }).then((res) => {
      if (!cancelled) {
        setExplanation(res.text)
        setExplanationSource(res.source)
      }
    })
    return () => {
      cancelled = true
    }
  }, [mistakeReport, contained])

  const breakdown = computeRecoveryBreakdown({ ...summary, timeLimitSeconds })
  const callouts = mistakeReport.orderedActions.map((a, i) => ({ ...a, meta: actionMeta(a), key: `${a.action}-${a.atSeconds}-${i}` })).filter((a) => a.meta)

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <Panel className="text-center">
        <h1 className="text-2xl font-bold mt-0 mb-4">{contained ? 'INCIDENT CONTAINED' : 'INCIDENT — TIME EXPIRED'}</h1>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          <ScoreRing
            score={score}
            label={grade.label}
            icon={grade.icon}
            ariaLabel={`Incident-response score: ${score} out of 100, ${grade.label}`}
          />
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {BREAKDOWN_LABELS.map(({ key, label, icon }) => (
              <ProgressBar key={key} label={`${icon} ${label}`} value={breakdown[key]} color={scoreTierColor(breakdown[key])} />
            ))}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-center m-0 mt-5 text-sm">
          <div>
            <dt className="text-[var(--cc-text-dim)] text-xs">Time elapsed</dt>
            <dd className="m-0 font-mono font-semibold">{formatTime(summary.secondsUsed)}</dd>
          </div>
          <div>
            <dt className="text-[var(--cc-text-dim)] text-xs">Accounts lost</dt>
            <dd className="m-0 font-semibold">{summary.accountsLost}</dd>
          </div>
          <div>
            <dt className="text-[var(--cc-text-dim)] text-xs">Accounts exposed</dt>
            <dd className="m-0 font-semibold">{summary.accountsExposedAtEnd}</dd>
          </div>
        </dl>
      </Panel>

      <Panel>
        <h2 className="text-base font-semibold mt-0 mb-2">What happened</h2>
        {explanation ? (
          <>
            <p className="text-sm text-[var(--cc-text-dim)] mt-0 mb-3">{explanation}</p>
            {explanationSource === 'heuristic' && (
              <p className="text-xs text-[var(--cc-text-dim)] mb-3">
                AI service unavailable — using CyberCity's built-in local analyzer.
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--cc-text-dim)] m-0 mb-3">Analyzing your response…</p>
        )}

        {callouts.length > 0 && (
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {callouts.map((a) => (
              <li
                key={a.key}
                className="rounded-lg px-3 py-2 text-sm flex items-start gap-2"
                style={{ borderLeft: `3px solid ${a.meta.color}`, background: `color-mix(in srgb, ${a.meta.color} 8%, transparent)` }}
              >
                <span aria-hidden="true">{a.icon}</span>
                <span>
                  <span className="font-bold" style={{ color: a.meta.color }}>
                    {a.meta.label}:
                  </span>{' '}
                  {a.action}
                  {a.resultText ? ` — ${a.resultText}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <WhatsNextPrompt />

      <Panel
        as="button"
        onClick={onContinue}
        className="self-start !px-5 !py-2.5 text-left min-h-11"
        style={{ background: 'var(--cc-accent)', color: '#06111c' }}
      >
        <span className="font-semibold">Back to Recovery Rush</span>
      </Panel>
    </div>
  )
}
