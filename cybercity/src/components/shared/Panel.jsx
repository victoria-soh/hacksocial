export default function Panel({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag
      className={`cc-hud-panel bg-[var(--cc-panel)] border rounded-2xl p-5 ${className}`}
      {...props}
    >
      <span className="cc-hud-bracket cc-hud-bracket--tl" aria-hidden="true" />
      <span className="cc-hud-bracket cc-hud-bracket--tr" aria-hidden="true" />
      <span className="cc-hud-bracket cc-hud-bracket--bl" aria-hidden="true" />
      <span className="cc-hud-bracket cc-hud-bracket--br" aria-hidden="true" />
      {children}
    </Tag>
  )
}
