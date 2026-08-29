const RAIN_COUNT_MAX = 16

function stableRandom(seed) {
  return ((seed * 2654435761) % 2147483647) / 2147483647
}

/**
 * Falling rain, driven by atmosphere.rainIntensity (heavier at low
 * resilience, clearing up as it improves) — the same continuous parameter
 * as everything else, so a clearing sky and a settling city read as the
 * same underlying story. Plain HTML/CSS (not SVG), since rain needs to
 * cover the whole scene uniformly rather than live in the skyline's own
 * coordinate space.
 *
 * (This used to also render a full-width "wet-ground reflection" smear
 * right at the building/grid-floor boundary — removed because it read as a
 * continuous band/seam there, worst exactly at low resilience since it's
 * rainIntensity-driven and rain is heaviest when resilience is lowest.)
 */
export default function CityWeather({ atmosphere }) {
  const rainCount = Math.round(atmosphere.rainIntensity * RAIN_COUNT_MAX)

  return (
    <>
      {rainCount > 0 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: rainCount }).map((_, i) => {
            const seed = i * 43 + 3
            const left = stableRandom(seed) * 100
            const duration = 0.55 + stableRandom(seed + 1) * 0.45
            const delay = -stableRandom(seed + 2) * duration
            return (
              <span
                key={i}
                className="cc-rain-streak"
                style={{
                  left: `${left}%`,
                  animationDuration: `${duration}s`,
                  animationDelay: `${delay}s`,
                  opacity: 0.2 + atmosphere.rainIntensity * 0.45,
                }}
              />
            )
          })}
        </div>
      )}
    </>
  )
}
