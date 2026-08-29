import { useMemo, useState } from 'react'
import { PRIVACY_MIRROR_INTRO, SHARING_CATEGORIES, RISK_TYPES } from '../../data/privacyMirror'
import {
  computeRiskScores,
  riskLevel,
  getInferableRisks,
  explainGrounding,
  getGroundTruthInferences,
  getTopChains,
  getInferenceValueOptions,
  getInferenceClueCategoryIds,
  pickDistractorCategories,
  NOT_ENOUGH_EVIDENCE,
  MAX_POSSIBLE_SCORES,
} from '../../lib/privacyMirrorEngine'
import { explainPrivacyMirrorRisk, generatePrivacyMirrorPersona } from '../../lib/ai'
import { calculatePrivacyDefenceScore } from '../../lib/scoring'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import ProgressBar from '../shared/ProgressBar'
import AiFallbackNotice from '../shared/AiFallbackNotice'
import ExposureChainDiagram from './privacyMirror/ExposureChainDiagram'
import EngineInspector from './privacyMirror/EngineInspector'
import RoleReversalTransition from './privacyMirror/RoleReversalTransition'

const LEVEL_COLOR_VAR = { Low: 'var(--cc-good)', Medium: 'var(--cc-warn)', High: 'var(--cc-danger)' }
const AI_FALLBACK_MESSAGE =
  "AI service unavailable — using CyberCity's built-in local generator for wording (the risk scoring itself never uses AI either way)."

function IntroBanner() {
  return (
    <p className="text-sm text-[var(--cc-text-dim)] m-0 border-l-2 pl-3" style={{ borderColor: 'var(--cc-accent-2)' }}>
      {PRIVACY_MIRROR_INTRO}
    </p>
  )
}

/**
 * Privacy Mirror — three screens (select → reveal → switch sides). Never
 * touches the player's real bio/posts: the only input is which of 14
 * category ids they selected in screen 1. See lib/privacyMirrorEngine.js
 * (layer 1, deterministic, no model calls) and lib/ai.js's Task 4 section
 * (layer 2, generative, only ever phrases wording — never decides a risk
 * level, a grade, or which post maps to which category) for the two
 * halves. Screen 3's persona and its investigation mechanic are both fully
 * deterministic (see generatePrivacyMirrorPersona), so the only AI-sourced
 * text anywhere in this feature is screen 2's per-risk explanations, which
 * screen 3 reuses rather than re-asking the model for anything.
 */
export default function PrivacyMirror() {
  const { state, recordPrivacyScoreScan } = useGame()
  const [step, setStep] = useState('select') // select -> reveal -> persona
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [committedIds, setCommittedIds] = useState([])
  const [transitionDone, setTransitionDone] = useState(false)

  const [riskExplanations, setRiskExplanations] = useState({}) // riskId -> { text, source }
  const [explanationsLoading, setExplanationsLoading] = useState(false)

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
  // The full trail (not capped at 2) for screen 3's end-of-investigation
  // reveal — screen 2's own diagram stays capped for readability there.
  const allChains = useMemo(() => {
    return getTopChains(committedIds, inferableRisks.length).map((c) => ({
      ...c,
      level: riskLevel(committedScores[c.riskId], c.riskId),
    }))
  }, [committedIds, committedScores, inferableRisks.length])

  const persona = useMemo(() => (committedIds.length > 0 ? generatePrivacyMirrorPersona(committedIds) : null), [committedIds])

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
          onContinue={switchSides}
        />
      )}

      {step === 'persona' && !transitionDone && <RoleReversalTransition onDone={() => setTransitionDone(true)} />}

      {step === 'persona' && transitionDone && (
        <ScreenInvestigate
          persona={persona}
          committedIds={committedIds}
          groundTruths={groundTruths}
          riskExplanations={riskExplanations}
          allChains={allChains}
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

function ScreenReveal({ committedIds, inferableRisks, riskExplanations, explanationsLoading, committedScores, chains, onContinue }) {
  const directCategories = SHARING_CATEGORIES.filter((c) => committedIds.includes(c.id))

  return (
    <div className="flex flex-col gap-5">
      <Panel brackets={false} className="grid gap-4 sm:grid-cols-2">
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
                  {!explanationsLoading && (
                    <AiFallbackNotice
                      show={riskExplanations[r.id]?.source === 'heuristic'}
                      message={AI_FALLBACK_MESSAGE}
                      className="mt-1"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel brackets={false} style={{ borderColor: 'var(--cc-danger)', boxShadow: 'var(--cc-glow-danger)' }}>
        <h3 className="text-sm font-bold uppercase tracking-wide mb-3 mt-0" style={{ color: 'var(--cc-accent-2)' }}>
          How these connect
        </h3>
        <ExposureChainDiagram chains={chains} />
      </Panel>

      <Panel brackets={false}>
        <h3 className="text-base font-bold mb-2 mt-0">Your Sharing Style</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {RISK_TYPES.map((r) => (
            <ProgressBar
              key={r.id}
              label={`${r.icon} ${r.label}`}
              value={committedScores[r.id]}
              max={MAX_POSSIBLE_SCORES[r.id]}
              color={LEVEL_COLOR_VAR[riskLevel(committedScores[r.id], r.id)]}
              glow={riskLevel(committedScores[r.id], r.id) === 'High'}
            />
          ))}
        </div>
        <p className="text-sm text-[var(--cc-text-dim)] mt-3 mb-0">
          Multiple independent clues can reveal patterns that no individual post reveals by itself.
        </p>
      </Panel>

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

// ---------------------------------------------------------------------------
// Screen 3 — the switch-sides investigation. Structured, card-based
// selection throughout (same interaction DNA as screen 1's category grid),
// never free text: a "direct facts" pass over the persona's own categories,
// then a "what can you infer" pass over only the risk types the engine
// actually flagged for this exact selection, each broken into a value pick
// and a supporting-clue pick with an immediate reveal, and finally a
// debrief with a reveal-the-trail diagram.

const CARD_VARIANT_STYLE = {
  idle: { borderColor: 'var(--cc-panel-border)', background: 'var(--cc-bg-alt)', boxShadow: 'none' },
  correct: { borderColor: 'var(--cc-good)', background: 'rgba(90,214,150,0.14)', boxShadow: '0 0 8px -2px var(--cc-good)' },
  incorrect: { borderColor: 'var(--cc-danger)', background: 'rgba(255,90,90,0.14)', boxShadow: '0 0 8px -2px var(--cc-danger)' },
}

function ChoiceCard({ variant = 'idle', onClick, disabled, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border px-3 py-2.5 text-left text-sm min-h-11 transition-colors disabled:cursor-default ${className}`}
      style={CARD_VARIANT_STYLE[variant]}
    >
      {children}
    </button>
  )
}

function DirectFactsStep({ persona, committedIds, onDone }) {
  const [options] = useState(() => {
    const distractorIds = pickDistractorCategories(committedIds, Math.min(4, 14 - committedIds.length))
    const all = [...committedIds, ...distractorIds]
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all
  })
  const [picks, setPicks] = useState({}) // categoryId -> 'correct' | 'incorrect'

  function pick(categoryId) {
    if (picks[categoryId]) return
    setPicks((prev) => ({ ...prev, [categoryId]: committedIds.includes(categoryId) ? 'correct' : 'incorrect' }))
  }

  const pickedCount = Object.keys(picks).length

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-base font-bold mt-0 mb-0">What can you directly tell about {persona.name}?</h3>
      <p className="text-sm text-[var(--cc-text-dim)] m-0">
        Tap anything you think {persona.name}'s posts actually show — some of these are real, some aren't.
      </p>
      <div role="group" aria-label="Direct-fact candidates" className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((id) => {
          const cat = SHARING_CATEGORIES.find((c) => c.id === id)
          const variant = picks[id] ?? 'idle'
          return (
            <ChoiceCard key={id} variant={variant} onClick={() => pick(id)} disabled={Boolean(picks[id])} className="flex flex-col items-center gap-1 text-center">
              <span aria-hidden="true">{cat.emoji}</span>
              <span className="text-xs leading-tight">{cat.label}</span>
              {picks[id] && (
                <span className="text-[10px]" style={{ color: variant === 'correct' ? 'var(--cc-good)' : 'var(--cc-danger)' }}>
                  {variant === 'correct' ? '✅ directly shown' : `❌ not in ${persona.name}'s posts`}
                </span>
              )}
            </ChoiceCard>
          )
        })}
      </div>
      <button
        onClick={() => onDone(picks)}
        disabled={pickedCount === 0}
        className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent-2)] text-[#1a0512] font-semibold min-h-11 disabled:opacity-40"
      >
        Continue to inferences →
      </button>
    </div>
  )
}

function InferenceCategoryGrid({ groundTruths, results, activeRiskId, onSelect }) {
  return (
    <div role="group" aria-label="Inference categories" className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {groundTruths.map((g) => {
        const risk = RISK_TYPES.find((r) => r.id === g.riskId)
        const done = results[g.riskId]
        const variant = done ? (done.valueCorrect && done.clueCorrect ? 'correct' : 'incorrect') : 'idle'
        return (
          <ChoiceCard
            key={g.riskId}
            variant={variant}
            onClick={() => onSelect(g.riskId)}
            disabled={Boolean(done) || activeRiskId === g.riskId}
            className="flex flex-col items-center gap-1 text-center"
          >
            <span aria-hidden="true">{risk?.icon}</span>
            <span className="text-xs leading-tight">{g.riskLabel}</span>
            {done && <span className="text-[10px]">{variant === 'correct' ? '✅ solved' : '❌ reviewed'}</span>}
          </ChoiceCard>
        )
      })}
    </div>
  )
}

function InferenceSubflow({ groundTruth, persona, committedIds, explanation, onComplete, onClose }) {
  const [valueOptions] = useState(() => getInferenceValueOptions(groundTruth.riskId, committedIds))
  const [chosenValue, setChosenValue] = useState(null)
  const [chosenClueId, setChosenClueId] = useState(null)

  const correctClueIds = useMemo(() => getInferenceClueCategoryIds(groundTruth.riskId, committedIds), [groundTruth.riskId, committedIds])

  function pickValue(value) {
    if (chosenValue) return
    setChosenValue(value)
  }

  function pickClue(categoryId) {
    if (chosenClueId) return
    setChosenClueId(categoryId)
    const clueCorrect = correctClueIds.includes(categoryId)
    const valueCorrect = chosenValue === valueOptions.correctValue
    onComplete({ riskId: groundTruth.riskId, valueCorrect, clueCorrect })
  }

  const valueCorrect = chosenValue != null && chosenValue === valueOptions.correctValue

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--cc-accent-2)', background: 'rgba(255,47,214,0.05)' }}>
      <p className="text-sm font-semibold m-0">What can you conclude about {groundTruth.riskLabel.toLowerCase()}?</p>
      <div className="flex flex-col gap-2">
        {valueOptions.options.map((value) => {
          const isChosen = chosenValue === value
          const variant = chosenValue == null ? 'idle' : isChosen ? (value === valueOptions.correctValue ? 'correct' : 'incorrect') : 'idle'
          return (
            <ChoiceCard key={value} variant={variant} onClick={() => pickValue(value)} disabled={Boolean(chosenValue)}>
              {value}
            </ChoiceCard>
          )
        })}
      </div>

      {chosenValue && (
        <p className="text-xs m-0" style={{ color: valueCorrect ? 'var(--cc-good)' : 'var(--cc-danger)' }}>
          {valueCorrect
            ? `✅ Right — that's a supported inference: ${valueOptions.correctValue.charAt(0).toLowerCase()}${valueOptions.correctValue.slice(1)}.`
            : chosenValue === NOT_ENOUGH_EVIDENCE
              ? `❌ There actually is enough evidence — ${valueOptions.correctValue.charAt(0).toLowerCase()}${valueOptions.correctValue.slice(1)}.`
              : `❌ Not quite — the actual inference is: ${valueOptions.correctValue.charAt(0).toLowerCase()}${valueOptions.correctValue.slice(1)}.`}
        </p>
      )}

      {chosenValue && (
        <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--cc-panel-border)' }}>
          <p className="text-sm font-semibold m-0">Which post supports that?</p>
          <div className="flex flex-col gap-2">
            {persona.posts.map((post) => {
              const isChosen = chosenClueId === post.categoryId
              const isCorrectPost = correctClueIds.includes(post.categoryId)
              const variant = chosenClueId == null ? 'idle' : isChosen ? (isCorrectPost ? 'correct' : 'incorrect') : 'idle'
              return (
                <ChoiceCard key={post.categoryId} variant={variant} onClick={() => pickClue(post.categoryId)} disabled={Boolean(chosenClueId)}>
                  <span className="text-xs text-[var(--cc-text-dim)]">{post.platform}</span>
                  <p className="m-0">{post.text}</p>
                </ChoiceCard>
              )
            })}
          </div>
          {chosenClueId && (
            <>
              <p className="text-xs m-0" style={{ color: correctClueIds.includes(chosenClueId) ? 'var(--cc-good)' : 'var(--cc-danger)' }}>
                {correctClueIds.includes(chosenClueId)
                  ? '✅ Right post — that one directly feeds this inference.'
                  : `❌ Not that one — the post(s) that actually feed this: ${persona.posts
                      .filter((p) => correctClueIds.includes(p.categoryId))
                      .map((p) => `"${p.text}"`)
                      .join(', ')}.`}
              </p>
              {explanation && <p className="text-xs text-[var(--cc-text-dim)] m-0">💡 {explanation}</p>}
              <button
                onClick={onClose}
                className="self-start px-4 py-2 rounded-lg border text-sm min-h-11"
                style={{ borderColor: 'var(--cc-panel-border)' }}
              >
                ← Back to categories
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function computeKeyLesson({ personaName, groundTruths, results, committedIds, directPicks }) {
  const firstMissedInference = groundTruths.find((g) => {
    const r = results[g.riskId]
    return !r || !r.valueCorrect || !r.clueCorrect
  })
  if (firstMissedInference) {
    const desc = firstMissedInference.description
    return `You missed that ${firstMissedInference.riskLabel.toLowerCase()} was inferable: ${desc.charAt(0).toLowerCase()}${desc.slice(1)}.`
  }
  const uncheckedDirect = committedIds.find((id) => directPicks[id] !== 'correct')
  if (uncheckedDirect) {
    const label = SHARING_CATEGORIES.find((c) => c.id === uncheckedDirect)?.label ?? uncheckedDirect
    return `You didn't confirm "${label}" was one of ${personaName}'s own posts — worth a second look next time.`
  }
  if (groundTruths.length === 0) {
    return `This exact mix of categories didn't create a strong inferable pattern for ${personaName} this round — that's a genuinely safer combination than most.`
  }
  return `You caught everything the engine flagged for ${personaName} — that's the full trail this persona's posts support.`
}

function Debrief({ persona, committedIds, directPicks, groundTruths, results, allChains }) {
  const directTotal = committedIds.length
  const directCorrect = Object.values(directPicks).filter((v) => v === 'correct').length
  const inferenceTotal = groundTruths.length
  const inferenceCorrect = Object.values(results).filter((r) => r.valueCorrect && r.clueCorrect).length
  const keyLesson = computeKeyLesson({ personaName: persona.name, groundTruths, results, committedIds, directPicks })

  const correctRiskIds = new Set(
    Object.entries(results)
      .filter(([, r]) => r.valueCorrect && r.clueCorrect)
      .map(([riskId]) => riskId),
  )
  const correctChains = allChains.filter((c) => correctRiskIds.has(c.riskId))
  const revealChains = correctChains.length > 0 ? correctChains : allChains

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-bold mt-0 mb-0">Investigation complete</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg p-3" style={{ background: 'var(--cc-bg-alt)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide m-0 mb-1 text-[var(--cc-text-dim)]">Direct facts</p>
          <p className="text-2xl font-bold m-0" style={{ color: 'var(--cc-accent)' }}>
            {directCorrect} / {directTotal}
          </p>
        </div>
        <div className="rounded-lg p-3" style={{ background: 'var(--cc-bg-alt)' }}>
          <p className="text-xs font-semibold uppercase tracking-wide m-0 mb-1 text-[var(--cc-text-dim)]">Inferences</p>
          <p className="text-2xl font-bold m-0" style={{ color: 'var(--cc-warn)' }}>
            {inferenceCorrect} / {inferenceTotal}
          </p>
        </div>
      </div>

      <p className="text-sm font-medium m-0 rounded-lg p-3 border-l-2" style={{ borderColor: 'var(--cc-accent-2)', background: 'var(--cc-bg-alt)' }}>
        🔑 {keyLesson}
      </p>

      <Panel brackets={false} style={{ borderColor: 'var(--cc-danger)', boxShadow: 'var(--cc-glow-danger)' }}>
        <h4 className="text-sm font-bold uppercase tracking-wide mb-3 mt-0" style={{ color: 'var(--cc-accent-2)' }}>
          Reveal the trail
        </h4>
        {revealChains.length > 0 ? (
          <ExposureChainDiagram chains={revealChains} />
        ) : (
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            No traceable chain for this exact mix of categories — this combination didn't line up into a strong
            inferable pattern.
          </p>
        )}
      </Panel>
    </div>
  )
}

function ScreenInvestigate({ persona, committedIds, groundTruths, riskExplanations, allChains }) {
  const [phase, setPhase] = useState('direct') // direct -> inference -> debrief
  const [directPicks, setDirectPicks] = useState(null)
  const [activeRiskId, setActiveRiskId] = useState(null)
  const [results, setResults] = useState({})

  if (!persona) {
    return <p className="text-sm text-[var(--cc-text-dim)]">Select some categories first to generate a persona.</p>
  }

  function handleDirectDone(picks) {
    setDirectPicks(picks)
    setPhase(groundTruths.length > 0 ? 'inference' : 'debrief')
  }

  function handleInferenceComplete({ riskId, valueCorrect, clueCorrect }) {
    setResults((prev) => ({ ...prev, [riskId]: { valueCorrect, clueCorrect } }))
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

      <div className="cc-role-reversal-line bg-[var(--cc-bg-alt)] rounded-lg p-4">
        <p className="font-bold m-0 mb-2">{persona.name}</p>
        <ul className="list-none p-0 m-0 flex flex-col gap-2 text-sm">
          {persona.posts.map((post) => (
            <li key={post.categoryId} className="border-b border-[var(--cc-panel-border)] pb-2 last:border-0 last:pb-0">
              <span className="text-xs text-[var(--cc-text-dim)]">{post.platform}</span>
              <p className="m-0">{post.text}</p>
            </li>
          ))}
        </ul>
      </div>

      {phase === 'direct' && <DirectFactsStep persona={persona} committedIds={committedIds} onDone={handleDirectDone} />}

      {phase === 'inference' && (
        <div className="flex flex-col gap-3">
          <h3 className="text-base font-bold mt-0 mb-0">What can you infer about {persona.name}?</h3>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            Only the categories our own scoring engine actually flagged as inferable from this exact mix of posts are
            shown below.
          </p>
          <InferenceCategoryGrid groundTruths={groundTruths} results={results} activeRiskId={activeRiskId} onSelect={setActiveRiskId} />
          {activeRiskId && (
            <InferenceSubflow
              groundTruth={groundTruths.find((g) => g.riskId === activeRiskId)}
              persona={persona}
              committedIds={committedIds}
              explanation={riskExplanations[activeRiskId]?.text}
              onComplete={handleInferenceComplete}
              onClose={() => setActiveRiskId(null)}
            />
          )}
          {Object.keys(results).length === groundTruths.length && (
            <button
              onClick={() => setPhase('debrief')}
              className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent-2)] text-[#1a0512] font-semibold min-h-11"
            >
              See my results →
            </button>
          )}
        </div>
      )}

      {phase === 'debrief' && (
        <Debrief
          persona={persona}
          committedIds={committedIds}
          directPicks={directPicks ?? {}}
          groundTruths={groundTruths}
          results={results}
          allChains={allChains}
        />
      )}
    </div>
  )
}
