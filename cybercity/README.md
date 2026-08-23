# CyberCity

**Learn to protect yourself. Then protect your community.**

CyberCity is a gamified cybersecurity education platform for students and
young adults (~13-25) who use social media and online accounts heavily but
don't see themselves as targets. It teaches through experience, not
warnings: players make decisions, see realistic consequences, then apply
what they learned to their real digital lives.

Three pillars, one per district:

- 🔎 **Digital Breadcrumbs** ("Discover") — what can someone learn about me?
- 🚨 **Recovery Rush** ("Respond") — if something goes wrong, do I know what to do?
- 🛡️ **Community Centre** ("Protect") — can I help someone else stay safe?

## Live Demo

<!-- TODO: add the deployed URL here once this is hosted — not yet live. -->
Not deployed yet — see [Local setup](#local-setup) below to run it yourself.

## Ethical guardrails (non-negotiable, and enforced in the code)

- Digital Breadcrumbs only ever uses **fictional practice profiles** (see
  `src/data/breadcrumbs.js`) or text a user **voluntarily types about
  themselves** (see the Role Reversal feature). There is no username
  search, no lookup of a real other person, nothing that functions as an
  OSINT tool against anyone.
- No real financial account connections. No scraping of real social accounts.

## How the AI features actually work

CyberCity has exactly **three** features that call a real language model —
everything else in the game (scoring, correctness, which accounts are
connected, whether a choice was right) is deterministic app code, never a
model's judgment call:

1. **Digital Breadcrumbs — "Can AI investigate you?"** (`RoleReversal.jsx` →
   `categorizeSelfExposure`): a player pastes their own bio/captions and the
   model categorizes what's directly exposed vs. inferable vs. exploitable.
2. **Recovery Rush — end-screen explanation** (`EndScreen.jsx` →
   `explainRecoveryMistakes`): the model narrates, in plain language, a
   mistake report our own code already computed — it's told the ground
   truth and isn't allowed to contradict it, only put it into words.
3. **Phase 4 bonus round** (`BonusRound.jsx` → `generateScamExample`): the
   model writes a fresh scam-message example matched to the player's recent
   accuracy, plus its own answer key in the same call — that answer key is
   then treated as fixed ground truth, so grading a later selection is pure
   set comparison, never a live model judgment.

**Architecture — the key never reaches the browser.** All three funnel
through one choke point, `src/lib/ai.js`'s `callModel()`, which calls this
app's own backend (`server/`) at `POST /api/ai/complete` — never
`api.anthropic.com` directly from client code. The backend holds
`ANTHROPIC_API_KEY` server-side (see `server/.env.example`), makes the real
Anthropic call, and returns just the text. A separate `GET /api/ai/status`
endpoint reports whether a key is configured at all, which drives the
"using local analysis" / "using a built-in example pool" notices shown in
the UI. Swapping model providers means editing `callModel()`'s backend
counterpart in `server/index.js` — nothing else in the app needs to change.

**The deterministic fallback is a deliberate reliability choice, not a
placeholder.** Every one of the three features above has its own local,
rule-based fallback (`heuristicCategorizeExposure`, `heuristicExplainMistakes`,
and a small hand-authored example pool in `src/data/scamExamples.js`), used
automatically whenever the backend has no key configured, is unreachable,
or a call simply fails. This means CyberCity is **fully playable with zero
setup and zero ongoing cost** — no backend, no API key, no network
dependency beyond loading the page itself. That matters for a game meant to
run in classrooms, at hackathon demo booths, or on a phone with a bad
connection, and it means a live-model outage degrades the experience
slightly instead of breaking it.

One more thing worth being explicit about: Recovery Rush's "adaptive
attacker" (the feed backing off when you secure an account fast, escalating
further if you're slow) is **not AI** — it's rule-based branching over fixed
thresholds in `src/data/recoveryRush.js`, deliberately built that way. It's
easy to assume "adaptive" means a model is involved here; it isn't.

## Tech stack

- **Frontend**: React 19 + Vite, React Router, Tailwind CSS v4. State/progress
  lives in `localStorage` (`src/lib/storage.js`), normalized on load so old
  saves survive schema changes.
- **Visualizations**: hand-built inline SVG with fixed layouts (radial rings
  for Recovery Rush's blast radius, a column-based node/arrow case board for
  Digital Breadcrumbs) — no graph library.
- **Backend** (optional): Node/Express + SQLite, using Node's built-in
  `node:sqlite` (experimental, no native build step) — see
  [`server/README.md`](server/README.md). Provides the AI proxy above, plus
  a 6-character shareable-code sync (no accounts/passwords) and an opt-in
  aggregate resilience comparison stat.
- **AI**: Anthropic's Messages API, called server-side only (see above).

## Local setup

You need [Node.js](https://nodejs.org/) — v20.19+ for the frontend, v22.5+
if you also want to run the backend (`node:sqlite` requires it). Check with
`node --version`.

### 1. Frontend (this is all you need to play the game)

```bash
git clone <this-repo-url>
cd cybercity
npm install
npm run dev
```

Open the URL it prints (`http://localhost:5173`). That's it — the whole
game is playable right now, fully offline-capable, with every AI feature
already working via its local heuristic fallback (see above). No `.env`
file, no API key, no backend needed for this.

### 2. Backend (optional — cross-device sync + real AI calls)

In a second terminal:

```bash
cd server
cp .env.example .env
npm install
npm start
```

This starts on `http://localhost:8787`, which the frontend already talks to
by default — no extra config needed for local dev. To also enable real
model calls (rather than the local heuristics), open `server/.env` and set
`ANTHROPIC_API_KEY` to a key from
[console.anthropic.com](https://console.anthropic.com/); leaving it unset
is fine, everything still works.

With the backend running, the dashboard's "Save & resume across devices"
panel can create a shareable code, and the opt-in resilience comparison
panel becomes usable. Without it, CyberCity works exactly the same except
those two things — nothing else changes, nothing breaks.

### 3. Deploying it yourself

- Frontend: `netlify.toml` + `public/_redirects` are already set up for
  Netlify (zero-config build detection plus the SPA fallback React Router
  needs). Set `VITE_API_URL` in the site's environment variables to your
  deployed backend's URL (see `.env.example`).
- Backend: `server/render.yaml` is set up for Render. **Read the comment at
  the top of that file before relying on it** — Render's free tier has no
  persistent disk, so the SQLite file (and with it, shareable-code
  progress) resets on every redeploy and periodically on free-tier
  spin-down. Core gameplay is unaffected either way, since that's all
  `localStorage` on the player's own device. Set `ANTHROPIC_API_KEY` and
  `ALLOWED_ORIGINS` (your deployed frontend's URL — CORS is locked to
  localhost plus whatever you list here) in the Render dashboard, never in
  the repo.

## What's built vs. what's just documented

Everything described in this README and in the "What's built" section
below is actually implemented and working, not aspirational — Phases 1
through 5 (see below) are all complete. The one known gap: Recovery Rush's
brief mentions "levels 1-5" conceptually, but only **levels 1-2** are
built (single-account takeover, email-compromise cascade); 3-5 don't exist.

[`docs/VISION.md`](docs/VISION.md) is the one piece of "vision" documentation
left — it originally described the Community Centre resident roster and
Guardian Mode before either was built. Both are now fully built (see
Phase 2 below); the file is kept as the *design rationale* behind what
shipped, since the "why" behind Guardian Mode's verification approach
(deliberately not a self-report checkbox) is worth understanding on its own.

## What's built, phase by phase

**Phase 1 — fully built and polished:**
- 1a. CyberCity Dashboard: city-wide + per-district resilience, an
  interactive city graphic where each district is a real clickable building
  sized/lit by its own resilience (plus a synced plain-text list of the
  same numbers), onboarding flow.
- 1b. Digital Breadcrumbs: the "Find Alex" connect-the-clues mission (SVG
  node/arrow diagram + synced plain-text list), the "Can AI investigate
  you?" role-reversal feature, and the Privacy Defence Score with three
  self-checklist missions.
- 1c. Recovery Rush: the full timed incident-response engine — dependency
  graph, escalating event feed, action menu with real time costs and
  intentional traps, a radial blast-radius diagram (icon+label+color, never
  color alone) synced with a plain-text list, and an AI-narrated (but
  code-graded) mistake explanation. Two levels built (single-account,
  email-cascade); levels 3-5 are not built.
- Accessibility: keyboard navigation, ARIA labels throughout, plain
  language, icon+label status indicators (colorblind-safe), large touch
  targets, mobile-responsive layout, `prefers-reduced-motion` support
  throughout.

**Phase 2 — fully built, all four residents + Guardian Mode:**
- Community Centre: four resident missions (Auntie May, Mr Ravi, Sarah,
  Daniel) as live chat conversations sharing one engine
  (`ChatMissionEngine.jsx`) — a decision moment, a distinct consequence per
  choice, and a reply assembled from tiles (not free text) scored by a
  deterministic clarity rubric.
- **Guardian Mode**: a same-device, two-person scenario unlocked after all
  four residents are complete — players alternate turns spotting red flags
  in a message, with an explicit device-handoff gate between turns.
  Intentionally *not* a self-report checkbox — see
  [`docs/VISION.md`](docs/VISION.md) for why, and for the honest limits of
  what this can and can't verify.

**Phase 3 — backend + deeper gamification:**
- A lightweight Node/Express + SQLite backend (`server/`) for persistence
  and the AI proxy — see [`server/README.md`](server/README.md). Optional:
  the app is fully playable on `localStorage` alone.
- Cyber XP, per-district Resilience, a daily challenge, and Guardian Badges
  (deterministic `check()` functions over saved state, in
  `src/data/badges.js`) are all wired in.

**Phase 4 — both stretch goals built:**
- **Difficulty-adaptive bonus rounds**: a rolling accuracy stat over the
  player's last ~10 graded choices picks a beginner/intermediate/advanced
  tier; the model generates a matching example *and* its own answer key in
  one call (see "How the AI features actually work" above).
- **Adaptive Recovery Rush attacker**: rule-based, not AI (see above) — the
  feed backs off if you secure the compromised account fast enough, or
  escalates further if you're slow, via a `condition: 'root-not-secured'`
  gate on scripted events in `src/data/recoveryRush.js`.

**Phase 5 — retention/incentive loop:** giving XP, streaks, and badges real
destinations instead of numbers that just go up. Explicitly avoids dark
patterns: no guilt-based streak-loss notifications, no randomized/gambling
reward mechanics, no public leaderboard.
- **Levels** (`src/data/levels.js`): 5 named tiers derived purely from
  `state.xp`. Each level-up unlocks something concrete — a new Recovery
  Rush scenario tier, a new skyline landmark, or the opt-in comparison
  feature — documented per-level in that file.
- **Achievement moments** (`AchievementOverlay.jsx`): a real celebratory
  overlay for every new badge/level-up, not a silently-updated list.
- **Streak milestones + freeze** (`src/data/streakMilestones.js`): 3/7/30-day
  milestones grant a one-time XP bonus and badge; the 7-day one also grants
  a streak freeze covering one missed day. No loss/guilt messaging.
- **Daily Challenge** (`DailyStreak.jsx`): a genuine ~30-second mini-game —
  6 rapid-fire "scam or legit" messages, tap or arrow keys, drawn from a
  larger pool via a date-seeded shuffle so it varies day to day without
  being a random re-roll — replaces the old single-question check-in as
  what actually advances the streak.
- **Capstone "Final Challenge"** (`CapstoneChallenge.jsx`): unlocked once
  all three districts are complete, chaining all three mechanics
  (deduction board, incident engine, chat engine) into one story about a
  fictional coworker, combined into a Cyber Guardian Certification.
- **Defence Plan export** (`src/lib/defencePlan.js`): a real, printable
  one-page summary — actual Privacy Defence Score + prioritized real
  checklist gaps, and a RecoveryMap built from the exact scenario(s) played.
- **Opt-in resilience comparison** (`ComparisonPanel.jsx`): compare against
  a friend's shareable code, or an aggregate "more prepared than X% of
  players" stat. Nothing shown unless the player explicitly asks; no
  leaderboard.
- **"What's Next" prompts** (`src/lib/whatsNext.js`): after any mission, one
  contextual line pointing at whichever real progress state is closest to
  a meaningful threshold, instead of a generic "back to menu".

## Project structure

```
src/
  lib/            ai.js, api.js, scoring.js, storage.js, format.js, defencePlan.js, whatsNext.js, capstone.js, useDeductionBoard.js — deterministic logic + the one AI choke point
  data/           breadcrumbs.js, recoveryRush.js, communityCentre.js, capstone.js, badges.js, dailyChallengePool.js, streakMilestones.js, levels.js, scamExamples.js
  state/          GameContext.jsx — global game state, localStorage + optional backend sync
  components/
    dashboard/      CityDashboard, CityGraphic (interactive), DistrictCard, OnboardingFlow, BadgesPanel, DailyStreak, BonusRound, SyncPanel, ComparisonPanel, DefencePlan, CapstoneChallenge
    breadcrumbs/    FindAlexMission, ConnectionMap (SVG case board, drag-and-drop + keyboard), Dossier, RoleReversal, PrivacyScore, BreadcrumbsHub
    recoveryRush/   IncidentScenario, IncidentEngine (reusable engine), IncidentAlertIntro, AmbientTension, BlastRadiusDiagram (SVG), ActionMenu, EventFeed, EndScreen, RecoveryRushHub
    communityCentre/ ResidentMission, ChatMissionEngine (reusable engine), GuardianMode, CommunityCentreHub
    shared/         Layout, Panel, LevelProgressBar, AchievementOverlay, WhatsNextPrompt
server/           Express + SQLite backend (optional) — AI proxy, shareable-code sync, aggregate comparison stat
docs/VISION.md    Community Centre design rationale (now built — see file for the "why")
```
