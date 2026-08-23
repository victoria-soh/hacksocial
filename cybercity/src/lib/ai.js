// Single choke point for every LLM call in CyberCity.
//
// AI ARCHITECTURE PRINCIPLE: deterministic facts (which accounts are
// connected, what the correct action order is, whether a choice was right)
// are always computed by our own code in src/data and src/lib/scoring.js.
// The functions below only (1) extract structure from free text the player
// typed, (2) narrate/explain facts we already computed, in plain language,
// or (3) generate new example content inside a rubric we control. None of
// them are allowed to decide "correctness" — callers pass in the verdict,
// the AI just puts it into words (or, for extraction, its output is treated
// as a first draft and never silently trusted for scoring).
//
// Swapping providers = editing callModel() only. Everything else in the app
// calls the task-specific helpers further down this file.
import { completeAi, fetchAiStatus } from './api'
import { SHARING_CATEGORIES, PERSONA_NAME_POOL, PERSONA_POST_TEMPLATES } from '../data/privacyMirror'

let statusCache = null // { available, checkedAt } | null
const STATUS_CACHE_MS = 30000
// When the backend isn't running at all (vs. running but erroring), the
// browser's own localhost IPv6-then-IPv4 fallback can take 2+ seconds to
// actually reject the fetch — far too slow for what's meant to be a quick
// capability probe behind a UI notice. Aborting after 1.5s and treating
// that the same as "unavailable" keeps the notice snappy either way.
const STATUS_CHECK_TIMEOUT_MS = 1500

/**
 * Whether the backend is actually configured to reach Anthropic — used by
 * the "using local analysis" / "using a built-in example pool" UI notices.
 * Cached briefly so every component checking this on mount doesn't fire a
 * fresh request each time; pass { force: true } to bypass the cache (e.g.
 * after a config change). Never throws — an unreachable backend just reads
 * as "not available", same as a backend that's up but has no key.
 */
export async function checkAiAvailable({ force = false } = {}) {
  if (!force && statusCache && Date.now() - statusCache.checkedAt < STATUS_CACHE_MS) {
    return statusCache.available
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), STATUS_CHECK_TIMEOUT_MS)
  try {
    const data = await fetchAiStatus(controller.signal)
    statusCache = { available: Boolean(data.available), checkedAt: Date.now() }
  } catch {
    statusCache = { available: false, checkedAt: Date.now() }
  } finally {
    clearTimeout(timeout)
  }
  return statusCache.available
}

/**
 * Low-level provider call — routed through our own backend's
 * POST /api/ai/complete (server/index.js), which holds the actual Anthropic
 * API key. The key never reaches the browser. If the backend has no key
 * configured, isn't reachable, or the call otherwise fails, this throws so
 * callers fall back to their local heuristic.
 */
async function callModel({ system, prompt, maxTokens = 600 }) {
  const { text } = await completeAi({ system, prompt, maxTokens })
  if (typeof text !== 'string') {
    throw new Error('malformed-response')
  }
  return text
}

function extractJson(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('no-json-in-response')
  return JSON.parse(match[0])
}

// ---------------------------------------------------------------------------
// Task 2: narrate what went wrong in a Recovery Rush run, grounded in the
// deterministic choices + graph facts the player actually produced.
// ---------------------------------------------------------------------------

const MISTAKE_SYSTEM_PROMPT = `You are a calm, encouraging incident-response coach in a cybersecurity game called CyberCity.
You will be given: the ordered list of actions a player took (with timestamps), the account dependency graph, and which mistakes our game logic already detected (ground truth — do not contradict it or invent new mistakes).
Write a short (3-5 sentence) plain-language explanation of what went well and what went wrong, referencing the SPECIFIC accounts and order involved. No jargon without a one-clause explanation. Do not restate the score. Do not invent facts not present in the input.`

function heuristicExplainMistakes({ detectedMistakes }) {
  if (detectedMistakes.length === 0) {
    return "You secured the root account first and worked outward through the dependency graph — that's exactly the right order, because fixing the compromised account first stops the attacker from just re-breaking anything you secure afterward. Nicely contained."
  }
  const lines = detectedMistakes.map((m) => m.explanation)
  return `${lines.join(' ')} Next time, work from the root of the compromise outward: secure and lock down the account the attacker actually controls before touching anything downstream.`
}

export async function explainRecoveryMistakes({ orderedActions, detectedMistakes, graphSummary }) {
  try {
    const prompt = JSON.stringify({ orderedActions, detectedMistakes, graphSummary })
    const text = await callModel({ system: MISTAKE_SYSTEM_PROMPT, prompt, maxTokens: 300 })
    if (text && text.trim().length > 0) return { text: text.trim(), source: 'model' }
    throw new Error('empty-response')
  } catch {
    return { text: heuristicExplainMistakes({ orderedActions, detectedMistakes }), source: 'heuristic' }
  }
}

// ---------------------------------------------------------------------------
// Task 3 (Phase 4): generate a scam/phishing example at a target difficulty,
// PLUS its own answer key, in one call. The answer key is captured at
// generation time and from then on treated as fixed ground truth by
// lib/scoring.js's scoreBonusRoundSelection — the model is never asked to
// grade a player's later answer, only to author content once.
// ---------------------------------------------------------------------------

const SCAM_EXAMPLE_SYSTEM_PROMPT = `You write short, realistic example scam/phishing messages for a cybersecurity education game called CyberCity, at a requested difficulty tier:
- "beginner": obvious tells — urgency, spelling/grammar mistakes, a generic greeting, an implausible offer.
- "intermediate": mostly plausible, one or two genuine tells, correct grammar.
- "advanced": highly plausible, correct branding/tone, no grammar errors, only a subtle red flag (e.g. a slightly-wrong domain).
Respond with ONLY a JSON object of this exact shape:
{"sender": string, "text": string, "redFlags": string[], "plausibleButSafe": string[]}
"redFlags" are the genuine tells you deliberately embedded (2-3 short phrases quoting or describing the specific detail). "plausibleButSafe" are 1-2 details in the message that might LOOK suspicious to a nervous reader but are actually normal/not indicators of a scam. Never include any commentary outside the JSON. This is for a fictional practice exercise — do not reference any real company's actual current security incidents.`

function normalizeScamExample(raw, difficulty, source) {
  const redFlags = raw.redFlags.map((text, i) => ({ id: `flag-${i}`, text }))
  const plausibleButSafe = raw.plausibleButSafe.map((text, i) => ({ id: `safe-${i}`, text }))
  return {
    message: { sender: raw.sender, text: raw.text },
    redFlags,
    plausibleButSafe,
    difficulty,
    source,
  }
}

export async function generateScamExample(difficulty) {
  try {
    const raw = await callModel({
      system: SCAM_EXAMPLE_SYSTEM_PROMPT,
      prompt: `Difficulty: ${difficulty}`,
      maxTokens: 500,
    })
    const parsed = extractJson(raw)
    if (
      typeof parsed.sender === 'string' &&
      typeof parsed.text === 'string' &&
      Array.isArray(parsed.redFlags) &&
      parsed.redFlags.length > 0 &&
      Array.isArray(parsed.plausibleButSafe)
    ) {
      return normalizeScamExample(parsed, difficulty, 'model')
    }
    throw new Error('malformed-response')
  } catch {
    const { pickFallbackExample } = await import('../data/scamExamples')
    const fallback = pickFallbackExample(difficulty)
    return normalizeScamExample(
      { sender: fallback.message.sender, text: fallback.message.text, redFlags: fallback.redFlags, plausibleButSafe: fallback.plausibleButSafe },
      difficulty,
      'heuristic',
    )
  }
}

// ---------------------------------------------------------------------------
// Task 4: Privacy Mirror — layer 2 (generative). This is the ONLY place in
// the feature that calls a model. It never decides a risk level, an
// inferable/not verdict, or a matched/missed grade — lib/privacyMirrorEngine.js
// and lib/privacyMirrorSimilarity.js (layer 1, no model calls, fully
// deterministic) already decided those. Every function below is handed that
// decision as structured input and only turns it into a sentence, or
// generates flavor content (a fictional name, sample posts) inside a rubric
// layer 1 already fixed. If asked "how does the AI know this is risky?" the
// honest answer is: it doesn't — the graph does. The model just writes it.
function categoryLabel(id) {
  return SHARING_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

function stableRandom(seed) {
  return ((seed * 2654435761) % 2147483647) / 2147483647
}

function hashSelection(selectedIds) {
  const s = [...selectedIds].sort().join('|')
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h || 1
}

const RISK_EXPLANATION_SYSTEM_PROMPT = `You are a calm privacy-education narrator inside a game called CyberCity.
You will be given a risk type and the SPECIFIC reasoning chain (or specific categories) our own scoring engine already determined caused it to be inferable — this is ground truth, not your judgment.
Write ONE short sentence (max ~25 words) explaining, in plain language, why this is inferable — referencing the actual chain/categories given. Do not invent new categories or reasons. Do not mention scores, numbers, or percentages. Respond with only the sentence, no quotes.`

function heuristicExplainRisk({ riskLabel, chain, categoryLabels }) {
  if (chain) {
    // Each chain step is already written as a complete short clause (see
    // data/privacyMirror.js's BOOST_RULES), so joining them as sentences
    // reads naturally without needing to graft on our own connective words.
    return `${chain[0]}. ${chain[1]}. ${chain[2]}.`
  }
  return `${riskLabel} is inferable just from what you selected: ${categoryLabels.join(', ')}.`
}

/**
 * grounding: the exact object lib/privacyMirrorEngine.js's explainGrounding()
 * produced for one risk type — { topRule: {chain,...}|null, topCategories }.
 */
export async function explainPrivacyMirrorRisk(riskLabel, grounding) {
  const chain = grounding.topRule?.chain ?? null
  const categoryLabels = grounding.topCategories.map(categoryLabel)
  try {
    const prompt = JSON.stringify({ riskLabel, chain, categories: categoryLabels })
    const text = await callModel({ system: RISK_EXPLANATION_SYSTEM_PROMPT, prompt, maxTokens: 100 })
    if (text && text.trim().length > 0) return { text: text.trim(), source: 'model' }
    throw new Error('empty-response')
  } catch {
    return { text: heuristicExplainRisk({ riskLabel, chain, categoryLabels }), source: 'heuristic' }
  }
}

const PERSONA_SYSTEM_PROMPT = `You invent a short fictional social-media persona for a privacy-education game called CyberCity.
You will be given a list of "sharing category" labels (things this fictional person posts about) — nothing else. No real person's data is involved.
Invent a plausible full name, and one short, platform-native sample post per category given (skip the least essential ones if there are more than 5, so you produce between 3 and 5 posts total). Each post should read like something a real person would actually post — casual, short, with an emoji where natural — and clearly relate to its category.
Respond with ONLY a JSON object: {"name": string, "posts": [{"platform": string, "text": string}]}. No commentary outside the JSON.`

function heuristicGeneratePersona(selectedIds) {
  const seed = hashSelection(selectedIds)
  const name = PERSONA_NAME_POOL[Math.floor(stableRandom(seed) * PERSONA_NAME_POOL.length)]
  const orderedIds = SHARING_CATEGORIES.map((c) => c.id).filter((id) => selectedIds.includes(id))
  const posts = orderedIds.slice(0, 5).map((id) => PERSONA_POST_TEMPLATES[id])
  return { name, posts }
}

/** selectedIds: the same category ids the player chose in screen 1 — the ONLY input this persona is conditioned on. */
export async function generatePrivacyMirrorPersona(selectedIds) {
  const categoryLabels = selectedIds.map(categoryLabel)
  try {
    const text = await callModel({
      system: PERSONA_SYSTEM_PROMPT,
      prompt: JSON.stringify({ categories: categoryLabels }),
      maxTokens: 500,
    })
    const parsed = extractJson(text)
    if (typeof parsed.name === 'string' && Array.isArray(parsed.posts) && parsed.posts.length > 0) {
      return { name: parsed.name, posts: parsed.posts, source: 'model' }
    }
    throw new Error('malformed-response')
  } catch {
    return { ...heuristicGeneratePersona(selectedIds), source: 'heuristic' }
  }
}

const FEEDBACK_SYSTEM_PROMPT = `You are a calm, encouraging privacy-education coach in a game called CyberCity.
A player guessed what a fictional persona's daily routine/location might be. You will be given, per inferable fact: its description, whether our own similarity-grading engine already marked it matched or missed (ground truth — do not re-judge or contradict it), and which combination of categories made it inferable.
Write a short (3-5 sentence) plain-language summary: what the player correctly picked up on, what they missed, and briefly why the missed item was inferable anyway (referencing the actual categories). Encouraging tone, no jargon without explanation. Do not invent facts not present in the input.`

function heuristicExplainFeedback(verdicts) {
  const matched = verdicts.filter((v) => v.matched)
  const missed = verdicts.filter((v) => !v.matched)
  const parts = []
  if (matched.length > 0) {
    parts.push(`You picked up on ${matched.map((v) => v.riskLabel.toLowerCase()).join(' and ')} — nice read.`)
  } else {
    parts.push("You didn't land on any of it this time — that's exactly why this stuff is easy to miss.")
  }
  if (missed.length > 0) {
    const first = missed[0]
    parts.push(
      `You missed ${missed.map((v) => v.riskLabel.toLowerCase()).join(' and ')}: ${first.description.charAt(0).toLowerCase()}${first.description.slice(1)}.`,
    )
  } else {
    parts.push('You caught everything the engine flagged as inferable.')
  }
  return parts.join(' ')
}

/** verdicts: lib/privacyMirrorSimilarity.js's gradeGuess() output — the model only phrases this, never re-grades it. */
export async function explainPrivacyMirrorFeedback(verdicts, personaName) {
  try {
    const prompt = JSON.stringify({
      personaName,
      items: verdicts.map((v) => ({ riskLabel: v.riskLabel, description: v.description, matched: v.matched })),
    })
    const text = await callModel({ system: FEEDBACK_SYSTEM_PROMPT, prompt, maxTokens: 300 })
    if (text && text.trim().length > 0) return { text: text.trim(), source: 'model' }
    throw new Error('empty-response')
  } catch {
    return { text: heuristicExplainFeedback(verdicts), source: 'heuristic' }
  }
}
