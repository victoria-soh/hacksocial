import { Link } from 'react-router-dom'
import { RECOVERY_LEVELS } from '../../data/recoveryRush'
import { STATUS_META } from './BlastRadiusDiagram'
import { isRecoveryLevelUnlocked, requiredLevelForRecoveryLevel } from '../../data/levels'
import { useGame } from '../../state/GameContext'
import { scoreTierColor, responseReadinessLabel } from '../../lib/scoring'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import CityTower from '../shared/CityTower'

// A scenario's graph never has more accounts than Email Compromise
// Cascade's 5 — that's the natural ceiling for "how many accounts can one
// incident threaten" in this app, so it's used as the pip row's fixed
// maximum rather than an arbitrary round number.
const THREAT_PIP_MAX = 5

const DIFFICULTY_LABELS = { 1: 'Beginner', 2: 'Advanced' }

// Honestly future content, not achievable unlocks — see UpcomingIncidentCard,
// which deliberately renders with no CTA, no threat data, and no "Unlocks
// at Level N" language a player could work toward.
const UPCOMING_INCIDENTS = [
  { icon: '🔒', name: 'Lost Phone' },
  { icon: '🔒', name: 'SIM Swap Attack' },
  { icon: '🔒', name: 'Ransomware Response' },
]

function ThreatPips({ count, max = THREAT_PIP_MAX }) {
  return (
    <span className="inline-flex items-center gap-1" role="img" aria-label={`Threat level ${count} of ${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="inline-block rounded-full"
          style={{
            width: 7,
            height: 7,
            background: i < count ? 'var(--cc-danger)' : 'transparent',
            border: `1px solid ${i < count ? 'var(--cc-danger)' : 'var(--cc-panel-border)'}`,
            boxShadow: i < count ? '0 0 4px var(--cc-danger)' : 'none',
          }}
        />
      ))}
    </span>
  )
}

// A small, static preview of who's involved in this incident — built from
// the exact same CityTower asset and STATUS_META colors the live gameplay
// screen's BlastRadiusDiagram uses, not new art. Shows the root account
// (compromised, red) alone when it only threatens one other account
// (Level 1's framing as a single-account takeover), or branching to every
// account it directly threatens once there are two or more (Level 2's
// cascade) — the same distinction the scenario names themselves draw.
function IncidentPreview({ level }) {
  const root = level.graph.nodes.find((n) => n.id === level.rootId)
  const childIds = level.graph.edges.filter((e) => e.from === level.rootId).map((e) => e.to)
  const children = childIds.map((id) => level.graph.nodes.find((n) => n.id === id)).filter(Boolean)
  const isCascade = children.length >= 2

  const label = isCascade
    ? `${root.label} compromised, threatening ${children.map((c) => c.label).join(', ')}`
    : `${root.label} compromised`

  return (
    <div className="flex items-center gap-2" role="img" aria-label={label}>
      <div className="flex flex-col items-center gap-1">
        <CityTower
          fillFraction={STATUS_META.compromised.fill}
          color={STATUS_META.compromised.color}
          width={28}
          minHeight={24}
          maxHeight={36}
          windowCount={4}
          windowCols={2}
        />
        <span className="text-[10px] leading-none">{root.icon}</span>
      </div>
      {isCascade && (
        <>
          <span className="text-[var(--cc-text-dim)] text-xs">→</span>
          <div className="flex gap-1.5">
            {children.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <CityTower
                  fillFraction={STATUS_META['at-risk'].fill}
                  color={STATUS_META['at-risk'].color}
                  width={20}
                  minHeight={18}
                  maxHeight={28}
                  windowCount={4}
                  windowCols={2}
                />
                <span className="text-[9px] leading-none">{c.icon}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Minimal tactical map motif sitting behind the incident cards' gutters —
// pure decoration, so it's absolutely positioned behind opaque Panel cards
// and never competes with their content. Reuses the app's existing
// `cc-pulse` glow-pulse utility (already respects prefers-reduced-motion)
// rather than inventing a new animation.
function TacticalMapBackdrop() {
  const nodes = [
    { x: 6, y: 10 }, { x: 28, y: 4 }, { x: 52, y: 16 }, { x: 76, y: 6 },
    { x: 94, y: 26 }, { x: 14, y: 52 }, { x: 42, y: 68 }, { x: 68, y: 58 },
    { x: 88, y: 78 }, { x: 22, y: 90 },
  ]
  const edges = [
    [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [2, 6],
  ]
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x}
          y1={nodes[a].y}
          x2={nodes[b].x}
          y2={nodes[b].y}
          stroke="var(--cc-accent)"
          strokeWidth="0.2"
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n.x}
          cy={n.y}
          r="0.9"
          fill="var(--cc-accent)"
          className="cc-pulse"
          style={{ animationDelay: `${(i % 5) * 0.4}s` }}
        />
      ))}
    </svg>
  )
}

// Mirrors the dashboard's Next Mission pattern (CityDashboard.jsx's
// computeNextMission) but scoped to this district's own two real incident
// types: recommends whichever unlocked scenario currently has the lower
// best score, so this page also has one clear next action, not two
// equally-weighted cards. Returns null once nothing unlocked is left to
// improve (a perfect 100 on the weakest one).
function computeRecommendedResponse(levels, completed, xp) {
  const eligible = levels.filter((l) => isRecoveryLevelUnlocked(xp, l.id))
  if (eligible.length === 0) return null
  const weakest = eligible.reduce((min, l) => {
    const score = completed[l.id]?.score ?? 0
    const minScore = completed[min.id]?.score ?? 0
    return score < minScore ? l : min
  }, eligible[0])
  const score = completed[weakest.id]?.score ?? 0
  if (score >= 100) return null
  return { level: weakest, score, attempted: Boolean(completed[weakest.id]) }
}

function IncidentCard({ level, index, result, unlocked, gate }) {
  const threatCount = Math.min(THREAT_PIP_MAX, level.graph.nodes.length)
  const difficultyLabel = DIFFICULTY_LABELS[level.difficultyStars] ?? `Tier ${level.difficultyStars}`
  const cta = result ? 'Redeploy' : 'Respond'

  const body = (
    <Panel className={`h-full flex flex-col gap-3 ${!unlocked ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="cc-chrome text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--cc-text-dim)' }}>
          Incident #{String(index).padStart(2, '0')}
        </span>
        <ThreatPips count={threatCount} />
      </div>

      <div>
        <h2 className="text-lg font-bold mt-0 mb-1 flex items-center gap-2">
          {level.name} {!unlocked && <span aria-hidden="true">🔒</span>}
        </h2>
        <p className="text-xs text-[var(--cc-text-dim)] m-0">
          {'⭐'.repeat(level.difficultyStars)} {difficultyLabel}
        </p>
      </div>

      <p className="text-sm text-[var(--cc-text-dim)] m-0">{level.openingAlert}</p>

      <IncidentPreview level={level} />

      {unlocked ? (
        result ? (
          <p className="text-sm font-semibold m-0" style={{ color: scoreTierColor(result.score) }}>
            {result.score}/100 · Response Readiness: {responseReadinessLabel(result.score)}
          </p>
        ) : (
          <p className="text-sm text-[var(--cc-text-dim)] m-0">Not yet responded to.</p>
        )
      ) : (
        <p className="text-xs text-[var(--cc-text-dim)] m-0">
          Unlocks at Level {gate?.level} ({gate?.name}).
        </p>
      )}

      <p className="text-xs text-[var(--cc-text-dim)] m-0">
        {result ? 'Improving' : 'Responding to'} this incident's score raises the district's overall resilience.
      </p>

      {unlocked && (
        <span
          className="mt-auto self-end text-sm font-semibold group-hover:underline underline-offset-2"
          style={{ color: 'var(--cc-accent)' }}
          aria-hidden="true"
        >
          {cta} →
        </span>
      )}
    </Panel>
  )

  if (!unlocked) return body

  return (
    <Link
      to={`/recovery-rush/${level.id}`}
      className="no-underline text-inherit block h-full group"
      aria-label={`${level.name} — threat level ${threatCount} of ${THREAT_PIP_MAX}, ${difficultyLabel} difficulty. ${
        result
          ? `Response readiness ${result.score} of 100, ${responseReadinessLabel(result.score)}.`
          : 'Not yet responded to.'
      } ${cta} to this incident.`}
    >
      {body}
    </Link>
  )
}

function UpcomingIncidentCard({ incident, index }) {
  return (
    <Panel className="h-full flex flex-col gap-2 opacity-60 grayscale">
      <span className="cc-chrome text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--cc-text-dim)' }}>
        Incident #{String(index).padStart(2, '0')}
      </span>
      <h2 className="text-lg font-bold m-0">
        {incident.icon} {incident.name} — coming soon
      </h2>
      <p className="text-sm text-[var(--cc-text-dim)] m-0">
        This incident type is planned for a future CyberCity update — not yet playable.
      </p>
    </Panel>
  )
}

export default function RecoveryRushHub() {
  const { districts, xp } = useGame()
  const completed = districts.recoveryRush.levelsComplete
  const resilience = districts.recoveryRush.resilience
  const levels = RECOVERY_LEVELS.filter((level) => !level.hidden)
  const recommended = computeRecommendedResponse(levels, completed, xp)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] m-0 mb-1" style={{ color: 'var(--cc-accent)' }}>
          CyberCity // Incident Response District
        </p>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">🚨</span> Recovery Rush
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">Active simulations from CyberCity Emergency Response.</p>
      </div>

      <Panel className="flex items-center gap-4" brackets={false}>
        <CityTower
          fillFraction={resilience / 100}
          color="var(--cc-accent)"
          width={56}
          minHeight={48}
          maxHeight={88}
          windowCount={6}
          windowCols={2}
        />
        <div className="flex-1">
          <ProgressBar label="District Resilience" value={resilience} color="var(--cc-accent)" />
          <p className="text-xs text-[var(--cc-text-dim)] m-0 mt-1">Built from your best incident-response scores.</p>
        </div>
      </Panel>

      {/* The one recommended action for this district — mirrors the
          dashboard's Next Mission card so "what should I train on" always
          reads the same way across the app. */}
      {recommended && (
        <Link
          to={`/recovery-rush/${recommended.level.id}`}
          className="cc-hud-panel no-underline relative block rounded-2xl p-5 border"
          style={{ background: 'var(--cc-panel)', borderColor: 'var(--cc-accent)', boxShadow: 'var(--cc-glow-cyan)' }}
        >
          <span className="cc-hud-bracket cc-hud-bracket--tl" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--tr" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--bl" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--br" aria-hidden="true" />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="cc-chrome text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent)' }}>
                🎯 Recommended Response Training
              </p>
              <h2 className="text-lg font-bold mt-0.5 mb-1" style={{ color: 'var(--cc-text)' }}>
                Your weakest incident type is {recommended.level.name}
              </h2>
              <p className="text-sm text-[var(--cc-text-dim)] m-0">
                {recommended.attempted
                  ? `Best response readiness: ${recommended.score}/100 — improving this score raises district resilience.`
                  : "Not yet responded to — this incident is currently dragging down district resilience."}
              </p>
            </div>
            <span
              className="shrink-0 px-4 py-2.5 rounded-lg font-semibold"
              style={{ background: 'var(--cc-accent)', color: '#06111c' }}
            >
              {recommended.attempted ? 'Redeploy' : 'Respond'} →
            </span>
          </div>
        </Link>
      )}

      <div className="relative">
        <TacticalMapBackdrop />
        <div className="relative grid gap-4 sm:grid-cols-2">
          {levels.map((level, i) => {
            const result = completed[level.id]
            const unlocked = isRecoveryLevelUnlocked(xp, level.id)
            const gate = unlocked ? null : requiredLevelForRecoveryLevel(level.id)
            return (
              <IncidentCard key={level.id} level={level} index={i + 1} result={result} unlocked={unlocked} gate={gate} />
            )
          })}
          {UPCOMING_INCIDENTS.map((incident, i) => (
            <UpcomingIncidentCard key={incident.name} incident={incident} index={levels.length + i + 1} />
          ))}
        </div>
      </div>
    </div>
  )
}
