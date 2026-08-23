import { useRef, useState } from 'react'
import { TRAIL_MAP } from '../../../data/privacyMissions'
import { scoreBreakTheTrail } from '../../../lib/scoring'

function getSvgPoint(svg, clientX, clientY) {
  const pt = svg.createSVGPoint()
  pt.x = clientX
  pt.y = clientY
  const ctm = svg.getScreenCTM()
  if (!ctm) return { x: 0, y: 0 }
  const p = pt.matrixTransform(ctm.inverse())
  return { x: p.x, y: p.y }
}

/**
 * Real-world hook: several running apps let you set a "privacy zone"
 * around your home address on tracked routes — this mirrors that feature.
 * Placement works two ways, both landing on the same zone.x/zone.y state:
 * click anywhere on the map (mouse), or focus the map and use arrow keys
 * (keyboard) — no drag gesture is required for either.
 */
export default function BreakTheTrailMission({ onComplete }) {
  const svgRef = useRef(null)
  const [zone, setZone] = useState(TRAIL_MAP.defaultZone)
  const [result, setResult] = useState(null)

  function placeAt(clientX, clientY) {
    if (result?.passed) return
    const svg = svgRef.current
    if (!svg) return
    const p = getSvgPoint(svg, clientX, clientY)
    setZone((z) => ({
      ...z,
      x: Math.max(0, Math.min(TRAIL_MAP.width, p.x)),
      y: Math.max(0, Math.min(TRAIL_MAP.height, p.y)),
    }))
    setResult(null)
  }

  function handleKeyDown(e) {
    if (result?.passed) return
    const step = TRAIL_MAP.positionStep
    let dx = 0
    let dy = 0
    if (e.key === 'ArrowLeft') dx = -step
    else if (e.key === 'ArrowRight') dx = step
    else if (e.key === 'ArrowUp') dy = -step
    else if (e.key === 'ArrowDown') dy = step
    else return
    e.preventDefault()
    setZone((z) => ({
      ...z,
      x: Math.max(0, Math.min(TRAIL_MAP.width, z.x + dx)),
      y: Math.max(0, Math.min(TRAIL_MAP.height, z.y + dy)),
    }))
    setResult(null)
  }

  function checkPlacement() {
    const outcome = scoreBreakTheTrail(zone, TRAIL_MAP)
    setResult(outcome)
    if (outcome.passed) {
      setTimeout(() => onComplete(outcome), 1100)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm m-0">
        This route map reveals exactly where your run starts and ends. Cover that point with a privacy zone —{' '}
        <strong>click the map</strong> to place it, or <strong>focus the map and use arrow keys</strong>, then adjust
        the size with the slider.
      </p>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Privacy zone position"
        aria-valuetext={`Zone centered at approximately ${Math.round(zone.x)}, ${Math.round(zone.y)} on the map, radius ${Math.round(zone.radius)}`}
        onKeyDown={handleKeyDown}
        className="rounded-lg overflow-hidden border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-accent)]"
        style={{ borderColor: 'var(--cc-panel-border)', background: 'var(--cc-bg-alt)' }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${TRAIL_MAP.width} ${TRAIL_MAP.height}`}
          className="w-full h-auto block cursor-crosshair touch-none"
          onClick={(e) => placeAt(e.clientX, e.clientY)}
          role="img"
          aria-label="Route map with a start and end point near the bottom. A plain-text position readout is provided via the slider control above this map."
        >
          <path d={TRAIL_MAP.pathD} fill="none" stroke="var(--cc-text-dim)" strokeWidth="2.5" strokeDasharray="5 4" />
          <circle
            cx={zone.x}
            cy={zone.y}
            r={zone.radius}
            fill="var(--cc-accent-2)"
            opacity="0.28"
            stroke="var(--cc-accent-2)"
            strokeWidth="2"
            style={{ transition: 'cx 120ms ease, cy 120ms ease, r 120ms ease' }}
          />
          <circle cx={TRAIL_MAP.startPoint.x} cy={TRAIL_MAP.startPoint.y} r="5" fill="var(--cc-danger)" />
          <text
            x={TRAIL_MAP.startPoint.x}
            y={TRAIL_MAP.startPoint.y - 12}
            textAnchor="middle"
            fontSize="11"
            fill="var(--cc-text-dim)"
          >
            📍 Start / End
          </text>
        </svg>
      </div>

      <label className="flex items-center gap-3 text-sm">
        Zone size
        <input
          type="range"
          min={15}
          max={TRAIL_MAP.maxRadius}
          value={zone.radius}
          disabled={result?.passed}
          onChange={(e) => {
            setZone((z) => ({ ...z, radius: Number(e.target.value) }))
            setResult(null)
          }}
          className="flex-1"
          aria-label="Privacy zone radius"
        />
        <span className="text-xs text-[var(--cc-text-dim)] w-16 text-right">{Math.round(zone.radius)}px</span>
      </label>

      {result && (
        <p
          role="status"
          className="text-sm font-semibold m-0 flex items-center gap-1.5"
          style={{ color: result.passed ? 'var(--cc-good)' : 'var(--cc-warn)' }}
        >
          <span aria-hidden="true">{result.passed ? '✅' : '❌'}</span>
          {result.passed
            ? 'Nice — that fully covers the start/end point with a real margin.'
            : !result.covered
              ? "Not quite — the zone doesn't actually cover the start/end point. Try again, no penalty."
              : 'Close, but that zone is too small to meaningfully hide the point. Try a bigger radius.'}
        </p>
      )}

      {!result?.passed && (
        <button
          onClick={checkPlacement}
          className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
        >
          Check placement
        </button>
      )}
    </div>
  )
}
