// Loads server/.env, if present, into process.env. Imported as the FIRST
// import in both index.js and db.js — ES modules evaluate a module's
// dependencies before its own top-level code runs, so db.js (imported by
// index.js) would otherwise read process.env.DB_PATH before index.js ever
// got a chance to load the .env file, regardless of where that call
// appeared in index.js's own body. Importing this module first in both
// files, combined with ES modules caching a module after its first
// evaluation, guarantees .env is loaded before anything reads process.env.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
try {
  process.loadEnvFile(path.join(__dirname, '.env'))
} catch {
  // no .env file present — fine in production, where the host injects env vars directly
}
