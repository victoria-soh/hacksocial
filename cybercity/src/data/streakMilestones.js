// Streak milestones. Each is a one-time reward the first time a streak
// reaches that length — claimed status is tracked in
// state.streak.milestonesClaimed and never re-granted, so restarting a
// streak later can't be farmed for repeat XP/badges. This is the
// replacement for a flat streak counter: concrete payoffs at meaningful
// points instead of a number that goes up with no destination.
export const STREAK_MILESTONES = [
  { days: 3, xpBonus: 30, badgeId: 'streak-3', grantsFreeze: false },
  { days: 7, xpBonus: 60, badgeId: 'streak-7', grantsFreeze: true },
  { days: 30, xpBonus: 200, badgeId: 'streak-30', grantsFreeze: false },
]

/** The next not-yet-claimed milestone (milestones are claimed once, permanently, so this is always the next real target), or null once all are claimed. */
export function getNextMilestone(milestonesClaimed = []) {
  return STREAK_MILESTONES.find((m) => !milestonesClaimed.includes(m.days)) ?? null
}

export function getMilestone(days) {
  return STREAK_MILESTONES.find((m) => m.days === days) ?? null
}
