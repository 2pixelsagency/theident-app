'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import LogoMark from '@/components/LogoMark'
import { cx } from '@/components/rc/ui'
import { hasSignedInCookie, supabase } from '@/lib/supabase'

const NAV = [
  { href: '/performers', label: 'Performers' },
  { href: '/casting', label: 'Casting directors' },
  { href: '/jobs', label: 'Browse roles' },
  { href: '/people', label: 'Browse talent' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/blog', label: 'Blog' },
]

// Desktop: four items — the rest sit in the Explore dropdown (the phone menu lists everything)
const MAIN = [{ href: '/performers', label: 'Performers' }, { href: '/casting', label: 'Casting' }]
const EXPLORE = [
  { href: '/jobs', label: 'Browse roles', sub: 'Castings, auditions and paid work', icon: 'briefcase' },
  { href: '/people', label: 'Browse talent', sub: 'Performers open to work', icon: 'users' },
  { href: '/auditions', label: 'Auditions by city', sub: 'London, Manchester and more', icon: 'pin' },
  { href: '/blog', label: 'Blog & guides', sub: 'Self-tapes, agents, money', icon: 'bulb' },
]

// Floating glass nav: a pill that tightens and gains a shadow on scroll; full-screen sheet on mobile
export default function SiteNav() {
  const pathname = usePathname()
  // The join button says who it's for: casting pages sign up casting teams; elsewhere people pick a side
  const casting = pathname.startsWith('/casting')
  const join = casting ? { href: '/start?role=caster', label: 'Start casting' } : { href: '/welcome?mode=signup', label: 'Get started' }
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  // On app.theident.me "/" opens the app, so the logo points at the website itself
  const [home, setHome] = useState('/')
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (window.location.hostname.startsWith('app.')) setHome('https://www.theident.me/') }, [])
  // Signed in on this host (session) or on the app host (shared theident.me flag) → Dashboard
  useEffect(() => {
    let live = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hasSignedInCookie()) setSignedIn(true)
    supabase.auth.getSession().then(({ data: { session } }) => { if (live && session) setSignedIn(true) })
    return () => { live = false }
  }, [])
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12)
    on(); window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])

  return (
    <header className="sticky top-0 z-50 px-3 pt-[max(12px,env(safe-area-inset-top))] md:px-6">
      <div className={cx('relative z-50 mx-auto flex h-14 max-w-[1180px] items-center gap-2 rounded-[14px] border pl-4 pr-2 transition-all duration-300',
        open ? 'border-transparent bg-transparent' : scrolled ? 'border-line/80 bg-surface/80 shadow-[0_10px_30px_-18px_rgb(18_49_39/0.45)] backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-transparent')}>
        <Link href={home} aria-label="The Ident home" className="group mr-4 flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-[26px] font-bold tracking-[-0.03em] text-forest">
          <LogoMark className="size-5" />The Ident
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {MAIN.map(n => <NavLink key={n.href} href={n.href} label={n.label} on={pathname.startsWith(n.href)} />)}
          <div className="group/explore relative">
            <button type="button" aria-haspopup="true" className={cx('inline-flex items-center gap-1 rounded-[10px] px-3.5 py-2 text-[14px] font-medium transition group-hover/explore:bg-chip/70 group-hover/explore:text-ink group-focus-within/explore:bg-chip/70', EXPLORE.some(e => pathname.startsWith(e.href)) ? 'bg-chip text-ink' : 'text-muted')}>
              Explore <Icon name="chevron-down" strokeWidth={2} className="size-3.5 transition-transform group-hover/explore:rotate-180" />
            </button>
            {/* Panel: opens on hover or keyboard focus */}
            <div className="invisible absolute left-0 top-full pt-2 opacity-0 transition duration-200 group-hover/explore:visible group-hover/explore:opacity-100 group-focus-within/explore:visible group-focus-within/explore:opacity-100">
              <ul className="w-[300px] rounded-[18px] border border-line bg-surface p-2 shadow-[0_24px_50px_-24px_rgb(18_49_39/0.45)]">
                {EXPLORE.map(e => (
                  <li key={e.href}><Link href={e.href} className="flex items-center gap-3 rounded-[12px] px-3 py-2.5 hover:bg-sand">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-lime text-forest"><Icon name={e.icon} strokeWidth={2} className="size-[18px]" /></span>
                    <span><span className="block text-[14px] font-semibold text-ink">{e.label}</span><span className="block text-[12px] text-muted">{e.sub}</span></span>
                  </Link></li>
                ))}
              </ul>
            </div>
          </div>
          <NavLink href="/pricing" label="Pricing" on={pathname === '/pricing'} />
        </nav>
        <span className="flex-1 md:hidden" />
        {signedIn ? (
          <Link href="/home" className="hidden h-10 items-center gap-1.5 whitespace-nowrap group rounded-full bg-forest px-5 text-[14px] font-semibold text-white transition-colors duration-300 hover:bg-lime hover:text-ink sm:inline-flex">
            Dashboard <Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-4" />
          </Link>
        ) : (<>
        <Link href="/welcome" className="hidden rounded-full px-4 py-2 text-[14px] font-semibold hover:bg-sand sm:inline-flex">Log in</Link>
        <Link href={join.href} className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-full group bg-forest sm:inline-flex px-5 text-[14px] font-semibold text-white transition-colors duration-300 hover:bg-lime hover:text-ink">
          {join.label} <Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-4" />
        </Link>
        </>)}
        <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}
          className="inline-flex size-10 items-center justify-center rounded-[10px] hover:bg-chip md:hidden"><Icon strokeWidth={2} name={open ? 'x' : 'menu'} className="size-5" /></button>
      </div>

      {open && (
        // Full-screen menu on mobile: big type, staggered in, actions pinned to the bottom
        <div className="fixed inset-0 z-40 flex flex-col bg-bg px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[calc(max(12px,env(safe-area-inset-top))+84px)] md:hidden">
          <nav aria-label="Menu" className="hero-in flex flex-col">
            {NAV.map(n => (
              <Link key={n.href} href={n.href} aria-current={pathname.startsWith(n.href) ? 'page' : undefined}
                className="group flex items-center justify-between border-b border-line py-4 font-display text-[30px] font-bold tracking-[-0.03em] aria-[current=page]:text-green-ink">
                {n.label}<Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-6 text-faint" />
              </Link>
            ))}
          </nav>
          <div className="rise mt-auto grid grid-cols-2 gap-3 pt-6" style={{ '--d': '420ms' } as React.CSSProperties}>
            {signedIn ? <Link href="/home" className="col-span-2 inline-flex h-14 items-center justify-center rounded-full bg-forest text-[16px] font-semibold text-white">Dashboard</Link> : (<>
              <Link href="/welcome" className="inline-flex h-14 items-center justify-center rounded-full border border-line-strong text-[16px] font-semibold">Log in</Link>
              <Link href={join.href} className="inline-flex h-14 items-center justify-center rounded-full bg-lime text-[16px] font-semibold text-ink">{join.label}</Link>
            </>)}
          </div>
        </div>
      )}
    </header>
  )
}

function NavLink({ href, label, on }: { href: string; label: string; on: boolean }) {
  return <Link href={href} aria-current={on ? 'page' : undefined}
    className={cx('rounded-[10px] px-3.5 py-2 text-[14px] font-medium transition', on ? 'bg-chip text-ink' : 'text-muted hover:bg-chip/70 hover:text-ink')}>{label}</Link>
}
