import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'
import ExpandCard from './ExpandCard'

// The website design system (from the Castings section, see DESIGN.md → "Website"). Server-safe.
// Re-exports the card parts so every page builds from the same pieces.
export { cx, ArrowLink, IconBadge, FeatureCard, Panel, FloatFrame } from './castings/parts'

export function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={cx('flex items-center gap-[5px] text-[11px] font-semibold uppercase tracking-[0.14em]', light ? 'text-lime' : 'text-forest')}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', light ? 'bg-lime' : 'bg-forest')} />{children}
    </p>
  )
}

// Title left, supporting copy + actions right (stacks on phones)
export function SectionHeader({ eyebrow, title, sub, actions, light, level = 2, id }: {
  eyebrow: string; title: React.ReactNode; sub?: React.ReactNode; actions?: React.ReactNode; light?: boolean; level?: 1 | 2; id?: string
}) {
  const H = level === 1 ? 'h1' : 'h2'
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-8 md:mb-12">
      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">
        <Eyebrow light={light}>{eyebrow}</Eyebrow>
        <H id={id} className={cx('max-w-[760px] font-display font-bold leading-[1.02] tracking-[-0.03em]', level === 1 ? 'text-[44px] md:text-[64px]' : 'text-[38px] md:text-[56px]', light && 'text-bg')}>{title}</H>
      </div>
      {(sub || actions) && (
        <div className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-5">
          {sub && <p className={cx('text-[15px] leading-[1.6]', light ? 'text-on-dark-muted' : 'text-muted-strong')}>{sub}</p>}
          {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
        </div>
      )}
    </div>
  )
}

type PillVariant = 'forest' | 'outline' | 'lime' | 'outline-light'
const PILL: Record<PillVariant, string> = {
  forest: 'bg-forest text-bg hover:bg-lime hover:text-ink',
  outline: 'border-[1.5px] border-forest text-forest hover:bg-forest hover:text-bg',
  lime: 'bg-lime text-ink hover:bg-bg',
  'outline-light': 'border-[1.5px] border-white/40 text-bg hover:border-lime hover:bg-lime hover:text-ink',
}
export function Pill({ href, variant = 'forest', arrow, children, className }: { href: string; variant?: PillVariant; arrow?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx('group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold transition-colors duration-300 active:scale-[.98]', PILL[variant], className)}>
      {children}{arrow && <Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-4" />}
    </Link>
  )
}

export function Tag({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return <span className={cx('rounded-[10px] px-3 py-1.5 text-[14px] font-medium', light ? 'bg-white/10 text-on-dark-muted' : 'bg-sand-2 text-muted-strong')}>{children}</span>
}

// The design's link arrow (↗) — used in every arrow box on the site
export function ArrowGlyph({ size = 16, className }: { size?: number; className?: string }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={cx('transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5', className)}><path d="M7 17L17 7M8 7h9v9" /></svg>
}
// Square arrow box (for use inside an existing link/card, where ArrowLink can't nest)
export const ARROW_BOX = 'flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-line-strong bg-bg text-ink transition-colors duration-300 group-hover:border-forest group-hover:bg-forest group-hover:text-lime'

// Plain sand (or Forest) card for text-led content
export function SandCard({ children, dark, className, as: As = 'div' }: { children: React.ReactNode; dark?: boolean; className?: string; as?: 'div' | 'article' | 'li' }) {
  return <As data-reveal className={cx('rounded-[var(--radius-feature)] p-6 md:p-8', dark ? 'bg-forest text-bg' : 'bg-sand text-ink', className)}>{children}</As>
}

// Icon-led small card: icon + title, the + expands the detail. (href/label kept for older call sites.)
export function IconCard({ icon, tone = 'bg-lime', title, body, dark }: { icon: string; tone?: string; title: string; body: string; href?: string; label?: string; dark?: boolean }) {
  return <ExpandCard icon={icon} tone={tone} title={title} body={body} dark={dark} />
}

// Closing call-to-action band: Forest card with the lime stripe band
export function CtaBand({ title, sub, actions }: { title: React.ReactNode; sub?: string; actions: React.ReactNode }) {
  return (
    <div data-reveal className="relative overflow-hidden rounded-[var(--radius-feature)] px-6 py-16 text-center text-bg md:px-12 md:py-20" style={{ backgroundImage: 'var(--panel-forest)' }}>
      <div aria-hidden="true" className="stripe-drift absolute inset-x-0 top-[38%] h-[120px]" style={{ backgroundImage: 'var(--stripes-dark)' }} />
      <div className="relative">
        <h2 className="mx-auto max-w-[760px] font-display text-[36px] font-bold leading-[1.04] tracking-[-0.03em] md:text-[56px]">{title}</h2>
        {sub && <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.6] text-on-dark-muted">{sub}</p>}
        <div className="mt-9 flex flex-wrap justify-center gap-3">{actions}</div>
      </div>
    </div>
  )
}

// Section wrapper: one spacing scale, 1200px column
export function Section({ children, className, id, label }: { children: React.ReactNode; className?: string; id?: string; label?: string }) {
  return <section id={id} aria-labelledby={label} className={cx('px-6 py-20 md:py-24', className)}><div className="mx-auto max-w-[1200px]">{children}</div></section>
}
