import Panel from './Panel'

/**
 * The app's one primary call-to-action button — an accent-filled Panel
 * rendered as <button>, carrying the same bracket-corner HUD framing as
 * every other panel. Used for "Back to X" and other primary actions
 * ("Send reply", etc.) so all of them get the HUD treatment, and any future
 * fix to that treatment only needs to happen here.
 */
export default function PrimaryButton({ className = '', style, children, ...props }) {
  return (
    <Panel
      as="button"
      className={`!px-5 !py-2.5 text-left min-h-11 font-semibold disabled:opacity-40 ${className}`}
      style={{ background: 'var(--cc-accent)', color: '#06111c', ...style }}
      {...props}
    >
      {children}
    </Panel>
  )
}
