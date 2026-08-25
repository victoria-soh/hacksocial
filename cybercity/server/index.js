import './env.js' // must be first — see env.js for why
import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import { codeExists, createPlayer, getPlayer, updatePlayer, getAllResiliences } from './db.js'

const MIN_SAMPLE_SIZE = 3
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

// Localhost (any port) is always allowed regardless of ALLOWED_ORIGINS, so
// local dev never breaks. ALLOWED_ORIGINS (comma-separated) adds specific
// production origins — e.g. the deployed frontend's URL. Left unset, no
// extra origins are allowed beyond localhost (a locked-down default, unlike
// the AI key's own "unset = fall back gracefully" philosophy, since an
// open CORS policy is a real exposure once this is deployed rather than
// just a missing feature).
const LOCALHOST_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const app = express()
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header at all means a same-origin request or a non-browser
      // client (curl, server-to-server) — never a cross-site browser call,
      // so it's not what CORS is protecting against.
      if (!origin || LOCALHOST_ORIGIN_RE.test(origin) || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      const err = new Error(`Origin ${origin} is not allowed by this server's CORS policy`)
      err.isCorsError = true
      callback(err)
    },
  }),
)
app.use(express.json({ limit: '256kb' }))

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid ambiguity

function generateCode() {
  let code
  do {
    code = Array.from({ length: 6 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join('')
  } while (codeExists(code))
  return code
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// Create a new shareable code and store the initial state under it.
app.post('/api/players', (req, res) => {
  const state = req.body?.state
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'state is required' })
  }
  const code = generateCode()
  createPlayer(code, state)
  res.status(201).json({ code })
})

// Resume progress from a shareable code.
app.get('/api/players/:code', (req, res) => {
  const player = getPlayer(req.params.code.toUpperCase())
  if (!player) return res.status(404).json({ error: 'Code not found' })
  res.json(player)
})

// Push the latest local state up to a shareable code (keeps a family member
// or a second device in sync without any account/password).
app.put('/api/players/:code', (req, res) => {
  const state = req.body?.state
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ error: 'state is required' })
  }
  const ok = updatePlayer(req.params.code.toUpperCase(), state)
  if (!ok) return res.status(404).json({ error: 'Code not found' })
  res.json({ ok: true })
})

// Opt-in aggregate comparison: "you're more prepared than X% of players who
// shared a code" — never a ranked leaderboard, never surfaced unless the
// player explicitly asks (see ComparisonPanel.jsx). Requires a minimum
// sample size so a near-empty database can't produce a misleading 0%/100%.
app.get('/api/stats/percentile/:code', (req, res) => {
  const player = getPlayer(req.params.code.toUpperCase())
  if (!player) return res.status(404).json({ error: 'Code not found' })
  const mine = player.state?.overallResilience
  if (typeof mine !== 'number') {
    return res.status(400).json({ error: 'This code has no resilience data yet — play a bit more first.' })
  }
  const all = getAllResiliences()
  if (all.length < MIN_SAMPLE_SIZE) {
    return res.json({ available: false, sampleSize: all.length, minSampleSize: MIN_SAMPLE_SIZE })
  }
  const atOrBelow = all.filter((v) => v <= mine).length
  const percentile = Math.round((atOrBelow / all.length) * 100)
  res.json({ available: true, percentile, sampleSize: all.length, yourResilience: mine })
})

// AI proxy: the only place the Anthropic API key is ever used. The
// frontend's lib/ai.js calls this instead of api.anthropic.com directly, so
// the key never reaches the browser. Every caller (Digital Breadcrumbs
// self-exposure analysis, Recovery Rush mistake explanations, Phase 4
// bonus-round content) already has its own deterministic local fallback for
// when this call fails or isn't configured — see lib/ai.js.
app.post('/api/ai/complete', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI features are not configured on this server (no ANTHROPIC_API_KEY set).' })
  }
  const { system, prompt, maxTokens } = req.body || {}
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'prompt is required' })
  }
  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: typeof maxTokens === 'number' && maxTokens > 0 ? maxTokens : 600,
        ...(typeof system === 'string' && system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text().catch(() => '')
      console.error('Anthropic API error', anthropicRes.status, detail)
      return res.status(502).json({ error: `Anthropic API call failed (${anthropicRes.status})` })
    }
    const data = await anthropicRes.json()
    // Not always content[0]: extended-thinking responses put a `thinking`
    // block first, with the actual answer in the next `text` block.
    const text = data?.content?.find((block) => block?.type === 'text')?.text ?? ''
    res.json({ text })
  } catch (err) {
    console.error('Anthropic API call threw', err)
    res.status(502).json({ error: 'Could not reach Anthropic API' })
  }
})

// Cheap status check (is a key configured — not a live ping on every call,
// which would cost real requests just to render a UI notice) so the
// frontend can show "using local analysis" / "using a built-in example
// pool" without attempting a call first.
app.get('/api/ai/status', (req, res) => {
  res.json({ available: Boolean(ANTHROPIC_API_KEY) })
})

// Error-handling middleware (4 args is what makes Express treat this as
// one) — without this, any thrown error (including a rejected CORS origin
// above) falls through to Express's default handler, which returns a full
// stack trace, complete with local filesystem paths, as the response body.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  if (err.isCorsError) {
    return res.status(403).json({ error: 'Not allowed by CORS policy' })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 8787
app.listen(PORT, () => {
  console.log(`CyberCity backend listening on http://localhost:${PORT}`)
})
