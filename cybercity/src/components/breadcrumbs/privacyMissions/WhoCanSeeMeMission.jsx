import { useState } from 'react'
import { VISIBILITY_FIELDS, VISIBILITY_LEVELS, VISIBILITY_LEVEL_LABELS, defaultVisibilitySettings } from '../../../data/privacyMissions'
import { scoreWhoCanSeeMe } from '../../../lib/scoring'

export default function WhoCanSeeMeMission({ onComplete }) {
  const [settings, setSettings] = useState(defaultVisibilitySettings)
  const [result, setResult] = useState(null)

  function setField(id, level) {
    if (result?.passed) return
    setSettings((s) => ({ ...s, [id]: level }))
    setResult(null)
  }

  function checkSettings() {
    const outcome = scoreWhoCanSeeMe(settings, VISIBILITY_FIELDS)
    setResult(outcome)
    if (outcome.passed) {
      setTimeout(() => onComplete(outcome), 1100)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm m-0">
        Every field here starts wide open — the default most platforms ship with. Set each one to something more
        sensible.
      </p>

      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {VISIBILITY_FIELDS.map((f) => {
          const level = settings[f.id]
          const isPublic = level === 'public'
          return (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-lg border"
              style={{ borderColor: isPublic && result ? 'var(--cc-danger)' : 'var(--cc-panel-border)', background: 'var(--cc-bg-alt)' }}
            >
              <span className="flex items-center gap-2 text-sm font-medium flex-1 min-w-[140px]">
                <span aria-hidden="true">{f.icon}</span> {f.label}
                {isPublic && result && (
                  <span className="text-xs font-normal" style={{ color: 'var(--cc-danger)' }}>
                    ⚠️ still Public
                  </span>
                )}
              </span>
              <div role="group" aria-label={`${f.label} visibility`} className="flex gap-1.5">
                {VISIBILITY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setField(f.id, lvl)}
                    disabled={result?.passed}
                    aria-pressed={level === lvl}
                    className="px-3 py-2 rounded-full border text-xs font-medium min-h-11"
                    style={
                      level === lvl
                        ? { background: 'var(--cc-accent)', color: '#06111c', borderColor: 'var(--cc-accent)' }
                        : { borderColor: 'var(--cc-panel-border)', color: 'var(--cc-text)' }
                    }
                  >
                    {VISIBILITY_LEVEL_LABELS[lvl]}
                  </button>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {result && (
        <p
          role="status"
          className="text-sm font-semibold m-0 flex items-center gap-1.5"
          style={{ color: result.passed ? 'var(--cc-good)' : 'var(--cc-warn)' }}
        >
          <span aria-hidden="true">{result.passed ? '✅' : '❌'}</span>
          {result.passed
            ? 'Nice — nothing sensitive is left wide open.'
            : `${result.stillPublic.length} field${result.stillPublic.length === 1 ? '' : 's'} still Public (${result.stillPublic.join(', ')}). Try again, no penalty.`}
        </p>
      )}

      {!result?.passed && (
        <button
          onClick={checkSettings}
          className="self-start px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11"
        >
          Check settings
        </button>
      )}
    </div>
  )
}
