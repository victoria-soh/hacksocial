// Privacy Mirror — layer 1: the deterministic risk-scoring engine. No model
// calls anywhere in this file. Every function here is pure (same input,
// same output, every time), which is what makes it possible to demo "toggle
// a checkbox, watch the score move" and to answer "how does the AI know
// this is risky?" honestly: it doesn't — this graph does. Layer 2 (see
// lib/ai.js) is only ever handed this module's OUTPUT to phrase in words.
import { SHARING_CATEGORIES, RISK_TYPES, BASE_WEIGHTS, BOOST_RULES } from '../data/privacyMirror'

function categoryLabel(id) {
  return SHARING_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

/** Every boost rule whose full category set is a subset of what's selected. */
export function firedBoostRules(selectedIds) {
  const selected = new Set(selectedIds)
  return BOOST_RULES.filter((rule) => rule.categories.every((c) => selected.has(c)))
}

/**
 * Each risk score = sum of base weights across selected categories, plus
 * every boost rule's contribution whose full category set is present.
 */
export function computeRiskScores(selectedIds) {
  const selected = new Set(selectedIds)
  const scores = Object.fromEntries(RISK_TYPES.map((r) => [r.id, 0]))
  for (const catId of selected) {
    const weights = BASE_WEIGHTS[catId]
    if (!weights) continue
    for (const risk of RISK_TYPES) scores[risk.id] += weights[risk.id] || 0
  }
  const fired = firedBoostRules(selectedIds)
  for (const rule of fired) {
    for (const [riskId, amount] of Object.entries(rule.risks)) {
      scores[riskId] = (scores[riskId] || 0) + amount
    }
  }
  return { scores, firedRules: fired }
}

// The true ceiling for each risk type — every category selected, every
// boost rule fired — computed from the tables themselves so it can never
// drift out of sync with them.
function computeMaxPossibleScores() {
  const max = Object.fromEntries(RISK_TYPES.map((r) => [r.id, 0]))
  for (const weights of Object.values(BASE_WEIGHTS)) {
    for (const risk of RISK_TYPES) max[risk.id] += weights[risk.id] || 0
  }
  for (const rule of BOOST_RULES) {
    for (const [riskId, amount] of Object.entries(rule.risks)) {
      max[riskId] = (max[riskId] || 0) + amount
    }
  }
  return max
}
export const MAX_POSSIBLE_SCORES = computeMaxPossibleScores()

const LEVEL_HIGH_PCT = 0.55
const LEVEL_MEDIUM_PCT = 0.28

export function riskLevel(score, riskId) {
  const max = MAX_POSSIBLE_SCORES[riskId] || 1
  const pct = max > 0 ? score / max : 0
  if (pct >= LEVEL_HIGH_PCT) return 'High'
  if (pct >= LEVEL_MEDIUM_PCT) return 'Medium'
  return 'Low'
}

const INFERABLE_LEVELS = new Set(['Medium', 'High'])

/** Risk types scoring above the "worth surfacing" threshold, highest first. */
export function getInferableRisks(scores) {
  return RISK_TYPES.map((r) => ({ ...r, score: scores[r.id], level: riskLevel(scores[r.id], r.id) }))
    .filter((r) => INFERABLE_LEVELS.has(r.level))
    .sort((a, b) => b.score - a.score)
}

/**
 * Deterministic grounding for a why-explanation on one risk type: which
 * fired boost rule (if any) contributes most to it, plus which selected
 * categories contribute the most base weight. Layer 2 is only allowed to
 * phrase this — it never decides which rule/categories "caused" the score.
 */
export function explainGrounding(riskId, selectedIds) {
  const { firedRules } = computeRiskScores(selectedIds)
  const relevantRules = firedRules
    .filter((r) => riskId in r.risks)
    .sort((a, b) => b.risks[riskId] - a.risks[riskId])
  const topCategories = [...selectedIds]
    .map((id) => ({ id, weight: BASE_WEIGHTS[id]?.[riskId] || 0 }))
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((c) => c.id)
  return { riskId, topRule: relevantRules[0] || null, topCategories }
}

/**
 * The ground-truth inferable-fact descriptions used both for screen 2's
 * "Potentially inferable" column and screen 3's grading. Always the final
 * step of the top-contributing boost rule's chain (or, if no rule fired for
 * that risk type, a plain listing of the top base-weight categories) —
 * never model-generated, so grading a player's guess against these is a
 * comparison against a fact this engine decided, not something an LLM
 * asserted after the fact.
 */
export function getGroundTruthInferences(selectedIds) {
  const { scores } = computeRiskScores(selectedIds)
  return getInferableRisks(scores).map((r) => {
    const grounding = explainGrounding(r.id, selectedIds)
    const description = grounding.topRule
      ? grounding.topRule.chain[grounding.topRule.chain.length - 1]
      : `${r.label} is inferable from: ${grounding.topCategories.map(categoryLabel).join(' + ')}`
    return {
      riskId: r.id,
      riskLabel: r.label,
      score: r.score,
      level: r.level,
      description,
      groundingRuleId: grounding.topRule?.id ?? null,
      grounding,
    }
  })
}

/**
 * Up to `max` exposure chains to render in the diagram — the highest-
 * scoring inferable risks, traced back through whichever fired boost rule
 * actually produced them. A risk with no fired rule behind it has nothing
 * to chain and is skipped, so the diagram never shows a fabricated chain.
 */
export function getTopChains(selectedIds, max = 2) {
  const { scores } = computeRiskScores(selectedIds)
  const inferable = getInferableRisks(scores)
  const chains = []
  const usedRuleIds = new Set()
  for (const risk of inferable) {
    if (chains.length >= max) break
    const grounding = explainGrounding(risk.id, selectedIds)
    if (grounding.topRule && !usedRuleIds.has(grounding.topRule.id)) {
      usedRuleIds.add(grounding.topRule.id)
      chains.push({ riskId: risk.id, riskLabel: risk.label, rule: grounding.topRule })
    }
  }
  return chains
}
