import { useState } from 'react'
import { ACTIONS } from '../../data/recoveryRush'

const PROCESSING_MS = 400

export default function ActionMenu({ onAction, disabled }) {
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

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {ACTIONS.map((action) => {
        const processing = processingId === action.id
        return (
          <button
            key={action.id}
            onClick={() => handleClick(action.id)}
            disabled={disabled || isBusy}
            className="flex items-center justify-between gap-2 p-3 rounded-lg border border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)] hover:border-[var(--cc-accent)] active:scale-[0.97] text-left min-h-11 transition-[border-color,transform] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <span className="flex items-center gap-2 text-sm">
              <span aria-hidden="true">{action.icon}</span>
              {action.label}
            </span>
            {processing ? (
              <span className="cc-chrome text-xs text-[var(--cc-accent)] flex items-center gap-1 whitespace-nowrap" aria-live="polite">
                <span
                  className="inline-block w-3 h-3 rounded-full border-2 border-[var(--cc-accent)] border-t-transparent motion-safe:animate-spin"
                  aria-hidden="true"
                />
                working…
              </span>
            ) : (
              <span className="cc-chrome text-xs text-[var(--cc-text-dim)] whitespace-nowrap">{action.timeCost}s</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
