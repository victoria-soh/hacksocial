# Community Centre — status

Update: the roster and the Guardian system described below are now built.
This file originally documented them as vision-only; kept here as the
design rationale behind what shipped, since the "why" (especially for
Guardian Mode's verification approach) matters as much as the "what."

## The resident roster (built)

Each resident is a fictional practice scenario, matching the same ethical
guardrail as Digital Breadcrumbs: no real people, no lookups, no OSINT. All
four share one component (`src/components/communityCentre/ResidentMission.jsx`)
driven by data in `src/data/communityCentre.js` — same pattern as Recovery
Rush's levels.

- **Auntie May** — 67, WhatsApp, a "new number" impersonation scam.
- **Mr Ravi** — small business owner, a QR payment swap/refund scam.
- **Sarah** — 19, student, a fake-internship advance-fee scam.
- **Daniel** — 14, gamer, a credential-phishing link, with the explanation
  rubric specifically checking that the player's answer names the password-
  reuse risk (not just "don't click the link").

Every mission reuses the same deterministic clarity rubric
(`scoreExplanationClarity` in `src/lib/scoring.js`) with light
per-resident tuning — extra jargon terms, allowed terms, or a required-
concept check — rather than a separate rubric per resident.

## The Cyber Guardian system (built)

The product's secondary vision (see the brief's "Target Users") is that
players who've built up their own resilience become **Cyber Guardians** who
help someone less tech-confident in their life stay safe — a parent, a
grandparent, a friend.

The mechanism that matters here is **verification, not self-report**. Every
other checklist in CyberCity (Privacy Defence missions, Recovery Rush
completion) is fine to self-report, because it's a personal claim about your
own accounts — there's nothing to fake. "I helped someone" is different: it's
a claim about another person's safety, and an unverifiable checkbox there
would let the badge mean nothing.

**Guardian Mode** (`src/components/communityCentre/GuardianMode.jsx`),
unlocked once all four resident missions are complete, is a same-device,
two-person scenario: a suspicious message is shown with four clues, and
players A and B alternate turns classifying each one as a red flag or
normal, with an explicit "pass the device, tap when ready" handoff between
turns. The UI states plainly that this can't cryptographically verify a
second person is present — the design goal is raising the bar above a
one-click claim, not perfect verification. Completion awards +5 Community
Resilience and is the actual condition for the **Community Guardian**
badge (not merely finishing one resident mission, which was the badge's
looser placeholder condition before this system existed).
