import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'

// Pricing-style card: a tinted top panel (label, name, line, big figure, pill CTA with a round ↗, note)
// over a "What's included" checklist. `dark` = the Forest highlight card with a soft glow and a lime badge.
export type PlanCardProps = {
  label: string; name: string; line: string
  value: string; unit?: string; small?: string
  cta: { href: string; label: string }; note?: string
  included: readonly string[]; dark?: boolean; badge?: string
}

export default function PlanCard({ label, name, line, value, unit, small, cta, note, included, dark, badge }: PlanCardProps) {
  return (
    <article data-reveal className={cx('relative flex flex-col overflow-hidden rounded-[28px] p-2',
      dark ? 'bg-forest text-bg shadow-[0_40px_80px_-40px_rgb(18_49_39/0.7)] lg:-my-3' : 'border border-line-soft bg-surface text-ink shadow-[0_24px_48px_-36px_rgb(21_33_28/0.35)]')}>

      <div className={cx('relative rounded-[22px] p-6 md:p-7', dark ? 'bg-white/[0.06] ring-1 ring-white/10' : 'bg-sand')}>
        <div className="flex items-start justify-between gap-3">
          <p className={cx('text-[12px] font-medium', dark ? 'text-on-dark-muted' : 'text-muted-strong')}>{label}</p>
          {badge && <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-2.5 py-1 text-[12px] font-semibold text-ink"><Icon name="sparkle" strokeWidth={2} className="size-3.5" />{badge}</span>}
        </div>
        <h3 className="mt-3 font-display text-[22px] font-bold tracking-[-0.02em]">{name}</h3>
        <p className={cx('mt-1.5 max-w-[320px] text-[13px] leading-[1.6]', dark ? 'text-on-dark-muted' : 'text-muted-strong')}>{line}</p>
        <p className="mt-7 flex items-baseline gap-1.5">
          <span className="font-display text-[52px] font-bold leading-none tracking-[-0.04em]">{value}</span>
          {unit && <span className={cx('text-[13px]', dark ? 'text-on-dark-muted' : 'text-muted')}>{unit}</span>}
        </p>
        {small && <p className={cx('mt-2 text-[12px] font-medium', dark ? 'text-on-dark-muted' : 'text-muted')}>{small}</p>}
        <Link href={cta.href} className={cx('group mt-7 flex h-[52px] items-center justify-between rounded-full pl-6 pr-1.5 text-[15px] font-semibold transition-colors duration-300',
          dark ? 'bg-lime text-ink hover:bg-bg' : 'bg-forest text-bg hover:bg-ink')}>
          {cta.label}
          <span className={cx('flex size-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45', dark ? 'bg-forest text-lime' : 'bg-lime text-forest')}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M8 7h9v9" /></svg>
          </span>
        </Link>
        {note && <p className={cx('mt-3 text-center text-[12px] font-medium', dark ? 'text-on-dark-muted' : 'text-muted')}>{note}</p>}
      </div>

      <div className="relative flex-1 px-5 pb-6 pt-6 md:px-6">
        <p className={cx('text-[12px] font-medium', dark ? 'text-on-dark-muted' : 'text-muted')}>What’s included</p>
        <ul className="mt-4 flex flex-col gap-3">
          {included.map(f => (
            <li key={f} className="flex items-start gap-3 text-[14px] leading-snug">
              <span className={cx('mt-px flex size-5 shrink-0 items-center justify-center rounded-full', dark ? 'bg-lime text-forest' : 'bg-forest text-bg')}>
                <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
              </span>
              {f}
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}

export function PlanGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid items-start gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] lg:gap-10">{children}</div>
}
