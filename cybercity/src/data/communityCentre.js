// Community Centre district content (Phase 2). All four resident missions
// share one deterministic template — a live chat conversation, not a static
// card — driven entirely by this data, rendered by one shared component
// (ResidentMission.jsx), same pattern as Recovery Rush's levels.
//
// Each mission has three scored moments, all deterministic (no AI):
//   1. A decision, made via quick-reply chips — `strategies[].correct`.
//   2. That decision's consequence, played out as chat messages —
//      `strategies[].consequence` — distinct per choice, not a generic
//      right/wrong message.
//   3. A reply assembled from tiles instead of typed free text —
//      `replyTiles` — scored by lib/scoring.js's scoreTileReply, which
//      returns the same { clear, issues } shape the old free-text rubric
//      did, so scoreResidentMission needed no changes at all.

export const RESIDENTS = [
  {
    id: 'auntie-may',
    icon: '👵',
    name: 'Auntie May',
    age: 67,
    description:
      "Auntie May uses WhatsApp every day to stay in touch with family. She isn't comfortable with technical terms and just wants to know what to do.",
    quote: '"Someone messaged saying they\'re my son and this is their new number. They need money urgently..."',
    threatCategory: 'Impersonation scam',
    threatLevel: 'High',
    accentColor: '#e0a94a',
    channel: 'WhatsApp',
    chat: {
      opening: 'Hi Mum. My phone broke and I lost all my contacts. This is my new number.',
      question: 'Should I reply?',
    },
    strategies: [
      {
        id: 'verify-known-channel',
        icon: '📞',
        label: "Call her child's original number to check, independently of this new chat",
        correct: true,
        consequence: [
          { text: 'Okay, let me call him on his usual number now, just to be safe...' },
          { text: "Phew — he says he never sent that message! It really was a scam trying to get money out of me." },
        ],
      },
      {
        id: 'ask-personal-questions',
        icon: '💬',
        label: 'Reply and ask the sender a few personal questions to check if it\'s really her child',
        correct: false,
        consequence: [
          { text: "I asked what our dog's name was... they got it right! Must be him, right?" },
          { text: "Wait — I posted photos of our dog on Facebook last month. Anyone could have seen that." },
        ],
      },
      {
        id: 'send-money',
        icon: '💸',
        label: 'Send some money in case it\'s urgent, and sort out the details later',
        correct: false,
        consequence: [
          { text: 'I sent $500 like they asked, just in case it was really urgent...' },
          { text: 'Wait, my son says he never asked for that... oh no.' },
        ],
      },
      {
        id: 'ask-bank-details',
        icon: '🏦',
        label: "Ask for the child's bank details to confirm it's them",
        correct: false,
        consequence: [
          { text: 'I asked for his bank account number, to "confirm" it was really him...' },
          { text: "They actually sent one straight away. That felt convincing, but now I'm worried I've started something bad." },
        ],
      },
    ],
    replyTiles: {
      core: [
        { id: 'core-1', text: "Don't reply yet" },
        { id: 'core-2', text: 'Call your usual number' },
        { id: 'core-3', text: 'to check first' },
      ],
      distractors: [
        { id: 'dist-1', text: 'Send some money to be safe', type: 'bad-advice', feedback: "That's not safe advice — don't include it." },
        { id: 'dist-2', text: 'Ask them to confirm the number', type: 'bad-advice', feedback: "That doesn't actually verify anything — leave it out." },
        { id: 'dist-3', text: 'Check the SSL certificate', type: 'jargon', feedback: "She won't understand that term." },
        { id: 'dist-4', text: "Verify it's not spoofed", type: 'jargon', feedback: "She won't understand that term." },
      ],
    },
    replyConsequence: {
      good: [{ text: "Got it — I won't reply to that number. Calling him now instead. Thanks!" }],
      unclear: [{ text: "Hmm, I'm not totally sure what you mean by all that... but okay, I'll be careful." }],
    },
  },
  {
    id: 'mr-ravi',
    icon: '🧑‍🍳',
    name: 'Mr Ravi',
    age: 52,
    description:
      'Mr Ravi runs a small food stall and accepts QR payments all day. He\'s busy, the queue is long, and he doesn\'t have time to fuss over every customer.',
    quote: '"A customer says their payment failed and wants me to scan their QR code for a \'refund\'..."',
    threatCategory: 'QR / payment scam',
    threatLevel: 'High',
    accentColor: '#c96b4f',
    channel: 'In person + WhatsApp',
    chat: {
      opening:
        "Excuse me, I scanned to pay just now but got an error! Can you scan this QR code I'm showing you? It's the refund code, my banking app is being confusing.",
      question: 'Should he scan the QR code the customer is holding up?',
    },
    strategies: [
      {
        id: 'check-own-app',
        icon: '📱',
        label: "Don't scan any code from the customer — check his own banking app directly to see if a payment actually came in",
        correct: true,
        consequence: [
          { text: 'Wait, let me check my own banking app first...' },
          { text: 'Huh, no new payment came in! Good thing I checked — that QR code would have sent MY money out, not given me a refund.' },
        ],
      },
      {
        id: 'scan-to-check',
        icon: '📷',
        label: 'Scan it quickly just to see what happens',
        correct: false,
        consequence: [
          { text: 'Okay, let me just scan it and see what happens...' },
          { text: "Wait. It's asking me to confirm a payment of $50 OUT of my account! This is not a refund at all!" },
        ],
      },
      {
        id: 'ask-more-details',
        icon: '💬',
        label: 'Ask the customer to explain more about what went wrong',
        correct: false,
        consequence: [
          { text: 'Wait, what exactly happened when you paid?' },
          { text: "Customer explained very confidently but... explaining doesn't actually prove anything about that QR code." },
        ],
      },
      {
        id: 'trust-customer-certain',
        icon: '🤝',
        label: 'Scan it since the customer seems certain and the queue is getting long',
        correct: false,
        consequence: [
          { text: 'Okay, the queue is getting long, let me just scan it...' },
          { text: 'Wait, why is it asking ME to pay?! I think I nearly got scammed because I didn\'t want to hold up the line.' },
        ],
      },
    ],
    replyTiles: {
      core: [
        { id: 'core-1', text: "Don't scan that code" },
        { id: 'core-2', text: 'check your own banking app' },
        { id: 'core-3', text: 'to see if it went through' },
      ],
      distractors: [
        { id: 'dist-1', text: 'Scan it just to check', type: 'bad-advice', feedback: "That's not safe — scanning it is the risk itself." },
        { id: 'dist-2', text: 'Trust him, he seems sure', type: 'bad-advice', feedback: "Confidence isn't proof — leave that out." },
        { id: 'dist-3', text: 'Verify the transaction hash', type: 'jargon', feedback: "He won't understand that term." },
        { id: 'dist-4', text: 'Check for a phishing endpoint', type: 'jargon', feedback: "He won't understand that term." },
      ],
    },
    replyConsequence: {
      good: [{ text: "Okay, that makes sense. I'll check my own app first next time. Thanks!" }],
      unclear: [{ text: "Hmm... okay, I think I got it? I'll just be more careful." }],
    },
  },
  {
    id: 'sarah',
    icon: '🎓',
    name: 'Sarah',
    age: 19,
    description:
      "Sarah is a student applying widely for internships. She's excited and a little anxious about landing one before the semester starts.",
    quote: '"I got offered an internship, but they want a $150 registration fee and my bank details before the interview..."',
    threatCategory: 'Job scam',
    threatLevel: 'Medium',
    accentColor: '#5eb89c',
    channel: 'WhatsApp',
    chat: {
      opening:
        "Congratulations! You've been selected for a guaranteed Marketing Intern role. To secure your spot, please pay a $150 registration fee and share your bank account number for stipend setup — before your interview.",
      question: 'Should she pay the fee and send her bank details to secure the internship?',
    },
    strategies: [
      {
        id: 'verify-independently',
        icon: '🔍',
        label: "Don't pay or share anything — look up the company's official website or LinkedIn independently first",
        correct: true,
        consequence: [
          { text: 'Let me check their website and LinkedIn first before replying...' },
          { text: 'I can\'t find "Talent Direct Careers" anywhere except a random Instagram page made last week. Definitely fake.' },
        ],
      },
      {
        id: 'pay-refundable',
        icon: '💸',
        label: 'Pay the fee since it sounds refundable and the opportunity seems good',
        correct: false,
        consequence: [
          { text: "I paid the $150 — they said it's fully refundable..." },
          { text: "It's been a week and they've stopped replying. I don't think I'm getting that money back." },
        ],
      },
      {
        id: 'ask-for-details',
        icon: '💬',
        label: 'Reply asking for more details about the role before deciding',
        correct: false,
        consequence: [
          { text: 'I asked for more info about the role...' },
          { text: 'They sent a very detailed, professional-sounding reply... but I still don\'t actually know if the COMPANY itself is real.' },
        ],
      },
      {
        id: 'send-bank-only',
        icon: '🏦',
        label: 'Send just the bank account number, since interview details will presumably come after',
        correct: false,
        consequence: [
          { text: 'I sent just my bank account number, for the "stipend setup"...' },
          { text: 'Now they\'re asking for my bank password too, "to verify". Something feels very wrong.' },
        ],
      },
    ],
    replyTiles: {
      core: [
        { id: 'core-1', text: "Don't pay or share anything" },
        { id: 'core-2', text: 'look up the company' },
        { id: 'core-3', text: 'on their official website or LinkedIn' },
      ],
      distractors: [
        { id: 'dist-1', text: "It's refundable, so pay the fee", type: 'bad-advice', feedback: "Real employers never charge candidates — leave that out." },
        { id: 'dist-2', text: 'Send your bank number first', type: 'bad-advice', feedback: "No legitimate reason to send that before an offer — leave it out." },
        { id: 'dist-3', text: 'Verify their SSL certificate', type: 'jargon', feedback: "That won't mean anything to her right now." },
        { id: 'dist-4', text: "Check the sender's IP address", type: 'jargon', feedback: "That won't mean anything to her right now." },
      ],
    },
    replyConsequence: {
      good: [{ text: "Good call — I'll look them up properly before replying to anything like this again." }],
      unclear: [{ text: "Okay... I think I get it, but I'm still a little unsure what exactly to check." }],
    },
  },
  {
    id: 'daniel',
    icon: '🎮',
    name: 'Daniel',
    age: 14,
    description:
      'Daniel plays a lot of online games and chats with friends (and strangers) on Discord. He reuses the same password on pretty much everything.',
    quote: '"Someone in Discord sent me a link for free skins and V-Bucks if I log in through their site..."',
    threatCategory: 'Account security',
    threatLevel: 'Medium',
    accentColor: '#7c93d1',
    channel: 'Discord DM',
    chat: {
      opening:
        "yo i found a site giving free skins n V-bucks, just login with your account here to claim: freegameredeem-rewards.com — do it fast before it's gone!!",
      question: 'Should he log in through that link to claim the reward?',
    },
    strategies: [
      {
        id: 'go-direct',
        icon: '🌐',
        label: "Don't log in through the link — go directly to the game's official site or app instead",
        correct: true,
        consequence: [
          { text: "Nah, I'll just go to the game's site myself instead of that link..." },
          { text: "There's nothing about free V-Bucks on the real site. That link was fake — glad I didn't log in there." },
        ],
      },
      {
        id: 'login-friend-vouches',
        icon: '🤝',
        label: 'Log in through the link since a friend seems to be recommending it',
        correct: false,
        consequence: [
          { text: 'My friend said it\'s legit, so I logged in...' },
          { text: "Wait, my friend's account just DMed a bunch of other people the same link. I think his account got hacked through this." },
        ],
      },
      {
        id: 'login-then-logout',
        icon: '🔁',
        label: 'Log in to claim it, then log out again right away',
        correct: false,
        consequence: [
          { text: "I logged in fast, grabbed the 'reward', then logged straight out..." },
          { text: "Now I'm getting emails about logins from places I've never been. Logging out didn't undo giving them my password." },
        ],
      },
      {
        id: 'ask-proof-then-login',
        icon: '📸',
        label: 'Ask the friend for proof it worked, then log in through the same link',
        correct: false,
        consequence: [
          { text: 'Friend sent a screenshot as "proof", so I used the link...' },
          { text: 'Screenshots are easy to fake though. I logged in anyway and now something feels off with my account.' },
        ],
      },
    ],
    replyTiles: {
      core: [
        { id: 'core-1', text: "Don't log in through that link" },
        { id: 'core-2', text: "go to the game's site directly" },
        { id: 'core-3', text: 'since you reuse that password everywhere' },
      ],
      distractors: [
        { id: 'dist-1', text: 'Log in quick then log out', type: 'bad-advice', feedback: "Logging in at all already hands over the password." },
        { id: 'dist-2', text: 'Ask for proof first', type: 'bad-advice', feedback: "Proof doesn't make the link itself any safer." },
        { id: 'dist-3', text: 'Check for credential stuffing', type: 'jargon', feedback: "That's not how he'd talk about it — keep it simple." },
        { id: 'dist-4', text: "Verify the endpoint's certificate", type: 'jargon', feedback: "That's not how he'd talk about it — keep it simple." },
      ],
    },
    replyConsequence: {
      good: [{ text: "Oh true, if it leaked my password that'd hit everything else too. Good point, I'll skip it." }],
      unclear: [{ text: "Uhh okay, I guess I just won't click it then." }],
    },
  },
]

export function getResident(residentId) {
  return RESIDENTS.find((r) => r.id === residentId)
}

// ---------------------------------------------------------------------------
// Cyber Guardian mode: a short two-person, same-device interactive scenario.
// This intentionally does NOT self-report "I helped someone" — completion
// requires alternating, active input from both participants in one sitting.
// It can't cryptographically prove a second person is present; the design
// goal is raising the bar above a one-click claim, not perfect verification
// (see docs/VISION.md).
// ---------------------------------------------------------------------------

export const GUARDIAN_SCENARIO = {
  message: {
    sender: 'Skyline Mobile Billing',
    text: "Your bill payment failed. Please update your payment details within 24 hours to avoid service suspension: bit.ly/skyline-billing-2024. Thank you for being a valued customer!",
  },
  clues: [
    {
      id: 'clue-link',
      player: 'A',
      text: '"bit.ly/skyline-billing-2024" — a shortened link instead of the real Skyline Mobile website',
      isRedFlag: true,
    },
    {
      id: 'clue-urgency',
      player: 'B',
      text: '"within 24 hours to avoid service suspension" — a tight deadline with a scary consequence',
      isRedFlag: true,
    },
    {
      id: 'clue-thanks',
      player: 'A',
      text: '"Thank you for being a valued customer!" — a friendly, generic sign-off',
      isRedFlag: false,
    },
    {
      id: 'clue-sender-name',
      player: 'B',
      text: '"This is Skyline Mobile Billing" — the message states a recognizable company name',
      isRedFlag: false,
    },
  ],
}
