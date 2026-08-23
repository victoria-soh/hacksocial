import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GUARDIAN_SCENARIO } from '../../data/communityCentre'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import WhatsNextPrompt from '../shared/WhatsNextPrompt'

const PLAYER_LABEL = { A: 'Player A', B: 'Player B' }
const GUARDIAN_XP = 40

export default function GuardianMode() {
  const [phase, setPhase] = useState('intro') // intro | handoff | clue | summary
  const [clueIndex, setClueIndex] = useState(0)
  const [answers, setAnswers] = useState([]) // [{ clueId, guessRedFlag, correct }]
  const [pendingGuess, setPendingGuess] = useState(null)
  const { completeGuardianMode, addXP } = useGame()
  const navigate = useNavigate()

  const clue = GUARDIAN_SCENARIO.clues[clueIndex]
  const isLastClue = clueIndex === GUARDIAN_SCENARIO.clues.length - 1
  const correctCount = answers.filter((a) => a.correct).length

  function begin() {
    setPhase('handoff')
  }

  function readyForClue() {
    setPendingGuess(null)
    setPhase('clue')
  }

  function guess(guessRedFlag) {
    const correct = guessRedFlag === clue.isRedFlag
    setPendingGuess({ guessRedFlag, correct })
    setAnswers((prev) => [...prev, { clueId: clue.id, guessRedFlag, correct }])
  }

  function next() {
    if (isLastClue) {
      setPhase('summary')
      completeGuardianMode()
      addXP(GUARDIAN_XP)
    } else {
      setClueIndex((i) => i + 1)
      setPhase('handoff')
    }
  }

  if (phase === 'intro') {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <Panel className="flex flex-col gap-3">
          <h1 className="text-xl font-bold mt-0 flex items-center gap-2">
            <span aria-hidden="true">🤝</span> Guardian Mode
          </h1>
          <p className="text-sm m-0">
            This one's for two people, sharing one device. Sit down with someone — a parent, a grandparent, a friend
            — and take turns spotting what's suspicious in a real-looking message.
          </p>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            Heads up: we can't actually verify a second person is here — there's no way to check that
            cryptographically. What this <em>can</em> do is make sure both of you had to actively read something and
            answer, turn by turn, instead of one person tapping through alone. The point is the conversation, not a
            perfect proof.
          </p>
          <p className="text-sm m-0">You'll alternate: Player A takes the first clue, Player B the next, and so on.</p>
          <button
            onClick={begin}
            className="self-start mt-1 px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
          >
            Begin Guardian Mode
          </button>
        </Panel>
      </div>
    )
  }

  if (phase === 'summary') {
    return (
      <div className="flex flex-col gap-6 max-w-2xl mx-auto">
        <Panel>
          <h1 className="text-xl font-bold mt-0">Guardian Mode complete</h1>
          <p className="m-0">
            Together, you correctly identified {correctCount} / {GUARDIAN_SCENARIO.clues.length} details.
          </p>
        </Panel>
        <Panel>
          <h2 className="text-base font-semibold mt-0 mb-2">What you both found</h2>
          <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm">
            {GUARDIAN_SCENARIO.clues.map((c, i) => (
              <li key={c.id} className="flex items-start gap-2 border-b border-[var(--cc-panel-border)] pb-2">
                <span aria-hidden="true">{answers[i]?.correct ? '✅' : '❌'}</span>
                <span>
                  <strong>{PLAYER_LABEL[c.player]}:</strong> {c.text} —{' '}
                  <span className={c.isRedFlag ? 'text-[var(--cc-warn)]' : 'text-[var(--cc-good)]'}>
                    {c.isRedFlag ? 'genuine red flag' : 'actually normal'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <p className="text-sm m-0">
            🛡️ +5 Community Resilience, and +{GUARDIAN_XP} XP — for the both of you doing this together.
          </p>
        </Panel>
        <WhatsNextPrompt />

        <button
          onClick={() => navigate('/community-centre')}
          className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
        >
          Back to Community Centre
        </button>
      </div>
    )
  }

  if (phase === 'handoff') {
    return (
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <Panel className="text-center flex flex-col gap-3">
          <p className="text-xs text-[var(--cc-text-dim)] m-0">
            Clue {clueIndex + 1} of {GUARDIAN_SCENARIO.clues.length}
          </p>
          <h1 className="text-xl font-bold mt-0 mb-0">Pass the device to {PLAYER_LABEL[clue.player]}</h1>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            {PLAYER_LABEL[clue.player]}: when you're holding the device, tap ready.
          </p>
          <button
            onClick={readyForClue}
            className="self-center mt-1 px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
          >
            I'm {PLAYER_LABEL[clue.player]} — I'm ready
          </button>
        </Panel>
      </div>
    )
  }

  // phase === 'clue'
  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <Panel className="flex flex-col gap-3">
        <p className="text-xs text-[var(--cc-text-dim)] m-0">
          {PLAYER_LABEL[clue.player]}'s turn · Clue {clueIndex + 1} of {GUARDIAN_SCENARIO.clues.length}
        </p>
        <p className="text-xs text-[var(--cc-text-dim)] m-0 mb-1">
          {GUARDIAN_SCENARIO.message.sender}
        </p>
        <p className="bg-[var(--cc-bg-alt)] rounded-lg p-3 m-0">{GUARDIAN_SCENARIO.message.text}</p>
      </Panel>

      <Panel className="flex flex-col gap-3">
        <h2 className="text-base font-semibold mt-0">{clue.text}</h2>
        {pendingGuess == null ? (
          <div className="flex gap-3">
            <button
              onClick={() => guess(true)}
              className="flex-1 px-4 py-3 rounded-lg border border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)] hover:border-[var(--cc-warn)] min-h-11 font-semibold"
            >
              🚩 Red flag
            </button>
            <button
              onClick={() => guess(false)}
              className="flex-1 px-4 py-3 rounded-lg border border-[var(--cc-panel-border)] bg-[var(--cc-bg-alt)] hover:border-[var(--cc-good)] min-h-11 font-semibold"
            >
              ✅ Normal
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className={`font-semibold m-0 ${pendingGuess.correct ? 'text-[var(--cc-good)]' : 'text-[var(--cc-danger)]'}`}>
              {pendingGuess.correct ? '✅ Correct' : '❌ Not quite'} — this is{' '}
              {clue.isRedFlag ? 'a genuine red flag.' : 'actually a normal detail.'}
            </p>
            <button
              onClick={next}
              className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
            >
              {isLastClue ? 'Finish' : 'Next clue'}
            </button>
          </div>
        )}
      </Panel>
    </div>
  )
}
