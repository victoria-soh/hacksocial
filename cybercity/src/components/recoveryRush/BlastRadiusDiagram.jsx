import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'
import CityTower from '../shared/CityTower'
import CityGridFloor from '../dashboard/CityGridFloor'

// Tiered layout — reuses the same "tier column" idea as Find Alex's case
// board, driven by each account's own `tier` (already present in
// data/recoveryRush.js's graph data: 0 = root, 1 = direct dependents, 2 =
// second-order). This is deliberately the single largest, most dominant
// element on the screen — wide tier gaps so edges are long enough for
// their tags to sit ON the line without crowding it, and big enough towers
// that the fill gauge and status color are unmistakable at a glance.
const TIER_X = { 0: 24, 1: 320, 2: 620 }
const COL_W = 170
const ROW_H = 112
const TOP_PAD = 14
const TOWER_ANCHOR_Y = 50 // vertical offset from a node's top to its tower's center, for edge anchors

const STATUS_META = {
  compromised: { color: 'var(--cc-danger)', tag: '🔴 COMPROMISED', fill: 0.22 },
  'at-risk': { color: 'var(--cc-warn)', tag: '🟡 AT RISK', fill: 0.55 },
  secured: { color: 'var(--cc-accent)', tag: '🟢 SECURED', fill: 1 },
}

// A handful of low-opacity building silhouettes so the graph reads as
// floating above the same skyline shown elsewhere, not empty space.
const SKYLINE_SILHOUETTE = [
  { x: 0, w: 50, h: 90 }, { x: 60, w: 70, h: 140 }, { x: 140, w: 46, h: 75 },
  { x: 195, w: 75, h: 165 }, { x: 280, w: 50, h: 105 }, { x: 340, w: 64, h: 145 },
  { x: 415, w: 46, h: 80 }, { x: 470, w: 72, h: 130 }, { x: 550, w: 54, h: 95 },
  { x: 610, w: 66, h: 150 }, { x: 685, w: 44, h: 90 },
]

// Each tier column is vertically centered against the tallest column
// instead of top-aligned, so a short column (e.g. a single downstream
// account) sits in the middle of the available height rather than leaving
// all its slack stacked up as dead space at the bottom.
function layoutNodes(nodes) {
  const byTier = {}
  for (const n of nodes) {
    byTier[n.tier] = byTier[n.tier] || []
    byTier[n.tier].push(n)
  }
  const maxRows = Math.max(1, ...Object.values(byTier).map((list) => list.length))
  const positions = {}
  for (const [tier, list] of Object.entries(byTier)) {
    const startOffset = ((maxRows - list.length) * ROW_H) / 2
    list.forEach((n, i) => {
      positions[n.id] = { x: TIER_X[tier] ?? TIER_X[2], y: TOP_PAD + startOffset + i * ROW_H }
    })
  }
  return positions
}

function anchorRight(pos) {
  return { x: pos.x + COL_W - 12, y: pos.y + TOWER_ANCHOR_Y }
}
function anchorLeft(pos) {
  return { x: pos.x + 12, y: pos.y + TOWER_ANCHOR_Y }
}

export default function BlastRadiusDiagram({ graph, nodes, forwardingActive }) {
  const reducedMotion = usePrefersReducedMotion()
  const positions = layoutNodes(graph.nodes)
  const svgWidth = Math.max(...Object.values(positions).map((p) => p.x)) + COL_W + 10
  const tierCounts = graph.nodes.reduce((acc, n) => {
    acc[n.tier] = (acc[n.tier] || 0) + 1
    return acc
  }, {})
  const maxRows = Math.max(1, ...Object.values(tierCounts))
  const svgHeight = TOP_PAD + maxRows * ROW_H + 12

  // Three distinct per-node flourishes, all keyed off the same before/after
  // status diff: a shield badge + pop when the PLAYER's action just secured
  // it (a clear, deliberate "you did that" moment), a shake when it just
  // became compromised (something bad just happened here, reusing the same
  // shake already used for wrong-connection feedback elsewhere), and the
  // one-shot attack-travel spark along the edge that caused it — reusing
  // the exact glowing-point + comet-tail recipe built for the ambient
  // skyline drones, just animated one-shot along a specific edge instead of
  // looping across the whole scene.
  const prevStatusRef = useRef({})
  const [travelingEdges, setTravelingEdges] = useState([]) // [{ key, edge }]
  const [snappingIds, setSnappingIds] = useState(new Set())
  const [shakingIds, setShakingIds] = useState(new Set())

  useEffect(() => {
    const prev = prevStatusRef.current
    const current = Object.fromEntries(graph.nodes.map((n) => [n.id, nodes[n.id]?.status]))

    const newlyCompromised = graph.nodes
      .map((n) => n.id)
      .filter((id) => prev[id] && prev[id] !== 'compromised' && current[id] === 'compromised')
    const newlySecured = graph.nodes
      .map((n) => n.id)
      .filter((id) => prev[id] && prev[id] !== 'secured' && current[id] === 'secured')

    let t1
    if (newlyCompromised.length > 0 && !reducedMotion) {
      const edges = newlyCompromised
        .map((id) => graph.edges.find((e) => e.to === id))
        .filter(Boolean)
        .map((edge) => ({ key: `${edge.from}-${edge.to}-${Date.now()}`, edge }))
      setTravelingEdges((prevEdges) => [...prevEdges, ...edges])
      t1 = setTimeout(() => {
        setTravelingEdges((prevEdges) => prevEdges.filter((e) => !edges.includes(e)))
      }, 700)
    }

    let t2
    if (newlySecured.length > 0) {
      setSnappingIds((s) => new Set([...s, ...newlySecured]))
      t2 = setTimeout(() => {
        setSnappingIds((s) => {
          const next = new Set(s)
          newlySecured.forEach((id) => next.delete(id))
          return next
        })
      }, 550)
    }

    let t3
    if (newlyCompromised.length > 0) {
      setShakingIds((s) => new Set([...s, ...newlyCompromised]))
      t3 = setTimeout(() => {
        setShakingIds((s) => {
          const next = new Set(s)
          newlyCompromised.forEach((id) => next.delete(id))
          return next
        })
      }, 560)
    }

    prevStatusRef.current = current
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [nodes, graph, reducedMotion])

  return (
    <div className="relative rounded-xl overflow-hidden border border-[var(--cc-panel-border)]" style={{ background: '#0a0f1e' }}>
      {/* Faint skyline + the same animated grid floor as the main dashboard,
          low-opacity so the graph nodes read as floating above the city
          rather than sitting in empty space. */}
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMax slice" className="w-full h-full">
          {SKYLINE_SILHOUETTE.map((b, i) => (
            <rect key={i} x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="#1a2440" />
          ))}
        </svg>
      </div>
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <CityGridFloor />
      </div>

      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="relative w-full h-auto block"
        role="img"
        aria-label="Dependency graph of connected accounts. A plain-text list of the same accounts follows below."
      >
        <defs>
          <linearGradient id="cc-attack-tail" x1="0%" y1="0" x2="100%" y2="0">
            <stop offset="0%" stopColor="var(--cc-danger)" stopOpacity="0" />
            <stop offset="55%" stopColor="var(--cc-danger)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--cc-danger)" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Edges, colored by the SOURCE account's status (an edge leaving a
            compromised account is itself a live attack path, regardless of
            whether the target has been reached yet), faded once the target
            is actually secured. Labels are small tags sitting directly on
            the line — a tight, borderless backdrop just enough to keep the
            text legible over the line/background, not a freestanding box
            competing with the account nodes for attention. */}
        {graph.edges.map((e) => {
          const from = positions[e.from]
          const to = positions[e.to]
          if (!from || !to) return null
          const sourceStatus = nodes[e.from]?.status ?? 'at-risk'
          const targetSecured = nodes[e.to]?.status === 'secured'
          const meta = STATUS_META[sourceStatus]
          const a = anchorRight(from)
          const b = anchorLeft(to)
          const midX = (a.x + b.x) / 2
          const midY = (a.y + b.y) / 2
          const labelWidth = (e.label?.length ?? 0) * 3.6 + 8

          return (
            <g key={`${e.from}-${e.to}`}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={meta.color}
                strokeWidth={targetSecured ? 1.25 : 2.5}
                opacity={targetSecured ? 0.3 : 0.9}
                style={{ filter: targetSecured ? undefined : `drop-shadow(0 0 3px ${meta.color})` }}
              />
              {e.label && (
                <g transform={`translate(${midX - labelWidth / 2}, ${midY - 5.5})`}>
                  <rect width={labelWidth} height="11" rx="2.5" fill="#05070e" opacity="0.85" />
                  <text x={labelWidth / 2} y="8.3" textAnchor="middle" fontSize="6.5" fill={meta.color} className="cc-chrome" opacity="0.95">
                    {e.label}
                  </text>
                </g>
              )}
            </g>
          )
        })}

        {/* One-shot attack travel: glowing point + comet tail along the
            edge, from source anchor to target anchor. */}
        {travelingEdges.map(({ key, edge }) => {
          const from = positions[edge.from]
          const to = positions[edge.to]
          if (!from || !to) return null
          const a = anchorRight(from)
          const b = anchorLeft(to)
          const pathId = `attack-path-${key}`
          const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
          return (
            <g key={key}>
              <path id={pathId} d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`} fill="none" opacity="0" />
              <g>
                <animateMotion dur="650ms" repeatCount="1" fill="freeze">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
                <g transform={`rotate(${angle})`}>
                  <line x1="-18" y1="0" x2="-2" y2="0" stroke="url(#cc-attack-tail)" strokeWidth="3" strokeLinecap="round" style={{ filter: 'blur(0.3px)' }} />
                  <ellipse cx="0" cy="0" rx="3.6" ry="2.4" fill="var(--cc-danger)" style={{ filter: 'drop-shadow(0 0 6px var(--cc-danger))' }} />
                  <ellipse cx="0" cy="0" rx="1.6" ry="1.1" fill="#fff6f0" />
                </g>
              </g>
            </g>
          )
        })}

        {/* Account towers — the dominant element on this screen. */}
        {graph.nodes.map((n) => {
          const pos = positions[n.id]
          const status = nodes[n.id]?.status ?? 'at-risk'
          const meta = STATUS_META[status]
          const isSnapping = snappingIds.has(n.id)
          const isShaking = shakingIds.has(n.id)
          return (
            <g key={n.id} transform={`translate(${pos.x}, ${pos.y})`}>
              <g className={[isSnapping && !reducedMotion && 'cc-pin-pop', isShaking && !reducedMotion && 'cc-node-error-shake'].filter(Boolean).join(' ') || undefined}>
                <foreignObject x="0" y="0" width={COL_W} height={ROW_H - 10}>
                  {/* content settles at ~95 svg units tall (measured live) — ROW_H-20 leaves >=10 units of clip-safety margin at every ROW_H above */}
                  <div className="flex flex-col items-center gap-1.5" style={{ width: `${COL_W}px` }}>
                    <p className="text-[15px] font-semibold text-center m-0 leading-tight cc-chrome" style={{ color: 'var(--cc-text)' }}>
                      <span aria-hidden="true">{n.icon}</span> {n.label}
                    </p>
                    <CityTower
                      fillFraction={meta.fill}
                      color={meta.color}
                      width={56}
                      minHeight={44}
                      maxHeight={68}
                      windowCount={6}
                      windowCols={2}
                      glitch={status === 'compromised' && !reducedMotion}
                    />
                    <p className="text-[12px] m-0 cc-chrome font-bold leading-tight whitespace-nowrap" style={{ color: meta.color }}>
                      {meta.tag}
                    </p>
                  </div>
                </foreignObject>
              </g>
              {/* A shield badge briefly appears the moment a securing
                  action lands — a clear, distinct "you did that" payoff,
                  separate from the node's own settle-into-place pop. */}
              {isSnapping && !reducedMotion && (
                <text
                  className="cc-shield-snap"
                  x={COL_W / 2}
                  y="-4"
                  textAnchor="middle"
                  fontSize="20"
                  aria-hidden="true"
                >
                  🛡️
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {forwardingActive && (
        <p
          className="relative m-0 px-2 pb-1.5 text-[11px] font-bold cc-chrome flex items-center gap-1"
          style={{ color: 'var(--cc-warn)' }}
        >
          ⚠️ Email forwarding rule still active
        </p>
      )}
    </div>
  )
}
