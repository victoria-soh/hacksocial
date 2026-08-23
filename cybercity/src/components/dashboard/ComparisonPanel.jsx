import { useState } from 'react'
import { fetchRemoteState, fetchResiliencePercentile } from '../../lib/api'
import { normalizeState } from '../../lib/storage'
import { deriveDistricts, computeOverallResilience, useGame } from '../../state/GameContext'
import { isFeatureUnlocked, requiredLevelForFeature } from '../../data/levels'
import Panel from '../shared/Panel'

/**
 * Entirely opt-in, low-pressure comparison — nothing here is shown unless
 * the player explicitly clicks a button. No public leaderboard, no ranked
 * list, no "you're behind" framing: both the friend-code compare and the
 * aggregate percentile are phrased as "more prepared than", never "worse
 * than", and the percentile call refuses to answer on too small a sample so
 * it can't produce a misleading 0%/100%.
 */
export default function ComparisonPanel() {
  const { xp, syncCode, overallResilience } = useGame()
  const [friendCode, setFriendCode] = useState('')
  const [friendResult, setFriendResult] = useState(null)
  const [percentileResult, setPercentileResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const unlocked = isFeatureUnlocked(xp, 'comparison')

  if (!unlocked) {
    const gate = requiredLevelForFeature('comparison')
    return (
      <Panel className="flex flex-col gap-2 opacity-70">
        <h2 className="text-base font-semibold mt-0 mb-0 flex items-center gap-2">
          <span aria-hidden="true">📊</span> Resilience comparison <span aria-hidden="true">🔒</span>
        </h2>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          Unlocks at Level {gate?.level} ({gate?.name}).
        </p>
      </Panel>
    )
  }

  async function compareWithFriend(e) {
    e.preventDefault()
    if (!friendCode.trim()) return
    setBusy(true)
    setError(null)
    setFriendResult(null)
    try {
      const { state: theirState } = await fetchRemoteState(friendCode.trim().toUpperCase())
      const theirDistricts = deriveDistricts(normalizeState(theirState))
      setFriendResult(computeOverallResilience(theirDistricts))
    } catch {
      setError('That code was not found, or the sync server is unreachable.')
    }
    setBusy(false)
  }

  async function checkPercentile() {
    if (!syncCode) return
    setBusy(true)
    setError(null)
    setPercentileResult(null)
    try {
      const result = await fetchResiliencePercentile(syncCode)
      setPercentileResult(result)
    } catch {
      setError('Could not reach the sync server for this comparison.')
    }
    setBusy(false)
  }

  return (
    <Panel className="flex flex-col gap-4">
      <div>
        <h2 className="text-base font-semibold mt-0 mb-0 flex items-center gap-2">
          <span aria-hidden="true">📊</span> Resilience comparison
        </h2>
        <p className="text-xs text-[var(--cc-text-dim)] mt-1 mb-0">
          Entirely optional — nothing here is shown unless you ask for it.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm m-0">Compare with a friend's shareable code:</p>
        <form onSubmit={compareWithFriend} className="flex flex-wrap gap-2 items-center">
          <input
            value={friendCode}
            onChange={(e) => setFriendCode(e.target.value)}
            placeholder="e.g. AB3XQZ"
            maxLength={6}
            className="rounded-lg bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] px-3 py-2 text-sm font-mono tracking-widest w-32"
          />
          <button
            type="submit"
            disabled={busy || !friendCode.trim()}
            className="px-3 py-2 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] text-sm min-h-11 disabled:opacity-40"
          >
            Compare
          </button>
        </form>
        {friendResult != null && (
          <p className="text-sm m-0">
            You: <strong>{overallResilience}%</strong> · Them: <strong>{friendResult}%</strong> —{' '}
            {overallResilience >= friendResult
              ? "you're currently more prepared, and every mission narrows or widens that either way."
              : "they're currently a bit ahead — a good scenario to try together next."}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-3 border-t border-[var(--cc-panel-border)]">
        <p className="text-sm m-0">See how you compare to everyone who's shared a code:</p>
        {syncCode ? (
          <button
            onClick={checkPercentile}
            disabled={busy}
            className="self-start px-4 py-2.5 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] font-semibold min-h-11 disabled:opacity-40"
          >
            {busy ? 'Checking…' : 'Show my percentile'}
          </button>
        ) : (
          <p className="text-xs text-[var(--cc-text-dim)] m-0">
            Create a shareable code below first — that's what puts you in the comparison pool.
          </p>
        )}
        {percentileResult && percentileResult.available && (
          <p className="text-sm m-0">
            You're more prepared than <strong>{percentileResult.percentile}%</strong> of players who've shared a
            code so far ({percentileResult.sampleSize} compared).
          </p>
        )}
        {percentileResult && !percentileResult.available && (
          <p className="text-xs text-[var(--cc-text-dim)] m-0">
            Not enough players have shared a code yet for this to be meaningful — check back later.
          </p>
        )}
      </div>

      {error && <p className="text-xs text-[var(--cc-danger)] m-0">{error}</p>}
    </Panel>
  )
}
