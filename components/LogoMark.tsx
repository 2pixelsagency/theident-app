// The Ident mark: four angled blocks around a hollow centre, drawn on a 4×4 grid (no background).
// Uses currentColor, so it takes the text colour of wherever it sits. The SVG is masked to the mark's
// silhouette (.logo-mark in globals.css); inside a hovered `.group` the fill rolls upward through it —
// a gap rises from the bottom to the middle and out, like an arrow moving up.
export const MARK_PATH = 'M0 0H1L2 1L1 2L0 1Z M3 0H4V1L3 2V1H2Z M1 2H2V3L1 4H0V3Z M2 3L3 2L4 3V4H3Z'

export default function LogoMark({ className = 'size-7', title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 4 4" className={'logo-mark ' + className} fill="currentColor" role={title ? 'img' : undefined} aria-hidden={title ? undefined : true} aria-label={title}>
      <g className="lm-roll">
        <rect width="4" height="4" />
        <rect y="5.5" width="4" height="4" />
      </g>
    </svg>
  )
}
