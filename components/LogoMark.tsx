// The Ident mark: four angled blocks around a hollow centre, drawn on a 4×4 grid (no background).
// Uses currentColor, so it takes the text colour of wherever it sits. The blocks are separate paths so
// the mark can animate: inside a hovered `.group` the two arrow blocks shoot out along the X (see .logo-mark in globals.css).
export const MARK_PATH = 'M0 0H1L2 1L1 2L0 1Z M3 0H4V1L3 2V1H2Z M1 2H2V3L1 4H0V3Z M2 3L3 2L4 3V4H3Z'
const PARTS = ['M0 0H1L2 1L1 2L0 1Z', 'M3 0H4V1L3 2V1H2Z', 'M1 2H2V3L1 4H0V3Z', 'M2 3L3 2L4 3V4H3Z'] as const

export default function LogoMark({ className = 'size-7', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 4 4" className={'logo-mark overflow-visible ' + className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      {PARTS.map((d, i) => <path key={i} d={d} className={'lm-' + i} />)}
    </svg>
  )
}
