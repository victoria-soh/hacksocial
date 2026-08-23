// Guardian Badges (Phase 3 gamification layer). Each `check` is a pure
// function over the persisted game state — badges are earned by deterministic
// milestones, never by an AI judgment call.

export const BADGES = [
  {
    id: 'breadcrumb-detective',
    name: 'Breadcrumb Detective',
    icon: '🔎',
    description: 'Complete all Digital Breadcrumbs investigations.',
    check: (state) =>
      state.districts.breadcrumbs.findAlexComplete &&
      Object.values(state.districts.breadcrumbs.selfChecklist).every(Boolean),
  },
  {
    id: 'incident-commander',
    name: 'Incident Commander',
    icon: '🧑‍✈️',
    description: 'Contain a compromise with zero accounts lost.',
    check: (state) =>
      Object.values(state.districts.recoveryRush.levelsComplete).some((l) => l?.accountsLost === 0),
  },
  {
    id: 'privacy-architect',
    name: 'Privacy Architect',
    icon: '🏛️',
    description: 'Raise your Privacy Defence Score above 80.',
    check: (state) => (state.districts.breadcrumbs.privacyDefenceScore ?? 0) > 80,
  },
  {
    id: 'community-guardian',
    name: 'Community Guardian',
    icon: '🛡️',
    description: 'Complete Guardian Mode with a real second person.',
    check: (state) => state.districts.communityCentre.guardianModeComplete,
  },
  {
    id: 'recovery-expert',
    name: 'Recovery Expert',
    icon: '🧯',
    description: 'Complete every Recovery Rush scenario.',
    check: (state) =>
      Boolean(state.districts.recoveryRush.levelsComplete.level1) &&
      Boolean(state.districts.recoveryRush.levelsComplete.level2),
  },
  {
    id: 'streak-3',
    name: 'Consistent Defender',
    icon: '🔥',
    description: 'Reach a 3-day streak.',
    check: (state) => state.streak.milestonesClaimed.includes(3),
  },
  {
    id: 'streak-7',
    name: 'Weekly Guardian',
    icon: '🧊',
    description: 'Reach a 7-day streak — and earn a streak freeze.',
    check: (state) => state.streak.milestonesClaimed.includes(7),
  },
  {
    id: 'streak-30',
    name: 'Cyber Veteran',
    icon: '🏆',
    description: 'Reach a 30-day streak.',
    check: (state) => state.streak.milestonesClaimed.includes(30),
  },
  {
    id: 'cyber-guardian-certified',
    name: 'Cyber Guardian Certified',
    icon: '🎓',
    description: 'Complete the Final Challenge — the game\'s capstone certification.',
    check: (state) => state.capstone.complete,
  },
]

export function computeEarnedBadges(state) {
  return BADGES.filter((b) => b.check(state)).map((b) => b.id)
}
