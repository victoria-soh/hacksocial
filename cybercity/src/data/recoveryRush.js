// Recovery Rush district content + deterministic incident engine.
//
// Every fact about "what's compromised" and "was this the right move" is
// computed here in plain code from the dependency graph below — never by a
// model. lib/ai.js only narrates the result (see explainRecoveryMistakes).

// ---------------------------------------------------------------------------
// Action catalog (shared across levels). `targetNodeId` is resolved against
// the ACTIVE level's graph at runtime: if it matches the graph's root, the
// action behaves as a root-fix/hardening move; if it matches a non-root
// node, it's a downstream fix; if the id isn't in the graph at all, the
// action is simply irrelevant to this scenario (wasted time).
// ---------------------------------------------------------------------------

export const ACTIONS = [
  {
    id: 'change-instagram-password',
    label: 'Change Instagram password',
    icon: '🔑',
    timeCost: 30,
    targetNodeId: 'instagram',
  },
  {
    id: 'secure-gmail',
    label: 'Secure Gmail',
    icon: '🔑',
    timeCost: 60,
    targetNodeId: 'gmail',
  },
  {
    id: 'revoke-gmail-sessions',
    label: 'Revoke Gmail sessions',
    icon: '🔓',
    timeCost: 30,
    targetNodeId: 'gmail',
    isHardening: true,
    flag: 'sessionsRevoked',
  },
  {
    id: 'check-email-forwarding',
    label: 'Check email forwarding',
    icon: '↪️',
    timeCost: 40,
    targetNodeId: 'gmail',
    isHardening: true,
    flag: 'forwardingChecked',
  },
  {
    id: 'enable-2fa',
    label: 'Enable 2FA',
    icon: '🔐',
    timeCost: 45,
    targetNodeId: 'gmail',
    isHardening: true,
    flag: 'twoFAEnabled',
  },
  {
    id: 'post-publicly-hacked',
    label: "Post publicly that you've been hacked",
    icon: '⚠️',
    timeCost: 20,
    alwaysTrap: true,
    trapReason:
      "Posting publicly wastes time you need for containment, and can tip off the attacker to move faster or cover their tracks.",
  },
  {
    id: 'contact-bank',
    label: 'Contact your bank',
    icon: '🏦',
    timeCost: 60,
    alwaysTrap: true,
    trapReason: 'No financial account is actually exposed in this incident — this burns time needed elsewhere.',
  },
]

export function getAction(actionId) {
  return ACTIONS.find((a) => a.id === actionId)
}

// ---------------------------------------------------------------------------
// Jargon glossary — powers EventFeed's clickable in-line terms. Matched as
// plain substrings (longest first, so "forwarding rule" wins over any
// shorter overlapping term) against whatever text a log/event line actually
// contains. Teaches vocabulary as it comes up, not as a glossary upfront.
// ---------------------------------------------------------------------------

export const JARGON_GLOSSARY = [
  {
    term: 'forwarding rule',
    explanation:
      'A mail rule that silently copies or redirects incoming email elsewhere. Attackers set these up to keep reading your mail even after you change your password.',
  },
  {
    term: 'recovery email',
    explanation:
      "The email address used to reset a forgotten password. Whoever controls it can reset anything linked to it — even without knowing your actual password.",
  },
  {
    term: 'reused password',
    explanation:
      'The same password used on more than one account. If one site gets breached, attackers try that exact password everywhere else too.',
  },
  {
    term: 'password reset',
    explanation:
      'A request to set a new password, usually triggered via a recovery email or phone number — not proof the real account owner is the one doing it.',
  },
  {
    term: 'linked account',
    explanation:
      'A "Continue with X" style login, where one account is used to sign into another. Whoever controls the linking account can walk straight into the linked one.',
  },
  {
    term: '2FA',
    explanation:
      "Two-factor authentication — a second proof of identity (like a code sent to your phone) beyond just a password, so a stolen password alone isn't enough to log in.",
  },
  {
    term: 'sessions',
    explanation:
      "Already-logged-in connections to an account. Changing a password doesn't always end existing sessions — the attacker can stay logged in until sessions are revoked.",
  },
  {
    term: 'new device',
    explanation:
      "A login from a device or browser the service hasn't seen before for this account — one of the clearest signs someone other than the owner is accessing it.",
  },
]

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const RECOVERY_LEVELS = [
  {
    id: 'level1',
    name: 'Single Account Takeover',
    difficultyStars: 1,
    timeLimitSeconds: 180,
    openingAlert: '🚨 SECURITY ALERT — Unusual login detected on your Instagram account.',
    rootId: 'instagram',
    graph: {
      nodes: [
        { id: 'instagram', label: 'Instagram', icon: '📸', tier: 0 },
        {
          id: 'facebook',
          label: 'Facebook',
          icon: '👥',
          tier: 1,
          exposureReason: 'Facebook login uses "Continue with Instagram" — whoever holds Instagram can walk straight into Facebook.',
        },
      ],
      edges: [{ from: 'instagram', to: 'facebook', label: 'linked account' }],
    },
    // `condition: 'root-not-secured'` events only fire if the root account
    // is still compromised at their trigger time — see applyDueEvents. This
    // is what lets a fast, correct response make the feed "go quiet"
    // instead of the script continuing regardless.
    fastSecureThresholdSeconds: 55,
    events: [
      {
        atSeconds: 35,
        id: 'fb-pivot',
        text: 'Facebook login attempt detected from a new device',
        appliesTo: 'facebook',
        condition: 'root-not-secured',
      },
      {
        atSeconds: 90,
        id: 'ig-persistent-escalation',
        text: 'Escalation: attacker is still logged into Instagram from a second new device',
        condition: 'root-not-secured',
      },
    ],
  },
  {
    id: 'level2',
    name: 'Email Compromise Cascade',
    difficultyStars: 2,
    timeLimitSeconds: 300,
    openingAlert:
      '🚨 SECURITY ALERT — Your Gmail password has been changed. Unknown login detected.',
    rootId: 'gmail',
    graph: {
      nodes: [
        { id: 'gmail', label: 'Gmail', icon: '✉️', tier: 0, severity: 'high' },
        {
          id: 'instagram',
          label: 'Instagram',
          icon: '📸',
          tier: 1,
          exposureReason: 'Gmail is the recovery email — attacker can reset Instagram\'s password any time Gmail stays compromised.',
        },
        {
          id: 'steam',
          label: 'Steam',
          icon: '🎮',
          tier: 1,
          severity: 'high',
          exposureReason: 'Gmail is the recovery email for Steam too — and Steam has a payment card on file.',
        },
        {
          id: 'linkedin',
          label: 'LinkedIn',
          icon: '💼',
          tier: 1,
          exposureReason: 'Gmail is the recovery email for LinkedIn too.',
        },
        {
          id: 'facebook',
          label: 'Facebook',
          icon: '👥',
          tier: 2,
          exposureReason: 'Facebook login uses "Continue with Instagram" — if Instagram falls, Facebook goes with it.',
        },
      ],
      edges: [
        { from: 'gmail', to: 'instagram', label: 'recovery email' },
        { from: 'gmail', to: 'steam', label: 'recovery email' },
        { from: 'gmail', to: 'linkedin', label: 'recovery email' },
        { from: 'instagram', to: 'facebook', label: 'linked account' },
      ],
    },
    fastSecureThresholdSeconds: 90,
    events: [
      { atSeconds: 40, id: 'ig-reset', text: 'Instagram password reset requested', appliesTo: 'instagram', condition: 'root-not-secured' },
      { atSeconds: 100, id: 'steam-reset', text: 'Steam password reset requested', appliesTo: 'steam', condition: 'root-not-secured' },
      {
        atSeconds: 160,
        id: 'forwarding-rule',
        text: 'New Gmail forwarding rule created',
        setsForwarding: true,
        condition: 'root-not-secured',
      },
      {
        atSeconds: 220,
        id: 'linkedin-escalation',
        text: 'Escalation: LinkedIn password reset requested — the attacker is pushing further since Gmail is still open',
        appliesTo: 'linkedin',
        condition: 'root-not-secured',
      },
    ],
  },
  // Capstone challenge, stage 2: reuses this exact engine/graph shape and
  // the SAME shared ACTIONS catalog above (no new actions needed — 'gmail'
  // and 'instagram' are the same node ids Level 1/2 already use, so
  // "Secure Gmail" and "Change Instagram password" work unmodified). Marked
  // `hidden` so it never appears on the Recovery Rush hub's own level list
  // (see RecoveryRushHub.jsx's filter) — it's only reachable by the
  // capstone flow, which passes this id straight to IncidentEngine.
  {
    id: 'capstone-incident',
    hidden: true,
    name: "Jordan's Account Takeover",
    difficultyStars: 2,
    timeLimitSeconds: 90,
    openingAlert: "🚨 Jordan just messaged you: \"My Gmail got hacked and now Instagram is doing weird stuff too — help!\"",
    rootId: 'gmail',
    graph: {
      nodes: [
        { id: 'gmail', label: 'Gmail', icon: '✉️', tier: 0 },
        {
          id: 'instagram',
          label: 'Instagram',
          icon: '📸',
          tier: 1,
          exposureReason:
            "Jordan reuses the same password everywhere — exactly what your investigation uncovered — so Gmail falling means Instagram falls too.",
        },
      ],
      edges: [{ from: 'gmail', to: 'instagram', label: 'reused password' }],
    },
    fastSecureThresholdSeconds: 40,
    events: [
      { atSeconds: 25, id: 'ig-reset', text: 'Instagram password reset requested', appliesTo: 'instagram', condition: 'root-not-secured' },
    ],
  },
]

export function getLevel(levelId) {
  return RECOVERY_LEVELS.find((l) => l.id === levelId)
}

function nodeLabel(level, nodeId) {
  return level.graph.nodes.find((n) => n.id === nodeId)?.label ?? nodeId
}

// ---------------------------------------------------------------------------
// Deterministic incident engine
// ---------------------------------------------------------------------------

// How long a fix that doesn't address the root cause holds before the
// attacker (who still controls the root/recovery account) quietly redoes
// it. This is the deferred-consequence mechanic: the fix visibly "works"
// for a while so the player isn't just blocked outright — the lesson lands
// when it's undone with an explanation, not when the button refuses to work.
export const REVERSION_DELAY_SECONDS = 10

export function createInitialRunState(levelId) {
  const level = getLevel(levelId)
  const nodes = {}
  for (const n of level.graph.nodes) {
    nodes[n.id] = {
      ...n,
      status: n.id === level.rootId ? 'compromised' : 'at-risk',
    }
  }
  return {
    levelId,
    nodes,
    forwardingActive: false,
    hardening: { sessionsRevoked: false, forwardingChecked: false, twoFAEnabled: false },
    elapsedSeconds: 0,
    log: [], // { actionId, atSeconds, effective, wrongOrder, trap, deferredReversion, resultText }
    firedEventIds: [],
    // Seeded with the breach itself so the live log never sits on the empty
    // "monitoring..." placeholder once a scenario is actually running — the
    // player's root account is already compromised the instant they begin,
    // and the log should say so immediately rather than waiting for the
    // first scripted escalation (which can be 30-40+ seconds in).
    syntheticEvents: [
      {
        id: 'initial-breach',
        atSeconds: 0,
        text: `${nodeLabel(level, level.rootId)} compromised — unusual login detected`,
        tone: 'bad',
      },
    ],
    pendingReversions: [], // [{ id, nodeId, dueAtSeconds, causeNodeId }] — see REVERSION_DELAY_SECONDS above
    tipOffPenaltySeconds: 0,
  }
}

// Securing a node closes off every exposure path that only existed because
// of it — a downstream account still merely "at-risk" (never actually taken
// over) becomes safe the moment its access route is cut, whether that route
// is a recovery-email reset (gmail -> instagram/steam/linkedin) or an SSO
// login link (instagram -> facebook). A node the attacker already fully
// took over ('compromised') is NOT auto-fixed this way — reclaiming it needs
// its own action, if one exists for that account.
function childrenOf(level, nodeId) {
  return level.graph.edges.filter((e) => e.from === nodeId).map((e) => e.to)
}

function cascadeSecure(nodes, level, securedNodeId) {
  for (const childId of childrenOf(level, securedNodeId)) {
    const child = nodes[childId]
    if (child && child.status === 'at-risk') {
      nodes[childId] = { ...child, status: 'secured' }
      cascadeSecure(nodes, level, childId) // propagate through the newly-secured node's own children too
    }
  }
}

/** Short, deterministic, template-based description of what an action actually did — no model call, just arithmetic over before/after state. */
export function describeActionOutcome({ action, level, before, after, effective, wrongOrder, trap, irrelevant, deferredReversion }) {
  if (trap) return `Time wasted — ${action.trapReason}`
  if (irrelevant) return 'No effect — that was already handled, or not part of this incident.'
  if (deferredReversion) {
    const target = nodeLabel(level, action.targetNodeId)
    const rootName = nodeLabel(level, level.rootId)
    return `${target} changed. ${rootName} remains compromised and can still reset it — this won't hold.`
  }
  if (wrongOrder) {
    return `${nodeLabel(level, level.rootId)} needs to be secured first — this had no effect yet.`
  }
  if (effective) {
    const beforeExposed = computeBlastRadius(before)
    const afterExposed = computeBlastRadius(after)
    const protectedCount = Math.max(0, beforeExposed - afterExposed)
    const rootFix = action.targetNodeId === level.rootId && !action.isHardening
    return `+${protectedCount} account${protectedCount === 1 ? '' : 's'} protected${rootFix ? ', attack path interrupted' : ''}. -${action.timeCost}s`
  }
  if (action.isHardening) {
    return `Hardening applied — reduces what the attacker can still do, even though it doesn't secure a new account. -${action.timeCost}s`
  }
  return `No change. -${action.timeCost}s`
}

/** Mutates a shallow-cloned run state by applying one player action. Returns the new state. */
export function applyAction(runState, actionId) {
  const level = getLevel(runState.levelId)
  const action = getAction(actionId)
  const nodes = { ...runState.nodes }
  const root = nodes[level.rootId]
  let effective = false
  let wrongOrder = false
  let trap = false
  let irrelevant = false
  let rootJustSecured = false
  let deferredReversion = false

  if (action.alwaysTrap) {
    trap = true
  } else if (!nodes[action.targetNodeId]) {
    irrelevant = true
  } else if (action.targetNodeId === level.rootId) {
    // Any non-hardening action aimed at the root account is that level's
    // "fix the root" move (e.g. Secure Gmail when Gmail is root, or Change
    // Instagram Password when Instagram itself is root in Level 1).
    if (action.isHardening) {
      if (root.status !== 'secured') {
        wrongOrder = true
      } else {
        effective = true
      }
    } else if (root.status !== 'secured') {
      nodes[level.rootId] = { ...root, status: 'secured' }
      effective = true
      rootJustSecured = true
      cascadeSecure(nodes, level, level.rootId)
    } else {
      irrelevant = true
    }
  } else {
    const target = nodes[action.targetNodeId]
    const rootExists = Boolean(nodes[level.rootId]) && level.rootId !== action.targetNodeId
    if (rootExists && root.status !== 'secured') {
      // Deferred consequence, not a silent block: the fix visibly takes —
      // the node reads as secured right away — but since the root/recovery
      // account is still compromised, a pending reversion is scheduled
      // below and the attacker quietly redoes it a little later. No
      // cascadeSecure here: a fix that's about to be undone shouldn't also
      // falsely protect anything downstream of it.
      wrongOrder = true
      deferredReversion = true
      nodes[action.targetNodeId] = { ...target, status: 'secured' }
    } else if (target.status === 'secured') {
      irrelevant = true
    } else {
      const wasCompromised = target.status === 'compromised'
      nodes[action.targetNodeId] = { ...target, status: 'secured' }
      effective = !wasCompromised
      cascadeSecure(nodes, level, action.targetNodeId)
    }
  }

  const hardening = { ...runState.hardening }
  if (effective && action.flag) hardening[action.flag] = true

  const newElapsed = runState.elapsedSeconds + action.timeCost
  const tipOff = action.id === 'post-publicly-hacked' ? runState.tipOffPenaltySeconds + 30 : runState.tipOffPenaltySeconds

  // Adaptive attacker, branch 1: secure the root fast enough and the feed
  // reflects the attacker backing off — no further scripted escalations —
  // instead of the fixed script continuing regardless (see applyDueEvents'
  // 'root-not-secured' condition check for the other half of this).
  const syntheticEvents = [...runState.syntheticEvents]
  if (rootJustSecured && newElapsed <= (level.fastSecureThresholdSeconds ?? Infinity)) {
    syntheticEvents.push({
      id: `backed-off-${newElapsed}`,
      atSeconds: newElapsed,
      text: 'No further suspicious activity detected — the attacker appears to have backed off',
      tone: 'good',
    })
  }

  const pendingReversions = [...runState.pendingReversions]
  if (deferredReversion) {
    pendingReversions.push({
      id: `reversion-${action.targetNodeId}-${newElapsed}`,
      nodeId: action.targetNodeId,
      dueAtSeconds: newElapsed + REVERSION_DELAY_SECONDS,
      causeNodeId: level.rootId,
    })
  }

  const after = {
    ...runState,
    nodes,
    hardening,
    elapsedSeconds: newElapsed,
    tipOffPenaltySeconds: tipOff,
    syntheticEvents,
    pendingReversions,
  }
  const resultText = describeActionOutcome({ action, level, before: runState, after, effective, wrongOrder, trap, irrelevant, deferredReversion })

  return {
    ...after,
    log: [
      ...runState.log,
      { actionId, atSeconds: newElapsed, effective, wrongOrder, trap, irrelevant, deferredReversion, resultText },
    ],
  }
}

/** Applies any scripted events whose trigger time has passed (accounting for the tip-off penalty). */
export function applyDueEvents(runState, currentElapsedSeconds) {
  const level = getLevel(runState.levelId)
  let nodes = runState.nodes
  let forwardingActive = runState.forwardingActive
  const firedEventIds = [...runState.firedEventIds]
  const effectiveElapsed = currentElapsedSeconds - runState.tipOffPenaltySeconds

  for (const evt of level.events) {
    if (firedEventIds.includes(evt.id)) continue
    if (effectiveElapsed < evt.atSeconds) continue
    // Adaptive attacker, branch 2: once the root is secured, every
    // remaining root-not-secured-gated event permanently stops firing —
    // the script doesn't escalate against an attacker who's already locked
    // out, rather than continuing on a fixed timer regardless of play.
    if (evt.condition === 'root-not-secured' && nodes[level.rootId]?.status === 'secured') continue
    firedEventIds.push(evt.id)
    if (evt.appliesTo) {
      const node = nodes[evt.appliesTo]
      if (node && node.status === 'at-risk') {
        nodes = { ...nodes, [evt.appliesTo]: { ...node, status: 'compromised' } }
      }
    }
    if (evt.setsForwarding) {
      forwardingActive = !runState.hardening.forwardingChecked
    }
  }

  // Deferred consequences: a fix that didn't address the root cause gets
  // quietly undone once its delay elapses — UNLESS the player secured the
  // root/recovery account in the meantime, in which case the attacker no
  // longer has a way to redo it and the pending reversion is simply
  // dropped (a real win, not an event worth logging).
  const syntheticEvents = [...runState.syntheticEvents]
  const stillPending = []
  for (const rev of runState.pendingReversions) {
    if (effectiveElapsed < rev.dueAtSeconds) {
      stillPending.push(rev)
      continue
    }
    const cause = nodes[rev.causeNodeId]
    if (!cause || cause.status === 'secured') continue // root fixed in time — reversion cancelled
    const node = nodes[rev.nodeId]
    if (node && node.status === 'secured') {
      nodes = { ...nodes, [rev.nodeId]: { ...node, status: 'compromised' } }
    }
    syntheticEvents.push({
      id: rev.id,
      atSeconds: rev.dueAtSeconds,
      text: `${nodeLabel(level, rev.nodeId)} password silently reset via ${nodeLabel(level, rev.causeNodeId)} — the change didn't hold because ${nodeLabel(level, rev.causeNodeId)} was still exposed.`,
      tone: 'bad',
      reversal: true,
    })
  }

  return { ...runState, nodes, forwardingActive, firedEventIds, syntheticEvents, pendingReversions: stillPending }
}

/** Live blast radius: count of accounts still exposed (not yet secured), for the shrinking counter. */
export function computeBlastRadius(runState) {
  const count = Object.values(runState.nodes).filter((n) => n.status !== 'secured').length
  return count + (runState.forwardingActive ? 1 : 0)
}

export function isContained(runState) {
  return computeBlastRadius(runState) === 0
}

export function computeEndSummary(runState) {
  const nodesList = Object.values(runState.nodes)
  const accountsLost = nodesList.filter((n) => n.status === 'compromised').length
  const accountsExposedAtEnd = nodesList.filter((n) => n.status === 'at-risk').length + (runState.forwardingActive ? 1 : 0)
  const trapActionsTaken = runState.log.filter((l) => l.trap).length
  const wrongOrderPenalties = runState.log.filter((l) => l.wrongOrder).length
  return { accountsLost, accountsExposedAtEnd, trapActionsTaken, wrongOrderPenalties, secondsUsed: runState.elapsedSeconds }
}

/** Builds the ordered-choices + ground-truth-mistakes payload handed to the AI narrator. */
export function buildMistakeReport(runState) {
  const level = getLevel(runState.levelId)
  const orderedActions = runState.log.map((l) => ({
    action: getAction(l.actionId)?.label,
    atSeconds: l.atSeconds,
    effective: l.effective,
    wrongOrder: l.wrongOrder,
    trap: l.trap,
  }))
  const detectedMistakes = []
  const wrongOrderEntries = runState.log.filter((l) => l.wrongOrder)
  if (wrongOrderEntries.length > 0) {
    const first = wrongOrderEntries[0]
    const actionLabel = getAction(first.actionId)?.label
    detectedMistakes.push({
      type: 'wrong-order',
      explanation: `You tried "${actionLabel}" before ${level.graph.nodes.find((n) => n.id === level.rootId)?.label} was secured. Because the root account was still compromised, that fix didn't stick — the attacker could simply undo it.`,
    })
  }
  const trapEntries = runState.log.filter((l) => l.trap)
  for (const t of trapEntries) {
    const action = getAction(t.actionId)
    detectedMistakes.push({ type: 'trap', explanation: `"${action.label}" — ${action.trapReason}` })
  }
  const graphSummary = {
    root: level.rootId,
    nodes: level.graph.nodes.map((n) => ({ id: n.id, tier: n.tier, exposureReason: n.exposureReason })),
  }
  return { orderedActions, detectedMistakes, graphSummary }
}
