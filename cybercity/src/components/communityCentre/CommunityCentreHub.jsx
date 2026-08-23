import { Link } from 'react-router-dom'
import { RESIDENTS } from '../../data/communityCentre'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">🛡️</span> Community Centre
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">Can you help someone else stay safe?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {RESIDENTS.map((resident) => {
          const progress = residents[resident.id]
          return (
            <Panel key={resident.id} className="flex flex-col gap-3">
              <div>
                <h2 className="text-lg font-bold mt-0 mb-1 flex items-center gap-2">
                  <span aria-hidden="true">{resident.icon}</span> {resident.name}
                </h2>
                <p className="text-sm text-[var(--cc-text-dim)] m-0">{resident.description}</p>
              </div>
              {progress?.complete && <p className="text-sm text-[var(--cc-good)] m-0">✓ Completed — score {progress.score}</p>}
              <Link
                to={`/community-centre/${resident.id}`}
                className="no-underline text-center px-4 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 flex items-center justify-center"
              >
                {progress?.complete ? 'Replay mission' : 'Start mission'}
              </Link>
            </Panel>
          )
        })}
      </div>

      <Panel className={`flex flex-col sm:flex-row sm:items-center gap-4 justify-between ${!allResidentsComplete ? 'opacity-60' : ''}`}>
        <div>
          <h2 className="text-lg font-bold mt-0 mb-1 flex items-center gap-2">
            <span aria-hidden="true">🤝</span> Guardian Mode
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
            className="no-underline text-center px-4 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 flex items-center justify-center shrink-0"
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
      </Panel>
    </div>
  )
}
