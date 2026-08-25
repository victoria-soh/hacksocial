import { Link } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import { unlockedLandmarkIds } from '../../data/levels'
import { isDefencePlanUnlocked } from '../../lib/defencePlan'
import CityGraphic from './CityGraphic'
import DistrictCard from './DistrictCard'
import DailyStreak from './DailyStreak'
import BonusRound from './BonusRound'
import BadgesSummary from './BadgesSummary'
import ComparisonPanel from './ComparisonPanel'
import SyncPanel from './SyncPanel'
import Panel from '../shared/Panel'
import Disclosure from '../shared/Disclosure'

const DISTRICT_META = {
  breadcrumbs: {
    icon: '🔎',
    name: 'Digital Breadcrumbs',
    to: '/breadcrumbs',
    weakness: 'your digital-footprint awareness',
    cta: 'Investigate Digital Breadcrumbs',
  },
  recoveryRush: {
    icon: '🚨',
    name: 'Recovery Rush',
    to: '/recovery-rush',
    weakness: 'your incident-response skills',
    cta: 'Deploy to Recovery Rush',
  },
  communityCentre: {
    icon: '🛡️',
    name: 'Community Centre',
    to: '/community-centre',
    weakness: 'your ability to help others stay safe',
    cta: 'Help at Community Centre',
  },
}

// The one recommended action for the page: whichever UNLOCKED district is
// currently CyberCity's weakest defence. Returns null once every unlocked
// district is already at 100% — nothing left to recommend.
function computeNextMission(districts) {
  const eligible = ['breadcrumbs', 'recoveryRush', 'communityCentre'].filter(
    (key) => key !== 'communityCentre' || districts.communityCentre.unlocked,
  )
  const weakestKey = eligible.reduce((min, key) => (districts[key].resilience < districts[min].resilience ? key : min), eligible[0])
  if (districts[weakestKey].resilience >= 100) return null
  return { key: weakestKey, resilience: districts[weakestKey].resilience, ...DISTRICT_META[weakestKey] }
}

// Collapsed by default — utility features (comparing resilience with a
// friend, syncing progress across devices) that shouldn't carry the same
// visual weight as the city, missions, and core progression content above.
// The revealed panels are grouped inside one brackets-free housing Panel so
// this reads as one cohesive section rather than two panels that happened
// to land under the toggle.
function MoreOptions({ children }) {
  return (
    <Disclosure label="More Options">
      <Panel brackets={false} className="flex flex-col gap-4">
        {children}
      </Panel>
    </Disclosure>
  )
}

export default function CityDashboard() {
  const { districts, overallResilience, xp, state, capstoneUnlocked, capstone } = useGame()
  const planUnlocked = isDefencePlanUnlocked(state)
  const nextMission = computeNextMission(districts)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">CyberCity Overview</h1>
        <p className="text-[var(--cc-text-dim)] m-0">The city banner below shows your overall resilience — the district buildings show each area's own.</p>
      </div>

      {capstoneUnlocked && (
        <Link
          to="/final-challenge"
          className="cc-hud-panel no-underline relative block rounded-2xl p-5 border cc-final-challenge-panel"
          style={{ background: 'var(--cc-panel)', borderColor: 'var(--cc-accent-2)', boxShadow: 'var(--cc-glow-magenta)' }}
        >
          <span className="cc-hud-bracket cc-hud-bracket--tl" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--tr" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--bl" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--br" aria-hidden="true" />
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="cc-chrome text-xs uppercase tracking-wide m-0" style={{ color: 'var(--cc-accent-2)' }}>
                🎓 The Final Challenge
              </p>
              <h2 className="text-lg font-bold mt-0.5 mb-1" style={{ color: 'var(--cc-text)' }}>
                Cyber Guardian Certification
              </h2>
              <p className="text-sm text-[var(--cc-text-dim)] m-0">
                {capstone.complete
                  ? `Certified: ${capstone.certificationTitle} (${capstone.finalScore}/100) — try again for a higher score.`
                  : "You've completed every district — take the capstone challenge that ties it all together."}
              </p>
            </div>
            <span
              className="shrink-0 px-4 py-2.5 rounded-lg font-semibold"
              style={{ background: 'var(--cc-accent-2)', color: '#1a0420' }}
            >
              {capstone.complete ? 'Play again' : 'Begin →'}
            </span>
          </div>
        </Link>
      )}

      {/* The one recommended action — more visually prominent than the grid
          of secondary actions further down, since "what should I do next"
          should have one clear answer, not five equally-weighted options. */}
      {nextMission && (
        <Link
          to={nextMission.to}
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
                🎯 Next Mission
              </p>
              <h2 className="text-lg font-bold mt-0.5 mb-1" style={{ color: 'var(--cc-text)' }}>
                {nextMission.icon} {nextMission.name} resilience: {nextMission.resilience}%
              </h2>
              <p className="text-sm text-[var(--cc-text-dim)] m-0">
                {nextMission.weakness.charAt(0).toUpperCase() + nextMission.weakness.slice(1)} — currently CyberCity's
                weakest defence.
              </p>
            </div>
            <span
              className="shrink-0 px-4 py-2.5 rounded-lg font-semibold"
              style={{ background: 'var(--cc-accent)', color: '#06111c' }}
            >
              {nextMission.cta} →
            </span>
          </div>
        </Link>
      )}

      <CityGraphic overallResilience={overallResilience} districts={districts} unlockedLandmarkIds={unlockedLandmarkIds(xp)} />

      <div className="grid gap-4 sm:grid-cols-3">
        <DistrictCard
          icon="🔎"
          name="Digital Breadcrumbs"
          blurb="Find out what your online footprint reveals about you."
          to="/breadcrumbs"
        />
        <DistrictCard
          icon="🚨"
          name="Recovery Rush"
          blurb="Contain an account compromise before the clock runs out."
          to="/recovery-rush"
        />
        <DistrictCard
          icon="🛡️"
          name="Community Centre"
          blurb="Help someone less tech-confident stay safe."
          to="/community-centre"
          locked={!districts.communityCentre.unlocked}
        />
      </div>

      {/* Secondary actions — a 2x2 grid instead of separate full-width
          strips, since none of these need to compete with Next Mission
          above for attention. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between h-full">
          <div>
            <h2 className="text-base font-semibold mt-0 mb-1 flex items-center gap-2">
              <span aria-hidden="true">📄</span> Defence Plan {!planUnlocked && <span aria-hidden="true">🔒</span>}
            </h2>
            <p className="text-sm text-[var(--cc-text-dim)] m-0">
              {planUnlocked
                ? 'A real, one-page summary of your privacy score and recovery results — export or print it.'
                : 'Complete Find Alex, scan your Privacy Defence Score, and finish a Recovery Rush scenario to unlock this.'}
            </p>
          </div>
          {planUnlocked ? (
            <Link
              to="/defence-plan"
              className="no-underline text-center px-4 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 flex items-center justify-center shrink-0"
            >
              View Defence Plan
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="text-center px-4 py-2.5 rounded-lg border border-[var(--cc-panel-border)] text-[var(--cc-text-dim)] min-h-11 flex items-center justify-center shrink-0"
            >
              Locked
            </span>
          )}
        </Panel>

        <DailyStreak />
        <BonusRound />
        <BadgesSummary />
      </div>

      <MoreOptions>
        <ComparisonPanel />
        <SyncPanel />
      </MoreOptions>
    </div>
  )
}
