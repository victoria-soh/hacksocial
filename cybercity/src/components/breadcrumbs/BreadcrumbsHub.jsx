import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import Panel from '../shared/Panel'
import PrivacyMirror from './PrivacyMirror'
import PrivacyScore from './PrivacyScore'

export default function BreadcrumbsHub() {
  const { districts } = useGame()
  const { findAlexComplete, findAlexScore } = districts.breadcrumbs
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const el = document.getElementById(hash.slice(1))
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <span aria-hidden="true">🔎</span> Digital Breadcrumbs
        </h1>
        <p className="text-[var(--cc-text-dim)] m-0">What can someone learn about you from what you already post?</p>
      </div>

      <Panel className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="text-lg font-bold mt-0 mb-1">Mission: Find Alex</h2>
          <p className="text-sm text-[var(--cc-text-dim)] m-0">
            A fictional practice profile. Piece together five public posts to see what a stranger could figure out.
          </p>
          {findAlexComplete && <p className="text-sm text-[var(--cc-good)] mt-1 mb-0">✓ Completed — score {findAlexScore}</p>}
        </div>
        <Link
          to="/breadcrumbs/find-alex"
          className="no-underline text-center px-5 py-2.5 rounded-lg bg-[var(--cc-accent)] text-[#06111c] font-semibold min-h-11 flex items-center justify-center"
        >
          {findAlexComplete ? 'Replay mission' : 'Start mission'}
        </Link>
      </Panel>

      <div id="privacy-mirror">
        <PrivacyMirror />
      </div>
      <PrivacyScore />
    </div>
  )
}
