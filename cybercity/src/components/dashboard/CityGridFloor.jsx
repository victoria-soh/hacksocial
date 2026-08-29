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
      {/* Depth fade: the grid pattern above is uniformly bright at every
          depth on its own (the 3D perspective transform only handles
          spacing/converging, not brightness), which flattens it. This
          overlay mutes the pattern increasingly toward the top of the box
          (the far/horizon end) while staying fully transparent at the
          bottom (the near/viewer end), so the same grid reads as brighter
          and more saturated close up, fading out toward the horizon. */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, transparent 0%, rgba(13, 18, 38, 0.88) 100%)' }}
      />
    </div>
  )
}
