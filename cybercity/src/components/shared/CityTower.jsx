/**
 * The CyberCity "district resilience tower" visual — a bordered window-grid
 * box that fills and glows in proportion to `fillFraction`, in whatever
 * `color` the caller passes. Originally built inline for the dashboard's
 * district buildings (see CityGraphic.jsx's DistrictBuilding); extracted
 * here so any other screen wanting "the same tower asset" (e.g. Recovery
 * Rush's account nodes) uses the literal same component instead of a
 * lookalike reimplementation that can drift out of sync.
 */
export default function CityTower({
  fillFraction,
  color,
  width = 82,
  minHeight = 76,
  maxHeight = 140,
  windowCount = 9,
  windowCols = 3,
  glitch = false,
  grayscale = false,
}) {
  const litCount = Math.round(windowCount * fillFraction)
  const heightPx = minHeight + fillFraction * (maxHeight - minHeight)
  // Border/padding/corner-radius scale down with width instead of using
  // fixed Tailwind values — at the dashboard's ~82px towers these clamp to
  // the exact same pixel values the fixed classes used to produce, but at
  // Recovery Rush's much smaller account towers a fixed 8px radius or 6px
  // padding would swallow the whole shape (turning a tiny tower into a
  // dome, or leaving no interior room for windows at all).
  const borderWidth = Math.max(1, Math.min(2, width * 0.045))
  const padding = Math.max(1, Math.min(6, width * 0.07))
  const gap = Math.max(1, Math.min(4, width * 0.045))
  const radius = Math.max(1, Math.min(8, width * 0.12))

  return (
    <div
      className={`grid transition-[height,background,border-color,box-shadow,filter] duration-500 ${glitch ? 'cc-billboard-glitch' : ''}`}
      style={{
        height: `${heightPx}px`,
        width: `${width}px`,
        gap: `${gap}px`,
        padding: `${padding}px`,
        borderWidth: `${borderWidth}px`,
        borderStyle: 'solid',
        borderTopLeftRadius: `${radius}px`,
        borderTopRightRadius: `${radius}px`,
        gridTemplateColumns: `repeat(${windowCols}, minmax(0, 1fr))`,
        background: grayscale ? 'var(--cc-bg-alt)' : `color-mix(in srgb, ${color} ${Math.round(fillFraction * 35 + 8)}%, #0a0f1e)`,
        borderColor: grayscale ? 'var(--cc-panel-border)' : color,
        boxShadow: grayscale ? 'none' : `0 0 ${6 + fillFraction * 16}px color-mix(in srgb, ${color} 55%, transparent)`,
        filter: grayscale ? 'grayscale(1) brightness(0.65)' : 'none',
      }}
    >
      {Array.from({ length: windowCount }).map((_, i) => (
        <span
          key={i}
          className="rounded-[1px] transition-[background,box-shadow] duration-500"
          style={{
            aspectRatio: '1',
            background: !grayscale && i < litCount ? color : 'rgba(255,255,255,0.08)',
            boxShadow: !grayscale && i < litCount ? `0 0 4px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  )
}
