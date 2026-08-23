import { useState } from 'react'
import { SHARING_CATEGORIES, RISK_TYPES, BASE_WEIGHTS } from '../../../data/privacyMirror'
import { firedBoostRules } from '../../../lib/privacyMirrorEngine'

function categoryLabel(id) {
  return SHARING_CATEGORIES.find((c) => c.id === id)?.label ?? id
}

/**
 * The moment for demonstrating the actual technical work: the full 14x4
 * base-weight table this session's score came from, plus exactly which
 * boost rules fired for this selection — nothing summarized or hidden.
 * Collapsed by default so it doesn't compete with the narrative screens.
 */
export default function EngineInspector({ selectedIds }) {
  const [open, setOpen] = useState(false)
  const fired = firedBoostRules(selectedIds)

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="text-xs underline text-[var(--cc-text-dim)] min-h-11 px-1"
      >
        {open ? '▾' : '▸'} How did we get this? (show the scoring graph)
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-4 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <caption className="text-left text-[var(--cc-text-dim)] mb-1">
                Base weight table (0-3 per risk type). Bold rows are categories you selected.
              </caption>
              <thead>
                <tr>
                  <th className="p-1 text-[var(--cc-text-dim)] font-normal">Category</th>
                  {RISK_TYPES.map((r) => (
                    <th key={r.id} className="p-1 text-[var(--cc-text-dim)] font-normal" title={r.label}>
                      {r.icon}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SHARING_CATEGORIES.map((c) => {
                  const selected = selectedIds.includes(c.id)
                  return (
                    <tr key={c.id}>
                      <td
                        className="p-1 whitespace-nowrap"
                        style={{ color: selected ? 'var(--cc-text)' : 'var(--cc-text-dim)', fontWeight: selected ? 700 : 400 }}
                      >
                        {c.emoji} {c.label}
                      </td>
                      {RISK_TYPES.map((r) => (
                        <td
                          key={r.id}
                          className="p-1 text-center"
                          style={{ color: selected ? 'var(--cc-text)' : 'var(--cc-text-dim)' }}
                        >
                          {BASE_WEIGHTS[c.id][r.id]}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-semibold mb-1">Boost rules that fired for this selection ({fired.length}):</p>
            {fired.length === 0 ? (
              <p className="text-[var(--cc-text-dim)]">
                None yet — select a matching pair (e.g. running/fitness routes + marketplace listings).
              </p>
            ) : (
              <ul className="list-disc pl-4 flex flex-col gap-1">
                {fired.map((rule) => (
                  <li key={rule.id}>
                    <code className="text-[var(--cc-accent-2)]">{rule.id}</code>:{' '}
                    {rule.categories.map(categoryLabel).join(' + ')} →{' '}
                    {Object.entries(rule.risks)
                      .map(([riskId, amount]) => `${RISK_TYPES.find((r) => r.id === riskId)?.label} +${amount}`)
                      .join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
