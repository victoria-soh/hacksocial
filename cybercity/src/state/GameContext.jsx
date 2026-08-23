import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { loadState, saveState, resetState, normalizeState } from '../lib/storage'
import { computeEarnedBadges } from '../data/badges'
import { createRemotePlayer, fetchRemoteState, pushRemoteState } from '../lib/api'
import { STREAK_MILESTONES } from '../data/streakMilestones'
import { isCapstoneUnlocked } from '../lib/capstone'

const GameContext = createContext(null)
const SYNC_CODE_KEY = 'cybercity:syncCode'

function loadSyncCode() {
  try {
    return window.localStorage.getItem(SYNC_CODE_KEY) || null
  } catch {
    return null
  }
}

function saveSyncCode(code) {
  try {
    if (code) window.localStorage.setItem(SYNC_CODE_KEY, code)
    else window.localStorage.removeItem(SYNC_CODE_KEY)
  } catch {
    // ignore
  }
}

function clamp(n) {
  return Math.max(0, Math.min(100, Math.round(n)))
}

// Exported so the opt-in comparison feature can compute a *fetched* player's
// resilience client-side, from their raw state, using exactly the same math
// this district uses for the local player — no duplicate scoring logic, no
// server-side reimplementation.
export function computeBreadcrumbsResilience(d) {
  const findAlexPart = d.findAlexComplete ? 50 : 0
  const privacyPart = ((d.privacyDefenceScore ?? 0) / 100) * 50
  return clamp(findAlexPart + privacyPart)
}

export function computeRecoveryResilience(d) {
  const levelIds = ['level1', 'level2']
  const total = levelIds.reduce((sum, id) => sum + (d.levelsComplete[id]?.score ?? 0), 0)
  return clamp(total / levelIds.length)
}

export function computeCommunityResilience(d) {
  const residents = Object.values(d.residents || {})
  const avgResidentScore =
    residents.length > 0 ? residents.reduce((sum, r) => sum + (r.complete ? r.score : 0), 0) / residents.length : 0
  const guardianBonus = d.guardianModeComplete ? 5 : 0
  return clamp(avgResidentScore + guardianBonus)
}

export function deriveDistricts(state) {
  const breadcrumbs = { ...state.districts.breadcrumbs, resilience: computeBreadcrumbsResilience(state.districts.breadcrumbs) }
  const recoveryRush = { ...state.districts.recoveryRush, resilience: computeRecoveryResilience(state.districts.recoveryRush) }
  // Community Centre unlocks once the player has shown they can spot a
  // breadcrumb trail and contain an incident — not a stored flag, so it's
  // always consistent with actual progress.
  const communityCentreReady =
    breadcrumbs.findAlexComplete && Object.keys(state.districts.recoveryRush.levelsComplete).length > 0
  const communityCentre = {
    ...state.districts.communityCentre,
    unlocked: communityCentreReady,
    resilience: computeCommunityResilience(state.districts.communityCentre),
  }
  return { breadcrumbs, recoveryRush, communityCentre }
}

export function computeOverallResilience(districts) {
  const vals = [districts.breadcrumbs.resilience, districts.recoveryRush.resilience]
  if (districts.communityCentre.unlocked) vals.push(districts.communityCentre.resilience)
  return clamp(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function GameProvider({ children }) {
  const [state, setState] = useState(() => loadState())
  const [syncCode, setSyncCode] = useState(() => loadSyncCode())
  const [syncStatus, setSyncStatus] = useState('idle') // idle | syncing | synced | error
  const pushTimer = useRef(null)

  useEffect(() => {
    saveState(state)
  }, [state])

  const districts = useMemo(() => deriveDistricts(state), [state])

  const overallResilience = useMemo(() => computeOverallResilience(districts), [districts])

  // Best-effort background sync to the optional Phase 3 backend: debounced
  // so rapid state changes (e.g. a Recovery Rush run) collapse into one
  // push. Never blocks the UI and never throws — the backend may not be
  // running at all, which is a perfectly normal way to use CyberCity. The
  // pushed payload includes the *derived* overallResilience (never stored
  // locally — see deriveDistricts) purely so the opt-in aggregate-comparison
  // endpoint can read it without the server re-deriving app scoring logic.
  useEffect(() => {
    if (!syncCode) return undefined
    clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      setSyncStatus('syncing')
      pushRemoteState(syncCode, { ...state, overallResilience })
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'))
    }, 1500)
    return () => clearTimeout(pushTimer.current)
  }, [state, syncCode, overallResilience])

  const badges = useMemo(() => computeEarnedBadges({ ...state, districts }), [state, districts])

  const addXP = useCallback((amount) => {
    setState((s) => ({ ...s, xp: s.xp + amount }))
  }, [])

  const completeOnboarding = useCallback((chosenMission) => {
    setState((s) => ({ ...s, onboarded: true, chosenMission }))
  }, [])

  const completeFindAlex = useCallback((score) => {
    setState((s) => ({
      ...s,
      districts: {
        ...s.districts,
        breadcrumbs: { ...s.districts.breadcrumbs, findAlexComplete: true, findAlexScore: score },
      },
    }))
  }, [])

  // Marks a Privacy Defence Score mission complete after a genuine passing
  // scenario result (see components/breadcrumbs/privacyMissions/) — XP is
  // granted only the first time (checked here, not trusted to the caller),
  // so replaying an already-completed mission for practice never re-grants
  // it. Missions can't be un-completed; there's no more manual toggling.
  const completePrivacyMission = useCallback((id, xp) => {
    setState((s) => {
      const alreadyDone = Boolean(s.districts.breadcrumbs.selfChecklist[id])
      return {
        ...s,
        xp: alreadyDone ? s.xp : s.xp + xp,
        districts: {
          ...s.districts,
          breadcrumbs: {
            ...s.districts.breadcrumbs,
            selfChecklist: { ...s.districts.breadcrumbs.selfChecklist, [id]: true },
          },
        },
      }
    })
  }, [])

  const recordPrivacyScoreScan = useCallback((score) => {
    setState((s) => ({
      ...s,
      districts: {
        ...s.districts,
        breadcrumbs: {
          ...s.districts.breadcrumbs,
          privacyDefenceScore: score,
          privacyScoreHistory: [
            ...s.districts.breadcrumbs.privacyScoreHistory,
            { score, timestamp: new Date().toISOString() },
          ],
        },
      },
    }))
  }, [])

  const completeRecoveryLevel = useCallback((levelId, summary) => {
    setState((s) => ({
      ...s,
      districts: {
        ...s.districts,
        recoveryRush: {
          ...s.districts.recoveryRush,
          levelsComplete: { ...s.districts.recoveryRush.levelsComplete, [levelId]: summary },
        },
      },
    }))
  }, [])

  const completeResidentMission = useCallback((residentId, score) => {
    setState((s) => ({
      ...s,
      districts: {
        ...s.districts,
        communityCentre: {
          ...s.districts.communityCentre,
          residents: {
            ...s.districts.communityCentre.residents,
            [residentId]: { complete: true, score },
          },
        },
      },
    }))
  }, [])

  const completeGuardianMode = useCallback(() => {
    setState((s) => ({
      ...s,
      districts: {
        ...s.districts,
        communityCentre: { ...s.districts.communityCentre, guardianModeComplete: true },
      },
    }))
  }, [])

  const completeCapstone = useCallback((result) => {
    setState((s) => ({
      ...s,
      capstone: {
        complete: true,
        deductionScore: result.deductionScore,
        incidentScore: result.incidentScore,
        commsScore: result.commsScore,
        finalScore: result.finalScore,
        certificationTitle: result.certification.title,
        completedAt: new Date().toISOString(),
      },
    }))
  }, [])

  // Rolling accuracy across graded single-choice moments (Community Centre
  // strategy picks, daily streak picks) — feeds Phase 4's difficulty-adaptive
  // content generation. Capped to the most recent 10 so it tracks recent
  // form, not lifetime history.
  const recordAttempt = useCallback((correct) => {
    setState((s) => {
      const next = [...s.performance.recentAttempts, { correct: Boolean(correct), ts: new Date().toISOString() }]
      return { ...s, performance: { recentAttempts: next.slice(-10) } }
    })
  }, [])

  // Milestones are one-time: once claimed they stay in milestonesClaimed
  // forever, so a streak that later resets and climbs back up can't be
  // farmed for repeat XP/badges. A streak freeze (earned at the 7-day
  // milestone) silently covers exactly one missed day — no guilt-based
  // messaging, no penalty framing, it just quietly keeps the streak alive.
  const recordStreakCheckIn = useCallback(() => {
    setState((s) => {
      const today = new Date().toISOString().slice(0, 10)
      if (s.streak.lastCompletedDate === today) return s
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      let continued = s.streak.lastCompletedDate === yesterday
      let freezesAvailable = s.streak.freezesAvailable
      const missedAtLeastOneDay = Boolean(s.streak.lastCompletedDate) && !continued
      if (missedAtLeastOneDay && freezesAvailable > 0) {
        continued = true
        freezesAvailable -= 1
      }
      const current = continued ? s.streak.current + 1 : 1
      const longest = Math.max(s.streak.longest, current)

      let xpBonus = 0
      const milestonesClaimed = [...s.streak.milestonesClaimed]
      for (const m of STREAK_MILESTONES) {
        if (current >= m.days && !milestonesClaimed.includes(m.days)) {
          milestonesClaimed.push(m.days)
          xpBonus += m.xpBonus
          if (m.grantsFreeze) freezesAvailable += 1
        }
      }

      return {
        ...s,
        xp: s.xp + xpBonus,
        streak: { current, longest, lastCompletedDate: today, freezesAvailable, milestonesClaimed },
      }
    })
  }, [])

  const doReset = useCallback(() => {
    setState(resetState())
  }, [])

  const createShareCode = useCallback(async () => {
    const { code } = await createRemotePlayer({ ...state, overallResilience })
    saveSyncCode(code)
    setSyncCode(code)
    setSyncStatus('synced')
    return code
  }, [state, overallResilience])

  const resumeFromCode = useCallback(async (code) => {
    const { state: remoteState } = await fetchRemoteState(code)
    const normalized = normalizeState(remoteState)
    setState(normalized)
    saveSyncCode(code)
    setSyncCode(code)
    setSyncStatus('synced')
  }, [])

  const forgetShareCode = useCallback(() => {
    saveSyncCode(null)
    setSyncCode(null)
    setSyncStatus('idle')
  }, [])

  const value = {
    state,
    districts,
    overallResilience,
    badges,
    xp: state.xp,
    streak: state.streak,
    onboarded: state.onboarded,
    chosenMission: state.chosenMission,
    capstone: state.capstone,
    capstoneUnlocked: isCapstoneUnlocked(state),
    syncCode,
    syncStatus,
    addXP,
    completeOnboarding,
    completeFindAlex,
    completePrivacyMission,
    recordPrivacyScoreScan,
    completeRecoveryLevel,
    completeResidentMission,
    completeGuardianMode,
    completeCapstone,
    recordAttempt,
    performance: state.performance,
    recordStreakCheckIn,
    resetProgress: doReset,
    createShareCode,
    resumeFromCode,
    forgetShareCode,
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used within GameProvider')
  return ctx
}
