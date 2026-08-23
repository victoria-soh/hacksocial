import { Link } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import { unlockedLandmarkIds } from '../../data/levels'
import { isDefencePlanUnlocked } from '../../lib/defencePlan'
import CityGraphic from './CityGraphic'
import DistrictCard from './DistrictCard'
import DailyStreak from './DailyStreak'
import BonusRound from './BonusRound'
import BadgesPanel from './BadgesPanel'
import ComparisonPanel from './ComparisonPanel'
import SyncPanel from './SyncPanel'
import Panel from '../shared/Panel'
import LevelProgressBar from '../shared/LevelProgressBar'

export default function CityDashboard() {
  const { districts, overallResilience, xp, state, capstoneUnlocked, capstone } = useGame()
  const planUnlocked = isDefencePlanUnlocked(state)

  const rows = [
    { icon: '🔎', name: 'Digital Breadcrumbs', resilience: districts.breadcrumbs.resilience, locked: false },
    { icon: '🚨', name: 'Recovery Rush', resilience: districts.recoveryRush.resilience, locked: false },
    { icon: '🛡️', name: 'Community Centre', resilience: districts.communityCentre.resilience, locked: !districts.communityCentre.unlocked },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">CyberCity Overview</h1>
        <p className="text-[var(--cc-text-dim)] m-0">Overall city resilience: {overallResilience}%</p>
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

      <CityGraphic overallResilience={overallResilience} districts={districts} unlockedLandmarkIds={unlockedLandmarkIds(xp)} />

      {/* Plain text/list view of the exact same information the city graphic represents. */}
      <Panel as="section" aria-labelledby="resilience-table-heading">
        <h2 id="resilience-table-heading" className="text-base font-semibold mt-0 mb-3">
          District resilience (plain-text view)
        </h2>
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          <li className="flex justify-between border-b border-[var(--cc-panel-border)] pb-2">
            <span>Overall city resilience</span>
            <strong>{overallResilience}%</strong>
          </li>
          {rows.map((r) => (
            <li key={r.name} className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                <span aria-hidden="true">{r.icon}</span>
                {r.name}
                {r.locked && <span className="text-xs text-[var(--cc-text-dim)]">(locked)</span>}
              </span>
              <strong>{r.locked ? '—' : `${r.resilience}%`}</strong>
            </li>
          ))}
        </ul>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <DistrictCard
          icon="🔎"
          name="Digital Breadcrumbs"
          blurb="Find out what your online footprint reveals about you."
          resilience={districts.breadcrumbs.resilience}
          to="/breadcrumbs"
        />
        <DistrictCard
          icon="🚨"
          name="Recovery Rush"
          blurb="Contain an account compromise before the clock runs out."
          resilience={districts.recoveryRush.resilience}
          to="/recovery-rush"
        />
        <DistrictCard
          icon="🛡️"
          name="Community Centre"
          blurb="Help someone less tech-confident stay safe."
          resilience={districts.communityCentre.resilience}
          to="/community-centre"
          locked={!districts.communityCentre.unlocked}
        />
      </div>

      <Panel>
        <LevelProgressBar xp={xp} variant="full" />
      </Panel>

      <Panel className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
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
      <BadgesPanel />
      <ComparisonPanel />
      <SyncPanel />
    </div>
  )
}
