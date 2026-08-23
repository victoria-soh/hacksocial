// Privacy Mirror — content and the deterministic weight/boost tables that
// drive it. Everything in this file is layer 1: plain data, no model calls,
// fully inspectable (see components/breadcrumbs/privacyMirror/EngineInspector.jsx,
// which renders this exact table + whichever boost rules fired, on request).

export const PRIVACY_MIRROR_INTRO =
  "Your posts don't need to contain secrets to reveal something. Tell us what kinds of things you normally share. " +
  "We'll show how separate pieces of harmless information can form a larger digital trail. Nothing is searched online. " +
  'You control what you provide.'

export const RISK_TYPES = [
  { id: 'identity', label: 'Identity exposure', icon: '🪪' },
  { id: 'location', label: 'Location exposure', icon: '📍' },
  { id: 'routine', label: 'Routine exposure', icon: '🗓️' },
  { id: 'socialEngineering', label: 'Social-engineering exposure', icon: '🎭' },
]

// 14 categories a player might select. Base weights below are 0-3 against
// each of the four risk types above (identity, location, routine,
// socialEngineering, in that order in every weights object).
export const SHARING_CATEGORIES = [
  { id: 'photos-with-friends', emoji: '📸', label: 'Photos with friends' },
  { id: 'birthday-posts', emoji: '🎂', label: 'Birthday posts' },
  { id: 'school-university', emoji: '🎓', label: 'School or university' },
  { id: 'workplace-internship', emoji: '💼', label: 'Workplace or internship' },
  { id: 'fitness-routes', emoji: '🏃', label: 'Running / fitness routes' },
  { id: 'restaurants-places', emoji: '🍽️', label: 'Restaurants & places visited' },
  { id: 'home-photos', emoji: '🏠', label: 'Photos taken around home' },
  { id: 'pet-name', emoji: '🐾', label: 'Pet name' },
  { id: 'travel-holiday', emoji: '✈️', label: 'Holiday posts while travelling' },
  { id: 'commute-complaints', emoji: '🚌', label: 'Commute complaints' },
  { id: 'marketplace-listings', emoji: '🛍️', label: 'Marketplace listings' },
  { id: 'gaming-usernames', emoji: '🎮', label: 'Gaming usernames' },
  { id: 'tagged-family', emoji: '👪', label: 'Tagged friends/family' },
  { id: 'consistent-username', emoji: '🔁', label: 'Same username everywhere' },
]

// Base weight table: how much each category alone contributes to each risk
// type, 0 (no signal) to 3 (strong signal). Anchored to the brief's worked
// examples (fitness routes: heavy location, moderate routine, zero identity/
// social-engineering; consistent username: heavy identity; pet name +
// birthday: both heavy social-engineering, as classic security-question
// answers) and extended to the remaining categories by the same logic.
export const BASE_WEIGHTS = {
  'photos-with-friends': { identity: 2, location: 1, routine: 0, socialEngineering: 1 },
  'birthday-posts': { identity: 2, location: 0, routine: 0, socialEngineering: 3 },
  'school-university': { identity: 2, location: 1, routine: 2, socialEngineering: 1 },
  'workplace-internship': { identity: 2, location: 2, routine: 2, socialEngineering: 2 },
  'fitness-routes': { identity: 0, location: 3, routine: 2, socialEngineering: 0 },
  'restaurants-places': { identity: 1, location: 2, routine: 1, socialEngineering: 0 },
  'home-photos': { identity: 1, location: 3, routine: 1, socialEngineering: 1 },
  'pet-name': { identity: 1, location: 0, routine: 0, socialEngineering: 3 },
  'travel-holiday': { identity: 0, location: 1, routine: 0, socialEngineering: 2 },
  'commute-complaints': { identity: 0, location: 1, routine: 3, socialEngineering: 0 },
  'marketplace-listings': { identity: 1, location: 2, routine: 0, socialEngineering: 1 },
  'gaming-usernames': { identity: 1, location: 0, routine: 0, socialEngineering: 0 },
  'tagged-family': { identity: 2, location: 0, routine: 0, socialEngineering: 2 },
  'consistent-username': { identity: 3, location: 0, routine: 0, socialEngineering: 1 },
}

// Non-linear co-occurrence boosts: extra points added ON TOP of the base
// weights above, only when every category in `categories` is selected.
// `chain` is a 3-step plain-language trace from raw signal to conclusion,
// used both for the exposure-chain diagram and as the deterministic
// "ground truth" description graded against a player's guess in screen 3 —
// layer 2 is only ever allowed to reword these, never invent them.
export const BOOST_RULES = [
  {
    id: 'commute-corridor',
    categories: ['workplace-internship', 'commute-complaints'],
    risks: { location: 2, routine: 3 },
    chain: [
      'Workplace or internship mentioned',
      'Regular commute complaints posted',
      'Together they mark a predictable travel corridor between home and work',
    ],
  },
  {
    id: 'daily-pattern',
    categories: ['school-university', 'workplace-internship'],
    risks: { routine: 3 },
    chain: [
      'School/university schedule known',
      'Workplace schedule known',
      'Two fixed daily anchor points reveal a routine',
    ],
  },
  {
    id: 'triangulate-home-marketplace',
    categories: ['fitness-routes', 'marketplace-listings'],
    risks: { location: 4 },
    chain: [
      'Repeated running route start/end point',
      'Marketplace pickup meetup location',
      'Both points triangulate a likely home area',
    ],
  },
  {
    id: 'triangulate-home-photos',
    categories: ['fitness-routes', 'home-photos'],
    risks: { location: 4 },
    chain: [
      'Repeated running route start/end point',
      'Identifiable home visible in photos',
      'Route plus home visuals triangulate a home area',
    ],
  },
  {
    id: 'away-from-home-photos',
    categories: ['travel-holiday', 'home-photos'],
    risks: { socialEngineering: 3 },
    chain: [
      'Public "currently away" travel post',
      'Home already identifiable from earlier photos',
      'A known-empty, known-location home is a burglary/impersonation risk',
    ],
  },
  {
    id: 'away-from-home-identity',
    categories: ['travel-holiday', 'consistent-username'],
    risks: { socialEngineering: 3 },
    chain: [
      'Public "currently away" travel post',
      'Same username links this account across platforms',
      'An attacker can find and target the same real identity while it is away',
    ],
  },
  {
    id: 'security-question-pair',
    categories: ['pet-name', 'birthday-posts'],
    risks: { socialEngineering: 4 },
    chain: [
      'Pet name posted publicly',
      'Birthday posted publicly',
      'Two common security-question answers exposed together',
    ],
  },
  {
    id: 'cross-platform-social-graph',
    categories: ['tagged-family', 'consistent-username'],
    risks: { identity: 3 },
    chain: [
      'Tagged family members reveal real names',
      'Consistent username links this profile across platforms',
      'Real name plus a cross-platform handle largely de-anonymizes the account',
    ],
  },
  {
    id: 'photo-identity-web',
    categories: ['photos-with-friends', 'tagged-family'],
    risks: { identity: 2 },
    chain: [
      'Photos with friends reveal a social circle',
      'Tagged family members confirm real names and relationships',
      'Together they let a stranger map real identity and closest contacts',
    ],
  },
]

// Fallback persona content used when no AI key is configured — a small
// name pool plus one templated sample post per category, so Privacy Mirror
// stays fully playable offline (see lib/ai.js's generatePrivacyMirrorPersona).
export const PERSONA_NAME_POOL = ['Jamie Cross', 'Priya Nathan', 'Marcus Webb', 'Elena Cho', 'Sam Ibrahim', 'Nadia Torres']

export const PERSONA_POST_TEMPLATES = {
  'photos-with-friends': { platform: 'Instagram', text: 'Best weekend with this crew 🤍' },
  'birthday-posts': { platform: 'Instagram', text: "Can't believe I'm 23 today 🎉" },
  'school-university': { platform: 'LinkedIn', text: 'Officially graduated from Meridian University! 🎓' },
  'workplace-internship': { platform: 'LinkedIn', text: 'Thrilled to start my new role this week!' },
  'fitness-routes': { platform: 'Running App', text: 'Sunday long run, 8.2km ✅ [route map attached]' },
  'restaurants-places': { platform: 'Instagram', text: 'Obsessed with this new brunch spot 🍳' },
  'home-photos': { platform: 'Instagram', text: 'Finally finished decorating the apartment 🪴' },
  'pet-name': { platform: 'Instagram', text: 'Miso being a menace as usual 🐱' },
  'travel-holiday': { platform: 'Instagram', text: 'Beach mode activated for the next 10 days ✈️' },
  'commute-complaints': { platform: 'TikTok', text: 'The 40-minute bus ride is testing me today 😩' },
  'marketplace-listings': { platform: 'Marketplace', text: 'Selling: desk lamp, barely used. Local pickup only.' },
  'gaming-usernames': { platform: 'Discord', text: 'Add me, same handle everywhere: same username as always 🎮' },
  'tagged-family': { platform: 'Instagram', text: 'Family dinner with the whole crew 👪' },
  'consistent-username': { platform: 'Twitter/X', text: 'New account, same handle as always — find me anywhere 🔁' },
}
