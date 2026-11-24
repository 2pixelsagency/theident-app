import { cx } from './castings/parts'

// Geometric cover art for blog posts, in the language of the logo mark: angled blocks on a grid,
// in brand colours. One composition per topic; purely decorative.
type Variant = 'tape' | 'recall' | 'reel' | 'money' | 'compare'
const F = 'var(--forest)', L = 'var(--lime)', W = 'rgba(255,255,255,.7)', S = 'var(--sand-2)'

function Art({ v }: { v: Variant }) {
  switch (v) {
    case 'tape': // a "play" built from four angled blocks, with a frame
      return <>
        <rect x="120" y="40" width="160" height="160" rx="18" fill={W} />
        <path d="M168 76h32l40 44-40 44h-32l40-44z" fill={F} />
        <path d="M150 96h18l24 24-24 24h-18l24-24z" fill={L} />
        <path d="M40 40h40l20 20v40l-20-20H40z M320 200h40v-40l-20-20h-20z" fill={F} opacity=".85" />
      </>
    case 'recall': // stepped chevrons moving forward: round two
      return <>
        {[0, 1, 2].map(i => <path key={i} d={`M${70 + i * 90} 60h48l60 60-60 60h-48l60-60z`} fill={i === 2 ? F : i === 1 ? L : W} />)}
        <circle cx="352" cy="58" r="14" fill={F} />
      </>
    case 'reel': // film strip of tiles, one cut on the diagonal
      return <>
        <rect x="30" y="72" width="340" height="96" rx="16" fill={F} />
        {[0, 1, 2, 3].map(i => <rect key={i} x={50 + i * 80} y="88" width="60" height="64" rx="8" fill={i === 1 ? L : W} />)}
        {Array.from({ length: 9 }, (_, i) => <rect key={'h' + i} x={44 + i * 38} y="78" width="14" height="6" rx="2" fill={S} />)}
        {Array.from({ length: 9 }, (_, i) => <rect key={'b' + i} x={44 + i * 38} y="156" width="14" height="6" rx="2" fill={S} />)}
        <path d="M290 40h60l-40 40h-60z" fill={L} />
      </>
    case 'compare': // two cards side by side, one picked with the angled lime tick
      return <>
        <rect x="60" y="56" width="128" height="140" rx="16" fill={W} />
        <rect x="212" y="40" width="128" height="156" rx="16" fill={F} />
        {[0, 1, 2].map(i => <rect key={i} x="80" y={84 + i * 30} width={88 - i * 18} height="12" rx="6" fill={S} />)}
        {[0, 1, 2].map(i => <rect key={'r' + i} x="232" y={72 + i * 30} width={88 - i * 14} height="12" rx="6" fill={L} opacity={1 - i * 0.25} />)}
        <path d="M300 176h40v-40l-20-20h-20l20 20v20h-20z" fill={L} />
      </>
    case 'money': // rising stepped blocks with an angled cap
      return <>
        {[0, 1, 2, 3].map(i => <rect key={i} x={70 + i * 70} y={180 - (i + 1) * 32} width="52" height={(i + 1) * 32} rx="6" fill={i === 3 ? F : W} />)}
        <path d="M280 52h52v24l-26 26-26-26z" fill={L} />
        <path d="M40 196h320" stroke={F} strokeWidth="4" strokeLinecap="round" />
      </>
  }
}

export default function BlogArt({ variant, className }: { variant: Variant; className?: string }) {
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true" className={cx('absolute inset-0 m-auto h-[78%] w-[78%]', className)}>
      <Art v={variant} />
    </svg>
  )
}
