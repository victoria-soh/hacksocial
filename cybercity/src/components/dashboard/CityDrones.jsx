const MAX_DRONES = 4
const DRONE_Y_RANGE = [22, 95] // stay within the skyline band, above the buildings' bases

// Same deterministic pseudo-random as CityGraphic — stable per drone index
// across renders, only the COUNT (via atmosphere.droneDensity) changes.
function stableRandom(seed) {
  return ((seed * 2654435761) % 2147483647) / 2147483647
}

/**
 * Flying drone silhouettes, rendered as <g> fragments meant to sit inside
 * the same <svg> as the skyline. Density and motion smoothness both come
 * from the shared atmosphere.droneDensity/droneSmoothness — "no drone
 * traffic" at low resilience is simply droneCount === 0, not a separate
 * on/off switch, and the timing-function choice between the two available
 * CSS curves (steps = choppy, linear = smooth) is the closest a discrete
 * CSS property can get to following that same continuous value.
 */
export default function CityDrones({ atmosphere, totalWidth }) {
  const droneCount = Math.round(atmosphere.droneDensity * MAX_DRONES)
  if (droneCount === 0) return null

  return (
    <>
      {/* Shared by every drone's tail: fully transparent at the trailing end,
          fading up to a soft glow right behind the nose. A gradient fade
          instead of a solid stroke is what keeps the tail reading as motion
          blur rather than a drawn line. */}
      <defs>
        <linearGradient id="cc-drone-tail" x1="0%" y1="0" x2="100%" y2="0">
          <stop offset="0%" stopColor="var(--cc-accent)" stopOpacity="0" />
          <stop offset="55%" stopColor="var(--cc-accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--cc-accent)" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      {Array.from({ length: droneCount }).map((_, i) => {
        const seed = i * 61 + 7
        const y = DRONE_Y_RANGE[0] + stableRandom(seed) * (DRONE_Y_RANGE[1] - DRONE_Y_RANGE[0])
        const rtl = stableRandom(seed + 1) < 0.5
        const duration = 9 + stableRandom(seed + 2) * 7 // 9-16s to cross the scene
        const delay = -stableRandom(seed + 3) * duration // negative delay staggers starting position along the loop
        const choppy = atmosphere.droneSmoothness < 0.5

        return (
          <g
            key={i}
            className={`${rtl ? 'cc-drone-rtl' : 'cc-drone-ltr'}${choppy ? ' cc-drone-choppy' : ''}`}
            style={{
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
              '--cc-drone-end': `${totalWidth + 30}px`,
            }}
          >
            {/* Local space always points "nose toward +x, trail behind at -x" —
                flipping the whole group for right-to-left flight keeps the
                trail correctly behind the nose either direction. Both pieces
                are curved (a stroked round-capped line, an ellipse) — no
                vertex anywhere in this shape, so it can't be misread as an
                arrow/chevron the way the old triangle nose was. */}
            <g transform={`translate(0, ${y.toFixed(1)}) ${rtl ? 'scale(-1,1)' : ''}`}>
              <line
                x1="-10"
                y1="0"
                x2="-0.8"
                y2="0"
                stroke="url(#cc-drone-tail)"
                strokeWidth="1.5"
                strokeLinecap="round"
                style={{ filter: 'blur(0.3px)' }}
              />
              <ellipse
                cx="0"
                cy="0"
                rx="1.5"
                ry="1"
                fill="var(--cc-accent)"
                style={{ filter: 'blur(0.15px) drop-shadow(0 0 2px var(--cc-accent))' }}
              />
            </g>
          </g>
        )
      })}
    </>
  )
}
