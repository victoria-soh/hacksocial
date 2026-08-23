import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from '../../lib/usePrefersReducedMotion'

const SIZE = 420
const CENTER = SIZE / 2
const RING_RADIUS = { 1: 130, 2: 190 }
const NODE_R = { 0: 34, 1: 27, 2: 22 }
const SEVERITY_BUMP = 6
const SECURED_ZONE_HEIGHT = 150
const SECURED_ZONE_Y = SIZE + SECURED_ZONE_HEIGHT / 2
const TOP_MARGIN = 20 // headroom so a tier-2 node's label near the top of the ring never clips against y=0
const VIEWBOX_HEIGHT = SIZE + SECURED_ZONE_HEIGHT

const STATUS_META = {
  compromised: { icon: '🔴', tag: 'COMPROMISED', ring: 'var(--cc-danger)', glow: 'var(--cc-glow-danger)' },
  'at-risk': { icon: '🟡', tag: 'AT RISK', ring: 'var(--cc-warn)', glow: 'var(--cc-glow-warn)' },
  secured: { icon: '🟢', tag: 'SECURED', ring: 'var(--cc-good)', glow: 'var(--cc-glow-good)' },
}

/** Ring positions for at-risk/compromised nodes — unchanged radial layout. */
function ringLayout(graph, rootId) {
  const tier1 = graph.nodes.filter((n) => n.tier === 1)
  const tier2 = graph.nodes.filter((n) => n.tier === 2)
  const positions = { [rootId]: { x: CENTER, y: CENTER, angle: 0 } }

  tier1.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(tier1.length, 1) - Math.PI / 2
    positions[n.id] = {
      x: CENTER + RING_RADIUS[1] * Math.cos(angle),
      y: CENTER + RING_RADIUS[1] * Math.sin(angle),
      angle,
    }
  })

  tier2.forEach((n) => {
    const parentEdge = graph.edges.find((e) => e.to === n.id)
    const parentPos = parentEdge ? positions[parentEdge.from] : null
    // Offset slightly from the parent's exact angle so the two labels
    // (parent on ring 1, child on ring 2) don't sit stacked on one line.
    const angle = (parentPos?.angle ?? 0) + 0.4
    positions[n.id] = {
      x: CENTER + RING_RADIUS[2] * Math.cos(angle),
      y: CENTER + RING_RADIUS[2] * Math.sin(angle),
      angle,
    }
  })

  return positions
}

/** A node's fixed slot in the "secured" zone, keyed by its stable index in graph.nodes — so a node always lands in the same place whenever it's the one that gets secured, regardless of order. */
function securedSlot(index, total) {
  const padding = 46
  const usableWidth = SIZE - padding * 2
  const x = total > 1 ? padding + (usableWidth * index) / (total - 1) : CENTER
  return { x, y: SECURED_ZONE_Y }
}

export default function BlastRadiusDiagram({ graph, rootId, nodes, forwardingActive }) {
  const reducedMotion = usePrefersReducedMotion()
  const rings = ringLayout(graph, rootId)
  const nodeIndex = new Map(graph.nodes.map((n, i) => [n.id, i]))
  const total = graph.nodes.length

  function positionFor(id) {
    const status = nodes[id]?.status
    if (status === 'secured') return securedSlot(nodeIndex.get(id), total)
    return rings[id]
  }

  // Detect nodes that just transitioned into 'secured' this render, to fire
  // the one-shot shield-snap / line-sever payoff — persistent afterward
  // (the shield stays; the line stops rendering once severed).
  const prevStatusRef = useRef({})
  const [snappingIds, setSnappingIds] = useState(new Set())
  const [severingEdgeKeys, setSeveringEdgeKeys] = useState(new Set())

  useEffect(() => {
    const prev = prevStatusRef.current
    const newlySecured = graph.nodes
      .map((n) => n.id)
      .filter((id) => prev[id] && prev[id] !== 'secured' && nodes[id]?.status === 'secured')

    if (newlySecured.length > 0) {
      const edgeKeys = graph.edges.filter((e) => newlySecured.includes(e.to)).map((e) => `${e.from}-${e.to}`)
      setSnappingIds((s) => new Set([...s, ...newlySecured]))
      setSeveringEdgeKeys((s) => new Set([...s, ...edgeKeys]))
      const t1 = setTimeout(() => {
        setSnappingIds((s) => {
          const next = new Set(s)
          newlySecured.forEach((id) => next.delete(id))
          return next
        })
      }, 450)
      const t2 = setTimeout(() => {
        setSeveringEdgeKeys((s) => {
          const next = new Set(s)
          edgeKeys.forEach((k) => next.delete(k))
          return next
        })
      }, 520)
      prevStatusRef.current = { ...prev, ...Object.fromEntries(graph.nodes.map((n) => [n.id, nodes[n.id]?.status])) }
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }

    prevStatusRef.current = Object.fromEntries(graph.nodes.map((n) => [n.id, nodes[n.id]?.status]))
    return undefined
  }, [nodes, graph])

  const rootStatus = nodes[rootId]?.status
  const rootCompromised = rootStatus === 'compromised'

  return (
    <svg
      viewBox={`0 -${TOP_MARGIN} ${SIZE} ${VIEWBOX_HEIGHT + TOP_MARGIN}`}
      className="w-full max-w-md mx-auto block"
      role="img"
      aria-label="Radial diagram of the compromised account at the center and connected accounts in outer rings, shown as icon badges ringed by status color, with secured accounts moving into a safe zone below. A plain-text list of the same accounts follows below."
    >
      {/* Structural ring guides — always present as a static layout reference */}
      <circle cx={CENTER} cy={CENTER} r={RING_RADIUS[1]} fill="none" stroke="var(--cc-panel-border)" strokeDasharray="4 4" />
      <circle cx={CENTER} cy={CENTER} r={RING_RADIUS[2]} fill="none" stroke="var(--cc-panel-border)" strokeDasharray="4 4" />

      {/* Radar shockwave from the compromised root, while the incident is live */}
      {rootCompromised &&
        [0, 0.8, 1.6].map((delay) => (
          <circle
            key={delay}
            className="cc-shockwave-ring"
            cx={CENTER}
            cy={CENTER}
            r={RING_RADIUS[2]}
            fill="none"
            stroke="var(--cc-danger)"
            strokeWidth="2"
            style={{ animationDelay: reducedMotion ? undefined : `${delay}s` }}
          />
        ))}

      {/* Connection lines + traveling threat pulses */}
      {graph.edges.map((e) => {
        const from = positionFor(e.from)
        const to = positionFor(e.to)
        if (!from || !to) return null
        const targetSecured = nodes[e.to]?.status === 'secured'
        const edgeKey = `${e.from}-${e.to}`
        const severing = severingEdgeKeys.has(edgeKey)
        if (targetSecured && !severing) return null // fully contained: no more line to a safely-relocated account

        const pathId = `path-${edgeKey}`
        return (
          <g key={edgeKey}>
            <path id={pathId} d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`} fill="none" opacity="0" />
            <line
              className={severing ? 'cc-line-sever' : undefined}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="var(--cc-panel-border)"
              strokeWidth="2"
            />
            {!targetSecured && !reducedMotion && (
              <circle r="4" fill="var(--cc-danger)" style={{ filter: 'drop-shadow(0 0 3px var(--cc-danger))' }}>
                <animateMotion dur="1.8s" repeatCount="indefinite" rotate="auto">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
            {!targetSecured && reducedMotion && (
              // Static equivalent: a fixed indicator at the connection's midpoint instead of an animated one.
              <circle
                cx={(from.x + to.x) / 2}
                cy={(from.y + to.y) / 2}
                r="4"
                fill="var(--cc-danger)"
                style={{ filter: 'drop-shadow(0 0 3px var(--cc-danger))' }}
              />
            )}
          </g>
        )
      })}

      {graph.nodes.map((n) => {
        const pos = positionFor(n.id)
        if (!pos) return null
        const status = nodes[n.id]?.status ?? 'at-risk'
        const meta = STATUS_META[status]
        const isHighSeverity = n.severity === 'high'
        const r = NODE_R[n.tier] + (isHighSeverity ? SEVERITY_BUMP : 0)
        const isCompromised = status === 'compromised'
        const isSnapping = snappingIds.has(n.id)

        return (
          <g key={n.id} className="cc-node-relocate" style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}>
            {/* Icon badge: identity (service icon) and status (ring color/glow) are two separate signals */}
            <circle
              className={isCompromised ? 'cc-pulse' : undefined}
              r={r}
              fill="var(--cc-panel)"
              stroke={meta.ring}
              strokeWidth="3.5"
              style={{ color: meta.ring, filter: `drop-shadow(${meta.glow.split(',')[0]})` }}
            />
            <text textAnchor="middle" y={r * 0.35} fontSize={r * 0.95}>
              {n.icon}
            </text>

            {isHighSeverity && (
              <g transform={`translate(${-r * 0.72}, ${r * 0.72})`} aria-hidden="true">
                <circle r="9" fill="var(--cc-bg)" stroke="var(--cc-warn)" strokeWidth="1.5" />
                <text textAnchor="middle" y="3.5" fontSize="10">
                  🪙
                </text>
              </g>
            )}

            {status === 'secured' && (
              <g
                className={isSnapping ? 'cc-shield-snap' : undefined}
                transform={`translate(${r * 0.72}, ${-r * 0.72})`}
                aria-hidden="true"
              >
                <circle r="10" fill="var(--cc-bg)" stroke="var(--cc-good)" strokeWidth="1.5" />
                <text textAnchor="middle" y="4" fontSize="11">
                  🛡️
                </text>
              </g>
            )}

            <text textAnchor="middle" y={-r - 10} fontSize="11" fill="var(--cc-text)" fontWeight="600">
              {n.label}
              {isHighSeverity ? ' 🪙' : ''}
            </text>
            <text textAnchor="middle" y={r + 18} fontSize="9.5" fontWeight="700" fill={meta.ring}>
              {meta.icon} {meta.tag}
            </text>
          </g>
        )
      })}

      {forwardingActive && (
        <text x={CENTER} y={VIEWBOX_HEIGHT - 6} textAnchor="middle" fontSize="11" fill="var(--cc-warn)" fontWeight="700">
          ⚠️ Forwarding rule still active
        </text>
      )}
    </svg>
  )
}
