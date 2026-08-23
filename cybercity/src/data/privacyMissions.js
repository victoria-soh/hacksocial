// Content + rubrics for the three interactive Privacy Defence Score
// missions (src/components/breadcrumbs/privacyMissions/*) — these replace
// what used to be self-report checkboxes with a genuine ~20-30s scenario
// each. Scoring itself lives in lib/scoring.js (deterministic facts belong
// in app code, same rule as every other district); this file is just the
// scenario content those scoring functions are evaluated against.

// ---------------------------------------------------------------------------
// Break the Trail: a mock running-route map, same "loop that starts and
// ends near a residential neighborhood" shape as Alex's own route in the
// Find Alex mission (src/data/breadcrumbs.js) — this time it's the
// player's own mock route, and the goal is to obscure the start/end point
// with a privacy zone, mirroring a real feature several running apps offer.
// ---------------------------------------------------------------------------

export const TRAIL_MAP = {
  width: 320,
  height: 200,
  pathD: 'M 160 150 C 100 150 68 112 78 72 C 88 30 138 18 172 40 C 212 65 222 112 190 136 C 180 144 170 148 160 150 Z',
  startPoint: { x: 160, y: 150 },
  // The smallest zone radius that would meaningfully obscure a real
  // starting point at this map scale — roughly 15% of the shorter map
  // dimension (200px), rounded to a clean number.
  minRadius: 30,
  maxRadius: 85,
  defaultZone: { x: 60, y: 45, radius: 30 }, // placed away from the sensitive point, so passing requires a real move
  positionStep: 10, // px per arrow-key press
}

// ---------------------------------------------------------------------------
// Birthday Ghost: a mock profile screen. 4 elements genuinely leak date-of-
// birth information; 2 are decoys that look related but don't actually
// reveal anything (an easy, deliberate thing to mix up — "member since"
// shows account age, not birth date).
// ---------------------------------------------------------------------------

export const BIRTHDAY_PROFILE_ELEMENTS = [
  {
    id: 'pinned-post',
    icon: '📌',
    label: 'Pinned post',
    content: '"Turning 22 today!! 🎉🎂 Best birthday ever"',
    isLeak: true,
    fixedNote: 'Post unpinned and hidden from your profile.',
  },
  {
    id: 'dob-field',
    icon: '📋',
    label: 'About — Date of Birth',
    content: 'March 15, 2003',
    isLeak: true,
    fixedNote: 'Date of birth hidden from your profile.',
  },
  {
    id: 'comment-thread',
    icon: '💬',
    label: 'Comments (47)',
    content: '"Happy bdayyy!! 🎂" · "HBD bestie 🎉" · "22 looks good on you!" — all posted today',
    isLeak: true,
    fixedNote: 'Comments hidden from public view.',
  },
  {
    id: 'bio-line',
    icon: '🎈',
    label: 'Bio',
    content: '🎈 Mar 15 | ♓ Pisces | 📍 Brookhaven',
    isLeak: true,
    fixedNote: 'Birthday removed from bio.',
  },
  {
    id: 'member-since',
    icon: '🏅',
    label: 'Member since badge',
    content: 'Member since March 2021',
    isLeak: false,
    fixedNote: "Hidden — though this only ever showed when you joined, not your birthday.",
  },
  {
    id: 'profile-photo',
    icon: '🖼️',
    label: 'Profile photo',
    content: 'A mountain landscape photo',
    isLeak: false,
    fixedNote: "Changed — though this never revealed anything about your birthday.",
  },
]

// ---------------------------------------------------------------------------
// Who Can See Me?: a mock privacy-settings panel, starting fully public
// (the oversharing default players actually get on most platforms).
// ---------------------------------------------------------------------------

export const VISIBILITY_FIELDS = [
  { id: 'posts', icon: '📝', label: 'Posts' },
  { id: 'photos', icon: '🖼️', label: 'Photos' },
  { id: 'friendList', icon: '👥', label: 'Friend list' },
  { id: 'locationTags', icon: '📍', label: 'Location tags' },
  { id: 'phoneNumber', icon: '📱', label: 'Phone number' },
]

export const VISIBILITY_LEVELS = ['public', 'friends', 'onlyMe']
export const VISIBILITY_LEVEL_LABELS = { public: 'Public', friends: 'Friends', onlyMe: 'Only Me' }

export function defaultVisibilitySettings() {
  return Object.fromEntries(VISIBILITY_FIELDS.map((f) => [f.id, 'public']))
}
