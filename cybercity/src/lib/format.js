export function formatTime(seconds) {
  const clamped = Math.max(0, Math.round(seconds))
  const m = Math.floor(clamped / 60)
  const s = clamped % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
