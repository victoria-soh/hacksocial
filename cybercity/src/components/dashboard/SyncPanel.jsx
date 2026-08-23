import { useState } from 'react'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

const STATUS_LABEL = {
  idle: null,
  syncing: 'Saving…',
  synced: '✓ Saved',
  error: '⚠️ Could not reach the sync server',
}

export default function SyncPanel() {
  const { syncCode, syncStatus, createShareCode, resumeFromCode, forgetShareCode } = useGame()
  const [codeInput, setCodeInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleCreate() {
    setBusy(true)
    setError(null)
    try {
      await createShareCode()
    } catch {
      setError('Could not reach the sync server. Is it running? (see server/README)')
    }
    setBusy(false)
  }

  async function handleResume(e) {
    e.preventDefault()
    if (!codeInput.trim()) return
    setBusy(true)
    setError(null)
    try {
      await resumeFromCode(codeInput.trim().toUpperCase())
      setCodeInput('')
    } catch {
      setError('That code was not found, or the sync server is unreachable.')
    }
    setBusy(false)
  }

  return (
    <Panel className="flex flex-col gap-3">
      <h2 className="text-base font-semibold mt-0 mb-0 flex items-center gap-2">
        <span aria-hidden="true">🔗</span> Save & resume across devices
      </h2>
      <p className="text-sm text-[var(--cc-text-dim)] m-0">
        Optional — CyberCity already saves progress on this device. A shareable code lets you (or someone you're
        helping) pick up the same progress elsewhere, no account needed.
      </p>

      {syncCode ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-lg tracking-widest bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] rounded-lg px-3 py-1.5">
            {syncCode}
          </span>
          {STATUS_LABEL[syncStatus] && <span className="text-xs text-[var(--cc-text-dim)]">{STATUS_LABEL[syncStatus]}</span>}
          <button onClick={forgetShareCode} className="text-xs text-[var(--cc-text-dim)] underline min-h-11 px-2">
            Stop syncing this device
          </button>
        </div>
      ) : (
        <button
          onClick={handleCreate}
          disabled={busy}
          className="self-start px-4 py-2.5 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] font-semibold min-h-11 disabled:opacity-40"
        >
          Create shareable code
        </button>
      )}

      <form onSubmit={handleResume} className="flex flex-wrap gap-2 items-center">
        <label htmlFor="resume-code" className="text-sm">
          Resume from a code:
        </label>
        <input
          id="resume-code"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value)}
          placeholder="e.g. AB3XQZ"
          maxLength={6}
          className="rounded-lg bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] px-3 py-2 text-sm font-mono tracking-widest w-32"
        />
        <button
          type="submit"
          disabled={busy || !codeInput.trim()}
          className="px-3 py-2 rounded-lg border border-[var(--cc-panel-border)] text-sm min-h-11 disabled:opacity-40"
        >
          Resume
        </button>
      </form>

      {error && <p className="text-xs text-[var(--cc-danger)] m-0">{error}</p>}
    </Panel>
  )
}
