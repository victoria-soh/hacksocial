import { Link } from 'react-router-dom'
import { RESIDENTS } from '../../data/communityCentre'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import CityTower from '../shared/CityTower'

// Same Low/Medium/High -> good/warn/danger color language used everywhere
// else in the app (see Privacy Mirror's risk levels) — reused here for each
// resident's threat-level badge, not reinvented.
const THREAT_LEVEL_COLOR = { Low: 'var(--cc-good)', Medium: 'var(--cc-warn)', High: 'var(--cc-danger)' }

function ResidentCard({ resident, progress }) {
  const accent = resident.accentColor
  const levelColor = THREAT_LEVEL_COLOR[resident.threatLevel] ?? 'var(--cc-text-dim)'
  const complete = Boolean(progress?.complete)

  return (
    <Link
      to={`/community-centre/${resident.id}`}
      className="no-underline text-inherit block h-full group"
      aria-label={`${resident.name} — ${resident.threatCategory}, ${complete ? `protected, score ${progress.score}` : 'needs help'}. ${complete ? 'Replay' : 'Enter'} mission.`}
    >
      <Panel
        className="h-full flex flex-col gap-3 transition-colors"
        style={{ borderColor: `color-mix(in srgb, ${accent} 45%, var(--cc-panel-border))` }}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={{ color: accent, border: `1px solid ${accent}`, background: `color-mix(in srgb, ${accent} 14%, transparent)` }}
          >
            {resident.threatCategory}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: levelColor }}>
            {resident.threatLevel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className="text-2xl w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ border: `1px solid ${accent}`, boxShadow: `0 0 10px -1px ${accent}` }}
            aria-hidden="true"
          >
            {resident.icon}
          </span>
          <h2 className="text-base font-bold m-0">{resident.name}</h2>
        </div>

        <p className="text-sm italic m-0 text-[var(--cc-text-dim)]">{resident.quote}</p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: complete ? 'var(--cc-good)' : 'var(--cc-warn)' }}
          >
            {complete ? `🛡 PROTECTED — ${progress.score}` : '⚠ NEEDS HELP'}
          </span>
          <span
            className="text-xs font-semibold shrink-0 group-hover:underline underline-offset-2"
            style={{ color: accent }}
            aria-hidden="true"
          >
            {complete ? 'Replay →' : 'Enter Mission →'}
          </span>
        </div>
      </Panel>
    </Link>
  )
}

export default function CommunityCentreHub() {
  const { districts } = useGame()

  if (!districts.communityCentre.unlocked) {
    return (
      <Panel className="max-w-xl mx-auto text-center flex flex-col gap-2">
        <h1 className="text-xl font-bold mt-0 flex items-center justify-center gap-2">
          <span aria-hidden="true">🔒</span> Community Centre locked
        </h1>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          Complete the Find Alex mission in Digital Breadcrumbs and at least one Recovery Rush scenario to unlock
          this district.
        </p>
      </Panel>
    )
  }

  const residents = districts.communityCentre.residents
  const allResidentsComplete = RESIDENTS.every((r) => residents[r.id]?.complete)
  const guardianComplete = districts.communityCentre.guardianModeComplete
  const resilience = districts.communityCentre.resilience

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] m-0 mb-1" style={{ color: 'var(--cc-community-warm)' }}>
          CyberCity // Community District
        </p>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">🛡️</span> Community Centre
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">Can you help someone else stay safe?</p>
      </div>

      <Panel className="flex items-center gap-4" brackets={false}>
        <CityTower
          fillFraction={resilience / 100}
          color="var(--cc-community-warm)"
          width={56}
          minHeight={48}
          maxHeight={88}
          windowCount={6}
          windowCols={2}
        />
        <div className="flex-1">
          <ProgressBar label="Community Resilience" value={resilience} color="var(--cc-community-warm)" />
          <p className="text-xs text-[var(--cc-text-dim)] m-0 mt-1">Built from completed missions and how well they went.</p>
        </div>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        {RESIDENTS.map((resident) => (
          <ResidentCard key={resident.id} resident={resident} progress={residents[resident.id]} />
        ))}
      </div>

      {/* Guardian Mode reads deliberately differently from the four resident
          cards above — dashed border instead of the HUD bracket corners,
          its own rose accent, and a two-person framing — since it's a
          different kind of activity (done together on one shared screen),
          not a fifth solo mission. */}
      <div
        className={`rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between ${!allResidentsComplete ? 'opacity-60' : ''}`}
        style={{ border: '2px dashed var(--cc-guardian-accent)', background: 'var(--cc-panel)' }}
      >
        <div>
          <h2 className="text-lg font-bold mt-0 mb-1 flex items-center gap-2">
            <span aria-hidden="true">🧑‍🤝‍🧑</span> Guardian Mode
            {!allResidentsComplete && <span aria-hidden="true">🔒</span>}
          </h2>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            {allResidentsComplete
              ? 'A short scenario for two — grab a real second person and do it together.'
              : 'Complete all four resident missions above to unlock this.'}
          </p>
          {guardianComplete && <p className="text-sm text-[var(--cc-good)] mt-1 mb-0">✓ Completed with a partner</p>}
        </div>
        {allResidentsComplete ? (
          <Link
            to="/community-centre/guardian"
            className="no-underline text-center px-4 py-2.5 rounded-lg font-semibold min-h-11 flex items-center justify-center shrink-0"
            style={{ background: 'var(--cc-guardian-accent)', color: '#2a0a14' }}
          >
            {guardianComplete ? 'Play again' : 'Begin'}
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="text-center px-4 py-2.5 rounded-lg border border-[var(--cc-panel-border)] text-[var(--cc-text-dim)] min-h-11 flex items-center justify-center shrink-0"
          >
            Locked
          </span>
        )}
      </div>
    </div>
  )
}
