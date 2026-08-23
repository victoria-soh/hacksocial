import './env.js' // must be first — see env.js for why
import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// DB_PATH lets a deployment point this at a mounted persistent-disk path
// (e.g. Render's paid disk add-on, mounted at /data) instead of the default
// location next to this file, which is wiped on every redeploy on a free
// tier with no persistent disk — see server/README.md's "Deploying" section.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cybercity.sqlite')
const db = new DatabaseSync(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    code TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`)

const insertStmt = db.prepare(
  'INSERT INTO players (code, state_json, created_at, updated_at) VALUES (?, ?, ?, ?)',
)
const updateStmt = db.prepare('UPDATE players SET state_json = ?, updated_at = ? WHERE code = ?')
const selectStmt = db.prepare('SELECT state_json, updated_at FROM players WHERE code = ?')
const existsStmt = db.prepare('SELECT 1 FROM players WHERE code = ?')
const allResiliencesStmt = db.prepare('SELECT state_json FROM players')

export function codeExists(code) {
  return Boolean(existsStmt.get(code))
}

export function createPlayer(code, state) {
  const now = new Date().toISOString()
  insertStmt.run(code, JSON.stringify(state), now, now)
}

export function getPlayer(code) {
  const row = selectStmt.get(code)
  if (!row) return null
  return { state: JSON.parse(row.state_json), updatedAt: row.updated_at }
}

export function updatePlayer(code, state) {
  const now = new Date().toISOString()
  const result = updateStmt.run(JSON.stringify(state), now, code)
  return result.changes > 0
}

// overallResilience is computed client-side (see state/GameContext.jsx) and
// included in the pushed state purely so this opt-in aggregate stat doesn't
// need to reimplement the app's scoring logic here.
export function getAllResiliences() {
  const rows = allResiliencesStmt.all()
  const values = []
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.state_json)
      if (typeof parsed.overallResilience === 'number') values.push(parsed.overallResilience)
    } catch {
      // skip malformed rows
    }
  }
  return values
}
