// Thin client for the optional Phase 3 backend (server/). CyberCity works
// fully offline on localStorage without this — these calls only matter if
// the player chooses to create or resume a shareable code, so every call
// site treats a failed/absent backend as a non-fatal, expected case.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'

async function request(path, options) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Request failed (${res.status})`)
  }
  return res.json()
}

export function createRemotePlayer(state) {
  return request('/api/players', { method: 'POST', body: JSON.stringify({ state }) })
}

export function fetchRemoteState(code) {
  return request(`/api/players/${encodeURIComponent(code)}`)
}

export function pushRemoteState(code, state) {
  return request(`/api/players/${encodeURIComponent(code)}`, {
    method: 'PUT',
    body: JSON.stringify({ state }),
  })
}

export function fetchResiliencePercentile(code) {
  return request(`/api/stats/percentile/${encodeURIComponent(code)}`)
}

// AI proxy — see lib/ai.js for the task-specific prompts/fallbacks that
// call these. The Anthropic key lives only on the backend; these two calls
// are the entire surface the frontend has to it.
export function completeAi({ system, prompt, maxTokens }) {
  return request('/api/ai/complete', { method: 'POST', body: JSON.stringify({ system, prompt, maxTokens }) })
}

export function fetchAiStatus(signal) {
  return request('/api/ai/status', signal ? { signal } : undefined)
}
