import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'
import SiteNav from './Nav'
import ScrollReveal from './ScrollReveal'
import { SectionHeader, Eyebrow as DsEyebrow } from './ds'

// One spacing scale for the whole site
export const SECTION = 'py-20 md:py-24'
export function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'mx-auto w-full max-w-[1248px] px-6 ' + className}>{children}</div>
}
// Section heading in the website design system (see ds.tsx): title left, copy + action right.
// `center` keeps a centred variant for short intros.
export function SectionHead({ eyebrow, title, sub, light, center, action }: { eyebrow: string; title: React.ReactNode; sub?: string; light?: boolean; center?: boolean; action?: React.ReactNode }) {
  if (!center) return <SectionHeader eyebrow={eyebrow} title={title} sub={sub} light={light} actions={action} />
  return (
    <div className="mx-auto mb-12 flex max-w-[760px] flex-col items-center gap-4 text-center">
      <DsEyebrow light={light}>{eyebrow}</DsEyebrow>
      <h2 className={'font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[56px] ' + (light ? 'text-bg' : '')}>{title}</h2>
      {sub && <p className={'text-[15px] leading-[1.6] ' + (light ? 'text-on-dark-muted' : 'text-muted-strong')}>{sub}</p>}
      {action}
    </div>
  )
}

export function SiteFooter() {
  const col = (title: string, links: [string, string][]) => (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/50">{title}</p>
      <ul className="mt-3 space-y-2">{links.map(([href, label]) => <li key={href}><Link href={href} className="text-[15px] text-white/80 hover:text-white">{label}</Link></li>)}</ul>
    </div>
  )
  return (
    <footer className="mx-3 mb-3 rounded-[var(--radius-feature)] bg-forest text-white md:mx-6 md:mb-6">
      <div className="mx-auto grid max-w-[1248px] gap-10 px-6 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-[26px] font-bold tracking-[-0.03em]">The Ident</p>
          <p className="mt-2 max-w-[320px] text-[13px] leading-[1.6] text-white/70">Castings, auditions and paid work for performers — and one place for casting teams to find them.</p>
        </div>
        {col('Product', [['/performers', 'For performers'], ['/casting', 'For casting'], ['/jobs', 'Browse roles'], ['/people', 'Browse talent'], ['/pricing', 'Pricing']])}
        {col('Auditions', [['/auditions', 'All auditions'], ['/auditions/musical-theatre', 'Musical theatre'], ['/auditions/dance', 'Dance'], ['/auditions/tv-and-film', 'TV & film'], ['/auditions/london', 'London'], ['/auditions/manchester', 'Manchester']])}
        {col('Company', [['/contact', 'Contact & help'], ['/welcome', 'Log in'], ['/start?role=performer', 'Join']])}
        {col('Legal', [['/privacy', 'Privacy policy'], ['/terms', 'Terms of use']])}
      </div>
      <div className="mx-auto flex max-w-[1248px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-6 text-[13px] text-white/50">
        <span>© {new Date().getFullYear()} The Ident</span>
        <a href={'mailto:' + SUPPORT_EMAIL} className="hover:text-white">{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  )
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <SiteNav />
      <main className="-mt-[68px]">{children}</main>
      <SiteFooter />
      <ScrollReveal />
    </div>
  )
}

// Shared bits
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <DsEyebrow>{children}</DsEyebrow>
}
export function Cta({ href, children, variant = 'lime', arrow = true }: { href: string; children: React.ReactNode; variant?: 'lime' | 'dark' | 'outline' | 'ghost-light'; arrow?: boolean }) {
  // Pill buttons (website design system): Forest filled, outline, Lime, outline-on-dark
  const cls = variant === 'lime' ? 'bg-lime text-ink hover:bg-forest hover:text-lime'
    : variant === 'dark' ? 'bg-forest text-bg hover:bg-lime hover:text-ink'
    : variant === 'outline' ? 'border-[1.5px] border-forest text-forest hover:bg-forest hover:text-bg'
    : 'border-[1.5px] border-white/40 text-bg hover:border-lime hover:bg-lime hover:text-ink'
  return (
    <Link href={href} className={'group inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 text-[16px] font-semibold transition-[background-color,color,border-color,transform] duration-300 ease-out active:scale-[.98] ' + cls}>
      {children}{arrow && <Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-4" />}
    </Link>
  )
}
