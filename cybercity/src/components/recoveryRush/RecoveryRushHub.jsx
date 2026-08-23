import { Link } from 'react-router-dom'
import { RECOVERY_LEVELS } from '../../data/recoveryRush'
import { isRecoveryLevelUnlocked, requiredLevelForRecoveryLevel } from '../../data/levels'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'

export default function RecoveryRushHub() {
  const { districts, xp } = useGame()
  const completed = districts.recoveryRush.levelsComplete

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">🚨</span> Recovery Rush
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">If something goes wrong, do you know what to do?</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {RECOVERY_LEVELS.filter((level) => !level.hidden).map((level) => {
          const result = completed[level.id]
          const unlocked = isRecoveryLevelUnlocked(xp, level.id)
          const gate = unlocked ? null : requiredLevelForRecoveryLevel(level.id)
          return (
            <Panel key={level.id} className={`flex flex-col gap-3 ${!unlocked ? 'opacity-60' : ''}`}>
              <div>
                <h2 className="text-lg font-bold mt-0 mb-1 flex items-center gap-2">
                  {level.name} {!unlocked && <span aria-hidden="true">🔒</span>}
                </h2>
                <p className="text-sm text-[var(--cc-text-dim)] m-0">{'⭐'.repeat(level.difficultyStars)}</p>
              </div>
              <p className="text-sm text-[var(--cc-text-dim)] m-0">{level.openingAlert}</p>
              {result && (
                <p className="text-sm text-[var(--cc-good)] m-0">
                  ✓ Best: {result.score}/100 — {result.grade}
                </p>
              )}
              {unlocked ? (
                <Link
                  to={`/recovery-rush/${level.id}`}
                  className="no-underline text-center px-4 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 flex items-center justify-center"
                >
                  {result ? 'Play again' : 'Start'}
                </Link>
              ) : (
                <p className="text-xs text-[var(--cc-text-dim)] m-0">
                  Unlocks at Level {gate?.level} ({gate?.name}).
                </p>
              )}
            </Panel>
          )
        })}
      </div>
    </div>
  )
}
