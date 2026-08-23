// Daily Challenge — a rapid-fire "scam or legit" mini-game. Replaces the old
// single-question streak check-in with a genuine short mini-game: a pool of
// pre-written scenarios (phishing, QR-payment scams, job scams, and their
// legitimate look-alikes), a deterministic-but-varied daily round is drawn
// from this pool (see getTodayRound below), and completing that round — not
// just visiting the page — is what calls recordStreakCheckIn (see
// DailyStreak.jsx). Every item is fixed content, never AI-generated, so
// scoring stays pure set-comparison (see lib/scoring.js's
// scoreDailyChallengeRound) — same "deterministic facts in app code" rule
// as every other district.
export const DAILY_CHALLENGE_POOL = [
  {
    id: 'urgent-password-verify',
    sender: 'Unknown SMS',
    text: 'URGENT: Your account will be suspended in 1 hour unless you verify your password here: [link]',
    isScam: true,
    explanation: 'A tight deadline plus a direct request for your password is a classic pressure-and-harvest scam.',
  },
  {
    id: 'gift-card-prize',
    sender: 'Unknown SMS',
    text: "Congratulations, you've won a $1000 gift card! Claim now: [link]",
    isScam: true,
    explanation: "An unsolicited \"you've won\" message with a claim link is a near-universal scam pattern.",
  },
  {
    id: 'new-number-mum',
    sender: 'Unknown number',
    text: "Hi, it's mum, new number. Can you transfer me $500 right now?",
    isScam: true,
    explanation: 'Money requested from an unverifiable "new number" is a classic impersonation scam — always confirm on the known number first.',
  },
  {
    id: 'qr-refund-scam',
    sender: 'In person',
    text: "Sorry, I paid you but got an error! Can you scan this QR code? It's the refund.",
    isScam: true,
    explanation: 'A "refund" QR code someone else generates and asks you to scan is designed to pull money OUT of your account, not into it.',
  },
  {
    id: 'guaranteed-internship',
    sender: 'WhatsApp',
    text: "Congratulations! You've been selected for a guaranteed Marketing Intern role. Pay a $150 registration fee to secure your spot.",
    isScam: true,
    explanation: 'Real employers never charge candidates a fee to secure a role — that "guarantee" is the scam.',
  },
  {
    id: 'customs-fee-parcel',
    sender: 'ParcelHub',
    text: 'Your package could not be delivered due to an unpaid customs fee of $2.50. Pay now to avoid it being returned: [link]',
    isScam: true,
    explanation: 'A small, oddly specific fee designed to feel too minor to question, paid through an unofficial link.',
  },
  {
    id: 'bank-login-link',
    sender: 'Bank Alerts',
    text: 'We noticed a login to your account from a new device. Secure your account within 2 hours: [link]',
    isScam: true,
    explanation: 'Real banks don\'t ask you to "secure your account" through a link in a text — go to the app directly instead.',
  },
  {
    id: 'tech-support-virus',
    sender: 'Unknown caller ID',
    text: 'This is tech support — we detected a virus on your computer. Call this number immediately to fix it: [phone]',
    isScam: true,
    explanation: "Software companies don't proactively call you about a virus — this is a classic tech-support scam opener.",
  },
  {
    id: 'romance-emergency-flight',
    sender: 'Dating app match',
    text: "I've been talking to you for weeks and I really feel a connection. I just need $300 for an emergency flight to visit you.",
    isScam: true,
    explanation: 'An online-only relationship suddenly needing money for travel is one of the most common romance-scam patterns.',
  },
  {
    id: 'subscription-lose-access',
    sender: 'Streaming Service',
    text: 'Your subscription payment failed. Update your card immediately or lose access: [link]',
    isScam: true,
    explanation: 'Urgency plus an unfamiliar payment link — check the real app directly instead of clicking through.',
  },
  {
    id: 'dentist-reminder',
    sender: 'Clinic',
    text: 'Reminder: your dentist appointment is tomorrow at 3pm.',
    isScam: false,
    explanation: 'A plain appointment reminder with no link, payment, or urgency — nothing to verify here.',
  },
  {
    id: 'meeting-moved',
    sender: 'Your manager',
    text: 'Team meeting moved to 3pm today.',
    isScam: false,
    explanation: 'A routine work message from a known, expected contact — no red flags.',
  },
  {
    id: 'order-shipped',
    sender: 'Online Store',
    text: 'Your order has shipped and is on its way.',
    isScam: false,
    explanation: 'A standard shipping notification with no fee, link to click, or urgent action needed.',
  },
  {
    id: 'old-classmate',
    sender: 'Old classmate',
    text: "Hey, it's been a while! How have you been?",
    isScam: false,
    explanation: 'A friendly catch-up message with no request attached — nothing suspicious yet.',
  },
  {
    id: 'ride-arriving',
    sender: 'Ride app',
    text: 'Your ride is arriving in 2 minutes.',
    isScam: false,
    explanation: 'A routine automated notification tied to something you actually booked.',
  },
  {
    id: 'library-due',
    sender: 'Library',
    text: 'Reminder: your library books are due back Friday.',
    isScam: false,
    explanation: 'A low-stakes reminder with no money, login, or link involved.',
  },
  {
    id: 'purchase-receipt',
    sender: 'Online Store',
    text: "Thanks for your purchase — here's your receipt.",
    isScam: false,
    explanation: 'A standard post-purchase receipt for something you actually bought.',
  },
  {
    id: 'video-call-reminder',
    sender: 'Calendar',
    text: 'Your video call starts in 10 minutes.',
    isScam: false,
    explanation: 'An automated calendar reminder — nothing is being asked of you beyond showing up.',
  },
  {
    id: 'friend-comment',
    sender: 'Social app',
    text: 'New comment on your post from a friend.',
    isScam: false,
    explanation: 'A routine social notification with no link to click or information requested.',
  },
  {
    id: 'monthly-statement',
    sender: 'Bank',
    text: 'Your monthly statement is now available in the app.',
    isScam: false,
    explanation: 'Purely informational, points you to open the app yourself rather than a link — no urgency, no action forced.',
  },
]

// Simple deterministic PRNG (mulberry32) seeded by the calendar date, so the
// same day always produces the same round (fair — no random re-roll for a
// better set) but different days draw a different, shuffled slice of the
// pool, so the game doesn't repeat the same scenarios every time.
function mulberry32(seed) {
  let s = seed
  return function () {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle(arr, seed) {
  const rand = mulberry32(seed)
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export const DAILY_CHALLENGE_ROUND_SIZE = 6
export const DAILY_CHALLENGE_SECONDS_PER_ITEM = 5

/** The deterministic-per-day round: a shuffled slice of the pool, seeded by the calendar date. */
export function getTodayRound(date = new Date(), roundSize = DAILY_CHALLENGE_ROUND_SIZE) {
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000)
  const seed = date.getFullYear() * 1000 + dayOfYear
  return seededShuffle(DAILY_CHALLENGE_POOL, seed).slice(0, roundSize)
}
