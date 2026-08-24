// Deterministic scoring/grading logic used across districts. Nothing in
// this file calls a model — see lib/ai.js's header comment for why.

// ---------------------------------------------------------------------------
// Digital Breadcrumbs: Privacy Defence Score
// ---------------------------------------------------------------------------

export const PRIVACY_SCORE_BASE = 57

export const PRIVACY_SCORE_INCREMENTS = {
  'break-the-trail': 12,
  'birthday-ghost': 9,
  'who-can-see-me': 9,
}

export function calculatePrivacyDefenceScore(checklist) {
  let score = PRIVACY_SCORE_BASE
  for (const [id, done] of Object.entries(checklist)) {
    if (done && PRIVACY_SCORE_INCREMENTS[id]) {
      score += PRIVACY_SCORE_INCREMENTS[id]
    }
  }
  return Math.min(100, score)
}

export function strongestAndWeakestArea(checklist, areaLabels) {
  const done = Object.entries(checklist).filter(([, v]) => v).map(([k]) => k)
  const pending = Object.entries(checklist).filter(([, v]) => !v).map(([k]) => k)
  return {
    strongest: done.length > 0 ? areaLabels[done[done.length - 1]] : null,
    biggestExposure: pending.length > 0 ? areaLabels[pending[0]] : null,
  }
}

// ---------------------------------------------------------------------------
// Digital Breadcrumbs: the three interactive Privacy Defence Score missions
// (Break the Trail, Birthday Ghost, Who Can See Me?) — replacing what used
// to be self-report checkboxes with a genuine short scenario each. Content
// for these lives in data/privacyMissions.js; a shared pass threshold keeps
// all three to the same bar. XP/score-recalculation elsewhere is unchanged
// — only how a mission gets marked complete changed.
// ---------------------------------------------------------------------------

export const PRIVACY_MISSION_PASS_THRESHOLD = 75

/** Break the Trail: did the player's privacy zone actually cover the sensitive point with a reasonable radius? */
export function scoreBreakTheTrail(zone, target) {
  const distance = Math.hypot(zone.x - target.startPoint.x, zone.y - target.startPoint.y)
  const covered = distance <= zone.radius
  const bigEnough = zone.radius >= target.minRadius
  const passed = covered && bigEnough
  return { covered, bigEnough, passed, score: passed ? 100 : 0 }
}

/**
 * Birthday Ghost: score is purely leaksFixed / totalLeaks — decoys never
 * add to or subtract from it either way, only surfaced separately so the
 * UI can give calm (not punitive) feedback about them.
 */
export function scoreBirthdayGhost(fixedIds, elements) {
  const fixed = new Set(fixedIds)
  const leaks = elements.filter((e) => e.isLeak)
  const leaksFixed = leaks.filter((e) => fixed.has(e.id)).length
  const decoysFixed = elements.filter((e) => !e.isLeak && fixed.has(e.id)).length
  const score = leaks.length > 0 ? Math.round((leaksFixed / leaks.length) * 100) : 0
  return { leaksFixed, totalLeaks: leaks.length, decoysFixed, score, passed: score >= PRIVACY_MISSION_PASS_THRESHOLD }
}

/** Who Can See Me?: every field just needs to not be left Public — Friends or Only Me both count. */
export function scoreWhoCanSeeMe(settings, fields) {
  const stillPublic = fields.filter((f) => settings[f.id] === 'public')
  const correct = fields.length - stillPublic.length
  const score = fields.length > 0 ? Math.round((correct / fields.length) * 100) : 0
  return {
    correct,
    total: fields.length,
    stillPublic: stillPublic.map((f) => f.label),
    score,
    passed: score >= PRIVACY_MISSION_PASS_THRESHOLD,
  }
}

// ---------------------------------------------------------------------------
// Digital Breadcrumbs: "Stranger Knowledge" exposure meter. Weighted by the
// same fact/inference-sensitivity tiers already shown on the case board, so
// unlocking one high-sensitivity inference climbs the meter more than one
// routine fact — framed as a threat growing, not a score to maximize.
// ---------------------------------------------------------------------------

export const EXPOSURE_TIER_WEIGHT = { fact: 1, low: 2, medium: 3, high: 4 }

function exposureWeightFor(node) {
  if (!node) return 0
  return node.type === 'fact' ? EXPOSURE_TIER_WEIGHT.fact : (EXPOSURE_TIER_WEIGHT[node.sensitivity] ?? 0)
}

/** unlockedNodeIds: Set of node ids already revealed this playthrough. nodes: the full node map (facts + inferences). */
export function computeExposurePercent(unlockedNodeIds, nodes) {
  const totalWeight = Object.values(nodes).reduce((sum, n) => sum + exposureWeightFor(n), 0)
  if (totalWeight === 0) return 0
  const unlockedWeight = [...unlockedNodeIds].reduce((sum, id) => sum + exposureWeightFor(nodes[id]), 0)
  return Math.round((unlockedWeight / totalWeight) * 100)
}

// ---------------------------------------------------------------------------
// Digital Breadcrumbs: Detective Mode — an optional, replay-only timed run
// of Find Alex (never offered on a player's first playthrough). No-penalty
// retries still apply; going slower from a retry is simply reflected in the
// elapsed time rather than a separate penalty.
// ---------------------------------------------------------------------------

export const DETECTIVE_MODE_TIME_LIMIT_SECONDS = 180
export const DETECTIVE_MODE_BONUS_XP = 50

export function computeDetectiveBonus(elapsedSeconds) {
  return elapsedSeconds <= DETECTIVE_MODE_TIME_LIMIT_SECONDS ? DETECTIVE_MODE_BONUS_XP : 0
}

// ---------------------------------------------------------------------------
// Daily Challenge: rapid-fire "scam or legit" mini-game scoring. Pure
// arithmetic over the caller's recorded per-item results — no randomness,
// no AI. Reuses gradeForScore below for the round's final grade rather than
// inventing a parallel tier system.
// ---------------------------------------------------------------------------

export const DAILY_CHALLENGE_BASE_XP = 10
export const DAILY_CHALLENGE_MAX_BONUS_XP = 30

/**
 * @param {{ correct: boolean, timedOut: boolean, responseMs: number|null }[]} results
 */
export function scoreDailyChallengeRound(results) {
  const total = results.length
  const correct = results.filter((r) => r.correct).length
  const accuracyScore = total > 0 ? Math.round((correct / total) * 100) : 0
  const answered = results.filter((r) => !r.timedOut && typeof r.responseMs === 'number')
  const avgResponseMs =
    answered.length > 0 ? Math.round(answered.reduce((sum, r) => sum + r.responseMs, 0) / answered.length) : null
  const xpEarned = DAILY_CHALLENGE_BASE_XP + Math.round((accuracyScore / 100) * DAILY_CHALLENGE_MAX_BONUS_XP)
  return { correct, total, accuracyScore, avgResponseMs, xpEarned }
}

// ---------------------------------------------------------------------------
// Recovery Rush: incident-response scoring + grading
// ---------------------------------------------------------------------------

// Shared 0-100 "how good is this" color tier — used anywhere a score gets
// a visual meter (Recovery Rush's debrief ring/bars, Community Centre's
// mission-outcome ring) so the same number always reads the same color
// across the whole app, never redefined per screen.
export function scoreTierColor(score) {
  if (score >= 75) return 'var(--cc-good)'
  if (score >= 50) return 'var(--cc-warn)'
  return 'var(--cc-danger)'
}

export function gradeForScore(score) {
  if (score >= 90) return { label: 'Cyber Responder', icon: '🛡️' }
  if (score >= 75) return { label: 'Quick Recoverer', icon: '⚡' }
  if (score >= 50) return { label: 'Getting There', icon: '🧯' }
  return { label: 'Needs Practice', icon: '📚' }
}

// Recovery Rush hub: a 3-tier "how ready is CyberCity for this incident
// type" label, using the exact same 75/50 thresholds as scoreTierColor
// above so the label and its color always agree — Vulnerable is always
// red, Developing always amber, Resilient always green.
export function responseReadinessLabel(score) {
  if (score >= 75) return 'Resilient'
  if (score >= 50) return 'Developing'
  return 'Vulnerable'
}

/**
 * score = 100, minus penalties for: accounts permanently lost, accounts left
 * exposed at containment, trap actions taken, and time overrun. Everything
 * here is arithmetic over facts the caller already computed from the graph
 * — no judgment calls happen in this function.
 */
export function scoreRecoveryRun({
  accountsLost,
  accountsExposedAtEnd,
  trapActionsTaken,
  secondsUsed,
  timeLimitSeconds,
  wrongOrderPenalties,
}) {
  let score = 100
  score -= accountsLost * 15
  score -= accountsExposedAtEnd * 8
  score -= trapActionsTaken * 10
  score -= wrongOrderPenalties * 12
  if (secondsUsed > timeLimitSeconds) {
    score -= Math.ceil((secondsUsed - timeLimitSeconds) / 15) * 5
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * A visual breakdown of the same four penalty sources scoreRecoveryRun
 * already applies to one combined number — decomposed into four
 * independent 0-100 category readouts for the debrief screen's meters.
 * Each category uses the exact same per-unit weight as the real score
 * function (nothing new invented here), it's just presented one dimension
 * at a time instead of pre-summed. Because each category starts its own
 * fresh 100 rather than sharing one pool, these four numbers won't average
 * back to the overall score when a run has penalties in multiple
 * categories — they're a "here's roughly how each dimension went"
 * supplement to the real score, not an alternate computation of it.
 */
export function computeRecoveryBreakdown({
  accountsLost,
  accountsExposedAtEnd,
  trapActionsTaken,
  wrongOrderPenalties,
  secondsUsed,
  timeLimitSeconds,
}) {
  const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))
  const overrunPenalty = secondsUsed > timeLimitSeconds ? Math.ceil((secondsUsed - timeLimitSeconds) / 15) * 5 : 0
  return {
    priority: clamp(100 - wrongOrderPenalties * 12 - trapActionsTaken * 10),
    containment: clamp(100 - accountsExposedAtEnd * 8),
    recovery: clamp(100 - accountsLost * 15),
    speed: clamp(100 - overrunPenalty),
  }
}

export function scoreResidentMission({ correctChoice, clarity }) {
  const choiceScore = correctChoice ? 50 : 0
  const clarityScore = clarity.clear ? 50 : Math.max(0, 50 - clarity.issues.length * 15)
  return Math.round(choiceScore + clarityScore)
}

// ---------------------------------------------------------------------------
// Community Centre: deterministic reply-tile rubric. The player assembles a
// reply from tiles (data/communityCentre.js's `replyTiles`) instead of free
// text — grading is a set comparison against that resident's own tile data,
// never text parsing or an AI judgment call. Returns the same
// { clear, issues } shape the mission's decision-choice scoring already
// expects, so scoreResidentMission above needed no changes.
// ---------------------------------------------------------------------------

export function scoreTileReply(selectedTileIds, replyTiles) {
  const selected = new Set(selectedTileIds)
  const issues = []

  const missingCore = replyTiles.core.filter((t) => !selected.has(t.id))
  if (missingCore.length > 0) {
    issues.push(`Missing key part(s) of a safe reply: ${missingCore.map((t) => `"${t.text}"`).join(', ')}`)
  }

  const jargonSelected = replyTiles.distractors.filter((t) => t.type === 'jargon' && selected.has(t.id))
  if (jargonSelected.length > 0) {
    issues.push(`Uses technical term(s) without a plain-language explanation: ${jargonSelected.map((t) => t.text).join(', ')}`)
  }

  const badAdviceSelected = replyTiles.distractors.filter((t) => t.type === 'bad-advice' && selected.has(t.id))
  if (badAdviceSelected.length > 0) {
    issues.push(`Includes unsafe or unhelpful advice: ${badAdviceSelected.map((t) => t.text).join(', ')}`)
  }

  return {
    clear: issues.length === 0,
    issues,
    jargonFound: jargonSelected.map((t) => t.text),
  }
}

// ---------------------------------------------------------------------------
// Phase 4: difficulty-adaptive bonus round scoring. The model (see
// lib/ai.js's generateScamExample) only ever authors content plus its own
// answer key at generation time; that answer key is then treated as fixed
// ground truth here — grading a player's later selection is pure set
// comparison, never a live model judgment.
// ---------------------------------------------------------------------------

/**
 * Picks a difficulty tier from the player's last ~10 graded choices
 * (Community Centre strategy picks + daily streak picks — see
 * GameContext's recordAttempt). Deterministic arithmetic over stored data;
 * the model never decides this.
 */
export function computeDifficultyTier(recentAttempts) {
  if (!recentAttempts || recentAttempts.length < 3) return 'beginner'
  const accuracy = recentAttempts.filter((a) => a.correct).length / recentAttempts.length
  if (accuracy >= 0.75) return 'advanced'
  if (accuracy >= 0.4) return 'intermediate'
  return 'beginner'
}

export function scoreBonusRoundSelection(selectedIds, redFlagIds) {
  const selected = new Set(selectedIds)
  const correct = new Set(redFlagIds)
  let hits = 0
  for (const id of correct) if (selected.has(id)) hits++
  let falsePositives = 0
  for (const id of selected) if (!correct.has(id)) falsePositives++
  const allCorrect = hits === correct.size && falsePositives === 0
  return { correct: allCorrect, hits, total: correct.size, falsePositives }
}
