import { useEffect, useRef } from 'react'
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
const BASE_WIDTH = 520
const LANDMARK_SLOT_WIDTH = 65
const WINDOW_COUNT = 9
const MAX_CITIZEN_SPRITES = 5
const GUARDIAN_HQ_WIDTH = 50
const GUARDIAN_HQ_HEIGHT = 205

// Tier 2: three depth layers instead of one flat skyline. Far is distant/
// cool/minimal (barely more than a silhouette); mid is the original
// skyline; near is closer, taller, and framed at the outer edges so it
// never competes with the interactive district buildings sitting front-
// and-center below. Each layer gets its own parallax rate (see
// PARALLAX_FACTORS) and its own window tone.
const LAYER_FAR = [
  { x: 0, w: 30, h: 46 },
  { x: 34, w: 24, h: 60 },
  { x: 64, w: 32, h: 40 },
  { x: 128, w: 26, h: 55 },
  { x: 160, w: 38, h: 36 },
  { x: 255, w: 28, h: 50 },
  { x: 298, w: 42, h: 38 },
  { x: 378, w: 28, h: 54 },
  { x: 418, w: 46, h: 40 },
  { x: 478, w: 32, h: 56 },
]

const LAYER_MID = [
  { x: 10, w: 40, h: 90, lit: 3 },
  { x: 55, w: 55, h: 130, lit: 5 },
  { x: 115, w: 35, h: 70, lit: 2 },
  { x: 155, w: 50, h: 150, lit: 6, billboard: true },
  { x: 210, w: 40, h: 100, lit: 4 },
  { x: 255, w: 60, h: 160, lit: 7 },
  { x: 320, w: 45, h: 85, lit: 3 },
  { x: 370, w: 50, h: 120, lit: 5, billboard: true },
  { x: 425, w: 35, h: 75, lit: 2 },
  { x: 465, w: 55, h: 140, lit: 6 },
]

const LAYER_NEAR = [
  { x: -25, w: 65, h: 168, lit: 4 },
  { x: 42, w: 42, h: 138, lit: 3 },
  { x: 498, w: 48, h: 158, lit: 4 },
  { x: 548, w: 58, h: 132, lit: 3 },
]

const PARALLAX_FACTORS = { far: 2.5, mid: 5, near: 10 }

// Level-up landmarks (see data/levels.js's unlockType: 'landmark' entries).
// Each unlocked landmark appends its own extra slot to the skyline rather
// than replacing anything — a visible, permanent record of level progress,
// not just a bigger number.
const LANDMARKS = [
  { id: 'signal-tower', label: 'Signal Tower', w: 34, h: 175, lit: 5 },
  { id: 'guardian-spire', label: 'Guardian Spire', w: 34, h: 200, lit: 8 },
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

/** Decorative-only; per-district resilience is also exposed via each district building's aria-label below. */
export default function CityGraphic({ overallResilience, districts, unlockedLandmarkIds = [] }) {
  const containerRef = useRef(null)
  useParallax(containerRef)

  const atmosphere = computeCityAtmosphere(overallResilience)
  const isProtected = overallResilience >= PROTECTED_THRESHOLD
  const landmarks = LANDMARKS.filter((l) => unlockedLandmarkIds.includes(l.id))
  // Guardian HQ always reserves its slot (visible from the start, dark and
  // inactive) — see the Guardian HQ block below for why it renders even
  // before it's earned, unlike the level-gated LANDMARKS above.
  const totalWidth = BASE_WIDTH + landmarks.length * LANDMARK_SLOT_WIDTH + GUARDIAN_HQ_WIDTH
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
        style={{
          filter: `saturate(${atmosphere.neonSaturation}) brightness(${atmosphere.neonBrightness}) drop-shadow(0 0 ${atmosphere.glowStrength}px ${glowColor})`,
          transition: 'filter 700ms ease',
        }}
      >
        <svg
          viewBox={`0 0 ${totalWidth} 200`}
          className="w-full h-auto block"
          role="presentation"
          style={{ filter: `blur(${atmosphere.skylineBlur}px)`, transition: 'filter 700ms ease' }}
        >
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#131c38" />
              <stop offset="100%" stopColor="#2a1f4d" />
            </linearGradient>
          </defs>
          <rect width={totalWidth} height="200" fill="url(#sky)" />
          <circle cx="450" cy="35" r="18" fill="#ffe9a8" opacity="0.9" />

          {/* Far layer: distant, cool-toned, barely-detailed silhouettes. Moves least. */}
          <g
            style={{
              transform: `translateX(calc(var(--parallax-x, 0) * ${PARALLAX_FACTORS.far}px))`,
              transition: 'transform 150ms ease-out',
            }}
          >
            {LAYER_FAR.map((b, i) => (
              <rect key={i} x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="#1a2440" opacity="0.75" />
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
                <rect x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="#0a0f1e" stroke="#24304d" />
                {Array.from({ length: b.lit }).map((_, j) => {
                  const seed = i * 31 + j * 7 + 11
                  const flickers = stableRandom(seed) < atmosphere.flickerChance
                  const twinkles = !flickers && stableRandom(seed + 500) < 0.18
                  return (
                    <rect
                      key={j}
                      className={flickers ? 'cc-window-flicker' : twinkles ? 'cc-window-twinkle' : undefined}
                      x={b.x + 6 + (j % 3) * (b.w / 3.4)}
                      y={200 - b.h + 12 + Math.floor(j / 3) * 18}
                      width="6"
                      height="8"
                      fill={windowFill}
                      opacity="0.9"
                      style={
                        flickers || twinkles
                          ? { animationDelay: `${stableRandom(seed + (flickers ? 0 : 1000)) * 4}s` }
                          : undefined
                      }
                    />
                  )
                })}
                {b.billboard && <Billboard x={b.x + b.w / 2} y={200 - b.h + 6} atmosphere={atmosphere} seed={i} />}
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
                <rect x={b.x} y={200 - b.h} width={b.w} height={b.h} fill="#060910" stroke="#2f3d5f" strokeWidth="1.25" />
                {Array.from({ length: b.lit }).map((_, j) => {
                  const seed = i * 53 + j * 5 + 900
                  const flickers = stableRandom(seed) < atmosphere.flickerChance
                  const twinkles = !flickers && stableRandom(seed + 500) < 0.22
                  return (
                    <rect
                      key={j}
                      className={flickers ? 'cc-window-flicker' : twinkles ? 'cc-window-twinkle' : undefined}
                      x={b.x + 7 + (j % 2) * (b.w / 2.3)}
                      y={200 - b.h + 16 + Math.floor(j / 2) * 22}
                      width="8"
                      height="11"
                      fill={windowFill}
                      opacity="0.95"
                      style={{
                        filter: `drop-shadow(0 0 3px ${windowFill})`,
                        animationDelay: flickers || twinkles ? `${stableRandom(seed + 1000) * 4}s` : undefined,
                      }}
                    />
                  )
                })}
              </g>
            ))}
          </g>

          {landmarks.map((l, i) => {
            const x = BASE_WIDTH + i * LANDMARK_SLOT_WIDTH + 8
            return (
              <g key={l.id}>
                <rect x={x} y={200 - l.h} width={l.w} height={l.h} fill="#0a0f1e" stroke="var(--cc-accent-2)" strokeWidth="1.5" />
                <circle
                  className="cc-pulse"
                  cx={x + l.w / 2}
                  cy={200 - l.h - 7}
                  r="4"
                  fill="var(--cc-accent-2)"
                  style={{ color: 'var(--cc-accent-2)' }}
                />
                {Array.from({ length: l.lit }).map((_, j) => (
                  <rect
                    key={j}
                    x={x + 5 + (j % 2) * (l.w / 2.2)}
                    y={200 - l.h + 14 + Math.floor(j / 2) * 18}
                    width="6"
                    height="8"
                    fill="var(--cc-accent-2)"
                    opacity="0.9"
                  />
                ))}
              </g>
            )
          })}

          <GuardianHQ x={totalWidth - GUARDIAN_HQ_WIDTH} unlocked={guardianUnlocked} />

          <CityDrones atmosphere={atmosphere} totalWidth={totalWidth} />

          <rect x="0" y="190" width={totalWidth} height="10" fill="#05070e" />
        </svg>

        <CityGridFloor />
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
          />
        ))}
      </div>
    </div>
  )
}

// Guardian HQ: a distinct, taller, two-tier landmark tied to completing
// Guardian Mode (districts.communityCentre.guardianModeComplete) — a
// different, rarer unlock condition than the level-based LANDMARKS above,
// so it's kept deliberately separate rather than folded into that array.
// It renders from the very start, dark and unlit like an ordinary building
// silhouette, so there's something to notice long before it's earned; the
// moment Guardian Mode is completed it transitions (via the CSS
// `transition` below, not a one-off animation — the actual celebratory
// moment is the existing AchievementOverlay firing for the
// community-guardian badge) into a lit, glowing two-color beacon that
// stays that way permanently, visually distinct from every other building.
function GuardianHQ({ x, unlocked }) {
  const w = GUARDIAN_HQ_WIDTH
  const h = GUARDIAN_HQ_HEIGHT
  const baseH = h * 0.62
  const spireW = w * 0.55
  const spireX = x + (w - spireW) / 2

  return (
    <g style={{ transition: 'opacity 900ms ease' }}>
      <rect
        x={x}
        y={200 - baseH}
        width={w}
        height={baseH}
        fill="#0a0f1e"
        stroke={unlocked ? 'var(--cc-accent)' : '#24304d'}
        strokeWidth={unlocked ? 1.75 : 1}
        style={{ transition: 'stroke 900ms ease' }}
      />
      <rect
        x={spireX}
        y={200 - h}
        width={spireW}
        height={h - baseH}
        fill="#0a0f1e"
        stroke={unlocked ? 'var(--cc-accent-2)' : '#24304d'}
        strokeWidth={unlocked ? 1.75 : 1}
        style={{ transition: 'stroke 900ms ease' }}
      />
      {unlocked ? (
        <>
          <circle className="cc-pulse" cx={spireX + spireW / 2} cy={200 - h - 8} r="5" fill="var(--cc-accent-2)" style={{ color: 'var(--cc-accent-2)' }} />
          {[0, 1, 2].map((row) => (
            <g key={row}>
              <rect x={x + 6} y={200 - baseH + 12 + row * 20} width="7" height="9" fill="var(--cc-accent)" opacity="0.9" />
              <rect x={x + w - 13} y={200 - baseH + 12 + row * 20} width="7" height="9" fill="var(--cc-accent)" opacity="0.9" />
            </g>
          ))}
          {[0, 1].map((row) => (
            <rect key={row} x={spireX + spireW / 2 - 3.5} y={200 - h + 16 + row * 20} width="7" height="9" fill="var(--cc-accent-2)" opacity="0.9" />
          ))}
        </>
      ) : (
        <text x={x + w / 2} y={200 - baseH - 10} textAnchor="middle" fontSize="9" fill="#3a4568">
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

function DistrictBuilding({ icon, name, to, resilience, missionsLeft, locked }) {
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
