import { useEffect, useMemo, useState } from 'react'
import { PRIVACY_MIRROR_INTRO, SHARING_CATEGORIES, RISK_TYPES } from '../../data/privacyMirror'
import {
  computeRiskScores,
  riskLevel,
  getInferableRisks,
  explainGrounding,
  getGroundTruthInferences,
  getTopChains,
  MAX_POSSIBLE_SCORES,
} from '../../lib/privacyMirrorEngine'
import { gradeGuess } from '../../lib/privacyMirrorSimilarity'
import { checkAiAvailable, explainPrivacyMirrorRisk, generatePrivacyMirrorPersona, explainPrivacyMirrorFeedback } from '../../lib/ai'
import { calculatePrivacyDefenceScore } from '../../lib/scoring'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import ExposureChainDiagram from './privacyMirror/ExposureChainDiagram'
import EngineInspector from './privacyMirror/EngineInspector'

const LEVEL_COLOR_VAR = { Low: 'var(--cc-good)', Medium: 'var(--cc-warn)', High: 'var(--cc-danger)' }

function IntroBanner() {
  return (
    <p className="text-sm text-[var(--cc-text-dim)] m-0 border-l-2 pl-3" style={{ borderColor: 'var(--cc-accent-2)' }}>
      {PRIVACY_MIRROR_INTRO}
    </p>
  )
}

function AiFallbackNotice({ aiAvailable }) {
  if (aiAvailable) return null
  return (
    <p className="text-xs text-[var(--cc-text-dim)] m-0">
      AI service unavailable — using CyberCity's built-in local generator for wording (the risk scoring itself never
      uses AI either way).
    </p>
  )
}

/**
 * Privacy Mirror — three screens (select → reveal → switch sides). Never
 * touches the player's real bio/posts: the only inputs are which of 14
 * category ids they selected, and their own free-text guess about a
 * FICTIONAL persona in screen 3. See lib/privacyMirrorEngine.js (layer 1,
 * deterministic, no model calls) and lib/ai.js's Task 4 section (layer 2,
 * generative, never decides a risk level or a grade) for the two halves.
 */
export default function PrivacyMirror() {
  const { state, recordPrivacyScoreScan } = useGame()
  const [step, setStep] = useState('select') // select -> reveal -> persona
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [committedIds, setCommittedIds] = useState([])
  const [aiAvailable, setAiAvailable] = useState(true) // optimistic default, matches the rest of the app

  const [riskExplanations, setRiskExplanations] = useState({}) // riskId -> { text, source }
  const [explanationsLoading, setExplanationsLoading] = useState(false)

  const [persona, setPersona] = useState(null)
  const [personaLoading, setPersonaLoading] = useState(false)
  const [guessText, setGuessText] = useState('')
  const [verdicts, setVerdicts] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [gradingLoading, setGradingLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    checkAiAvailable().then((available) => {
      if (!cancelled) setAiAvailable(available)
    })
    return () => {
      cancelled = true
    }
  }, [])

  function toggleCategory(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Live, layer-1-only preview — updates instantly as checkboxes toggle,
  // with no model call involved, so this is the moment that demonstrates
  // "the graph decides, in real time."
  const liveScores = useMemo(() => computeRiskScores([...selectedIds]).scores, [selectedIds])

  const committedScores = useMemo(() => computeRiskScores(committedIds).scores, [committedIds])
  const inferableRisks = useMemo(() => getInferableRisks(committedScores), [committedScores])
  const groundTruths = useMemo(() => getGroundTruthInferences(committedIds), [committedIds])
  const chains = useMemo(() => {
    return getTopChains(committedIds, 2).map((c) => ({ ...c, level: riskLevel(committedScores[c.riskId], c.riskId) }))
  }, [committedIds, committedScores])

  function revealExposure() {
    const ids = [...selectedIds]
    setCommittedIds(ids)
    setStep('reveal')

    if (state.districts.breadcrumbs.privacyDefenceScore == null) {
      recordPrivacyScoreScan(calculatePrivacyDefenceScore(state.districts.breadcrumbs.selfChecklist))
    }

    const scores = computeRiskScores(ids).scores
    const inferable = getInferableRisks(scores)
    setExplanationsLoading(true)
    Promise.all(
      inferable.map(async (r) => {
        const grounding = explainGrounding(r.id, ids)
        const explanation = await explainPrivacyMirrorRisk(r.label, grounding)
        return [r.id, explanation]
      }),
    ).then((entries) => {
      setRiskExplanations(Object.fromEntries(entries))
      setExplanationsLoading(false)
    })
  }

  function switchSides() {
    setStep('persona')
    if (!persona) {
      setPersonaLoading(true)
      generatePrivacyMirrorPersona(committedIds).then((p) => {
        setPersona(p)
        setPersonaLoading(false)
      })
    }
  }

  function gradeMyGuess() {
    const graded = gradeGuess(guessText, groundTruths)
    setVerdicts(graded)
    setGradingLoading(true)
    explainPrivacyMirrorFeedback(graded, persona?.name ?? 'this persona').then((fb) => {
      setFeedback(fb)
      setGradingLoading(false)
    })
  }

  return (
    <Panel className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold mt-0 mb-1">🪞 Privacy Mirror</h2>
        <p className="text-sm text-[var(--cc-text-dim)] m-0 mb-2">
          How much could someone learn from the way you normally use the internet?
        </p>
      </div>
      <IntroBanner />

      {step === 'select' && (
        <ScreenSelect
          selectedIds={selectedIds}
          toggleCategory={toggleCategory}
          liveScores={liveScores}
          onReveal={revealExposure}
        />
      )}

      {step === 'reveal' && (
        <ScreenReveal
          committedIds={committedIds}
          inferableRisks={inferableRisks}
          riskExplanations={riskExplanations}
          explanationsLoading={explanationsLoading}
          committedScores={committedScores}
          chains={chains}
          aiAvailable={aiAvailable}
          onContinue={switchSides}
        />
      )}

      {step === 'persona' && (
        <ScreenPersona
          committedIds={committedIds}
          persona={persona}
          personaLoading={personaLoading}
          guessText={guessText}
          setGuessText={setGuessText}
          verdicts={verdicts}
          feedback={feedback}
          gradingLoading={gradingLoading}
          onGrade={gradeMyGuess}
          chains={chains}
          aiAvailable={aiAvailable}
        />
      )}
    </Panel>
  )
}

function ScreenSelect({ selectedIds, toggleCategory, liveScores, onReveal }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium m-0">What do you usually share online? Select anything that sounds like you.</p>

      <div role="group" aria-label="Sharing categories" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {SHARING_CATEGORIES.map((cat) => {
          const selected = selectedIds.has(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              aria-pressed={selected}
              onClick={() => toggleCategory(cat.id)}
              className="flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center min-h-11 transition-colors"
              style={{
                borderColor: selected ? 'var(--cc-accent-2)' : 'var(--cc-panel-border)',
                background: selected ? 'rgba(255,47,214,0.12)' : 'var(--cc-bg-alt)',
                boxShadow: selected ? '0 0 8px -2px var(--cc-accent-2)' : 'none',
              }}
            >
              <span className="text-xl" aria-hidden="true">
                {cat.emoji}
              </span>
              <span className="text-xs leading-tight">{cat.label}</span>
            </button>
          )
        })}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--cc-text-dim)] mb-2">
          Live preview — updates as you select, no AI involved
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {RISK_TYPES.map((r) => (
            <ProgressBar
              key={r.id}
              label={`${r.icon} ${r.label}`}
              value={liveScores[r.id]}
              max={MAX_POSSIBLE_SCORES[r.id]}
              color={LEVEL_COLOR_VAR[riskLevel(liveScores[r.id], r.id)]}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onReveal}
        disabled={selectedIds.size === 0}
        className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 disabled:opacity-40"
      >
        Reveal my exposure
      </button>
    </div>
  )
}

function ScreenReveal({ committedIds, inferableRisks, riskExplanations, explanationsLoading, committedScores, chains, aiAvailable, onContinue }) {
  const directCategories = SHARING_CATEGORIES.filter((c) => committedIds.includes(c.id))

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--cc-accent)' }}>
            Directly visible
          </h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5 text-sm">
            {directCategories.map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <span aria-hidden="true">{c.emoji}</span> {c.label}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--cc-warn)' }}>
            Potentially inferable
          </h3>
          {inferableRisks.length === 0 ? (
            <p className="text-sm text-[var(--cc-text-dim)] m-0">
              Nothing scored high enough to flag yet — try selecting a related pair of categories.
            </p>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-2.5 text-sm">
              {inferableRisks.map((r) => (
                <li key={r.id}>
                  <span className="font-medium">🟠 {r.label}</span>
                  <p className="text-xs text-[var(--cc-text-dim)] m-0 mt-0.5">
                    {explanationsLoading ? 'Generating explanation…' : riskExplanations[r.id]?.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AiFallbackNotice aiAvailable={aiAvailable} />

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: 'var(--cc-accent-2)' }}>
          How these connect
        </h3>
        <ExposureChainDiagram chains={chains} />
      </div>

      <div>
        <h3 className="text-base font-bold mb-2">Your Sharing Style</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {RISK_TYPES.map((r) => (
            <ProgressBar
              key={r.id}
              label={`${r.icon} ${r.label}`}
              value={committedScores[r.id]}
              max={MAX_POSSIBLE_SCORES[r.id]}
              color={LEVEL_COLOR_VAR[riskLevel(committedScores[r.id], r.id)]}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--cc-text-dim)] mt-3 mb-0">
          Multiple independent clues can reveal patterns that no individual post reveals by itself.
        </p>
      </div>

      <EngineInspector selectedIds={committedIds} />

      <button
        onClick={onContinue}
        className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
      >
        Switch sides — become the attacker →
      </button>
    </div>
  )
}

function ScreenPersona({ committedIds, persona, personaLoading, guessText, setGuessText, verdicts, feedback, gradingLoading, onGrade, chains, aiAvailable }) {
  const groundTruths = useMemo(() => getGroundTruthInferences(committedIds), [committedIds])
  const topChain = chains[0]

  function closingLine() {
    const name = persona?.name ?? 'This persona'
    if (!topChain) return 'Multiple independent, harmless-looking details can still add up to a pattern.'
    const conclusion = topChain.rule.chain[2]
    if (topChain.riskId === 'location') {
      return `${name} never posted their address. But several harmless details together could narrow down where they spend most of their time — ${conclusion.charAt(0).toLowerCase()}${conclusion.slice(1)}.`
    }
    return `${name} never posted this directly. But ${topChain.rule.chain[0].toLowerCase()} combined with ${topChain.rule.chain[1].charAt(0).toLowerCase()}${topChain.rule.chain[1].slice(1)} was enough to reveal it.`
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-lg font-bold mt-0 mb-1">Switch sides — you are now the attacker</h3>
        <p className="text-sm text-[var(--cc-text-dim)] m-0">
          CyberCity has generated a fictional person who shares online the same way you do. This profile was
          generated using your sharing habits — not your personal information.
        </p>
      </div>

      <AiFallbackNotice aiAvailable={aiAvailable} />

      {personaLoading || !persona ? (
        <p className="text-sm text-[var(--cc-text-dim)]">Generating persona…</p>
      ) : (
        <div className="bg-[var(--cc-bg-alt)] rounded-lg p-4">
          <p className="font-bold m-0 mb-2">{persona.name}</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm">
            {persona.posts.map((post, i) => (
              <li key={i} className="border-b border-[var(--cc-panel-border)] pb-2 last:border-0 last:pb-0">
                <span className="text-xs text-[var(--cc-text-dim)]">{post.platform}</span>
                <p className="m-0">{post.text}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="pm-guess" className="text-sm font-medium">
          What do you think {persona?.name ?? 'this person'}'s daily routine looks like? Where do they likely live or
          work?
        </label>
        <textarea
          id="pm-guess"
          value={guessText}
          onChange={(e) => setGuessText(e.target.value)}
          rows={4}
          placeholder="Type your guess…"
          className="w-full rounded-lg bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] p-3 text-sm"
        />
        <button
          onClick={onGrade}
          disabled={!guessText.trim() || !persona}
          className="self-start px-4 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 disabled:opacity-40"
        >
          Grade my guess
        </button>
      </div>

      {verdicts && (
        <div className="flex flex-col gap-3">
          <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm">
            {verdicts.map((v) => (
              <li key={v.riskId} className="flex items-start gap-2">
                <span aria-hidden="true">{v.matched ? '✅' : '❌'}</span>
                <span>
                  <span className="font-medium">{v.riskLabel}</span>
                  <span className="block text-xs text-[var(--cc-text-dim)]">
                    {v.description} — similarity {v.similarity.toFixed(2)} ({v.matched ? 'matched' : 'missed'})
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm m-0">{gradingLoading ? 'Generating feedback…' : feedback?.text}</p>
          {!gradingLoading && <p className="text-sm font-medium m-0">{closingLine()}</p>}
        </div>
      )}

      {groundTruths.length === 0 && (
        <p className="text-xs text-[var(--cc-text-dim)] m-0">
          No inferable facts scored high enough for this selection — go back and pick a related pair of categories
          to see grading in action.
        </p>
      )}
    </div>
  )
}
