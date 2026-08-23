// Player levels, derived purely from accumulated XP (state.xp) — there is no
// separate "level" field in storage, so a level can never drift out of sync
// with the XP that earned it. Thresholds are cumulative total XP, not XP
// "per level".
//
// Each level's unlock is one of the three concrete kinds called for by the
// retention-loop spec: a new Recovery Rush mission tier, a new skyline
// landmark on the dashboard's CityGraphic, or a previously locked feature.
// Nothing here is purely cosmetic-with-no-effect except the landmarks, which
// the spec explicitly allows as a legitimate unlock category.
export const LEVELS = [
  {
    level: 1,
    name: 'Cyber Recruit',
    xpRequired: 0,
    unlockType: 'base',
    unlockLabel: 'Starting access to Digital Breadcrumbs and Recovery Rush.',
  },
  {
    level: 2,
    name: 'Cyber Investigator',
    xpRequired: 200,
    unlockType: 'landmark',
    landmarkId: 'signal-tower',
    unlockLabel: 'New skyline landmark unlocked: the Signal Tower.',
  },
  {
    level: 3,
    name: 'Cyber Defender',
    xpRequired: 450,
    unlockType: 'mission-tier',
    unlocksRecoveryLevelId: 'level2',
    unlockLabel: 'New Recovery Rush scenario unlocked: Email Compromise Cascade.',
  },
  {
    level: 4,
    name: 'Cyber Guardian',
    xpRequired: 800,
    unlockType: 'feature',
    unlocksFeatureId: 'comparison',
    unlockLabel: 'Opt-in resilience comparison unlocked on your dashboard.',
  },
  {
    level: 5,
    name: 'Cyber Sentinel',
    xpRequired: 1250,
    unlockType: 'landmark',
    landmarkId: 'guardian-spire',
    unlockLabel: 'New skyline landmark unlocked: the Guardian Spire.',
  },
]

function clampLevelIndex(xp) {
  let idx = 0
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpRequired) idx = i
  }
  return idx
}

/** Everything the UI needs to render a "[xp] / [next threshold] XP to [next level]" progress bar. */
export function getLevelProgress(xp) {
  const idx = clampLevelIndex(xp)
  const current = LEVELS[idx]
  const next = LEVELS[idx + 1] ?? null
  const isMaxLevel = next === null
  const xpIntoLevel = xp - current.xpRequired
  const xpForCurrentSpan = next ? next.xpRequired - current.xpRequired : 0
  const progressFraction = isMaxLevel ? 1 : Math.max(0, Math.min(1, xpIntoLevel / xpForCurrentSpan))
  return {
    level: current.level,
    name: current.name,
    xp,
    xpRequired: current.xpRequired,
    isMaxLevel,
    nextLevelName: next?.name ?? null,
    xpForNext: next?.xpRequired ?? null,
    progressFraction,
  }
}

export function getLevelForXP(xp) {
  return LEVELS[clampLevelIndex(xp)]
}

/** True once the player's XP has reached the level that unlocks the given Recovery Rush level id. */
export function isRecoveryLevelUnlocked(xp, recoveryLevelId) {
  const gate = LEVELS.find((l) => l.unlocksRecoveryLevelId === recoveryLevelId)
  if (!gate) return true // levels with no gate (e.g. level1) are always available
  return xp >= gate.xpRequired
}

export function requiredLevelForRecoveryLevel(recoveryLevelId) {
  return LEVELS.find((l) => l.unlocksRecoveryLevelId === recoveryLevelId) ?? null
}

/** True once the player's XP has reached the level that unlocks the given named feature. */
export function isFeatureUnlocked(xp, featureId) {
  const gate = LEVELS.find((l) => l.unlocksFeatureId === featureId)
  if (!gate) return true
  return xp >= gate.xpRequired
}

export function requiredLevelForFeature(featureId) {
  return LEVELS.find((l) => l.unlocksFeatureId === featureId) ?? null
}

export function unlockedLandmarkIds(xp) {
  return LEVELS.filter((l) => l.unlockType === 'landmark' && xp >= l.xpRequired).map((l) => l.landmarkId)
}
