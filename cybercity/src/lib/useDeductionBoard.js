import { useMemo, useState } from 'react'

function setsEqual(a, b) {
  if (a.size !== b.size) return false
  for (const v of a) if (!b.has(v)) return false
  return true
}

/**
 * The connect-the-clues state machine behind ConnectionMap — extracted out
 * of FindAlexMission so the exact same deduction mechanic (no-penalty
 * retries, multi-clue corroboration, live-region messaging) drives both the
 * full Find Alex mission and the capstone challenge's smaller deduction
 * stage, parameterized entirely by `edges`/`nodes`.
 */
export function useDeductionBoard(edges, nodes) {
  const [selected, setSelected] = useState(new Set())
  const [completedEdgeIds, setCompletedEdgeIds] = useState(new Set())
  const [unlockOrder, setUnlockOrder] = useState([])
  // Per-target set of sources attached so far but not yet resolving the
  // connection — the "one clue dangling, not enough on its own" state for
  // inferences that need 2-3 corroborating facts. Keyed by target node id.
  const [attachedByTarget, setAttachedByTarget] = useState({})
  const [errorSignal, setErrorSignal] = useState(null) // { targetId, nonce }
  const [liveMessage, setLiveMessage] = useState('')
  const [score, setScore] = useState(0)

  const completedEdges = useMemo(() => edges.filter((e) => completedEdgeIds.has(e.id)), [edges, completedEdgeIds])
  const unlockedNodeIds = useMemo(() => new Set(completedEdges.map((e) => e.to)), [completedEdges])
  const allDone = completedEdgeIds.size === edges.length

  function toggleSelect(nodeId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) next.delete(nodeId)
      else next.add(nodeId)
      return next
    })
  }

  /**
   * Single validation path for both interaction models: the click flow
   * calls this with every currently-selected source at once; the drag flow
   * calls this with exactly one dragged source per drop. Either way, a
   * connection only resolves once the full required source set for that
   * target has been attached — across however many calls it took.
   */
  function attemptConnection(targetId, sourceIds) {
    const edge = edges.find((e) => e.to === targetId)
    if (!edge || completedEdgeIds.has(edge.id) || sourceIds.length === 0) return false
    const requiredSet = new Set(edge.from)
    const allValid = sourceIds.every((id) => requiredSet.has(id))

    if (!allValid) {
      setErrorSignal({ targetId, nonce: Date.now() })
      setLiveMessage("Not quite — that clue doesn't support this conclusion. Try again, no penalty.")
      setSelected(new Set())
      return false
    }

    const merged = new Set([...(attachedByTarget[targetId] || []), ...sourceIds])
    setAttachedByTarget((prev) => ({ ...prev, [targetId]: merged }))
    setSelected(new Set())

    if (setsEqual(merged, requiredSet)) {
      setCompletedEdgeIds((prev) => new Set(prev).add(edge.id))
      setUnlockOrder((prev) => [...prev, targetId])
      setScore((s) => s + edge.points)
      setLiveMessage(`Connected! +${edge.points} points — "${nodes[targetId].label}" revealed.`)
    } else {
      const remaining = requiredSet.size - merged.size
      setLiveMessage(
        `Clue attached — that's one piece of "${nodes[targetId].label}", but it needs ${remaining} more corroborating clue${remaining === 1 ? '' : 's'} before it resolves.`,
      )
    }
    return true
  }

  return {
    selected,
    completedEdgeIds,
    unlockOrder,
    attachedByTarget,
    errorSignal,
    liveMessage,
    score,
    completedEdges,
    unlockedNodeIds,
    allDone,
    toggleSelect,
    attemptConnection,
  }
}
