/** Persistent reminder the incident is still live: a subtle pulsing red vignette around the viewport for as long as a mission is actively running. */
export default function AmbientTension() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-30 cc-vignette-pulse"
      style={{
        boxShadow: 'inset 0 0 120px 10px rgba(255, 45, 79, 0.28)',
      }}
      aria-hidden="true"
    />
  )
}
