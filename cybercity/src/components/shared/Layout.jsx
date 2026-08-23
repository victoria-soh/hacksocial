import { NavLink } from 'react-router-dom'
import { useGame } from '../../state/GameContext'
import LevelProgressBar from './LevelProgressBar'
import AchievementOverlay from './AchievementOverlay'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'City Hall', icon: '🏙️' },
  { to: '/breadcrumbs', label: 'Digital Breadcrumbs', icon: '🔎' },
  { to: '/recovery-rush', label: 'Recovery Rush', icon: '🚨' },
  { to: '/community-centre', label: 'Community Centre', icon: '🛡️' },
]

export default function Layout({ children }) {
  const { xp, streak, districts } = useGame()

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header
        className="border-b bg-[var(--cc-bg-alt)]"
        style={{ borderColor: 'var(--cc-panel-border)', boxShadow: '0 1px 0 0 rgba(34,230,255,0.15)' }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 font-bold text-lg no-underline"
            style={{ fontFamily: 'var(--font-chrome)', color: 'var(--cc-accent)', textShadow: 'var(--cc-glow-cyan)' }}
          >
            <span aria-hidden="true">🏙️</span> CyberCity
          </NavLink>
          <nav aria-label="Districts" className="flex flex-wrap gap-1">
            {NAV_ITEMS.slice(1).map((item) => {
              const isLocked = item.to === '/community-centre' && !districts.communityCentre.unlocked
              return (
                <NavLink
                  key={item.to}
                  to={isLocked ? '#' : item.to}
                  aria-disabled={isLocked}
                  onClick={(e) => isLocked && e.preventDefault()}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm flex items-center gap-1.5 no-underline border transition-colors ${
                      isLocked
                        ? 'opacity-40 cursor-not-allowed text-[var(--cc-text-dim)] border-transparent'
                        : isActive
                          ? 'text-[var(--cc-accent)] font-semibold border-[var(--cc-accent)]'
                          : 'text-[var(--cc-text)] border-transparent hover:border-[var(--cc-panel-border)] hover:bg-[var(--cc-panel)]'
                    }`
                  }
                  style={({ isActive }) => (isActive && !isLocked ? { boxShadow: 'var(--cc-glow-cyan)' } : undefined)}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  {item.label}
                  {isLocked && <span className="sr-only"> (locked)</span>}
                  {isLocked && <span aria-hidden="true">🔒</span>}
                </NavLink>
              )
            })}
          </nav>
          <div className="cc-chrome flex items-center gap-3 text-sm">
            <LevelProgressBar xp={xp} variant="compact" />
            <span className="flex items-center gap-1" title="Daily streak">
              <span aria-hidden="true">🔥</span>
              <span>{streak.current}</span>
            </span>
          </div>
        </div>
      </header>
      <main id="main-content" className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {children}
      </main>
      <AchievementOverlay />
    </div>
  )
}
