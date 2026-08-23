import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getResident } from '../../data/communityCentre'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import WhatsNextPrompt from '../shared/WhatsNextPrompt'
import ChatMissionEngine from './ChatMissionEngine'

export default function ResidentMission() {
  const { residentId } = useParams()
  const resident = getResident(residentId)
  const navigate = useNavigate()
  const { completeResidentMission, recordAttempt, addXP } = useGame()
  const [result, setResult] = useState(null)

  if (!resident) return <p>Unknown resident.</p>

  function handleComplete(r) {
    completeResidentMission(resident.id, r.score)
    recordAttempt(r.correctChoice)
    addXP(r.score)
    setResult(r)
  }

  const chosenStrategy = result ? resident.strategies.find((s) => s.correct) : null

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">{resident.icon}</span> Mission: Help {resident.name}
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">{resident.description}</p>
      </div>

      {!result && <ChatMissionEngine scenario={resident} onComplete={handleComplete} />}

      {result && (
        <Panel className="flex flex-col gap-3">
          <h2 className="text-base font-semibold mt-0 mb-0">Mission complete — score: {result.score} / 100</h2>

          <div>
            <p className="text-sm font-semibold m-0">{result.correctChoice ? '✅ Correct decision' : '❌ Not the safest decision'}</p>
            {!result.correctChoice && chosenStrategy && (
              <p className="text-sm text-[var(--cc-text-dim)] mt-1 mb-0">Safer option: "{chosenStrategy.label}"</p>
            )}
          </div>

          <div>
            <p className={`text-sm font-semibold m-0 ${result.tileResult.clear ? 'text-[var(--cc-good)]' : 'text-[var(--cc-warn)]'}`}>
              {result.tileResult.clear ? '✅ Your reply was clear' : '❓ Your reply had some issues'}
            </p>
            {result.tileResult.issues.length > 0 && (
              <ul className="list-disc pl-5 m-0 text-sm text-[var(--cc-text-dim)]">
                {result.tileResult.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            )}
          </div>

          <button
            onClick={() => navigate('/community-centre')}
            className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
          >
            Back to Community Centre
          </button>
        </Panel>
      )}

      {result && <WhatsNextPrompt />}
    </div>
  )
}
