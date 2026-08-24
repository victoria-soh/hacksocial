import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getResident } from '../../data/communityCentre'
import { scoreTierColor } from '../../lib/scoring'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import ScoreRing from '../shared/ScoreRing'
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
  // scoreTileReply doesn't return a numeric score, so mirror scoreResidentMission's
  // own clarity sub-formula (0-50 there) doubled to a 0-100 display scale.
  const clarityPct = result
    ? result.tileResult.clear
      ? 100
      : Math.max(0, 100 - result.tileResult.issues.length * 30)
    : 0

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">{resident.icon}</span> Mission: Help {resident.name}
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">{resident.description}</p>
      </div>

      {!result && <ChatMissionEngine scenario={resident} onComplete={handleComplete} />}

      {result && (
        <>
          <Panel className="text-center">
            <h2 className="text-lg font-bold mt-0 mb-4">Mission complete</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <ScoreRing score={result.score} />
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <ProgressBar
                  label="🎯 Decision"
                  value={result.correctChoice ? 100 : 0}
                  color={scoreTierColor(result.correctChoice ? 100 : 0)}
                />
                <ProgressBar label="💬 Clarity" value={clarityPct} color={scoreTierColor(clarityPct)} />
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold m-0">{result.correctChoice ? '✅ Correct decision' : '❌ Not the safest decision'}</p>
              {!result.correctChoice && chosenStrategy && (
                <p className="text-sm text-[var(--cc-text-dim)] mt-1 mb-0">Safer option: "{chosenStrategy.label}"</p>
              )}
            </div>

            <div>
              <p
                className="text-sm font-semibold m-0 mb-2"
                style={{ color: result.tileResult.clear ? 'var(--cc-good)' : 'var(--cc-warn)' }}
              >
                {result.tileResult.clear ? '✅ Your reply was clear' : '⚠️ Your reply had some issues'}
              </p>

              {!result.tileResult.clear && (
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ background: 'var(--cc-bg-alt)', borderLeft: '3px solid var(--cc-warn)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide m-0 mb-1" style={{ color: 'var(--cc-warn)' }}>
                      Your reply
                    </p>
                    <p className="text-sm m-0">{result.replyText}</p>
                  </div>
                  <div className="rounded-lg p-3" style={{ background: 'var(--cc-bg-alt)', borderLeft: '3px solid var(--cc-accent)' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide m-0 mb-1" style={{ color: 'var(--cc-accent)' }}>
                      A safe reply needed to include
                    </p>
                    <ul className="list-disc pl-4 m-0 text-sm">
                      {resident.replyTiles.core.map((t) => (
                        <li key={t.id}>{t.text}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {result.tileResult.issues.length > 0 && (
                <ul className="list-disc pl-5 m-0 mt-3 text-sm text-[var(--cc-text-dim)]">
                  {result.tileResult.issues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          <WhatsNextPrompt />

          <Panel
            as="button"
            onClick={() => navigate('/community-centre')}
            className="self-start !px-5 !py-2.5 text-left min-h-11"
            style={{ background: 'var(--cc-accent)', color: '#06111c' }}
          >
            <span className="font-semibold">Back to Community Centre</span>
          </Panel>
        </>
      )}
    </div>
  )
}
