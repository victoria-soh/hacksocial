import { useState } from 'react'
import { ACTIONS, getAction } from '../../data/recoveryRush'

const PROCESSING_MS = 400

/**
 * `lastResult`: { actionId, resultText } | null — the real impact of the
 * most recently chosen action, computed deterministically by
 * data/recoveryRush.js's describeActionOutcome. Never shown before the
 * choice is made — that's the actual decision-making mechanic — only
 * revealed once the player has already committed to it.
 */
export default function ActionMenu({ onAction, disabled, lastResult }) {
  const [processingId, setProcessingId] = useState(null)
  const isBusy = processingId !== null

  function handleClick(actionId) {
    if (disabled || isBusy) return
    setProcessingId(actionId)
    setTimeout(() => {
      onAction(actionId)
      setProcessingId(null)
    }, PROCESSING_MS)
  }

  const lastAction = lastResult ? getAction(lastResult.actionId) : null

  return (
    <div className="flex flex-col gap-1">
      {lastResult && lastAction && (
        <div
          className="cc-alert-entrance flex items-start gap-2 rounded-lg px-2.5 py-1.5 text-xs"
          style={{ background: 'var(--cc-bg-alt)' }}
        >
          <span aria-hidden="true">{lastAction.icon}</span>
          <span>
            <span className="cc-chrome font-bold">{lastAction.label}:</span>{' '}
            <span style={{ fontFamily: 'var(--font-content)' }}>{lastResult.resultText}</span>
          </span>
        </div>
      )}
      <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {ACTIONS.map((action) => {
          const processing = processingId === action.id
          return (
            <button
              key={action.id}
              onClick={() => handleClick(action.id)}
              disabled={disabled || isBusy}
              className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg border border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)] hover:border-[var(--cc-accent)] active:scale-[0.97] text-left min-h-11 transition-[border-color,transform] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              <span className="flex items-center gap-1.5 text-xs sm:text-sm">
                <span aria-hidden="true">{action.icon}</span>
                {action.label}
              </span>
              {processing ? (
                <span className="cc-chrome text-xs text-[var(--cc-accent)] flex items-center gap-1 whitespace-nowrap shrink-0" aria-live="polite">
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2 border-[var(--cc-accent)] border-t-transparent motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  working…
                </span>
              ) : (
                <span className="cc-chrome text-[10px] text-[var(--cc-text-dim)] whitespace-nowrap shrink-0">
                  {action.timeCost}s · ❓ unknown
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
