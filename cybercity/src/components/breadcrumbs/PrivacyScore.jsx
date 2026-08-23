import { useEffect, useState } from 'react'
import { useGame } from '../../state/GameContext'
import { calculatePrivacyDefenceScore, strongestAndWeakestArea } from '../../lib/scoring'
import { PRIVACY_MISSIONS, PRIVACY_AREA_LABELS } from '../../data/breadcrumbs'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import BreakTheTrailMission from './privacyMissions/BreakTheTrailMission'
import BirthdayGhostMission from './privacyMissions/BirthdayGhostMission'
import WhoCanSeeMeMission from './privacyMissions/WhoCanSeeMeMission'

const MISSION_COMPONENTS = {
  'break-the-trail': BreakTheTrailMission,
  'birthday-ghost': BirthdayGhostMission,
  'who-can-see-me': WhoCanSeeMeMission,
}

export default function PrivacyScore() {
  const { state, completePrivacyMission, recordPrivacyScoreScan } = useGame()
  const checklist = state.districts.breadcrumbs.selfChecklist
  const storedScore = state.districts.breadcrumbs.privacyDefenceScore
  const scanned = storedScore != null
  const [displayedScore, setDisplayedScore] = useState(storedScore ?? 0)
  const [prevScore, setPrevScore] = useState(null)
  const [activeMissionId, setActiveMissionId] = useState(null)

  // The baseline scan happens in PrivacyMirror (a sibling component), so
  // pick up its result the moment it lands rather than only reading it at mount.
  useEffect(() => {
    if (scanned) setDisplayedScore(storedScore)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanned])

  function rescan() {
    const newScore = calculatePrivacyDefenceScore(checklist)
    setPrevScore(displayedScore)
    setDisplayedScore(newScore)
    recordPrivacyScoreScan(newScore)
  }

  function handleMissionComplete(id, xp) {
    completePrivacyMission(id, xp)
    setActiveMissionId(null)
  }

  if (!scanned) {
    return (
      <Panel>
        <h2 className="text-lg font-bold mt-0">🛡️ Privacy Defence Score</h2>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          Reveal your exposure in Privacy Mirror above first to get your baseline score.
        </p>
      </Panel>
    )
  }

  const { strongest, biggestExposure } = strongestAndWeakestArea(checklist, PRIVACY_AREA_LABELS)
  const activeMission = PRIVACY_MISSIONS.find((m) => m.id === activeMissionId)
  const ActiveMissionComponent = activeMissionId ? MISSION_COMPONENTS[activeMissionId] : null

  return (
    <Panel className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold mt-0 mb-1">🛡️ Privacy Defence Score</h2>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          A calm read on where you stand today — not a verdict, just a starting point.
        </p>
      </div>

      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{displayedScore}</span>
          <span className="text-[var(--cc-text-dim)]">/ 100</span>
          {prevScore != null && prevScore !== displayedScore && (
            <span className="text-sm text-[var(--cc-good)]">↑ from {prevScore}</span>
          )}
        </div>
        <ProgressBar label="Privacy Defence Score" value={displayedScore} color="var(--cc-good)" />
      </div>

      <dl className="grid gap-2 sm:grid-cols-2 text-sm m-0">
        <div className="bg-[var(--cc-bg-alt)] rounded-lg p-3">
          <dt className="text-[var(--cc-text-dim)]">Strongest area</dt>
          <dd className="m-0 font-medium">{strongest ?? 'Complete a mission below to build one up.'}</dd>
        </div>
        <div className="bg-[var(--cc-bg-alt)] rounded-lg p-3">
          <dt className="text-[var(--cc-text-dim)]">Biggest exposure</dt>
          <dd className="m-0 font-medium">{biggestExposure ?? 'None left — nice work.'}</dd>
        </div>
      </dl>

      {activeMission && ActiveMissionComponent ? (
        <div className="flex flex-col gap-3 bg-[var(--cc-bg-alt)] rounded-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold m-0">{activeMission.title}</h3>
            <button
              onClick={() => setActiveMissionId(null)}
              className="text-xs text-[var(--cc-text-dim)] underline min-h-11 px-2"
            >
              Exit without saving
            </button>
          </div>
          <ActiveMissionComponent onComplete={() => handleMissionComplete(activeMission.id, activeMission.xp)} />
        </div>
      ) : (
        <div>
          <h3 className="text-base font-semibold mb-2">Recommended missions</h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            {PRIVACY_MISSIONS.map((m) => {
              const done = checklist[m.id]
              return (
                <li key={m.id} className="flex items-center gap-3 bg-[var(--cc-bg-alt)] rounded-lg p-3">
                  <span className="text-lg shrink-0" aria-hidden="true">
                    {done ? '✅' : '🔒'}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{m.title}</span>
                    <span className="block text-xs text-[var(--cc-text-dim)]">{m.description}</span>
                  </span>
                  {done ? (
                    <button
                      onClick={() => setActiveMissionId(m.id)}
                      className="text-xs text-[var(--cc-text-dim)] underline min-h-11 px-2"
                    >
                      Replay
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveMissionId(m.id)}
                      className="px-3 py-2 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] text-xs font-semibold min-h-11"
                    >
                      Start (+{m.xp} XP)
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <button
        onClick={rescan}
        className="self-start px-4 py-2.5 rounded-lg border border-[var(--cc-accent)] text-[var(--cc-accent)] font-semibold min-h-11"
      >
        Re-run scan
      </button>
    </Panel>
  )
}
