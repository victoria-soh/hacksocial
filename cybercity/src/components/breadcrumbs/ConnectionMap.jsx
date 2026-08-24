import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

const TIER_X = { 0: 60, 1: 340, 2: 620 }
const COL_WIDTH = 220
const ROW_HEIGHT = 76
const CLICK_DRAG_THRESHOLD = 6 // px in screen space; below this, a pointer down+up counts as a click, not a drag

// Fixed 6-point spark burst on a correct connection — deterministic angles
// (not randomized per-instance), computed once at module load, so nothing
// shifts mid-animation if the component happens to re-render while the
// burst is playing.
const SPARK_ANGLES = [0, 60, 120, 180, 240, 300]
const SPARK_DISTANCE = 16
const SPARKS = SPARK_ANGLES.map((deg) => {
  const rad = (deg * Math.PI) / 180
  return { dx: Math.cos(rad) * SPARK_DISTANCE, dy: Math.sin(rad) * SPARK_DISTANCE }
})

// Generic case-board layout: evidence (tier 0) -> facts (tier 1) -> inferences
// (tier 2). Driven entirely by the `posts`/`nodes` props (for label/type
// lookups) plus `visibleOrder` (which ids actually get a slot, and in what
// order) so this same board renders both the full "Find Alex" mission's
// progressively-revealed board and the capstone's smaller, fully-visible
// deduction stage. Position within a tier is assigned by each id's position
// in `visibleOrder`, NOT by fixed dictionary order — that's what keeps
// already-placed nodes from visually jumping around as new ones are
// revealed (a node revealed later always appends after nodes already on
// the board, never inserts above one that's already there).
function buildLayout(posts, nodes, visibleOrder) {
  const positions = {}
  let evidenceIndex = 0
  let factIndex = 0
  let inferenceIndex = 0
  for (const id of visibleOrder) {
    const isEvidence = posts.some((p) => p.id === id)
    if (isEvidence) {
      positions[id] = { x: TIER_X[0], y: 30 + evidenceIndex * ROW_HEIGHT, tier: 0 }
      evidenceIndex += 1
      continue
    }
    const node = nodes[id]
    if (!node) continue
    if (node.type === 'fact') {
      positions[id] = { x: TIER_X[1], y: 30 + factIndex * ROW_HEIGHT, tier: 1, index: factIndex, columnName: 'Facts' }
      factIndex += 1
    } else {
      positions[id] = { x: TIER_X[2], y: 20 + inferenceIndex * (ROW_HEIGHT * 1.15), tier: 2, index: inferenceIndex, columnName: 'Inferences' }
      inferenceIndex += 1
    }
  }
  return positions
}

function anchorRight(pos) {
  return { x: pos.x + COL_WIDTH - 10, y: pos.y + 16 }
}
function anchorLeft(pos) {
  return { x: pos.x - 4, y: pos.y + 16 }
}

function sagPath(x1, y1, x2, y2, sag) {
  const midX = (x1 + x2) / 2
  const midY = (y1 + y2) / 2 + sag
  return `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`
}

function getSvgPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

// Escalating visual temperature: Evidence stays neutral, Facts run cool,
// Inferences run warm-to-hot by sensitivity. Every tier also gets a
// shape-distinct icon so the signal never rides on color alone.
const TIER_STYLE = {
  fact: { icon: '📌', fill: 'var(--cc-fact-bg)', stroke: 'var(--cc-fact)', tag: 'Fact' },
  'inference-low': { icon: '🔹', fill: 'var(--cc-inf-low-bg)', stroke: 'var(--cc-inf-low)', tag: 'Inference · low sensitivity' },
  'inference-medium': {
    icon: '🔶',
    fill: 'var(--cc-inf-medium-bg)',
    stroke: 'var(--cc-inf-medium)',
    tag: 'Inference · medium sensitivity',
  },
  'inference-high': { icon: '🔺', fill: 'var(--cc-inf-high-bg)', stroke: 'var(--cc-inf-high)', tag: 'Inference · high sensitivity' },
}

export default function ConnectionMap({
  posts,
  nodes,
  edges,
  unlockedNodeIds,
  completedEdges,
  selectedSourceIds,
  attachedByTarget,
  errorSignal,
  onToggleSelect,
  onAttempt,
  // Progressive disclosure (Find Alex only): which evidence posts have been
  // opened in the feed above and are therefore valid drag/select sources.
  // Omitted entirely (e.g. by the capstone's smaller deduction stage) means
  // every evidence post is already usable, preserving that context's
  // existing behavior unchanged — see the `progressive` branch below.
  openedIds = null,
  // First-connection walkthrough (Find Alex only): the one evidence node
  // and one fact/inference node to visually call out while the player has
  // not yet made their first connection. Both null once the guided chain
  // completes, or when unused by a caller (e.g. the capstone stage).
  guidedSourceId = null,
  guidedTargetId = null,
}) {
  const reducedMotion = usePrefersReducedMotion()
  const svgRef = useRef(null)

  // Persists across renders (append-only) so the board's layout only ever
  // grows — a node already on the board never gets reshuffled just because
  // a different node became visible. When `openedIds` is omitted (capstone),
  // everything is visible from the first render, matching the old behavior.
  const visibleOrderRef = useRef([])
  const progressive = openedIds !== null
  let visibleOrder
  if (progressive) {
    const seen = new Set(visibleOrderRef.current)
    for (const id of openedIds) {
      if (!seen.has(id)) {
        visibleOrderRef.current.push(id)
        seen.add(id)
      }
    }
    for (const edge of edges) {
      if (seen.has(edge.to)) continue
      const ready = edge.from.some((src) => openedIds.has(src) || unlockedNodeIds.has(src))
      if (ready) {
        visibleOrderRef.current.push(edge.to)
        seen.add(edge.to)
      }
    }
    visibleOrder = visibleOrderRef.current
  } else {
    visibleOrder = [...posts.map((p) => p.id), ...Object.keys(nodes)]
  }

  const LAYOUT = buildLayout(posts, nodes, visibleOrder)
  const nodeIds = Object.keys(LAYOUT)

  function nodeLabel(id) {
    const post = posts.find((p) => p.id === id)
    if (post) return `${post.icon} ${post.platform}`
    return nodes[id]?.label ?? id
  }

  function tierStyleFor(id) {
    const node = nodes[id]
    if (!node) return null
    if (node.type === 'fact') return TIER_STYLE.fact
    return TIER_STYLE[`inference-${node.sensitivity}`]
  }

  function edgeFor(targetId) {
    return edges.find((e) => e.to === targetId)
  }

  // { sourceId, x, y, startClient, moved } — the ref is the synchronous
  // source of truth read inside pointermove/pointerup (pointer events can
  // fire in rapid bursts faster than React commits state updates, so a
  // handler closing over stale `dragging` state could still see it as null
  // right after pointerdown). `dragging` state is kept in sync purely to
  // drive rendering of the live string/highlights.
  const dragStateRef = useRef(null)
  const hoveredTargetRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [hoveredTargetId, setHoveredTargetId] = useState(null)
  const [rejecting, setRejecting] = useState(null) // { sourceId, targetId, nonce }
  const [poppingTargetId, setPoppingTargetId] = useState(null)
  const [shakingTargetId, setShakingTargetId] = useState(null)
  const [pulsingEdgeId, setPulsingEdgeId] = useState(null) // one-shot traveling pulse along a newly-resolved edge
  const prevCompletedCount = useRef(completedEdges.length)

  // errorSignal carries a fresh nonce every time ANY attempt fails (click or
  // drag) — light up that specific slot for the duration of the flash/shake.
  useEffect(() => {
    if (!errorSignal) return undefined
    setShakingTargetId(errorSignal.targetId)
    const t = setTimeout(() => setShakingTargetId(null), 560)
    return () => clearTimeout(t)
  }, [errorSignal])

  // Pop the target that just fully resolved, and fire a one-shot traveling
  // pulse + spark burst for it (both cleared afterward — the resolved line
  // and lit node stay, only the "just happened" flourishes are transient).
  useEffect(() => {
    if (completedEdges.length > prevCompletedCount.current) {
      const newest = completedEdges[completedEdges.length - 1]
      setPoppingTargetId(newest.to)
      setPulsingEdgeId(newest.id)
      const t1 = setTimeout(() => setPoppingTargetId(null), 420)
      const t2 = setTimeout(() => setPulsingEdgeId(null), 900)
      prevCompletedCount.current = completedEdges.length
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    prevCompletedCount.current = completedEdges.length
    return undefined
  }, [completedEdges])

  function isEvidenceOpen(id) {
    return openedIds ? openedIds.has(id) : true
  }

  function canDragFrom(id) {
    const pos = LAYOUT[id]
    if (pos.tier === 0) return isEvidenceOpen(id)
    return unlockedNodeIds.has(id)
  }

  function hitTestTarget(pt) {
    for (const id of nodeIds) {
      const pos = LAYOUT[id]
      if (pos.tier === 0 || unlockedNodeIds.has(id)) continue // only locked fact/inference slots are drop targets
      if (pt.x >= pos.x && pt.x <= pos.x + (COL_WIDTH - 16) && pt.y >= pos.y && pt.y <= pos.y + 32) {
        return id
      }
    }
    return null
  }

  function handlePointerDown(e, id) {
    if (!canDragFrom(id)) return
    e.preventDefault() // stop native text-selection/drag from hijacking the gesture
    const pt = getSvgPoint(svgRef.current, e.clientX, e.clientY)
    const next = { sourceId: id, x: pt.x, y: pt.y, startClient: { x: e.clientX, y: e.clientY }, moved: false }
    dragStateRef.current = next
    setDragging(next)
    setIsDragActive(true)
  }

  // Window-level listeners (rather than pointer capture on the dragged
  // element) so the gesture keeps tracking reliably across re-renders —
  // e.g. the moment a connection resolves mid-drag and the board re-renders
  // with new props/DOM. Capture-based tracking on a re-rendering element
  // proved to silently stop receiving move events after such a re-render.
  useEffect(() => {
    if (!isDragActive) return undefined

    function onMove(e) {
      const current = dragStateRef.current
      if (!current) return
      const pt = getSvgPoint(svgRef.current, e.clientX, e.clientY)
      const dx = e.clientX - current.startClient.x
      const dy = e.clientY - current.startClient.y
      const moved = current.moved || Math.hypot(dx, dy) > CLICK_DRAG_THRESHOLD
      const next = { ...current, x: pt.x, y: pt.y, moved }
      dragStateRef.current = next
      setDragging(next)
      const hovered = moved ? hitTestTarget(pt) : null
      hoveredTargetRef.current = hovered
      setHoveredTargetId(hovered)
    }

    function onUp() {
      const current = dragStateRef.current
      if (current) {
        const hovered = hoveredTargetRef.current
        if (!current.moved) {
          onToggleSelect(current.sourceId)
        } else if (hovered) {
          const ok = onAttempt(hovered, [current.sourceId])
          if (!ok) {
            setRejecting({ sourceId: current.sourceId, targetId: hovered, nonce: Date.now() })
            setTimeout(() => setRejecting(null), 450)
          }
        }
      }
      dragStateRef.current = null
      hoveredTargetRef.current = null
      setDragging(null)
      setHoveredTargetId(null)
      setIsDragActive(false)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragActive])

  // Progressive disclosure: nothing on the board yet — a pre-drawn empty
  // worksheet of locked slots would give away the whole shape of the case
  // before the player has done anything. Once the first post is opened,
  // the board starts growing from here instead.
  if (nodeIds.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          No evidence collected yet. Open a post to begin investigating Alex.
        </p>
      </div>
    )
  }

  const SVG_HEIGHT = Math.max(...Object.values(LAYOUT).map((p) => p.y)) + 70

  return (
    <div className="overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${TIER_X[2] + COL_WIDTH} ${SVG_HEIGHT}`}
        className="w-full min-w-[720px] touch-none select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        role="img"
        aria-label="Case board of connected clues. Evidence on the left leads to facts in the middle, which combine into inferences on the right. Drag a clue onto a slot to connect it, or use keyboard selection. A plain-text list of the same connections follows below."
      >
        {/* column headers */}
        <text x={TIER_X[0]} y={14} fontSize="12" fill="var(--cc-text-dim)">EVIDENCE</text>
        <text x={TIER_X[1]} y={14} fontSize="12" fill="var(--cc-text-dim)">FACTS</text>
        <text x={TIER_X[2]} y={14} fontSize="12" fill="var(--cc-text-dim)">INFERENCES</text>

        {/* resolved connections: taut, glowing strings, each with a one-shot
            traveling pulse the moment it's newly resolved (reusing the same
            SMIL animateMotion + mpath technique as the Recovery Rush
            diagram's traveling threat pulses, just one-shot instead of
            looping — a connection forming once, not an ongoing signal). */}
        {completedEdges.map((edge) => {
          const to = LAYOUT[edge.to]
          const isNewest = pulsingEdgeId === edge.id
          return edge.from.map((fromId) => {
            const from = LAYOUT[fromId]
            if (!from || !to) return null
            const a = anchorRight(from)
            const b = anchorLeft(to)
            const pathId = `resolved-path-${fromId}-${edge.to}`
            return (
              <g key={`resolved-${fromId}-${edge.to}`}>
                {isNewest && !reducedMotion && (
                  <path id={pathId} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} fill="none" opacity="0" />
                )}
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="var(--cc-accent)"
                  strokeWidth="2.5"
                  opacity="0.9"
                  style={{ filter: 'drop-shadow(0 0 3px var(--cc-accent))' }}
                />
                {isNewest && !reducedMotion && (
                  <circle r="4.5" fill="var(--cc-good)" style={{ filter: 'drop-shadow(0 0 4px var(--cc-good))' }}>
                    <animateMotion dur="550ms" repeatCount="1" fill="freeze">
                      <mpath href={`#${pathId}`} />
                    </animateMotion>
                    <animate attributeName="opacity" values="1;1;0" dur="550ms" repeatCount="1" fill="freeze" />
                  </circle>
                )}
              </g>
            )
          })
        })}

        {/* partial connections: one or more corroborating clues attached, still hanging loose */}
        {Object.entries(attachedByTarget || {}).map(([targetId, sourceSet]) => {
          const edge = edgeFor(targetId)
          if (!edge || unlockedNodeIds.has(targetId)) return null // already resolved, rendered above
          const to = LAYOUT[targetId]
          return [...sourceSet].map((fromId) => {
            const from = LAYOUT[fromId]
            if (!from || !to) return null
            const a = anchorRight(from)
            const b = anchorLeft(to)
            return (
              <path
                key={`partial-${fromId}-${targetId}`}
                d={sagPath(a.x, a.y, b.x, b.y, 22)}
                fill="none"
                stroke="var(--cc-accent-2)"
                strokeWidth="1.5"
                strokeDasharray="3 4"
                opacity="0.55"
                style={{ filter: 'drop-shadow(0 0 2px var(--cc-accent-2))' }}
              />
            )
          })
        })}

        {/* live string following the cursor while dragging */}
        {dragging?.moved &&
          (() => {
            const from = LAYOUT[dragging.sourceId]
            if (!from) return null
            const a = anchorRight(from)
            const validHover = hoveredTargetId && edgeFor(hoveredTargetId)?.from.includes(dragging.sourceId)
            return (
              <line
                x1={a.x}
                y1={a.y}
                x2={dragging.x}
                y2={dragging.y}
                stroke={validHover ? 'var(--cc-good)' : 'var(--cc-accent-2)'}
                strokeWidth="2.5"
                style={{ filter: `drop-shadow(0 0 4px ${validHover ? 'var(--cc-good)' : 'var(--cc-accent-2)'})` }}
              />
            )
          })()}

        {/* a rejected drop snaps back and dissolves */}
        {rejecting &&
          (() => {
            const from = LAYOUT[rejecting.sourceId]
            const to = LAYOUT[rejecting.targetId]
            if (!from || !to) return null
            const a = anchorRight(from)
            const b = anchorLeft(to)
            return (
              <line
                key={rejecting.nonce}
                className="cc-string-reject"
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--cc-danger)"
                strokeWidth="3"
                style={{ filter: 'drop-shadow(0 0 4px var(--cc-danger))' }}
              />
            )
          })()}

        {nodeIds.map((id) => {
          const pos = LAYOUT[id]
          const isEvidence = pos.tier === 0
          const unlocked = isEvidence ? isEvidenceOpen(id) : unlockedNodeIds.has(id)
          const selected = selectedSourceIds.has(id)
          const draggable = canDragFrom(id)
          const edge = !isEvidence ? edgeFor(id) : null
          const attachedCount = attachedByTarget?.[id]?.size ?? 0
          const isPartial = !unlocked && attachedCount > 0
          const multiCount = edge && edge.from.length > 1 ? edge.from.length : 0
          const tierStyle = unlocked && !isEvidence ? tierStyleFor(id) : null
          const isHoverTarget = dragging?.moved && hoveredTargetId === id
          const isPlausibleDropTarget =
            dragging?.moved && !unlocked && edge?.from.includes(dragging.sourceId)
          const isErroring = shakingTargetId === id
          const isPopping = poppingTargetId === id
          const isGuidedSource = id === guidedSourceId
          const isGuidedTarget = id === guidedTargetId

          const fill = selected
            ? 'var(--cc-accent-2)'
            : isHoverTarget
              ? 'rgba(57,255,143,0.25)'
              : unlocked
                ? (tierStyle ? tierStyle.fill : 'var(--cc-panel)')
                : isPartial
                  ? 'rgba(255,47,214,0.12)'
                  : 'var(--cc-bg-alt)'
          const stroke = selected
            ? 'var(--cc-accent-2)'
            : isHoverTarget
              ? 'var(--cc-good)'
              : unlocked
                ? (tierStyle ? tierStyle.stroke : 'var(--cc-accent)')
                : isPlausibleDropTarget
                  ? 'var(--cc-good)'
                  : isPartial
                    ? 'var(--cc-accent-2)'
                    : 'var(--cc-panel-border)'
          // Glow follows the same color already driving the border — an
          // idle locked slot stays flat (nothing to signal yet); anything
          // active/selected/revealed gets the neon bloom.
          const glows = selected || isHoverTarget || unlocked || isPlausibleDropTarget || isPartial
          const label = unlocked
            ? (tierStyle ? `${tierStyle.icon} ${nodeLabel(id)}` : nodeLabel(id))
            : isEvidence
              ? '🔒 Not yet opened'
              : '🔒 Not yet connected'
          const ariaLabel = unlocked
            ? `${label}${tierStyle ? `, ${tierStyle.tag}` : ''}${selected ? ', selected' : ''}`
            : isEvidence
              ? `${nodeLabel(id)} — not opened yet. Open this post in the feed above to add it to the case board.`
              : `Locked ${pos.columnName} slot ${pos.index + 1}${multiCount ? `, needs ${multiCount} corroborating clues, ${attachedCount} attached so far` : ''}. Select clue(s) then activate this slot to attempt a connection.`

          function handleActivateViaClick() {
            if (isEvidence && !unlocked) return // must be opened in the feed above first
            if (!unlocked && edge) {
              onAttempt(id, [...selectedSourceIds])
            } else {
              onToggleSelect(id)
            }
          }

          return (
            <g
              key={id}
              transform={`translate(${pos.x}, ${pos.y})`}
              onPointerDown={draggable ? (e) => handlePointerDown(e, id) : undefined}
              onClick={!draggable ? handleActivateViaClick : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleActivateViaClick()
                }
              }}
              aria-label={ariaLabel}
              style={{ cursor: draggable ? 'grab' : isEvidence && !unlocked ? 'not-allowed' : 'pointer', touchAction: 'none' }}
            >
              {/* First-connection walkthrough: a dashed focus-colored halo
                  around whichever one node the player should act on next,
                  distinct from every in-game status color so it never reads
                  as game state. Cleared for good once the guided chain
                  resolves — see FindAlexMission's tutorialActive. */}
              {(isGuidedSource || isGuidedTarget) && (
                <>
                  <rect
                    x="-5"
                    y="-5"
                    width={COL_WIDTH - 16 + 10}
                    height="42"
                    rx="11"
                    fill="none"
                    stroke="var(--cc-focus)"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                    className="cc-pulse"
                    aria-hidden="true"
                  />
                  <text
                    x={(COL_WIDTH - 16) / 2}
                    y="-11"
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="var(--cc-focus)"
                    className="cc-chrome"
                    aria-hidden="true"
                  >
                    {isGuidedSource ? '👉 Start here' : '👉 Drop it here'}
                  </text>
                </>
              )}
              <g className={[isPopping && 'cc-pin-pop', isErroring && 'cc-node-error-shake'].filter(Boolean).join(' ') || undefined}>
                <rect
                  className={isErroring ? 'cc-node-error-rect' : undefined}
                  width={COL_WIDTH - 16}
                  height="32"
                  rx="8"
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={selected || isHoverTarget ? 3 : 1.5}
                  style={{
                    transition: 'fill 250ms ease, stroke 250ms ease, filter 250ms ease',
                    filter: glows ? `drop-shadow(0 0 4px ${stroke})` : 'none',
                  }}
                />
              </g>
              {multiCount > 0 && !unlocked && (
                <g transform={`translate(${COL_WIDTH - 34}, -8)`} aria-hidden="true">
                  <circle r="9" fill="var(--cc-bg)" stroke="var(--cc-accent-2)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 3px var(--cc-accent-2))' }} />
                  <text textAnchor="middle" y="3.5" fontSize="9" fontWeight="700" fill="var(--cc-accent-2)">
                    ×{multiCount}
                  </text>
                </g>
              )}
              {/* Correct-connection flourish: a quick spark burst, or under
                  reduced motion a brief brightness flash instead — never
                  both, never neither. */}
              {isPopping && !reducedMotion && (
                <g transform="translate(-4, 16)" aria-hidden="true">
                  {SPARKS.map((s, i) => (
                    <circle
                      key={i}
                      className="cc-spark"
                      r="2.5"
                      fill="var(--cc-good)"
                      style={{ '--cc-spark-dx': `${s.dx}px`, '--cc-spark-dy': `${s.dy}px` }}
                    />
                  ))}
                </g>
              )}
              {isPopping && reducedMotion && (
                <rect className="cc-node-flash" width={COL_WIDTH - 16} height="32" rx="8" fill="var(--cc-good)" aria-hidden="true" />
              )}
              <foreignObject width={COL_WIDTH - 16} height="32">
                <div
                  style={{
                    fontSize: '11.5px',
                    lineHeight: '1.15',
                    padding: '4px 8px',
                    color: unlocked ? 'var(--cc-text)' : 'var(--cc-text-dim)',
                    fontWeight: unlocked && pos.tier > 0 ? 600 : 400,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {label}
                </div>
              </foreignObject>
            </g>
          )
        })}
      </svg>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 list-none p-0 mt-2 text-xs text-[var(--cc-text-dim)]">
        <li>📌 Fact</li>
        <li>🔹 Inference · low sensitivity</li>
        <li>🔶 Inference · medium sensitivity</li>
        <li>🔺 Inference · high sensitivity</li>
        <li>×2 / ×3 needs that many corroborating clues</li>
      </ul>
    </div>
  )
}
