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
 * Safety net for the "no markdown" instruction every system prompt below
 * now carries — the prompt asks nicely, this makes sure a generation that
 * ignores it still never reaches a player as raw `**`/`_`/`` ` ``. Only
 * unwraps PAIRED emphasis markers (removes the markers, keeps the text
 * between them) rather than deleting every asterisk/underscore outright —
 * a generated phishing message can legitimately contain a lone one (e.g.
 * "50% off*" or a code-like domain), and mangling that content would be
 * worse than the formatting bug. Underscore pairs specifically skip
 * intraword matches (CommonMark's own rule for `_..._`) so real
 * identifiers/usernames/domains like "get_user_data" or "alex_t" survive
 * untouched — only markdown-style emphasis at a word boundary is unwrapped.
 * Also unwraps [label](url) link syntax down to just the label — caught
 * live in a Training Simulation sender field despite the prompt asking for
 * plain prose, so it's the one pattern here not in the original spec.
 * Applied here, at the one choke point every AI-backed feature already
 * routes through, so this covers all of them without each caller needing
 * its own copy. Output stays plain text — never rendered as HTML — so this
 * can't become a markdown-to-HTML injection path.
 */
function sanitizeModelText(text) {
  let out = text
  out = out.replace(/\[([^\]\n]+?)\]\([^)\n]+?\)/g, '$1') // [label](url) link syntax — keep the label, drop the URL
  out = out.replace(/\*\*([^*\n]+?)\*\*/g, '$1') // **bold**
  out = out.replace(/(?<!\w)__([^_\n]+?)__(?!\w)/g, '$1') // __bold__ (not intraword)
  out = out.replace(/\*([^*\n]+?)\*/g, '$1') // *italic*
  out = out.replace(/(?<!\w)_([^_\n]+?)_(?!\w)/g, '$1') // _italic_ (not intraword)
  out = out.replace(/`([^`\n]+?)`/g, '$1') // `code`
  out = out.replace(/^#{1,6}\s+/gm, '') // leading "# " heading markers
  out = out.replace(/^(\s*)[-*]\s+/gm, '$1') // leading "- " / "* " list markers
  return out
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
  return sanitizeModelText(text)
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
You will be given: the ordered list of actions a player took (with timestamps), the account dependency graph, whether the incident actually ended contained or timed out, and which mistakes our game logic already detected (ground truth — do not contradict it or invent new mistakes). A player can end up with zero detected mistakes and STILL not have contained the incident, e.g. by taking too few actions or running out of time passively — never describe a run as successfully contained unless "contained" is true.
Write a short (3-5 sentence) plain-language explanation of what went well and what went wrong, referencing the SPECIFIC accounts and order involved. No jargon without a one-clause explanation. Do not restate the score. Do not invent facts not present in the input.
Output plain prose only — no markdown formatting: no asterisks, underscores, backticks, headers, bullet syntax, or [link](url) syntax.`

function heuristicExplainMistakes({ detectedMistakes, contained }) {
  if (detectedMistakes.length === 0 && contained) {
    return "You secured the root account first and worked outward through the dependency graph — that's exactly the right order, because fixing the compromised account first stops the attacker from just re-breaking anything you secure afterward. Nicely contained."
  }
  if (detectedMistakes.length === 0) {
    return "No specific wrong move was flagged, but time ran out before the incident was fully contained — staying passive costs just as much ground as an active mistake does. Next time, secure the root account first, then work outward through the dependency graph before the clock runs out."
  }
  const lines = detectedMistakes.map((m) => m.explanation)
  return `${lines.join(' ')} Next time, work from the root of the compromise outward: secure and lock down the account the attacker actually controls before touching anything downstream.`
}

export async function explainRecoveryMistakes({ orderedActions, detectedMistakes, graphSummary, contained }) {
  try {
    const prompt = JSON.stringify({ orderedActions, detectedMistakes, graphSummary, contained })
    const text = await callModel({ system: MISTAKE_SYSTEM_PROMPT, prompt, maxTokens: 300 })
    if (text && text.trim().length > 0) return { text: text.trim(), source: 'model' }
    throw new Error('empty-response')
  } catch {
    return { text: heuristicExplainMistakes({ detectedMistakes, contained }), source: 'heuristic' }
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
"redFlags" are the genuine tells you deliberately embedded (2-3 short phrases quoting or describing the specific detail). "plausibleButSafe" are 1-2 details in the message that might LOOK suspicious to a nervous reader but are actually normal/not indicators of a scam. Never include any commentary outside the JSON. This is for a fictional practice exercise — do not reference any real company's actual current security incidents.
Every string value (sender, text, and each list entry) must be plain prose with no markdown formatting: no asterisks, underscores, backticks, headers, bullet syntax, or [link](url) syntax.`

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
// Task 4: Privacy Mirror — layer 2 (generative). It never decides a risk
// level or an inferable/not verdict — lib/privacyMirrorEngine.js (layer 1,
// no model calls, fully deterministic) already decided that. Each function
// below is handed that decision as structured input and only turns it into
// a sentence. (generatePrivacyMirrorPersona below is deterministic too —
// see its own comment for why.) If asked "how does the AI know this is
// risky?" the honest answer is: it doesn't — the graph does. The model just
// writes it.
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
Write ONE short sentence (max ~25 words) explaining, in plain language, why this is inferable — referencing the actual chain/categories given. Do not invent new categories or reasons. Do not mention scores, numbers, or percentages. Respond with only the sentence, no quotes.
Plain prose only — no markdown formatting: no asterisks, underscores, backticks, headers, bullet syntax, or [link](url) syntax.`

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

/**
 * The switch-sides investigation's grading needs to know exactly which post
 * came from which sharing category (to check "which post supports this
 * inference?" answers), so persona posts are always built deterministically
 * from PERSONA_POST_TEMPLATES — one per selected category, every time —
 * rather than trusting a model to invent its own post-to-category mapping.
 * Nothing here calls a model: same input, same persona, every time, which
 * is also what makes the investigation stage replayable/inspectable.
 *
 * selectedIds: the same category ids the player chose in screen 1 — the
 * ONLY input this persona is conditioned on.
 */
export function generatePrivacyMirrorPersona(selectedIds) {
  const seed = hashSelection(selectedIds)
  const name = PERSONA_NAME_POOL[Math.floor(stableRandom(seed) * PERSONA_NAME_POOL.length)]
  const orderedIds = SHARING_CATEGORIES.map((c) => c.id).filter((id) => selectedIds.includes(id))
  const posts = orderedIds.map((id) => ({ categoryId: id, ...PERSONA_POST_TEMPLATES[id] }))
  return { name, posts }
}
