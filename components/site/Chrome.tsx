import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'
import SiteNav from './Nav'

// One spacing scale for the whole site
export const SECTION = 'py-20 md:py-28'
export function Container({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'mx-auto w-full max-w-[1180px] px-5 md:px-8 ' + className}>{children}</div>
}
export function SectionHead({ eyebrow, title, sub, light, center, action }: { eyebrow: string; title: React.ReactNode; sub?: string; light?: boolean; center?: boolean; action?: React.ReactNode }) {
  return (
    <div className={'mb-12 flex flex-wrap items-end justify-between gap-6 md:mb-14 ' + (center ? 'flex-col items-center text-center' : '')}>
      <div className={center ? 'mx-auto max-w-[720px]' : 'max-w-[720px]'}>
        <p className={'text-[13px] font-semibold uppercase tracking-[0.12em] ' + (light ? 'text-lime' : 'text-green-ink')}>{eyebrow}</p>
        <h2 className={'mt-3 text-[34px] leading-[1.06] tracking-[-0.02em] md:text-[48px] ' + (light ? 'text-white' : '')}>{title}</h2>
        {sub && <p className={'mt-4 text-[17px] leading-relaxed md:text-[18px] ' + (light ? 'text-white/70' : 'text-muted')}>{sub}</p>}
      </div>
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
    <footer className="bg-forest text-white">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-display text-[26px] font-bold tracking-[-0.03em]">The Ident</p>
          <p className="mt-2 max-w-[320px] text-[15px] text-white/70">Castings, auditions and paid work for performers — and one place for casting teams to find them.</p>
        </div>
        {col('Product', [['/performers', 'For performers'], ['/casting', 'For casting'], ['/jobs', 'Browse roles'], ['/pricing', 'Pricing']])}
        {col('Company', [['/contact', 'Contact & help'], ['/welcome', 'Log in'], ['/start?role=performer', 'Join']])}
        {col('Legal', [['/privacy', 'Privacy policy'], ['/terms', 'Terms of use']])}
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-6 text-[13px] text-white/50 md:px-8">
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
    </div>
  )
}

// Shared bits
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-green-ink">{children}</p>
}
export function Cta({ href, children, variant = 'lime' }: { href: string; children: React.ReactNode; variant?: 'lime' | 'dark' | 'outline' | 'ghost-light' }) {
  const cls = variant === 'lime' ? 'bg-lime text-ink shadow-cta' : variant === 'dark' ? 'bg-forest text-white' : variant === 'outline' ? 'border border-line bg-surface text-ink' : 'border border-white/30 text-white hover:bg-white/10'
  return <Link href={href} className={'inline-flex h-12 items-center justify-center rounded-[10px] px-6 text-[15px] font-semibold transition ' + cls}>{children}</Link>
}
