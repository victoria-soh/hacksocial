// Deterministic unlock check + combined scoring for the capstone "Final
// Challenge" — no AI involved, same "facts computed in app code" rule as
// every other district. Reuses the exact same completion signals the rest
// of the game already tracks (findAlexComplete, levelsComplete, resident
// completion) rather than inventing a parallel "capstone readiness" flag.

const REQUIRED_RECOVERY_LEVEL_IDS = ['level1', 'level2']

export function capstoneUnlockRequirements(state) {
  const bc = state.districts.breadcrumbs
  const rr = state.districts.recoveryRush
  const cc = state.districts.communityCentre
  return [
    { label: 'Complete Digital Breadcrumbs (Find Alex)', done: bc.findAlexComplete },
    {
      label: 'Complete every Recovery Rush scenario',
      done: REQUIRED_RECOVERY_LEVEL_IDS.every((id) => Boolean(rr.levelsComplete[id])),
    },
    {
      label: 'Complete every Community Centre resident mission',
      done: Object.values(cc.residents).every((r) => r.complete),
    },
  ]
}

export function isCapstoneUnlocked(state) {
  return capstoneUnlockRequirements(state).every((r) => r.done)
}

// Distinct certification tiers for the capstone's own ending moment — same
// numeric cut points lib/scoring.js's gradeForScore already uses elsewhere
// in the game (90/75/50), just with capstone-specific titles, so this feels
// like its own proper ending without inventing an unrelated scale.
const CERTIFICATION_TIERS = [
  { min: 90, title: 'Certified Cyber Guardian', icon: '🏅' },
  { min: 75, title: 'Cyber Guardian (Provisional)', icon: '🛡️' },
  { min: 50, title: 'Cyber Guardian in Training', icon: '🧭' },
  { min: 0, title: 'Cyber Guardian Candidate', icon: '📋' },
]

export function certificationForScore(score) {
  return CERTIFICATION_TIERS.find((t) => score >= t.min)
}

/**
 * Combines the three independently-scored stages into one final result.
 * deductionScore/incidentScore/commsScore are each already 0-100 (the
 * deduction stage's raw points-out-of-max are normalized by the caller
 * before this runs, via normalizeDeductionScore below).
 */
export function combineCapstoneScore({ deductionScore, incidentScore, commsScore }) {
  const finalScore = Math.round((deductionScore + incidentScore + commsScore) / 3)
  const certification = certificationForScore(finalScore)
  return { deductionScore, incidentScore, commsScore, finalScore, certification }
}

export function normalizeDeductionScore(rawPoints, maxPoints) {
  return maxPoints > 0 ? Math.round((rawPoints / maxPoints) * 100) : 0
}
