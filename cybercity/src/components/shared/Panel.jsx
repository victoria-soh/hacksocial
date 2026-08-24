// `brackets` defaults to true (every existing call site keeps its corner-
// bracket HUD motif unchanged) — pass `brackets={false}` for a panel where
// that ornament would just repeat without adding information (see Recovery
// Rush's IncidentEngine, which keeps it only on the account-map panel).
export default function Panel({ as: Tag = 'div', className = '', brackets = true, children, ...props }) {
  return (
    <Tag
      className={`cc-hud-panel bg-[var(--cc-panel)] border rounded-2xl p-5 ${className}`}
      {...props}
    >
      {brackets && (
        <>
          <span className="cc-hud-bracket cc-hud-bracket--tl" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--tr" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--bl" aria-hidden="true" />
          <span className="cc-hud-bracket cc-hud-bracket--br" aria-hidden="true" />
        </>
      )}
      {children}
    </Tag>
  )
}
