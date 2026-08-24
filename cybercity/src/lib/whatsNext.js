// "What's next" — a single, contextual one-line prompt shown after any
// mission completion, pointing at whichever real progress state (from
// state.xp / state.streak / state.districts) sits closest to a meaningful
// threshold, instead of dropping the player back to a generic menu.
import { RESIDENTS } from '../data/communityCentre'
import { getLevelProgress } from '../data/levels'
import { getNextMilestone } from '../data/streakMilestones'
import { isDefencePlanUnlocked } from './defencePlan'

export function computeWhatsNext({ state, districts, capstoneUnlocked }) {
  const bc = state.districts.breadcrumbs
  const rr = state.districts.recoveryRush
  const cc = state.districts.communityCentre
  const levelProgress = getLevelProgress(state.xp)

  if (capstoneUnlocked && !state.capstone.complete) {
    // `milestone: true` is the one case WhatsNextPrompt renders with
    // elevated styling — every other return below is a routine nudge and
    // deliberately stays undefined here, since this component is reused
    // across the whole app and shouldn't visually escalate for those.
    return { text: "You've completed every district — the Final Challenge is ready for you.", to: '/final-challenge', milestone: true }
  }

  if (districts.communityCentre.unlocked) {
    const residentIds = Object.keys(cc.residents)
    const completeCount = residentIds.filter((id) => cc.residents[id]?.complete).length

    if (completeCount === residentIds.length && !cc.guardianModeComplete) {
      return { text: "You've helped everyone here — grab a friend or family member and try Guardian Mode next.", to: '/community-centre/guardian' }
    }
    if (completeCount === residentIds.length - 1) {
      const remaining = RESIDENTS.find((r) => !cc.residents[r.id]?.complete)
      if (remaining) {
        return {
          text: `Complete one more Community Centre mission (${remaining.name}) to unlock Guardian Mode.`,
          to: `/community-centre/${remaining.id}`,
        }
      }
    }
  } else {
    const recoveryDone = Object.keys(rr.levelsComplete).length > 0
    if (bc.findAlexComplete && !recoveryDone) {
      return { text: 'Try Recovery Rush next to unlock the Community Centre.', to: '/recovery-rush' }
    }
    if (!bc.findAlexComplete && recoveryDone) {
      return { text: 'Try the Find Alex mission next to unlock the Community Centre.', to: '/breadcrumbs/find-alex' }
    }
  }

  const nextMilestone = getNextMilestone(state.streak.milestonesClaimed)
  if (nextMilestone && state.streak.current > 0) {
    const daysLeft = nextMilestone.days - state.streak.current
    if (daysLeft > 0 && daysLeft <= 2) {
      return {
        text: `You're ${daysLeft} day${daysLeft === 1 ? '' : 's'} from a ${nextMilestone.days}-day streak milestone — come back tomorrow for the daily challenge.`,
        to: '/dashboard',
      }
    }
  }

  if (!levelProgress.isMaxLevel && levelProgress.xpForNext - state.xp <= 75) {
    const remaining = levelProgress.xpForNext - state.xp
    const recoveryDone = Object.keys(rr.levelsComplete).length > 0
    const suggestion = !bc.findAlexComplete
      ? { label: 'Find Alex', to: '/breadcrumbs/find-alex' }
      : !recoveryDone
        ? { label: 'Recovery Rush', to: '/recovery-rush' }
        : { label: "today's daily challenge", to: '/dashboard' }
    return {
      text: `You're ${remaining} XP from leveling up to ${levelProgress.nextLevelName} — try ${suggestion.label} next.`,
      to: suggestion.to,
    }
  }

  if (!isDefencePlanUnlocked(state)) {
    if (bc.privacyDefenceScore == null) {
      return { text: 'Try Privacy Mirror to move closer to unlocking your exportable Defence Plan.', to: '/breadcrumbs#privacy-mirror' }
    }
    if (Object.keys(rr.levelsComplete).length === 0) {
      return { text: 'Complete a Recovery Rush scenario to move closer to unlocking your exportable Defence Plan.', to: '/recovery-rush' }
    }
  }

  const pendingChecklistEntry = Object.entries(bc.selfChecklist).find(([, done]) => !done)
  if (pendingChecklistEntry) {
    return { text: 'Tick off another item on your privacy checklist to raise your Privacy Defence Score.', to: '/breadcrumbs' }
  }

  return { text: "Head back to the dashboard to see your city's overall resilience.", to: '/dashboard' }
}
