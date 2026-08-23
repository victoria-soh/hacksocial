// Thin wrapper around localStorage. All CyberCity progress lives under one
// namespaced key so it's easy to inspect, migrate, or (Phase 3) replace with
// a backend call without touching call sites.

const STORAGE_KEY = 'cybercity:v1'

const DEFAULT_STATE = {
  playerName: null,
  onboarded: false,
  chosenMission: null, // 'investigator' | 'responder' | 'guardian'
  xp: 0,
  badges: [], // badge ids earned
  districts: {
    breadcrumbs: {
      unlocked: true,
      resilience: 0, // 0-100, drives dashboard + city vibrancy
      findAlexComplete: false,
      findAlexScore: 0,
      privacyDefenceScore: null, // 0-100, from role-reversal scan
      privacyScoreHistory: [], // [{ score, timestamp }]
      selfChecklist: {
        'break-the-trail': false,
        'birthday-ghost': false,
        'who-can-see-me': false,
      },
    },
    recoveryRush: {
      unlocked: true,
      resilience: 0,
      levelsComplete: {}, // { level1: { score, grade, time }, level2: {...} }
    },
    communityCentre: {
      unlocked: false, // Phase 2
      resilience: 0,
      residents: {
        'auntie-may': { complete: false, score: 0 },
        'mr-ravi': { complete: false, score: 0 },
        sarah: { complete: false, score: 0 },
        daniel: { complete: false, score: 0 },
      },
      guardianModeComplete: false,
    },
  },
  streak: {
    current: 0,
    longest: 0,
    lastCompletedDate: null, // ISO date string
    freezesAvailable: 0, // earned from streak milestones; protects one missed day without breaking the streak
    milestonesClaimed: [], // [3, 7, 30] — milestone day-lengths already rewarded, never re-granted
  },
  // Phase 4: rolling accuracy used to pick a difficulty tier for
  // AI-generated bonus content. Capped to the most recent 10 graded choices
  // across Community Centre missions and the daily streak challenge.
  performance: {
    recentAttempts: [], // [{ correct: boolean, ts: ISO string }]
  },
  // Capstone "Final Challenge" — unlocked once all three districts are
  // complete (see lib/capstone.js). Stores only the best/most recent
  // certification result; the challenge itself is replayable.
  capstone: {
    complete: false,
    deductionScore: 0,
    incidentScore: 0,
    commsScore: 0,
    finalScore: 0,
    certificationTitle: null,
    completedAt: null, // ISO timestamp
  },
}

function deepMerge(base, overrides) {
  if (typeof overrides !== 'object' || overrides === null) return base
  const out = Array.isArray(base) ? [...base] : { ...base }
  for (const key of Object.keys(overrides)) {
    const baseVal = base?.[key]
    const overrideVal = overrides[key]
    if (
      baseVal &&
      overrideVal &&
      typeof baseVal === 'object' &&
      typeof overrideVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(overrideVal)
    ) {
      out[key] = deepMerge(baseVal, overrideVal)
    } else {
      out[key] = overrideVal
    }
  }
  return out
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_STATE)
    const parsed = JSON.parse(raw)
    // Merge onto defaults so new fields introduced later don't crash old saves.
    return deepMerge(DEFAULT_STATE, parsed)
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

export function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable (private mode, quota, etc). Progress simply won't
    // persist across reloads; the app still works within the session.
  }
}

/** Fills in any fields missing from a state object (e.g. one fetched from the Phase 3 backend) using the current defaults. */
export function normalizeState(raw) {
  return deepMerge(DEFAULT_STATE, raw)
}

export function resetState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return structuredClone(DEFAULT_STATE)
}

export { DEFAULT_STATE }
