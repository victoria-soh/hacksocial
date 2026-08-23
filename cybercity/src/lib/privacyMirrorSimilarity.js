// Privacy Mirror — screen 3's grading. Deterministic and local, no model
// call: this is the "real, inspectable similarity calculation" the feature
// is built around, not an LLM asked to judge correctness directly.
//
// This project's backend only proxies a text-completion model (see
// lib/ai.js) — there is no embeddings endpoint behind it — so rather than
// fake "embeddings" with another model call (which would defeat the point
// of keeping grading inspectable), similarity here is a classic bag-of-
// words term-frequency vector with cosine similarity: a genuine vector-
// space technique, fully local, fully deterministic, and easy to hand-
// verify against any two strings. Swapping in a real embeddings API later
// only means changing textToVector() below — every caller just sees a
// plain 0-1 number either way.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'and', 'or', 'of', 'to', 'in', 'on', 'at',
  'it', 'this', 'that', 'their', 'they', 'be', 'with', 'for', 'i', 'you', 'we', 'your',
])

// Bag-of-words cosine has no notion of synonyms, so a correct guess phrased
// differently from a ground-truth sentence's exact wording ("workplace" vs
// "work", "live near" vs "home area") would otherwise score a hard 0 — not
// because the guess was wrong, but because it shares no literal tokens.
// Rather than fake that understanding with another model call, this is a
// small, fixed, fully-inspectable synonym table scoped to the closed
// vocabulary this feature's own ground-truth chains actually use (see
// data/privacyMirror.js's BOOST_RULES) — a standard bag-of-words technique,
// not a workaround.
const SYNONYMS = {
  workplace: 'work', office: 'work', job: 'work', employer: 'work',
  home: 'home', house: 'home', live: 'home', lives: 'home', living: 'home',
  address: 'home', neighborhood: 'home', neighbourhood: 'home', area: 'home', apartment: 'home',
  commute: 'travel', commuting: 'travel', commutes: 'travel', travelling: 'travel',
  traveling: 'travel', route: 'travel', routes: 'travel', corridor: 'travel', journey: 'travel',
  routine: 'pattern', schedule: 'pattern', patterns: 'pattern', daily: 'pattern', everyday: 'pattern',
  triangulate: 'locate', pinpoint: 'locate', narrow: 'locate', figure: 'locate',
}

function tokenize(text) {
  const words = (text || '').toLowerCase().match(/[a-z0-9']+/g) || []
  return words.filter((w) => !STOPWORDS.has(w)).map((w) => SYNONYMS[w] || w)
}

function termFrequencyVector(tokens) {
  const v = {}
  for (const t of tokens) v[t] = (v[t] || 0) + 1
  return v
}

function textToVector(text) {
  return termFrequencyVector(tokenize(text))
}

export function cosineSimilarity(vecA, vecB) {
  const keys = new Set([...Object.keys(vecA), ...Object.keys(vecB)])
  let dot = 0
  let magA = 0
  let magB = 0
  for (const k of keys) {
    const a = vecA[k] || 0
    const b = vecB[k] || 0
    dot += a * b
    magA += a * a
    magB += b * b
  }
  if (magA === 0 || magB === 0) return 0
  return dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export function textSimilarity(a, b) {
  return cosineSimilarity(textToVector(a), textToVector(b))
}

export const SIMILARITY_MATCH_THRESHOLD = 0.12

/**
 * Grades one free-text guess against every ground-truth inferable-risk
 * description for this session's persona (privacyMirrorEngine's
 * getGroundTruthInferences). Pure arithmetic — the model never sees or
 * judges this comparison; it only phrases the result afterward (see
 * lib/ai.js's explainPrivacyMirrorFeedback).
 */
export function gradeGuess(guessText, groundTruths) {
  return groundTruths.map((g) => {
    const similarity = textSimilarity(guessText, g.description)
    return { ...g, similarity, matched: similarity >= SIMILARITY_MATCH_THRESHOLD }
  })
}
