// Capstone "Final Challenge" content — a smaller, fictional practice
// profile ("Jordan", same ethical guardrail as Alex: entirely made up, no
// real-person lookup) that chains all three district mechanics into one
// narrative:
//   Stage 1 (deduction) reveals a real vulnerability (password reuse) —
//   Stage 2 (incident response) is that exact vulnerability being exploited —
//   Stage 3 (communication) is explaining what happened to Jordan afterward.
// See lib/capstone.js for the unlock check and combined scoring.

// ---------------------------------------------------------------------------
// Stage 1: deduction, reusing ConnectionMap/Dossier at a smaller scale than
// Find Alex — 2 evidence posts -> 2 facts -> 1 inference (vs. Alex's
// 5 posts -> 6 facts -> 5 inferences).
// ---------------------------------------------------------------------------

export const CAPSTONE_POSTS = [
  {
    id: 'jd-linkedin',
    platform: 'LinkedIn',
    icon: '💼',
    handle: 'Jordan',
    caption: 'Started as a Support Engineer at Solstice Cloud today! Excited for this new chapter. #newjob',
  },
  {
    id: 'jd-forum',
    platform: 'Tech Forum',
    icon: '💬',
    handle: 'u/jordan_codes',
    caption: "Finally got my new work email set up. Just reused my usual password everywhere again, way easier to remember lol",
  },
]

export const CAPSTONE_NODES = {
  'fact-employer-jordan': {
    type: 'fact',
    label: 'Employer: Solstice Cloud',
    detail: 'Stated directly in the LinkedIn post.',
    dossierFragment: 'works at Solstice Cloud',
  },
  'fact-password-reuse': {
    type: 'fact',
    label: 'Reuses the same password everywhere',
    detail: 'Stated directly in the forum comment.',
    dossierFragment: 'reuses the same password across accounts',
  },
  'inf-email-vulnerable': {
    type: 'inference',
    label: 'Likely vulnerability: reused password on work email',
    detail:
      "Combining the employer and the password-reuse habit means Jordan's work email is only as safe as the weakest OTHER account sharing that same password.",
    category: 'Security',
    sensitivity: 'high',
    dossierFragment: 'likely has a work email protected only by a password reused elsewhere',
  },
}

export const CAPSTONE_EDGES = [
  { id: 'ce1', from: ['jd-linkedin'], to: 'fact-employer-jordan', points: 10 },
  { id: 'ce2', from: ['jd-forum'], to: 'fact-password-reuse', points: 10 },
  { id: 'ce3', from: ['fact-employer-jordan', 'fact-password-reuse'], to: 'inf-email-vulnerable', points: 20 },
]

export const CAPSTONE_DEDUCTION_MAX_SCORE = CAPSTONE_EDGES.reduce((sum, e) => sum + e.points, 0)

// ---------------------------------------------------------------------------
// Stage 2 (incident response) reuses IncidentEngine directly against the
// hidden 'capstone-incident' level defined in data/recoveryRush.js — no
// separate data needed here, see that file for why the graph deliberately
// reuses the 'gmail'/'instagram' node ids so the existing shared ACTIONS
// catalog works unmodified.
// ---------------------------------------------------------------------------

export const CAPSTONE_INCIDENT_LEVEL_ID = 'capstone-incident'

// ---------------------------------------------------------------------------
// Stage 3: communication, reusing ChatMissionEngine with a resident-shaped
// scenario object (same shape as one entry of data/communityCentre.js's
// RESIDENTS) — explaining the incident to Jordan afterward.
// ---------------------------------------------------------------------------

export const CAPSTONE_COMMS_SCENARIO = {
  id: 'jordan-debrief',
  icon: '🧑‍💻',
  name: 'Jordan',
  channel: 'Chat',
  chat: {
    opening: "Oh my gosh, thank you for sorting that out! I have no idea what actually happened though...",
    question: "What actually happened, and is there anything I need to do now?",
  },
  strategies: [
    {
      id: 'plain-explanation',
      label: 'Explain plainly what happened and give one clear next step',
      correct: true,
      consequence: [
        { text: 'Let me explain simply, and tell you exactly what to do next...' },
        { text: "Oh, that makes so much sense! I'll fix that right away." },
      ],
    },
    {
      id: 'no-details',
      label: "Just say it's fixed now, no need to worry about the details",
      correct: false,
      consequence: [
        { text: "It's all sorted now, nothing to worry about!" },
        { text: "Oh, great! ...wait, so is there anything I should actually change? I don't want this to happen again." },
      ],
    },
    {
      id: 'jargon-explanation',
      label: 'Give a fully technical explanation of exactly what occurred',
      correct: false,
      consequence: [
        { text: 'So basically a credential-stuffing attack exploited a shared secret across your session tokens...' },
        { text: "Umm... I have genuinely no idea what any of that means. Am I okay?" },
      ],
    },
    {
      id: 'blame-jordan',
      label: 'Point out that this happened because Jordan reused a password',
      correct: false,
      consequence: [
        { text: "Well, this happened because you reused your password — that's on you, honestly." },
        { text: "...Okay. I feel kind of bad now. I still don't really know what to do differently though." },
      ],
    },
  ],
  replyTiles: {
    core: [
      { id: 'core-1', text: 'Your password was reused on another account' },
      { id: 'core-2', text: 'so when that other account leaked, your email got in too' },
      { id: 'core-3', text: 'use a different, unique password for your email from now on' },
    ],
    distractors: [
      { id: 'dist-1', text: "It's fine, don't worry about it", type: 'bad-advice', feedback: "That leaves Jordan just as vulnerable next time — don't include it." },
      { id: 'dist-2', text: 'As long as you get lucky, you should be okay', type: 'bad-advice', feedback: "That's not a real safeguard — leave it out." },
      { id: 'dist-3', text: 'Enable OAuth token rotation', type: 'jargon', feedback: "Jordan won't understand that term." },
      { id: 'dist-4', text: 'Set up a WAF rule for credential stuffing', type: 'jargon', feedback: "Jordan won't understand that term." },
    ],
  },
  replyConsequence: {
    good: [{ text: "Oh okay, that makes total sense! I'll set a unique password for my email right now. Thank you so much!" }],
    unclear: [{ text: "Umm... I think I get it? I'll try to be more careful, I guess." }],
  },
}
