// Fallback pool for the difficulty-adaptive "bonus round" (Phase 4), used
// whenever no AI key is configured so the feature still works offline. Each
// entry already carries its own fixed ground truth (redFlags /
// plausibleButSafe) — exactly the shape lib/ai.js normalizes a model
// response into, so the bonus round component never has to know whether a
// given round came from the model or from here.

export const SCAM_EXAMPLE_POOL = [
  {
    difficulty: 'beginner',
    message: {
      sender: 'Unknown (+1 302 555 0199)',
      text: "CONGRATULATION!!! You has been chosen to win FREE iPhone 15!! Click link now to clam before it expire: http://ipnone-rewards.tk/claim",
    },
    redFlags: [
      'Multiple spelling and grammar mistakes ("You has been chosen", "clam")',
      'An unsolicited "you won a prize" message out of nowhere',
      'A strange, non-official-looking link domain (.tk, misspelled brand)',
    ],
    plausibleButSafe: ['Uses exclamation marks', 'Message arrived on a phone number, not an app'],
  },
  {
    difficulty: 'advanced',
    message: {
      sender: 'Union Trust Bank Alerts',
      text: "We noticed a login to your Union Trust Bank account from a new device in an unfamiliar location. If this wasn't you, secure your account within 2 hours: uniontrust-secure-verify.com/login",
    },
    redFlags: [
      'The link domain is not the bank\'s real domain, even though it sounds plausible',
      'A short time pressure window ("within 2 hours") pushing a fast, unverified click',
    ],
    plausibleButSafe: [
      'Correct, professional tone and formatting with no spelling errors',
      'Real banks do sometimes send new-device login alerts',
    ],
  },
  {
    difficulty: 'intermediate',
    message: {
      sender: 'ParcelHub Support',
      text: "Your recent order #29481 could not be delivered due to an unpaid customs fee of $2.50. Pay now to avoid your parcel being returned: parcelhub-fee.info/pay",
    },
    redFlags: [
      'A very small, oddly specific "fee" designed to feel too minor to question',
      'A link domain that isn\'t ParcelHub\'s real site',
    ],
    plausibleButSafe: ['References a plausible-sounding order number', 'Delivery/customs fee messages do exist legitimately'],
  },
]

export function pickFallbackExample(difficulty) {
  const matching = SCAM_EXAMPLE_POOL.filter((e) => e.difficulty === difficulty)
  const pool = matching.length > 0 ? matching : SCAM_EXAMPLE_POOL
  return pool[Math.floor(Math.random() * pool.length)]
}
