// Digital Breadcrumbs district content — "Find Alex" mission.
//
// Everything here is FICTIONAL per the project's ethical guardrails: "Alex"
// is a made-up practice profile written for this game. Nothing in this
// district looks up, searches for, or investigates a real person.

// Fake engagement numbers, styled per platform (hearts for Instagram,
// reactions for LinkedIn, etc.) — purely cosmetic flavor so each evidence
// card reads as a real social post rather than a plain data card. Never
// used in scoring/matching logic, which only ever reads id/from/to.
export const ALEX_POSTS = [
  {
    id: 'ev-instagram',
    platform: 'Instagram',
    icon: '📸',
    handle: '@alex.explores',
    caption: 'Best 20th birthday ever 🎂',
    imageDescription:
      'Photo shows a birthday cake with candles, a university lanyard hanging around Alex\'s neck, and a restaurant name plate reading "Nomad Kitchen" in the background.',
    engagement: { icon: '❤️', label: '214 likes' },
    preview: 'Best 20th birthday ever 🎂',
  },
  {
    id: 'ev-linkedin',
    platform: 'LinkedIn',
    icon: '💼',
    handle: 'Alex Tan',
    caption: 'Excited to start my summer internship at ABC Bank! Grateful for the opportunity to learn from such a great team. #newbeginnings #internship',
    engagement: { icon: '👍', label: '89 reactions · 12 comments' },
    preview: 'Excited to start my summer internship…',
  },
  {
    id: 'ev-running',
    platform: 'Running App',
    icon: '🏃',
    handle: 'Alex\'s Activity',
    caption: 'Tuesday Morning Run, 5.4 km',
    routeDescription:
      'A route map showing a loop that starts and ends near a residential neighborhood, with the starting pin in an area labelled approximately "Brookhaven".',
    engagement: { icon: '🔥', label: '34 kudos' },
    preview: 'Tuesday Morning Run, 5.4 km',
  },
  {
    id: 'ev-tiktok',
    platform: 'TikTok',
    icon: '🎵',
    handle: '@alexlivin',
    caption: 'The 45-minute commute to school is killing me 😭 #studentlife',
    engagement: { icon: '❤️', label: '1.2K likes · 43 comments' },
    preview: 'The 45-minute commute is killing me 😭',
  },
  {
    id: 'ev-marketplace',
    platform: 'Marketplace',
    icon: '🛍️',
    handle: 'Seller: alex_t',
    caption: 'Selling: mini fridge, barely used. Location: Brookhaven. Local pickup only.',
    engagement: { icon: '👁️', label: '56 views · 3 inquiries' },
    preview: 'Selling: mini fridge, barely used…',
  },
]

// "Fact" nodes: directly extractable from a single post. "Inference" nodes:
// only make sense once one or more facts are connected to them. This
// mirrors the sample chains in the brief, e.g.
//   Birthday post → Age → (Graduation year)
//   Running route → Starting area → (Possible home area)
//   LinkedIn → Employer → Office location → Daily commute
export const BREADCRUMB_NODES = {
  'fact-age': {
    type: 'fact',
    label: 'Age: ~20',
    detail: '"20th birthday" states the age directly.',
    dossierFragment: 'is approximately 20 years old',
  },
  'fact-university': {
    type: 'fact',
    label: 'University: Meridian University',
    detail: 'The lanyard in the birthday photo identifies the school.',
    dossierFragment: 'studies at Meridian University',
  },
  'fact-employer': {
    type: 'fact',
    label: 'Employer: ABC Bank',
    detail: 'Stated directly in the LinkedIn post.',
    dossierFragment: 'works at ABC Bank',
  },
  'fact-route-area': {
    type: 'fact',
    label: 'Route starting area: ~Brookhaven',
    detail: 'The run route map shows an approximate starting neighbourhood.',
    dossierFragment: 'has a regular running route starting near Brookhaven',
  },
  'fact-commute-duration': {
    type: 'fact',
    label: 'Commute length: 45 minutes',
    detail: 'Stated directly in the TikTok caption.',
    dossierFragment: 'has a 45-minute daily commute',
  },
  'fact-seller-location': {
    type: 'fact',
    label: 'Marketplace location: Brookhaven',
    detail: 'Stated directly in the listing.',
    dossierFragment: 'is based in the Brookhaven area',
  },
  'inf-graduation-year': {
    type: 'inference',
    label: 'Likely graduation year: ~2027',
    detail: 'A 20-year-old currently at university is likely 2-3 years from graduating.',
    category: 'Education',
    sensitivity: 'low',
    dossierFragment: 'is likely graduating around 2027',
  },
  'inf-birthday-window': {
    type: 'inference',
    label: 'Approximate birthday: this month',
    detail: 'The "20th birthday" post was made this month, narrowing the birthday to a specific window.',
    category: 'Personal',
    sensitivity: 'high',
    dossierFragment: 'has a birthday sometime this month',
  },
  'inf-home-area': {
    type: 'inference',
    label: 'Likely residential area: Brookhaven',
    detail: 'Two independent sources (run route + marketplace listing) both point to the same area.',
    category: 'Location',
    sensitivity: 'medium',
    dossierFragment: 'likely lives near Brookhaven',
  },
  'inf-office-location': {
    type: 'inference',
    label: 'Likely office area: Central Business District',
    detail: 'ABC Bank\'s main office is in the CBD.',
    category: 'Work',
    sensitivity: 'medium',
    dossierFragment: 'likely works out of the Central Business District',
  },
  'inf-daily-commute': {
    type: 'inference',
    label: 'Weekday commute pattern: Brookhaven → CBD, ~45 min, weekday mornings',
    detail: 'Combining home area, office area, and stated commute time reveals roughly where and when Alex travels each weekday.',
    category: 'Schedule',
    sensitivity: 'high',
    dossierFragment: 'probably travels between Brookhaven and the CBD on weekday mornings, about 45 minutes each way',
  },
}

// Each edge is one valid connection the player can make. `from` is an array
// because some inference nodes require multiple prerequisite facts before
// they "unlock" as a valid target (teaches that a single clue is rarely
// enough — corroboration across posts is what makes an inference strong).
export const BREADCRUMB_EDGES = [
  { id: 'e1', from: ['ev-instagram'], to: 'fact-age', points: 10 },
  { id: 'e2', from: ['ev-instagram'], to: 'fact-university', points: 10 },
  { id: 'e3', from: ['ev-linkedin'], to: 'fact-employer', points: 10 },
  { id: 'e4', from: ['ev-running'], to: 'fact-route-area', points: 10 },
  { id: 'e5', from: ['ev-tiktok'], to: 'fact-commute-duration', points: 10 },
  { id: 'e6', from: ['ev-marketplace'], to: 'fact-seller-location', points: 10 },
  { id: 'e7', from: ['fact-age', 'fact-university'], to: 'inf-graduation-year', points: 20 },
  { id: 'e8', from: ['fact-age'], to: 'inf-birthday-window', points: 15 },
  { id: 'e9', from: ['fact-route-area', 'fact-seller-location'], to: 'inf-home-area', points: 20 },
  { id: 'e10', from: ['fact-employer'], to: 'inf-office-location', points: 15 },
  {
    id: 'e11',
    from: ['inf-office-location', 'fact-commute-duration', 'inf-home-area'],
    to: 'inf-daily-commute',
    points: 25,
  },
]

export const BREADCRUMB_MAX_SCORE = BREADCRUMB_EDGES.reduce((sum, e) => sum + e.points, 0)

// Powers the dynamic final reveal screen: for each entry, if the player
// actually reached that specific inference this playthrough (i.e. its id is
// in board.unlockOrder), the reveal can honestly say "Alex never explicitly
// posted X — you inferred it." Never shown for an inference that wasn't
// actually reached, so an early exit never claims a discovery that didn't
// happen. Ordered by narrative strength — the reveal shows the first match.
export const FIND_ALEX_REVEAL_INSIGHTS = [
  {
    nodeId: 'inf-home-area',
    neverPostedLine: 'Alex never explicitly posted where they live.',
    inferredLine: 'You inferred it — from a running route and a marketplace listing that both pointed the same way.',
  },
  {
    nodeId: 'inf-daily-commute',
    neverPostedLine: "Alex never explicitly posted their weekday schedule.",
    inferredLine: 'You inferred it — by combining their likely home area, work area, and stated commute time.',
  },
  {
    nodeId: 'inf-birthday-window',
    neverPostedLine: 'Alex never explicitly posted their exact date of birth.',
    inferredLine: "You narrowed it to a specific window anyway, just from when the birthday post was made.",
  },
  {
    nodeId: 'inf-graduation-year',
    neverPostedLine: 'Alex never explicitly posted when they graduate.',
    inferredLine: 'You inferred it — just from their age and university.',
  },
  {
    nodeId: 'inf-office-location',
    neverPostedLine: 'Alex never explicitly posted where they work from day to day.',
    inferredLine: "You inferred it, just from their employer's name.",
  },
]

// ---------------------------------------------------------------------------
// Recommended missions shown after the Privacy Defence Score. Self-reported
// completion is intentional here — this is a personal checklist, not a
// claim about having helped someone else (that distinction matters more in
// the Community Centre district, see docs/VISION.md).
// ---------------------------------------------------------------------------

export const PRIVACY_MISSIONS = [
  {
    id: 'break-the-trail',
    title: 'Break the Trail',
    description: 'Hide precise workout routes so your regular starting point isn\'t public.',
    xp: 150,
  },
  {
    id: 'birthday-ghost',
    title: 'Birthday Ghost',
    description: 'Reduce how much public info reveals your date of birth.',
    xp: 100,
  },
  {
    id: 'who-can-see-me',
    title: 'Who Can See Me?',
    description: 'Review who can see your profile and posts by default.',
    xp: 100,
  },
]

export const PRIVACY_AREA_LABELS = {
  'break-the-trail': 'Location & routine privacy',
  'birthday-ghost': 'Birthday / age privacy',
  'who-can-see-me': 'Profile visibility',
}
