import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getLevel } from '../../data/recoveryRush'
import { isRecoveryLevelUnlocked, requiredLevelForRecoveryLevel } from '../../data/levels'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import PrimaryButton from '../shared/PrimaryButton'
import IncidentEngine from './IncidentEngine'
import EndScreen from './EndScreen'

export default function IncidentScenario() {
  const { levelId } = useParams()
  const level = getLevel(levelId)
  const navigate = useNavigate()
  const { completeRecoveryLevel, addXP, xp } = useGame()
  const [endData, setEndData] = useState(null)

  function handleComplete(data) {
    completeRecoveryLevel(levelId, {
      score: data.score,
      grade: data.grade.label,
      time: data.summary.secondsUsed,
      accountsLost: data.summary.accountsLost,
    })
    addXP(data.score)
    setEndData(data)
  }

  if (!level) {
    return <p>Unknown level.</p>
  }

  if (!isRecoveryLevelUnlocked(xp, levelId)) {
    const gate = requiredLevelForRecoveryLevel(levelId)
    return (
      <Panel className="max-w-lg mx-auto text-center flex flex-col gap-2">
        <h1 className="text-xl font-bold mt-0 flex items-center justify-center gap-2">
          <span aria-hidden="true">🔒</span> {level.name} locked
        </h1>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          Unlocks at Level {gate?.level} ({gate?.name}).
        </p>
        <PrimaryButton onClick={() => navigate('/recovery-rush')} className="self-center mt-2">
          Back to Recovery Rush
        </PrimaryButton>
      </Panel>
    )
  }

  if (endData) {
    return (
      <EndScreen
        summary={endData.summary}
        score={endData.score}
        grade={endData.grade}
        contained={endData.contained}
        mistakeReport={endData.mistakeReport}
        timeLimitSeconds={level.timeLimitSeconds}
        onContinue={() => navigate('/recovery-rush')}
      />
    )
  }

  return <IncidentEngine levelId={levelId} onComplete={handleComplete} />
}
