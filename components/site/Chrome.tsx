import Link from 'next/link'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

const NAV = [
  { href: '/performers', label: 'For performers' },
  { href: '/casting', label: 'For casting' },
  { href: '/jobs', label: 'Browse roles' },
  { href: '/pricing', label: 'Pricing' },
]

// Marketing site header (theident.me). Server component — no client JS.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-6 px-5 pt-[env(safe-area-inset-top)]">
        <Link href="/" className="font-display text-[22px] font-bold tracking-[-0.03em] text-forest">The Ident</Link>
        <nav className="hidden flex-1 items-center gap-6 md:flex">
          {NAV.map(n => <Link key={n.href} href={n.href} className="text-[15px] font-medium text-muted transition hover:text-ink">{n.label}</Link>)}
        </nav>
        <span className="flex-1 md:hidden" />
        <Link href="/welcome" className="text-[15px] font-semibold">Log in</Link>
        <Link href="/start?role=performer" className="inline-flex h-10 items-center rounded-[10px] bg-lime px-4 text-[15px] font-semibold text-ink shadow-cta">Start free trial</Link>
      </div>
      <nav className="scrollbar-none flex gap-5 overflow-x-auto border-t border-line/60 px-5 py-2.5 md:hidden">
        {NAV.map(n => <Link key={n.href} href={n.href} className="shrink-0 text-[14px] font-medium text-muted">{n.label}</Link>)}
      </nav>
    </header>
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
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-display text-[26px] font-bold tracking-[-0.03em]">The Ident</p>
          <p className="mt-2 max-w-[320px] text-[15px] text-white/70">Castings, auditions and paid work for performers — and one place for casting teams to find them.</p>
        </div>
        {col('Product', [['/performers', 'For performers'], ['/casting', 'For casting'], ['/jobs', 'Browse roles'], ['/pricing', 'Pricing']])}
        {col('Company', [['/contact', 'Contact & help'], ['/welcome', 'Log in'], ['/start?role=performer', 'Join']])}
        {col('Legal', [['/privacy', 'Privacy policy'], ['/terms', 'Terms of use']])}
      </div>
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-6 text-[13px] text-white/50">
        <span>© {new Date().getFullYear()} The Ident</span>
        <a href={'mailto:' + SUPPORT_EMAIL} className="hover:text-white">{SUPPORT_EMAIL}</a>
      </div>
    </footer>
  )
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <SiteHeader />
      <main>{children}</main>
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
