// Deterministic assembly of the exportable, real-world Defence Plan — every
// field here is read from the player's own stored state (Digital
// Breadcrumbs + Recovery Rush), never sample/placeholder data. See
// components/dashboard/DefencePlan.jsx for the printable page that renders
// this.
import { PRIVACY_AREA_LABELS, PRIVACY_MISSIONS } from '../data/breadcrumbs'
import { PRIVACY_SCORE_INCREMENTS, strongestAndWeakestArea } from './scoring'
import { RECOVERY_LEVELS, getLevel } from '../data/recoveryRush'

/** The completion threshold gating the Defence Plan export: enough real signal in both districts to say something useful. */
export function isDefencePlanUnlocked(state) {
  const bc = state.districts.breadcrumbs
  const rr = state.districts.recoveryRush
  return bc.findAlexComplete && bc.privacyDefenceScore != null && Object.keys(rr.levelsComplete).length > 0
}

export function defencePlanUnlockRequirements(state) {
  const bc = state.districts.breadcrumbs
  const rr = state.districts.recoveryRush
  return [
    { label: 'Complete the Find Alex mission', done: bc.findAlexComplete },
    { label: 'Scan your Privacy Defence Score', done: bc.privacyDefenceScore != null },
    { label: 'Complete at least one Recovery Rush scenario', done: Object.keys(rr.levelsComplete).length > 0 },
  ]
}

/** Pending checklist items ordered by how much score they'd add if completed — the plan's real prioritized action list. */
function buildPrioritizedActions(selfChecklist) {
  return PRIVACY_MISSIONS.filter((m) => !selfChecklist[m.id])
    .sort((a, b) => (PRIVACY_SCORE_INCREMENTS[b.id] ?? 0) - (PRIVACY_SCORE_INCREMENTS[a.id] ?? 0))
    .map((m) => ({ title: m.title, description: m.description }))
}

/** One entry per Recovery Rush scenario the player has actually completed, combining the real dependency graph they played with their real result. */
function buildRecoveryMap(levelsComplete) {
  return Object.entries(levelsComplete).map(([levelId, result]) => {
    const level = getLevel(levelId)
    if (!level) return null
    const root = level.graph.nodes.find((n) => n.id === level.rootId)
    const dependents = level.graph.nodes.filter((n) => n.id !== level.rootId)
    return {
      levelName: level.name,
      rootAccount: root?.label ?? level.rootId,
      dependentAccounts: dependents.map((n) => ({ label: n.label, reason: n.exposureReason })),
      score: result.score,
      grade: result.grade,
      accountsLost: result.accountsLost,
    }
  }).filter(Boolean)
}

export function buildDefencePlanData(state) {
  const bc = state.districts.breadcrumbs
  const rr = state.districts.recoveryRush
  const { strongest, biggestExposure } = strongestAndWeakestArea(bc.selfChecklist, PRIVACY_AREA_LABELS)

  return {
    generatedAt: new Date().toISOString(),
    privacyDefenceScore: bc.privacyDefenceScore,
    strongestArea: strongest,
    biggestExposure,
    prioritizedActions: buildPrioritizedActions(bc.selfChecklist),
    recoveryMap: buildRecoveryMap(rr.levelsComplete),
    scenariosAvailable: RECOVERY_LEVELS.length,
    scenariosCompleted: Object.keys(rr.levelsComplete).length,
  }
}
