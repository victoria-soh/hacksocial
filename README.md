# hacksocial

# CyberCity

**Your security posture, as a city.**
 A cybersecurity-education game where every mission you complete makes a literal skyline grow — buildings light up and get taller as you close real gaps in how you use the internet, new towers unlock as you level up, and one XP/resilience system ties it all together.

The problem it's built for: security education is usually a wall of warnings nobody reads. CyberCity teaches by making you *live* the consequences instead — piece together what a stranger could learn from your own posting habits, run a timed incident response while an attacker actively escalates, coach a worried relative through a scam text in real time — then hands you a concrete, personalized action plan at the end.

## Run it (2 minutes)

```bash
git clone https://github.com/victoria-soh/hacksocial.git
cd hacksocial/cybercity
npm install
npm run dev
```

Open **http://localhost:5173**. The whole game is playable right now — every mission, every district, no `.env` file or backend required.

### Turn on real AI (do this — it's what a judge should see)

Without a backend, the three AI-backed features (below) silently serve deterministic local fallback content, marked with a small **ⓘ** you have to tap to notice. If you just run the frontend alone, you will not see the AI working — you'll see the fallback and might reasonably conclude there's no real model integration. There is; it just needs a key:

```bash
# in a second terminal, from wherever you cloned
cd hacksocial/cybercity/server
cp .env.example .env
# open .env and set ANTHROPIC_API_KEY=sk-ant-... (https://console.anthropic.com/)
npm install
npm start
```

This starts the backend on **http://localhost:8787**, which the frontend already points to by default — no extra config. Reload the app; the ⓘ notices disappear because real model calls are now succeeding.

Node requirement: **v20.19+** for the frontend, **v22.5+** for the backend (it uses Node's built-in `node:sqlite`, which needs the newer runtime). Check with `node --version`.

## The AI integration

Everything that decides *correctness* — what's compromised, whether a choice was right, what a checklist gap is worth — is deterministic app code. A model is only ever asked to **explain or generate content**, never to judge. Three features actually call Anthropic's API:

| Feature | Where | What the model generates |
|---|---|---|
| Recovery Rush debrief | `EndScreen.jsx` → `explainRecoveryMistakes()` | A plain-language explanation of what went right/wrong in the player's incident response, grounded in mistakes the game's own scoring already detected — the model narrates ground truth, it doesn't decide it. |
| Training Simulation | `BonusRound.jsx` → `generateScamExample()` | A fresh phishing/scam message at the player's current difficulty tier, plus its own answer key (red flags + plausible-but-safe details) in the same call — that answer key then becomes the fixed grading rubric. |
| Privacy Mirror risk explanations | `PrivacyMirror.jsx` → `explainPrivacyMirrorRisk()` | One sentence per inferable risk (e.g. "location exposure"), explaining *why* it's inferable — grounded in the exact reasoning chain the deterministic scoring engine already computed. |

**Architecture:** `lib/ai.js` (the one choke point for every model call) → `lib/api.js` → `POST /api/ai/complete` on this app's own Express backend → the Anthropic Messages API. The key lives only in `server/.env` and is never sent to the browser — the frontend never talks to `api.anthropic.com` directly.

**Graceful degradation is deliberate, not a placeholder.** Every one of the three features above has its own local, rule-based fallback, used automatically if no key is configured, the backend is unreachable, or a call fails. A `GET /api/ai/status` check (cached client-side) drives an app-wide "AI available" flag, and each piece of AI-sourced content also carries its own `source: 'model' | 'heuristic'` tag — so the ⓘ notice only ever appears next to content that's actually degraded, never as a blanket warning.

**Privacy Mirror's attacker persona is *not* AI, on purpose.** The "Switch sides" screen generates a fictional persona (name + sample posts) from whichever sharing categories the player picked. That mapping is built locally and deterministically — same selection always produces the same persona — because the investigation/grading steps right after it need to know exactly which post maps to which category to check the player's answers. Handing that to a model would break the grading contract, not just add variance. This is a scoping decision, not an unfinished feature.

## Feature tour

**🔎 Digital Breadcrumbs** — *what can someone learn about you from what you already post?* The "Find Alex" mission: piece together five public posts about a fictional practice profile into a case board. Privacy Mirror: pick the categories of things you normally share, see which risks (identity, location, routine, social-engineering) become inferable and why, then "switch sides" and investigate the resulting persona yourself. A Privacy Defence Score plus three self-checklist missions (Break the Trail, Birthday Ghost, Who Can See Me?) round it out. Only ever uses fictional profiles or a player's own voluntarily-entered text — no real-person lookups.

**🚨 Recovery Rush** — *if something goes wrong, do you know what to do?* A timed incident-response sim: a dependency graph of linked accounts, an escalating live event feed, and an action menu with real time costs and deliberate traps (e.g. "post publicly that you've been hacked" burns time and can tip off the attacker). The feed backs off if you secure the compromised account fast, or escalates further if you're slow — rule-based, not AI. Two scenarios are built: **Single Account Takeover** and **Email Compromise Cascade**.

**🛡️ Community Centre** — *can you help someone else stay safe?* Unlocks once you've completed Find Alex and at least one Recovery Rush scenario. Four live-chat missions (Auntie May, Mr Ravi, Sarah, Daniel), each a different scam archetype, scored on the decision you make and the reply you assemble from tiles. **Guardian Mode** is a two-person, same-device scenario (unlocked after all four) with an explicit device-handoff between turns.

**Progression** ties it together: Cyber XP and a per-district Resilience score (all derived, never hand-set), badges, and a streak-based Daily Challenge (6 rapid-fire scam-or-legit calls, drawn from a larger pool, date-seeded so it varies day to day). Five named levels gate concrete unlocks — a new Recovery Rush scenario, the opt-in resilience-comparison feature, or a new **skyline landmark** on the dashboard's interactive city graphic (the Signal Tower at level 2, the Guardian Spire at level 5). Completing all three districts unlocks a capstone **Final Challenge** that chains all three mechanics into one story, plus a printable **Defence Plan** export.

## Tech stack

- **Frontend:** React 19 + Vite, React Router, Tailwind CSS v4. Progress lives in `localStorage`, normalized on load. Diagrams (Recovery Rush's blast radius, Breadcrumbs' case board) are hand-built inline SVG, no graph library.
- **Backend (optional):** Node/Express + SQLite (`node:sqlite`). Provides the AI proxy above, a 6-character shareable-code cross-device sync, and an opt-in aggregate resilience-comparison stat. The app works fully without it.
- **AI:** Anthropic Messages API, called server-side only.

## Project structure

```
src/
  lib/            ai.js (the one AI choke point), api.js, scoring.js, storage.js, privacyMirrorEngine.js, defencePlan.js
  data/           breadcrumbs.js, recoveryRush.js, communityCentre.js, privacyMirror.js, badges.js, levels.js, scamExamples.js, ...
  state/          GameContext.jsx — global state, localStorage + optional backend sync
  components/
    dashboard/      CityDashboard, CityGraphic (interactive skyline), BonusRound (Training Simulation), OnboardingFlow, ...
    breadcrumbs/    FindAlexMission, PrivacyMirror, PrivacyScore, BreadcrumbsHub
    recoveryRush/   IncidentScenario, ActionMenu, EventFeed, BlastRadiusDiagram, EndScreen
    communityCentre/ ResidentMission, ChatMissionEngine, GuardianMode
server/           Express + SQLite backend (optional) — AI proxy, shareable-code sync, comparison stat
docs/VISION.md    Design rationale for the Community Centre / Guardian Mode
```

## Scope & roadmap

Recovery Rush ships with **two** playable incident scenarios — Single Account Takeover and Email Compromise Cascade (`src/data/recoveryRush.js`) — plus a third, hidden scenario reused by the capstone challenge. Additional incident types (e.g. higher-tier, multi-account cascades) are a natural extension of the same dependency-graph engine but aren't built yet. Treat anything beyond the two listed above as roadmap, not shipped.

Not yet deployed anywhere — see [Run it](#run-it-2-minutes) above to run it locally.
