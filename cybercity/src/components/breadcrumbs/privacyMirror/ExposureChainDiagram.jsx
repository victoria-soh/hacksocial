// Reuses the same node-and-glow visual grammar as ConnectionMap.jsx (Find
// Alex's case board): rounded-rect nodes, tier-colored fill/stroke, a
// drop-shadow glow on both nodes and connectors. This diagram traces a
// fixed reasoning chain top-to-bottom rather than a drag-to-connect graph,
// so it's read-only — but built from the exact same rect/line/glow recipe
// so it feels native next to that screen rather than bolted on.
const NODE_W = 280
const GAP = 34
const MIN_NODE_H = 44
// Rough text-wrap estimate (no real layout measurement available at SVG
// build time) so a long final step — which also carries the "→ risk label"
// suffix — gets enough box height for its text instead of being clipped.
const CHARS_PER_LINE = 34
const LINE_HEIGHT = 15
const PADDING_V = 16

const LEVEL_COLOR = {
  Medium: { fill: 'var(--cc-inf-medium-bg)', stroke: 'var(--cc-inf-medium)' },
  High: { fill: 'var(--cc-inf-high-bg)', stroke: 'var(--cc-inf-high)' },
}

function estimateNodeHeight(text) {
  const lines = Math.max(1, Math.ceil(text.length / CHARS_PER_LINE))
  return Math.max(MIN_NODE_H, lines * LINE_HEIGHT + PADDING_V)
}

function ChainSvg({ chain }) {
  const color = LEVEL_COLOR[chain.level] ?? LEVEL_COLOR.Medium
  const steps = chain.rule.chain
  const texts = steps.map((text, i) => (i === steps.length - 1 ? `${text} → ${chain.riskLabel}` : text))
  const heights = texts.map(estimateNodeHeight)
  const ys = heights.reduce((acc, h, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + heights[idx - 1] + GAP)
    return acc
  }, [])
  const svgHeight = ys[ys.length - 1] + heights[heights.length - 1] + 4

  return (
    <svg
      viewBox={`0 0 ${NODE_W} ${svgHeight}`}
      className="w-full max-w-sm"
      role="img"
      aria-label={`Reasoning chain for ${chain.riskLabel}: ${steps.join(' — leads to — ')}.`}
    >
      {texts.map((text, i) => {
        const y = ys[i]
        const h = heights[i]
        const isLast = i === texts.length - 1
        return (
          <g key={i}>
            {i > 0 && (
              <>
                <line
                  x1={NODE_W / 2}
                  y1={ys[i - 1] + heights[i - 1] + 2}
                  x2={NODE_W / 2}
                  y2={y - 8}
                  stroke={color.stroke}
                  strokeWidth="2"
                  opacity="0.85"
                  style={{ filter: `drop-shadow(0 0 3px ${color.stroke})` }}
                />
                <polygon
                  points={`${NODE_W / 2 - 5},${y - 10} ${NODE_W / 2 + 5},${y - 10} ${NODE_W / 2},${y - 2}`}
                  fill={color.stroke}
                  style={{ filter: `drop-shadow(0 0 2px ${color.stroke})` }}
                />
              </>
            )}
            <rect
              x="0"
              y={y}
              width={NODE_W}
              height={h}
              rx="8"
              fill={color.fill}
              stroke={color.stroke}
              strokeWidth={isLast ? 2.5 : 1.5}
              style={{ filter: `drop-shadow(0 0 ${isLast ? 5 : 3}px ${color.stroke})` }}
            />
            <foreignObject x="0" y={y} width={NODE_W} height={h}>
              <div
                style={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 12px',
                  fontSize: '12px',
                  lineHeight: 1.25,
                  fontWeight: isLast ? 700 : 400,
                  color: 'var(--cc-text)',
                }}
              >
                {text}
              </div>
            </foreignObject>
          </g>
        )
      })}
    </svg>
  )
}

/** chains: getTopChains() output, each enriched with a `level` ('Medium'|'High'). */
export default function ExposureChainDiagram({ chains }) {
  if (chains.length === 0) {
    return (
      <p className="text-sm text-[var(--cc-text-dim)]">
        Select a couple more related categories (e.g. running routes + marketplace listings) to see a reasoning
        chain form.
      </p>
    )
  }

  return (
    <div className="flex flex-col md:flex-row gap-6 flex-wrap">
      {chains.map((chain) => (
        <div key={chain.riskId} className="flex-1 min-w-[240px]">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--cc-accent-2)' }}>
            Why "{chain.riskLabel}" is inferable
          </p>
          <ChainSvg chain={chain} />
        </div>
      ))}
    </div>
  )
}
