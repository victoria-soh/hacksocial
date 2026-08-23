const RAIN_COUNT_MAX = 16

function stableRandom(seed) {
  return ((seed * 2654435761) % 2147483647) / 2147483647
}

/**
 * Rain + a smeared neon reflection strip, both driven by
 * atmosphere.rainIntensity (heavier at low resilience, clearing up as it
 * improves) — the same continuous parameter as everything else, so a
 * clearing sky and a settling city read as the same underlying story.
 * Plain HTML/CSS (not SVG), since rain needs to cover the whole scene
 * uniformly rather than live in the skyline's own coordinate space.
 */
export default function CityWeather({ atmosphere }) {
  const rainCount = Math.round(atmosphere.rainIntensity * RAIN_COUNT_MAX)

  return (
    <>
      {/* Wet-ground reflection: a soft blurred smear of neon color sitting
          right where the buildings meet the grid floor. */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          bottom: '22%',
          height: '7%',
          opacity: atmosphere.rainIntensity * 0.75,
          filter: 'blur(5px)',
          background: 'linear-gradient(90deg, rgba(34,230,255,0.4), rgba(255,47,214,0.35), rgba(34,230,255,0.35))',
          transition: 'opacity 700ms ease',
        }}
      />

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
