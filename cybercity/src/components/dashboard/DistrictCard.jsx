import { Link } from 'react-router-dom'
import Panel from '../shared/Panel'

// Resilience itself is no longer shown here — the city graphic above is
// now the one primary representation of it (see CityDashboard.jsx); this
// card's job is just navigation + a one-line description of the district.
export default function DistrictCard({ icon, name, to, locked, blurb }) {
  const content = (
    <Panel className={`h-full flex flex-col gap-3 ${locked ? 'opacity-60' : 'hover:border-[var(--cc-accent)] transition-colors'}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 m-0">
          <span aria-hidden="true">{icon}</span> {name}
        </h3>
        {locked && (
          <span className="text-xs px-2 py-1 rounded-full bg-[var(--cc-bg-alt)] border border-[var(--cc-panel-border)] flex items-center gap-1">
            <span aria-hidden="true">🔒</span> Locked
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--cc-text-dim)] m-0">{blurb}</p>
    </Panel>
  )

  if (locked) {
    return (
      <div role="group" aria-label={`${name}, locked`}>
        {content}
      </div>
    )
  }
  return (
    <Link to={to} className="no-underline text-inherit block h-full">
      {content}
    </Link>
  )
}
