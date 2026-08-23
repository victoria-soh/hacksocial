// Synthwave perspective grid beneath the skyline. Deliberately a plain CSS
// gradient + `perspective`/`rotateX` (the standard trick for this look) —
// no manual per-line math, no SVG, no canvas: a uniform grid rendered in
// 3D by the browser's own transform engine reads as receding-toward-a-
// horizon for free, and animating it is just animating background-position,
// which is as cheap as CSS animation gets.
export default function CityGridFloor() {
  return (
    <div
      className="absolute left-0 right-0 bottom-0 h-[24%] overflow-hidden pointer-events-none"
      style={{ perspective: '160px', perspectiveOrigin: '50% 0%' }}
    >
      <div
        className="cc-grid-floor absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgba(34,230,255,0.55) 1px, transparent 1px), linear-gradient(0deg, rgba(255,47,214,0.5) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          transform: 'rotateX(72deg)',
          transformOrigin: 'top',
        }}
      />
      {/* Horizon glow line where the grid "starts" */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: 'var(--cc-accent-2)', boxShadow: '0 0 8px 1px var(--cc-accent-2)', opacity: 0.7 }}
      />
    </div>
  )
}
