// The Ident mark: four angled blocks around a hollow centre, drawn on a 4×4 grid (no background).
// Uses currentColor, so it takes the text colour of wherever it sits.
export const MARK_PATH = 'M0 0H1L2 1L1 2L0 1Z M3 0H4V1L3 2V1H2Z M1 2H2V3L1 4H0V3Z M2 3L3 2L4 3V4H3Z'

export default function LogoMark({ className = 'size-7', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 4 4" className={className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <path d={MARK_PATH} />
    </svg>
  )
}
