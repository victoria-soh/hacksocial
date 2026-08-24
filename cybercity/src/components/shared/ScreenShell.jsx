/**
 * Shared wrapper for mission/result screens (Recovery Rush's debrief,
 * Community Centre's resident missions) — previously each screen duplicated
 * its own narrow `max-w-2xl/3xl mx-auto` column, top-aligned inside
 * Layout's much wider <main>, which left a large empty region below on any
 * screen whose content didn't happen to fill the viewport. Consolidated
 * here so a width or alignment fix lands on every screen that uses it at
 * once: wider column (less unused side space), and vertically centered
 * within a tall floor so short content doesn't just pin to the top with
 * dead space below it — once content grows past that floor, this behaves
 * exactly like normal top-aligned flow.
 *
 * `maxWidth` defaults to a wide reading column but is a real prop (not a
 * className to override) — a narrow single-card interstitial (a "pass the
 * device" handoff prompt, say) still wants a tight column even though it
 * benefits from the same vertical-centering fix as everything else here.
 */
export default function ScreenShell({ className = '', maxWidth = 'max-w-4xl', children }) {
  return <div className={`flex flex-col justify-center gap-6 ${maxWidth} mx-auto w-full min-h-[70vh] ${className}`}>{children}</div>
}
