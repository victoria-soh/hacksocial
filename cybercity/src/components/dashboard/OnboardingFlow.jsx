import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import { unlockedLandmarkIds } from '../../data/levels'
import Panel from '../shared/Panel'
import CityGraphic from './CityGraphic'

const MISSIONS = [
  { id: 'investigator', icon: '🔎', title: 'Investigator', description: 'Discover what digital breadcrumbs reveal.' },
  { id: 'responder', icon: '🚨', title: 'Responder', description: 'Stop an account compromise before it spreads.' },
  { id: 'guardian', icon: '🛡️', title: 'Guardian', description: 'Protect people in your community.' },
]

export default function OnboardingFlow() {
  const [step, setStep] = useState('welcome')
  const { completeOnboarding, districts, overallResilience, xp } = useGame()
  const navigate = useNavigate()

  function choose(id) {
    completeOnboarding(id)
    navigate('/breadcrumbs')
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6 py-8">
      {step === 'welcome' && (
        <Panel className="text-center flex flex-col gap-4">
          <h1 className="text-2xl font-bold m-0">Welcome to CyberCity.</h1>
          <p className="text-[var(--cc-text-dim)] m-0">
            Cyber threats don't only attack computers. They exploit the choices people make online.
          </p>

          <div className="w-full max-w-sm mx-auto">
            <CityGraphic
              overallResilience={overallResilience}
              districts={districts}
              unlockedLandmarkIds={unlockedLandmarkIds(xp)}
              interactive={false}
            />
          </div>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            This is your city — it represents your accounts. Districts are account clusters, and each resilience
            tower shows how protected that district is. Complete missions to strengthen your city.
          </p>

          <button
            onClick={() => setStep('choose')}
            className="self-center mt-2 px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
          >
            Continue
          </button>
        </Panel>
      )}

      {step === 'choose' && (
        <Panel className="flex flex-col gap-4">
          <h2 className="text-xl font-bold m-0 text-center">Choose your mission</h2>
          <p className="text-sm text-[var(--cc-text-dim)] m-0 border-l-2 pl-3" style={{ borderColor: 'var(--cc-accent-2)' }}>
            Whichever you pick, you'll start at Digital Breadcrumbs first — it's where the story begins.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {MISSIONS.map((m) => (
              <button
                key={m.id}
                onClick={() => choose(m.id)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)] hover:border-[var(--cc-accent)] min-h-24 text-center"
              >
                <span className="text-3xl" aria-hidden="true">
                  {m.icon}
                </span>
                <span className="font-semibold">{m.title}</span>
                <span className="text-xs text-[var(--cc-text-dim)]">{m.description}</span>
              </button>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
