import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { computeCityAtmosphere } from '../../lib/cityAtmosphere'
import { RESIDENTS } from '../../data/communityCentre'
import { RECOVERY_LEVELS } from '../../data/recoveryRush'
import CityGridFloor from './CityGridFloor'
import CityDrones from './CityDrones'
import CityWeather from './CityWeather'
import CityTower from '../shared/CityTower'

// "Missions remaining" per district for the building hover tooltip — each
// mapped onto whatever discrete units that district's own resilience
// formula already treats as its components (see GameContext.jsx's
// computeBreadcrumbsResilience/computeRecoveryResilience/
// computeCommunityResilience), not a new parallel tracking concept.
function missionsRemaining(key, districtState) {
  if (key === 'breadcrumbs') {
    return (districtState.findAlexComplete ? 0 : 1) + (districtState.privacyDefenceScore == null ? 1 : 0)
  }
  if (key === 'recoveryRush') {
    // `hidden` levels (the capstone-only incident) aren't part of the
    // regular Recovery Rush level list — see RecoveryRushHub.jsx's own
    // identical filter — and computeRecoveryResilience never counts them
    // either, so they shouldn't inflate "missions remaining" here.
    return RECOVERY_LEVELS.filter((l) => !l.hidden && !districtState.levelsComplete[l.id]).length
  }
  return RESIDENTS.filter((r) => !districtState.residents[r.id]?.complete).length
}

const PROTECTED_THRESHOLD = 60
const WINDOW_COUNT = 9
const MAX_CITIZEN_SPRITES = 5
// The canvas is taller than it is "wide per unit" on purpose — 280 units,
// not 200 — so the skyline has genuine room: tall, slender buildings *and*
// real sky above the tallest one, rather than needing to squash buildings
// to fit a shorter canvas (which is what made an earlier pass read as squat
// and stubby). viewBox height uses this directly (see the <svg> below).
const CANVAS_HEIGHT = 280
// Every building's ground line — regular skyline AND the three landmarks
// alike — still 76% down the canvas, matching CityGridFloor's own horizon
// (it occupies the bottom 24% of this same atmospheric layer; see the
// `relative` comment below) — just 76% of the new, taller CANVAS_HEIGHT
// rather than of the old 200. All buildings terminate here, base flush
// with the horizon, so the grid floor reads as a real foreground plane
// receding toward it rather than a sliver only visible in gaps between an
// opaque wall of buildings.
const GROUND_Y = Math.round(CANVAS_HEIGHT * 0.76)
const GUARDIAN_HQ_WIDTH = 50
// Tallest of the three landmarks (they should read as more prominent than
// the regular skyline) — heights below (here and on LAYER_FAR/
// LAYER_MID_BASE/LAYER_NEAR/LANDMARKS) are back to their original, taller
// proportions now that CANVAS_HEIGHT gives them room; GROUND_Y - this still
// leaves clear sky above the dome apex.
const GUARDIAN_HQ_HEIGHT = 190

// Tier 2: three depth layers instead of one flat skyline. Far is distant/
// cool/minimal (barely more than a silhouette); mid is the original
// skyline; near is closer, taller, and framed at the outer edges so it
// never competes with the interactive district buildings sitting front-
// and-center below. Each layer gets its own parallax rate (see
// PARALLAX_FACTORS) and its own window tone.
// Two entries (originally x=160 and x=378) shifted to clear the
// signal-tower and guardian-spire LANDMARK_SLOTS gaps below — a distant/dim
// backdrop layer is fine sitting *behind* a closer building at the same x
// (that's normal depth layering), but these two happened to fall in a
// landmark's own x-range, not a regular skyline building's.
const LAYER_FAR = [
  { x: 0, w: 30, h: 46 },
  { x: 34, w: 24, h: 60 },
  { x: 64, w: 32, h: 40 },
  { x: 128, w: 26, h: 55 },
  { x: 206, w: 38, h: 36 },
  { x: 255, w: 28, h: 50 },
  { x: 298, w: 42, h: 38 },
  { x: 345, w: 26, h: 54 },
  { x: 418, w: 46, h: 40 },
  { x: 478, w: 32, h: 56 },
]

// A fourth, even-more-distant depth step behind LAYER_FAR — short, low-
// opacity, and desaturated toward the sky's own dark-blue tone (no window
// detail at all, unlike LAYER_FAR/MID/NEAR), so it reads as atmospheric
// backdrop filling out the skyline rather than another row of buildings
// competing for attention. Spans the full (wider, since the landmark slots)
// skyline width; short enough (h ≤ 34) that it never comes close to the
// much taller landmarks regardless of x, so there's nothing to collide with.
const LAYER_BACK = [
  { x: -10, w: 45, h: 26 },
  { x: 50, w: 38, h: 20 },
  { x: 100, w: 50, h: 30 },
  { x: 165, w: 40, h: 22 },
  { x: 230, w: 55, h: 28 },
  { x: 300, w: 42, h: 24 },
  { x: 355, w: 48, h: 32 },
  { x: 420, w: 60, h: 26 },
  { x: 495, w: 45, h: 20 },
  { x: 555, w: 50, h: 28 },
  { x: 620, w: 55, h: 24 },
  { x: 685, w: 40, h: 22 },
]

// Unshifted base positions — LAYER_MID (the actual rendered layer) is this
// same silhouette with three gaps opened up by LANDMARK_SLOTS below, not
// this raw array. Kept separate so the slot math has a stable "before"
// layout to shift from.
// `lit` counts raised from their original values now that windows scatter
// across most of each body instead of packing into a top-aligned grid (see
// the scatteredWindows() render below) — the same counts spread over a much
// taller area would otherwise read as sparser/emptier than before, not just
// differently arranged.
const LAYER_MID_BASE = [
  { x: 10, w: 40, h: 90, lit: 5 },
  { x: 55, w: 55, h: 130, lit: 8 },
  { x: 115, w: 35, h: 70, lit: 3 },
  { x: 155, w: 50, h: 150, lit: 9, billboard: true },
  { x: 210, w: 40, h: 100, lit: 6 },
  { x: 255, w: 60, h: 160, lit: 11 },
  { x: 320, w: 45, h: 85, lit: 5 },
  { x: 370, w: 50, h: 120, lit: 8, billboard: true },
  { x: 425, w: 35, h: 75, lit: 3 },
  { x: 465, w: 55, h: 140, lit: 9 },
]

// Regular skyline buildings (LAYER_FAR/MID/NEAR) have no semantic tie to any
// specific district or feature — they're pure decoration, positioned only
// for a varied silhouette (the real, interactive per-district buildings are
// the separate CityTower row below the skyline SVG, keyed off DISTRICT_DEFS
// instead). Landmarks used to just tack on after the last one, clustered
// together past the "real" skyline; these slots instead open a genuine gap
// at three points already spread through LAYER_MID's own varied rhythm —
// early, middle, and late, each a different width — so an unlocked landmark
// reads as part of the skyline rather than a strip bolted onto the edge.
// The gap is reserved as soon as a slot is defined, regardless of whether
// that landmark is actually unlocked yet, so nothing else in the skyline
// shifts position the moment a landmark unlocks — only that one gap fills
// in. `shape` (on LANDMARKS below) picks which silhouette LandmarkTower
// draws; neither it nor this slot list has any effect on unlock condition.
const LANDMARK_SLOTS = [
  { id: 'signal-tower', afterIndex: 2, width: 34, margin: 9 },
  { id: 'guardian-spire', afterIndex: 5, width: 34, margin: 9 },
  { id: 'guardian-hq', afterIndex: 8, width: GUARDIAN_HQ_WIDTH, margin: 9 },
]

function layoutMidLayerWithLandmarks(base, slots) {
  const slotByIndex = new Map(slots.map((s) => [s.afterIndex, s]))
  const landmarkX = {}
  let shift = 0
  const buildings = base.map((b, i) => {
    const shifted = { ...b, x: b.x + shift }
    const slot = slotByIndex.get(i)
    if (slot) {
      landmarkX[slot.id] = shifted.x + b.w + slot.margin
      shift += slot.margin * 2 + slot.width
    }
    return shifted
  })
  return { buildings, landmarkX }
}

const { buildings: LAYER_MID, landmarkX: LANDMARK_X } = layoutMidLayerWithLandmarks(LAYER_MID_BASE, LANDMARK_SLOTS)
// The skyline's own fixed width — no longer a function of how many
// landmarks are unlocked, since every slot's gap is always reserved.
const SKYLINE_TOTAL_WIDTH = LAYER_MID[LAYER_MID.length - 1].x + LAYER_MID[LAYER_MID.length - 1].w + 10

// The right-side pair sat at x=400/452 before the landmark slots above
// existed; the new guardian-spire slot (~x373-416) and guardian-hq slot
// (further right still) now occupy that stretch, so both are pushed right
// to clear them — same relative spacing to each other, just shifted.
const LAYER_NEAR = [
  { x: -25, w: 65, h: 168, lit: 7 },
  { x: 42, w: 42, h: 138, lit: 5 },
  { x: 430, w: 44, h: 158, lit: 7 },
  { x: 482, w: 50, h: 132, lit: 5 },
]

const PARALLAX_FACTORS = { back: 1.2, far: 2.5, mid: 5, near: 10 }

// Level-up landmarks (see data/levels.js's unlockType: 'landmark' entries).
// Each unlocked landmark fills in its own already-reserved LANDMARK_SLOTS
// gap rather than appending past the end of the skyline — see the slot
// comment above. `shape` picks which distinct silhouette LandmarkTower
// draws (see below) — purely a rendering choice, no effect on unlock
// condition or slot position.
const LANDMARKS = [
  { id: 'signal-tower', label: 'Signal Tower', w: 34, h: 175, lit: 5, shape: 'antenna', unlockText: 'Unlocked at Level 2 — Cyber Investigator' },
  { id: 'guardian-spire', label: 'Guardian Spire', w: 34, h: 178, lit: 8, shape: 'spire-cap', unlockText: 'Unlocked at Level 5 — Cyber Sentinel' },
]

const DISTRICT_DEFS = [
  { key: 'breadcrumbs', icon: '🔎', name: 'Digital Breadcrumbs', to: '/breadcrumbs' },
  { key: 'recoveryRush', icon: '🚨', name: 'Recovery Rush', to: '/recovery-rush' },
  { key: 'communityCentre', icon: '🛡️', name: 'Community Centre', to: '/community-centre' },
]

// Deterministic pseudo-random in [0, 1) from a small integer seed — used to
// decide which windows/billboards flicker or twinkle so the SAME ones do
// on every render (stable), while the fraction that qualify changes
// smoothly as the underlying atmosphere value changes. Never Math.random()
// here: that would reshuffle the selection on every re-render, which reads
// as random noise rather than a status signal or a gentle ambient effect.
function stableRandom(seed) {
  return ((seed * 2654435761) % 2147483647) / 2147483647
}

/**
 * Scattered (not gridded) window positions for a building body — candidate
 * `cols`-per-row slots with per-slot jitter, ranked by a stable per-slot
 * score and only the top `count` kept lit. This is what gives "irregular
 * gaps and varied counts per row" instead of a dense uniform grid: some
 * rows end up with one window, some with none, some with a full row, and
 * it's a different pattern per building (via `seedBase`) rather than one
 * template reused. Each returned slot also carries a `brightness` tier
 * (0.32 dim / 0.68 medium / 1 bright, weighted toward medium) so a lit
 * building reads as populated rather than as a uniform repeating light —
 * see the two call sites below for how that maps to fill/opacity/glow.
 *
 * `bottomMargin` keeps the lowest row well clear of the roofline (nothing
 * sits right down at the ground boundary, where the perspective grid
 * floor's lines cross behind it and make an in-bounds window read as if it
 * were floating loose below street level) while still reaching much
 * further down the body than a top-packed fixed grid would.
 *
 * `cols` defaults to 2 (landmark bodies are narrow) using the exact
 * original two-column x formula; wider regular buildings pass 3 and get an
 * evenly-spaced column formula instead.
 */
function scatteredWindows(seedBase, count, w, bodyH, cols = 2) {
  const rowH = 22
  const topMargin = 14
  const bottomMargin = 20
  const rows = Math.max(2, Math.floor((bodyH - topMargin - bottomMargin) / rowH))
  const slots = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const seed = seedBase + row * 19 + col * 7
      const colX = cols === 2 ? (col === 0 ? 6 : w - 13) : 6 + col * ((w - 18) / (cols - 1))
      const brightnessRoll = stableRandom(seed + 5)
      slots.push({
        x: colX + (stableRandom(seed) - 0.5) * 2,
        y: topMargin + row * rowH + (stableRandom(seed + 3) - 0.5) * 6,
        score: stableRandom(seed + 1),
        brightness: brightnessRoll < 0.15 ? 0.32 : brightnessRoll < 0.85 ? 0.68 : 1,
      })
    }
  }
  return slots.sort((a, b) => b.score - a.score).slice(0, count)
}

/**
 * Subtle mouse-move parallax across the whole viewport (not just this
 * component — "as the cursor moves across the dashboard"), applied via a
 * CSS custom property on the container rather than React state, so it
 * never triggers a re-render on mousemove. Skipped entirely under
 * prefers-reduced-motion: layers simply stay put, which is itself the
 * correct static fallback for a pointer-driven effect (nothing to freeze
 * mid-animation, there's no motion unless the mouse moves).
 */
function useParallax(containerRef) {
  useEffect(() => {
    const container = containerRef.current
    if (!container) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    let raf = null
    function handleMove(e) {
      if (raf) return
      raf = requestAnimationFrame(() => {
        const nx = (e.clientX / window.innerWidth - 0.5) * 2 // -1..1
        container.style.setProperty('--parallax-x', nx.toFixed(3))
        raf = null
      })
    }
    function handleLeave() {
      container.style.setProperty('--parallax-x', '0')
    }
    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseleave', handleLeave)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseleave', handleLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [containerRef])
}

/**
 * Decorative-only; per-district resilience is also exposed via each
 * district building's aria-label below.
 *
 * `interactive` (default true): set false to render the district buildings
 * as static, non-focusable previews instead of links — for contexts like
 * the onboarding welcome screen, where the districts aren't navigable yet
 * (the player isn't `onboarded` until they pick a mission, so a real click
 * here would just bounce them straight back via ProtectedLayout's guard).
 */
export default function CityGraphic({ overallResilience, districts, unlockedLandmarkIds = [], interactive = true }) {
  const containerRef = useRef(null)
  useParallax(containerRef)

  // Landmark hover/focus tooltip. Rendered via a portal straight to
  // document.body (see the bottom of this component) rather than as a
  // normal descendant — the container this graphic lives in clips overflow
  // (for its own rounded corners), and landmarks sit close enough to the
  // top/right edge that a tooltip positioned the normal way would get cut
  // off there. Storing the trigger's own getBoundingClientRect() at
  // hover/focus time means the portal needs no extra positioning logic of
  // its own and stays correct regardless of the graphic's responsive width.
  const [landmarkTooltip, setLandmarkTooltip] = useState(null)
  function showLandmarkTooltip(e, label, unlockText) {
    setLandmarkTooltip({ label, unlockText, rect: e.currentTarget.getBoundingClientRect() })
  }
  function hideLandmarkTooltip() {
    setLandmarkTooltip(null)
  }

  const atmosphere = computeCityAtmosphere(overallResilience)
  const isProtected = overallResilience >= PROTECTED_THRESHOLD
  const landmarks = LANDMARKS.filter((l) => unlockedLandmarkIds.includes(l.id))
  // Fixed — every landmark's gap in LAYER_MID is reserved regardless of
  // unlock state (see LANDMARK_SLOTS), so the skyline's own width never
  // changes as landmarks unlock.
  const totalWidth = SKYLINE_TOTAL_WIDTH
  // Guardian HQ always reserves its slot (visible from the start, dark and
  // inactive) — see the Guardian HQ block below for why it renders even
  // before it's earned, unlike the level-gated LANDMARKS above.
  const guardianUnlocked = Boolean(districts.communityCentre.guardianModeComplete)
  const glowColor = isProtected ? 'var(--cc-accent)' : 'var(--cc-warn)'
  const scanlineOpacity = 0.16 * (1 - atmosphere.clarity)
  const windowFill = isProtected ? 'var(--cc-accent)' : 'var(--cc-warn)'

  // Ambient citizens: a visible, populated city rather than a rising
  // number — more people out and about as overall resilience climbs.
  const citizenCount = Math.round(atmosphere.clarity * MAX_CITIZEN_SPRITES)

  return (
    <div
      ref={containerRef}
      className="relative rounded-2xl overflow-hidden border border-[var(--cc-panel-border)]"
      style={{ background: '#0d1226', '--parallax-x': 0 }}
    >
      <div
        aria-hidden="true"
        // `relative` gives CityGridFloor (and CityWeather's ground-reflection
        // band) a positioning context scoped to just this atmospheric layer
        // — without it, their percentage-based sizing/anchoring resolves
        // against the outer container, which also includes the district
        // buildings row below, and the grid floor's bottom/height end up
        // measured against the wrong box. The sky gradient moves here (off
        // the SVG's own <rect>, which painted after the grid floor and
        // buildings in DOM order below it) so it can sit behind the grid
        // floor rather than possibly in front of it.
        className="relative"
        style={{
          filter: `saturate(${atmosphere.neonSaturation}) brightness(${atmosphere.neonBrightness}) drop-shadow(0 0 ${atmosphere.glowStrength}px ${glowColor})`,
          background: 'linear-gradient(180deg, #131c38 0%, #2a1f4d 100%)',
          transition: 'filter 700ms ease',
        }}
      >
        {/* Grid floor now renders before the skyline SVG (SVG paints in
            document order, and this sits in the normal HTML flow right
            before it) so every opaque building silhouette — including the
            landmarks — draws over it and occludes it properly, instead of
            the grid's horizon line and perspective lines painting on top of
            the buildings' lower half. */}
        <CityGridFloor />
        <svg
          viewBox={`0 0 ${totalWidth} ${CANVAS_HEIGHT}`}
          className="w-full h-auto block relative"
          role="presentation"
          style={{ filter: `blur(${atmosphere.skylineBlur}px)`, transition: 'filter 700ms ease' }}
        >
          {/* Moon: positioned over LAYER_MID's shortest building (x=115-150,
              h=70, top at GROUND_Y-70=143) with a huge margin to its bottom
              edge, clear of every layer's tallest silhouette at this x —
              LAYER_FAR/LAYER_BACK here top out well above that, and the
              nearest LAYER_NEAR/landmark bodies (x=-25..40 and x=159..193)
              don't reach this x-range at all. CANVAS_HEIGHT's own extra room
              is what lets it sit lower with real breathing space around it
              instead of pinned near the very top edge. Drawn first (and
              never moved later in document order), so buildings still
              occlude it, not the other way round. */}
          <defs>
            <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffe9a8" stopOpacity="0.32" />
              <stop offset="45%" stopColor="#ffe9a8" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#ffe9a8" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="130" cy="50" r="56" fill="url(#moon-glow)" />
          <circle cx="130" cy="50" r="18" fill="#ffe9a8" opacity="0.9" />

          {/* Back layer: the most distant depth step, behind even the far
              layer — short, low-opacity, no window detail, colored close to
              the sky itself so it barely reads as more than atmospheric
              haze. Moves slowest of all four layers. */}
          <g
            style={{
              transform: `translateX(calc(var(--parallax-x, 0) * ${PARALLAX_FACTORS.back}px))`,
              transition: 'transform 150ms ease-out',
            }}
          >
            {LAYER_BACK.map((b, i) => (
              <rect key={i} x={b.x} y={GROUND_Y - b.h} width={b.w} height={b.h} fill="#182342" opacity="0.42" />
            ))}
          </g>

          {/* Far layer: distant, cool-toned, barely-detailed silhouettes. Moves least. */}
          <g
            style={{
              transform: `translateX(calc(var(--parallax-x, 0) * ${PARALLAX_FACTORS.far}px))`,
              transition: 'transform 150ms ease-out',
            }}
          >
            {LAYER_FAR.map((b, i) => (
              <rect key={i} x={b.x} y={GROUND_Y - b.h} width={b.w} height={b.h} fill="#1a2440" opacity="0.75" />
            ))}
          </g>

          {/* Mid layer: the original skyline — moderate detail, moderate parallax. */}
          <g
            style={{
              transform: `translateX(calc(var(--parallax-x, 0) * ${PARALLAX_FACTORS.mid}px))`,
              transition: 'transform 150ms ease-out',
            }}
          >
            {LAYER_MID.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={GROUND_Y - b.h} width={b.w} height={b.h} fill="#0a0f1e" stroke="#24304d" />
                {scatteredWindows(i * 97 + 13, b.lit, b.w, b.h, 3).map((win, j) => {
                  const seed = i * 31 + j * 7 + 11
                  const flickers = stableRandom(seed) < atmosphere.flickerChance
                  const twinkles = !flickers && stableRandom(seed + 500) < 0.18
                  return (
                    <rect
                      key={j}
                      className={flickers ? 'cc-window-flicker' : twinkles ? 'cc-window-twinkle' : undefined}
                      x={b.x + win.x}
                      y={GROUND_Y - b.h + win.y}
                      width="6"
                      height="8"
                      fill={windowFill}
                      opacity={win.brightness}
                      style={{
                        ...(win.brightness === 1 ? { filter: `drop-shadow(0 0 2px ${windowFill})` } : undefined),
                        animationDelay:
                          flickers || twinkles ? `${stableRandom(seed + (flickers ? 0 : 1000)) * 4}s` : undefined,
                      }}
                    />
                  )
                })}
                {b.billboard && <Billboard x={b.x + b.w / 2} y={GROUND_Y - b.h + 6} atmosphere={atmosphere} seed={i} />}
                {/* Neon spill where this building meets the grid floor — a
                    discrete pool of light in the building's own window
                    color, narrow enough (well inside the building's own
                    width, with a light blur) that neighboring buildings'
                    pools stay visibly separated by dark grid floor instead
                    of blending into one continuous band. */}
                <ellipse cx={b.x + b.w / 2} cy={GROUND_Y} rx={b.w * 0.32} ry="3.5" fill={windowFill} opacity="0.3" style={{ filter: 'blur(1.5px)' }} />
              </g>
            ))}
          </g>

          {/* Near layer: closer, taller, brighter — framed at the outer edges so it
              never overlaps the interactive district buildings below. Moves most. */}
          <g
            style={{
              transform: `translateX(calc(var(--parallax-x, 0) * ${PARALLAX_FACTORS.near}px))`,
              transition: 'transform 150ms ease-out',
            }}
          >
            {LAYER_NEAR.map((b, i) => (
              <g key={i}>
                <rect x={b.x} y={GROUND_Y - b.h} width={b.w} height={b.h} fill="#060910" stroke="#2f3d5f" strokeWidth="1.25" />
                {scatteredWindows(i * 149 + 61, b.lit, b.w, b.h, 2).map((win, j) => {
                  const seed = i * 53 + j * 5 + 900
                  const flickers = stableRandom(seed) < atmosphere.flickerChance
                  const twinkles = !flickers && stableRandom(seed + 500) < 0.22
                  return (
                    <rect
                      key={j}
                      className={flickers ? 'cc-window-flicker' : twinkles ? 'cc-window-twinkle' : undefined}
                      x={b.x + win.x + 1}
                      y={GROUND_Y - b.h + win.y}
                      width="8"
                      height="11"
                      fill={windowFill}
                      opacity={Math.min(1, win.brightness + 0.15)}
                      style={{
                        filter: win.brightness >= 0.68 ? `drop-shadow(0 0 3px ${windowFill})` : undefined,
                        animationDelay: flickers || twinkles ? `${stableRandom(seed + 1000) * 4}s` : undefined,
                      }}
                    />
                  )
                })}
                <ellipse cx={b.x + b.w / 2} cy={GROUND_Y} rx={b.w * 0.32} ry="4" fill={windowFill} opacity="0.34" style={{ filter: 'blur(1.5px)' }} />
              </g>
            ))}
          </g>

          {landmarks.map((l) => (
            <LandmarkTower
              key={l.id}
              x={LANDMARK_X[l.id]}
              landmark={l}
              onShowTooltip={showLandmarkTooltip}
              onHideTooltip={hideLandmarkTooltip}
            />
          ))}

          <GuardianHQ
            x={LANDMARK_X['guardian-hq']}
            unlocked={guardianUnlocked}
            onShowTooltip={showLandmarkTooltip}
            onHideTooltip={hideLandmarkTooltip}
          />

          <CityDrones atmosphere={atmosphere} totalWidth={totalWidth} />
        </svg>

        <CityWeather atmosphere={atmosphere} />

        {/* Low-resilience haze — a translucent layer sitting over the skyline,
            heavier near the ground, that fades out entirely as resilience
            climbs. Combined with the SVG's own blur above for a genuine
            "hazy air", not just a flat tint. */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, rgba(140,150,175,0.55) 0%, rgba(140,150,175,0.15) 55%, transparent 100%)',
            opacity: atmosphere.fogOpacity,
            transition: 'opacity 700ms ease',
          }}
        />

        {/* Faint scanline texture, only really visible while resilience is low */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)',
            opacity: scanlineOpacity,
            transition: 'opacity 700ms ease',
          }}
        />

        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold cc-chrome"
          style={{
            background: isProtected ? 'var(--cc-good)' : 'var(--cc-danger)',
            color: '#050a08',
            boxShadow: isProtected ? 'var(--cc-glow-good)' : 'var(--cc-glow-danger)',
          }}
        >
          {isProtected ? `🛡️ CYBERCITY PROTECTED · ${overallResilience}%` : `⚠️ CITY UNDER ATTACK · ${overallResilience}%`}
        </div>

        {citizenCount > 0 && (
          <div className="absolute bottom-2.5 left-0 right-0 flex justify-center gap-6 sm:gap-10 pointer-events-none overflow-hidden px-4">
            {Array.from({ length: citizenCount }).map((_, i) => (
              <span
                key={i}
                className="cc-citizen-sprite text-sm sm:text-base"
                style={{ animationDelay: `${i * 0.6}s`, animationDuration: `${5 + (i % 3)}s` }}
              >
                🚶
              </span>
            ))}
          </div>
        )}
      </div>

      {/* The real, interactive content: click into a district. */}
      <div className="relative flex items-end justify-center gap-3 sm:gap-6 px-4 pt-16 pb-4 flex-wrap">
        {DISTRICT_DEFS.map((d) => (
          <DistrictBuilding
            key={d.key}
            icon={d.icon}
            name={d.name}
            to={d.to}
            resilience={districts[d.key].resilience}
            missionsLeft={missionsRemaining(d.key, districts[d.key])}
            locked={d.key === 'communityCentre' ? !districts.communityCentre.unlocked : false}
            interactive={interactive}
          />
        ))}
      </div>

      {landmarkTooltip &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed w-max max-w-[220px] rounded-lg px-2.5 py-1.5 text-center z-50"
            style={{
              background: 'var(--cc-bg-alt)',
              border: '1px solid var(--cc-panel-border)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              left: landmarkTooltip.rect.left + landmarkTooltip.rect.width / 2,
              top: landmarkTooltip.rect.top - 8,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="text-xs font-semibold m-0" style={{ color: 'var(--cc-text)' }}>
              {landmarkTooltip.label}
            </p>
            <p className="text-[10px] m-0" style={{ color: 'var(--cc-text-dim)' }}>
              {landmarkTooltip.unlockText}
            </p>
          </div>,
          document.body,
        )}
    </div>
  )
}

// Level-up landmarks: unlike every skyline building (a plain lit rectangle),
// each landmark gets its own distinct architectural topper — never a second
// color, so there's no tier seam. The glow is a modest, fixed-radius drop
// shadow on the outline only (not blanketed over the windows too), so the
// structure still reads as lit-and-special without the bloom washing out
// its own window detail. No permanent on-screen label — name + unlock
// condition surface as a hover/focus tooltip instead (rendered by the
// parent CityGraphic via a portal, since a tooltip positioned the normal
// way would get clipped by this graphic's own overflow-hidden container
// out near this landmark's edge).
function LandmarkTower({ x, landmark, onShowTooltip, onHideTooltip }) {
  const { w, h, lit, shape, label, unlockText } = landmark
  const color = 'var(--cc-accent-2)'
  const bodyH = h * (shape === 'antenna' ? 0.7 : 0.76)
  const bodyY = GROUND_Y - bodyH
  const windows = scatteredWindows(x * 3 + (shape === 'antenna' ? 101 : 202), lit, w, bodyH)

  return (
    <g
      tabIndex={0}
      aria-label={`${label} — ${unlockText}`}
      className="cursor-default outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cc-accent-2)]"
      onMouseEnter={(e) => onShowTooltip(e, label, unlockText)}
      onMouseLeave={onHideTooltip}
      onFocus={(e) => onShowTooltip(e, label, unlockText)}
      onBlur={onHideTooltip}
    >
      <g style={{ filter: `drop-shadow(0 0 3px ${color})` }}>
        <rect x={x} y={bodyY} width={w} height={bodyH} fill="#0a0f1e" stroke={color} strokeWidth="1.5" />
        {shape === 'antenna' ? (
          <>
            {/* A slender mast rising off-center from the roofline, with three
                cross-bars and a small mounted dish partway up — reads as a
                radio/signal antenna, a shape no ordinary building or the
                spire-cap landmark has. */}
            <rect x={x + w / 2 - 1.5} y={GROUND_Y - h} width="3" height={h - bodyH} fill={color} />
            <rect x={x + w / 2 - 7} y={GROUND_Y - h + (h - bodyH) * 0.32} width="6" height="2" fill={color} />
            <rect x={x + w / 2 + 1} y={GROUND_Y - h + (h - bodyH) * 0.32} width="6" height="2" fill={color} />
            <rect x={x + w / 2 - 5} y={GROUND_Y - h + (h - bodyH) * 0.56} width="4" height="2" fill={color} />
            <rect x={x + w / 2 + 1} y={GROUND_Y - h + (h - bodyH) * 0.56} width="4" height="2" fill={color} />
            <circle cx={x + w / 2 + 6} cy={GROUND_Y - h + (h - bodyH) * 0.75} r="2.5" fill="none" stroke={color} strokeWidth="1" />
          </>
        ) : (
          // A tapered spire cap — a triangular roofline with a center ridge
          // line (not a bare flat-shaded triangle) instead of a flat top,
          // reading as "spire" the way the antenna reads as "signal".
          <>
            <polygon points={`${x},${bodyY} ${x + w},${bodyY} ${x + w / 2},${GROUND_Y - h}`} fill="#0a0f1e" stroke={color} strokeWidth="1.5" />
            <line x1={x + w / 2} y1={bodyY} x2={x + w / 2} y2={GROUND_Y - h} stroke={color} strokeWidth="1" opacity="0.6" />
          </>
        )}
      </g>

      {windows.map((win, j) => (
        <rect
          key={j}
          x={x + win.x}
          y={bodyY + win.y}
          width="6"
          height="8"
          fill={color}
          opacity={win.brightness}
          style={win.brightness === 1 ? { filter: `drop-shadow(0 0 2px ${color})` } : undefined}
        />
      ))}

      <circle
        className="cc-pulse"
        cx={x + w / 2}
        cy={GROUND_Y - h - 6}
        r={shape === 'antenna' ? 3.5 : 4}
        fill={color}
        style={{ color }}
      />

      {/* Neon spill at this landmark's own base, now flush with GROUND_Y —
          same discrete-pool treatment as the regular buildings (narrow
          relative to the landmark's own width, light blur), in the
          landmark's own color. */}
      <ellipse cx={x + w / 2} cy={GROUND_Y} rx={w * 0.4} ry="4.5" fill={color} opacity="0.32" style={{ filter: 'blur(1.5px)' }} />
    </g>
  )
}

// Guardian HQ: a distinct, taller landmark tied to completing Guardian Mode
// (districts.communityCentre.guardianModeComplete) — a different, rarer
// unlock condition than the level-based LANDMARKS above, so it's kept
// deliberately separate rather than folded into that array. It renders from
// the very start, dark and unlit like an ordinary building silhouette, so
// there's something to notice long before it's earned; the moment Guardian
// Mode is completed it transitions (via the CSS `transition` below, not a
// one-off animation — the actual celebratory moment is the existing
// AchievementOverlay firing for the community-guardian badge) into a single
// continuously-lit beacon dome — CyberCity's rarest landmark, so its topper
// (a domed beacon housing on a collar, unlike either LANDMARKS silhouette)
// is deliberately the most distinct roofline of the three.
const GUARDIAN_HQ_LIT = 9

// Locked state gets none of the hover/focus tooltip wiring below — a
// not-yet-earned landmark shouldn't reveal its own name/unlock condition,
// only the existing dim silhouette + lock icon.
function GuardianHQ({ x, unlocked, onShowTooltip, onHideTooltip }) {
  const w = GUARDIAN_HQ_WIDTH
  const h = GUARDIAN_HQ_HEIGHT
  const bodyH = h * 0.82
  const bodyY = GROUND_Y - bodyH
  const collarY = bodyY - 5
  const domeBaseY = collarY - 4
  const topY = GROUND_Y - h
  const color = unlocked ? 'var(--cc-accent-2)' : '#24304d'
  const strokeWidth = unlocked ? 1.75 : 1
  const windows = scatteredWindows(919, GUARDIAN_HQ_LIT, w, bodyH)
  const label = 'Guardian HQ'
  const unlockText = 'Unlocked by completing Guardian Mode in the Community Centre'

  const interactiveProps = unlocked
    ? {
        tabIndex: 0,
        'aria-label': `${label} — ${unlockText}`,
        className: 'cursor-default outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--cc-accent-2)]',
        onMouseEnter: (e) => onShowTooltip(e, label, unlockText),
        onMouseLeave: onHideTooltip,
        onFocus: (e) => onShowTooltip(e, label, unlockText),
        onBlur: onHideTooltip,
      }
    : {}

  return (
    <g style={{ transition: 'opacity 900ms ease' }} {...interactiveProps}>
      <g style={unlocked ? { filter: 'drop-shadow(0 0 4px var(--cc-accent-2))' } : undefined}>
        <rect x={x} y={bodyY} width={w} height={bodyH} fill="#0a0f1e" stroke={color} strokeWidth={strokeWidth} style={{ transition: 'stroke 900ms ease' }} />
        {/* A short collar (cornice) leading into a domed beacon housing — a
            single continuous rounded roofline, not a second-tier box, so
            there's no seam between body and topper. */}
        <rect x={x - 2} y={collarY} width={w + 4} height="5" rx="1" fill="#0a0f1e" stroke={color} strokeWidth={strokeWidth} style={{ transition: 'stroke 900ms ease' }} />
        <path
          d={`M ${x + 3} ${domeBaseY} A ${(w - 6) / 2} ${domeBaseY - topY} 0 0 1 ${x + w - 3} ${domeBaseY} Z`}
          fill="#0a0f1e"
          stroke={color}
          strokeWidth={strokeWidth}
          style={{ transition: 'stroke 900ms ease' }}
        />
      </g>

      {unlocked &&
        windows.map((win, j) => (
          <rect
            key={j}
            x={x + win.x}
            y={bodyY + win.y}
            width="7"
            height="9"
            fill="var(--cc-accent-2)"
            opacity={win.brightness}
            style={win.brightness === 1 ? { filter: 'drop-shadow(0 0 2px var(--cc-accent-2))' } : undefined}
          />
        ))}

      {unlocked ? (
        <>
          <circle className="cc-pulse" cx={x + w / 2} cy={topY + 4} r="4" fill="var(--cc-accent-2)" style={{ color: 'var(--cc-accent-2)' }} />
          <ellipse cx={x + w / 2} cy={GROUND_Y} rx={w * 0.4} ry="4.5" fill="var(--cc-accent-2)" opacity="0.32" style={{ filter: 'blur(1.5px)' }} />
        </>
      ) : (
        <text x={x + w / 2} y={bodyY - 10} textAnchor="middle" fontSize="9" fill="#3a4568">
          🔒
        </text>
      )}
    </g>
  )
}

// A small glowing sign near the top of a building — dim/glitching at low
// resilience, fully lit and steady at high resilience, via the same
// continuous atmosphere parameter driving everything else.
function Billboard({ x, y, atmosphere, seed }) {
  const glitches = stableRandom(seed * 41 + 5) < atmosphere.flickerChance
  return (
    <g
      className={glitches ? 'cc-billboard-glitch' : undefined}
      style={{ opacity: atmosphere.billboardOpacity, animationDelay: glitches ? `${stableRandom(seed * 23) * 3}s` : undefined }}
    >
      <rect x={x - 9} y={y} width="18" height="9" rx="1" fill="var(--cc-accent-2)" opacity="0.22" />
      <rect x={x - 9} y={y} width="18" height="9" rx="1" fill="none" stroke="var(--cc-accent-2)" strokeWidth="0.75" />
      <rect x={x - 6} y={y + 3} width="12" height="2.5" fill="var(--cc-accent-2)" />
    </g>
  )
}

// A small hover/focus tooltip — the same name/resilience/missions-remaining
// facts already available via this building's own aria-label, surfaced
// right at the point of interaction instead of requiring a click to find
// out what a building represents.
function BuildingTooltip({ name, resilience, missionsLeft, locked }) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[160px] rounded-lg px-2.5 py-1.5 text-center opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 z-10"
      style={{ background: 'var(--cc-bg-alt)', border: '1px solid var(--cc-panel-border)', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
    >
      <p className="text-xs font-semibold m-0">{name}</p>
      {locked ? (
        <p className="text-[10px] text-[var(--cc-text-dim)] m-0">Locked</p>
      ) : (
        <>
          <p className="text-[10px] text-[var(--cc-text-dim)] m-0">Resilience: {resilience}%</p>
          <p className="text-[10px] text-[var(--cc-text-dim)] m-0">
            {missionsLeft > 0 ? `${missionsLeft} mission${missionsLeft === 1 ? '' : 's'} remaining` : 'All missions complete'}
          </p>
        </>
      )}
    </div>
  )
}

function DistrictBuilding({ icon, name, to, resilience, missionsLeft, locked, interactive = true }) {
  const litFraction = locked ? 0 : resilience / 100

  const body = (
    <div className="flex flex-col items-center gap-1.5">
      <p className="text-[11px] sm:text-xs font-semibold text-center m-0 leading-tight max-w-[90px]" style={{ color: locked ? 'var(--cc-text-dim)' : 'var(--cc-text)' }}>
        {locked && <span aria-hidden="true">🔒 </span>}
        <span aria-hidden="true">{icon}</span> {name}
      </p>
      <CityTower
        fillFraction={litFraction}
        color="var(--cc-accent)"
        width={82}
        minHeight={76}
        maxHeight={140}
        windowCount={WINDOW_COUNT}
        grayscale={locked}
      />
      <p className="text-[10px] text-[var(--cc-text-dim)] m-0">{locked ? 'Locked' : `${resilience}%`}</p>
    </div>
  )

  if (locked) {
    return (
      <div aria-disabled="true" aria-label={`${name}, locked`} className="group relative cursor-not-allowed opacity-80">
        <BuildingTooltip name={name} locked />
        {body}
      </div>
    )
  }

  if (!interactive) {
    return <div className="relative">{body}</div>
  }

  return (
    <Link
      to={to}
      className="group relative no-underline rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--cc-accent)]"
      aria-label={`Enter ${name} — resilience ${resilience}%, ${missionsLeft} mission${missionsLeft === 1 ? '' : 's'} remaining`}
    >
      <BuildingTooltip name={name} resilience={resilience} missionsLeft={missionsLeft} />
      {body}
    </Link>
  )
}
