import { cx } from './castings/parts'

// Panel background art (Calendly-style variation in our colours): the base gradient, two soft colour
// glows that drift slowly, and a row of rounded pill bars behind the floating card. The bars rise in
// with a stagger whenever the panel's graphics play (they use the .hiw-* replay system).
export type PanelTone = 'forest' | 'lime' | 'butter' | 'mint'
const BASE: Record<PanelTone, string> = { forest: 'var(--panel-forest)', lime: 'var(--panel-lime)', butter: 'var(--panel-butter)', mint: 'var(--panel-mint)' }
const GLOW: Record<PanelTone, [string, string]> = {
  forest: ['bg-lime/25', 'bg-mint/20'],
  lime: ['bg-white/70', 'bg-mint'],
  butter: ['bg-white/70', 'bg-blossom'],
  mint: ['bg-lime/45', 'bg-white/70'],
}
const BAR: Record<PanelTone, string> = {
  forest: 'bg-white/[0.07] ring-1 ring-inset ring-white/10',
  lime: 'bg-white/40', butter: 'bg-white/45', mint: 'bg-white/40',
}

export function toneFrom(background: string): PanelTone {
  return background.includes('forest') ? 'forest' : background.includes('lime') ? 'lime' : background.includes('butter') ? 'butter' : 'mint'
}

export function PanelBase({ tone }: { tone: PanelTone }) {
  const [a, b] = GLOW[tone]
  return (
    <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden" style={{ backgroundImage: BASE[tone] }}>
      <span className={cx('panel-glow absolute -right-[12%] -top-[30%] size-[70%] rounded-full blur-3xl', a)} />
      <span className={cx('panel-glow panel-glow-b absolute -bottom-[35%] -left-[10%] size-[65%] rounded-full blur-3xl', b)} />
    </div>
  )
}

// Goes inside the replayed area so the bars rise again on every tab change / hover
export function PanelBars({ tone, count = 9 }: { tone: PanelTone; count?: number }) {
  return (
    <div aria-hidden="true" className="absolute inset-x-[3%] top-1/2 flex h-[72%] -translate-y-1/2 items-center justify-between">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className={cx('panel-bar h-full w-[7.5%] rounded-full', BAR[tone])} style={{ '--i': Math.abs(i - (count - 1) / 2) } as React.CSSProperties} />
      ))}
    </div>
  )
}
