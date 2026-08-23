# CyberCity backend (Phase 3)

Optional. CyberCity works fully offline on `localStorage` without this —
this only matters if a player wants a shareable code to resume progress on
another device (see the "Save & resume across devices" panel on the
dashboard).

Node/Express + SQLite, using Node's built-in `node:sqlite` (experimental,
requires Node 22.5+ — no native build step, unlike `better-sqlite3`). No
authentication: a 6-character code stands in for a login, by design (see
the main README for why).

This server is also the **only** place the Anthropic API key is ever used —
see "AI proxy" below. Without a key configured, the AI endpoints just
respond 503 and the frontend automatically falls back to its deterministic
local heuristics (see `src/lib/ai.js`); nothing about the rest of the
server's purpose changes either way.

## Run it

```bash
cd server
cp .env.example .env   # then fill in ANTHROPIC_API_KEY if you have one — optional
npm install
npm start        # http://localhost:8787
```

The frontend looks for the backend at `http://localhost:8787` by default;
override with `VITE_API_URL` in `cybercity/.env` if you deploy it elsewhere.

## API

- `POST /api/players` — `{ state }` → `{ code }`. Creates a new shareable code.
- `GET /api/players/:code` — → `{ state, updatedAt }`. Resume progress.
- `PUT /api/players/:code` — `{ state }` → `{ ok: true }`. Push the latest state.
- `GET /api/stats/percentile/:code` — → `{ available, percentile, sampleSize }`.
  Opt-in aggregate resilience comparison (see `ComparisonPanel.jsx`).

The whole game-state object (districts, XP, badges, Privacy Defence Score
history, Recovery Rush results, streak) is stored as one JSON blob per code
— it's the same shape `src/lib/storage.js` already persists to
`localStorage`, so there's one schema to reason about.

### AI proxy

- `POST /api/ai/complete` — `{ system, prompt, maxTokens }` → `{ text }`.
  Makes the actual Anthropic Messages API call server-side using
  `ANTHROPIC_API_KEY` (see `.env.example`) and returns the model's text.
  Returns 503 if no key is configured. The key never reaches the browser —
  the frontend only ever calls this endpoint, never `api.anthropic.com`
  directly.
- `GET /api/ai/status` — → `{ available: boolean }`. Whether a key is
  configured (a cheap local check, not a live ping to Anthropic on every
  call) — drives the "using local analysis" / "using a built-in example
  pool" notices in the UI.

## Deploying

`render.yaml` in this directory is set up for [Render](https://render.com/)
(New → Blueprint, point it at this repo). Two things to configure in the
Render dashboard after import — never commit either to the repo:

- `ANTHROPIC_API_KEY` — optional, see above.
- `ALLOWED_ORIGINS` — comma-separated list of extra origins allowed to call
  this API (CORS). Set this to your deployed frontend's URL. `localhost`
  (any port) is always allowed regardless, for local dev; left unset in
  production, no origins beyond localhost are allowed at all — this is a
  locked-down default, unlike the AI key's graceful-fallback philosophy,
  since an open CORS policy is a real exposure once this is actually
  reachable on the internet.

**Persistent disk / SQLite tradeoff** — read this before relying on
deployed shareable codes: Render's **free** plan has no persistent disk.
This service's filesystem, including the SQLite file, is wiped on every
redeploy and periodically when a free instance spins down from inactivity
and back up. That means shareable-code progress (the optional cross-device
sync feature) resets unpredictably on the free plan. **Core gameplay is
unaffected** — that's all `localStorage` on the player's own device,
regardless of what this server is doing.

To make sync progress actually persistent: upgrade to a paid Render plan,
attach a Render Disk mounted at e.g. `/data`, and set
`DB_PATH=/data/cybercity.sqlite` (see `.env.example`) so `db.js` writes
there instead of the ephemeral default path next to it. `render.yaml` has
this commented out rather than doing it silently, since it costs money.

Railway is a reasonable alternative with a similar setup (`npm start` as
the start command, same env vars) — it wasn't picked here mainly because
its current pricing model is trial-credit-based rather than an indefinite
free tier, which matters if you want this reachable long-term at no cost.
