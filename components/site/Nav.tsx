'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/performers', label: 'Performers' },
  { href: '/casting', label: 'Casting' },
  { href: '/jobs', label: 'Roles' },
  { href: '/people', label: 'Talent' },
  { href: '/pricing', label: 'Pricing' },
]

// Floating glass nav: a pill that tightens and gains a shadow on scroll; full-screen sheet on mobile
export default function SiteNav() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [signedIn, setSignedIn] = useState(false)
  // On app.theident.me "/" opens the app, so the logo points at the website itself
  const [home, setHome] = useState('/')
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (window.location.hostname.startsWith('app.')) setHome('https://www.theident.me/') }, [])
  useEffect(() => { let live = true; supabase.auth.getSession().then(({ data: { session } }) => live && setSignedIn(!!session)); return () => { live = false } }, [])
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
      <div className={cx('mx-auto flex h-14 max-w-[1180px] items-center gap-2 rounded-[14px] border pl-4 pr-2 transition-all duration-300',
        scrolled || open ? 'border-line/80 bg-surface/80 shadow-[0_10px_30px_-18px_rgb(18_49_39/0.45)] backdrop-blur-xl backdrop-saturate-150' : 'border-transparent bg-transparent')}>
        <Link href={home} aria-label="The Ident home" className="mr-4 flex shrink-0 items-center gap-2 whitespace-nowrap font-display text-[19px] font-bold tracking-[-0.03em] text-forest">
          <span className="flex size-8 items-center justify-center rounded-[9px] bg-forest text-[14px] text-lime">Id</span>The Ident
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map(n => {
            const on = pathname === n.href
            return <Link key={n.href} href={n.href} aria-current={on ? 'page' : undefined}
              className={cx('rounded-[10px] px-3.5 py-2 text-[14px] font-medium transition', on ? 'bg-chip text-ink' : 'text-muted hover:bg-chip/70 hover:text-ink')}>{n.label}</Link>
          })}
        </nav>
        <span className="flex-1 md:hidden" />
        {signedIn ? (
          <Link href="/home" className="hidden h-10 items-center gap-1.5 whitespace-nowrap group rounded-[10px] bg-forest px-4 text-[14px] font-semibold text-white transition-colors duration-300 hover:bg-lime hover:text-ink sm:inline-flex">
            Open app <Icon name="arrow-right" className="cta-arrow size-4" />
          </Link>
        ) : (<>
        <Link href="/welcome" className="hidden rounded-[10px] px-3.5 py-2 text-[14px] font-semibold hover:bg-chip/70 sm:inline-flex">Log in</Link>
        <Link href="/start?role=performer" className="hidden h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] group bg-forest sm:inline-flex px-4 text-[14px] font-semibold text-white transition-colors duration-300 hover:bg-lime hover:text-ink">
          Start free trial <Icon name="arrow-right" className="cta-arrow size-4" />
        </Link>
        </>)}
        <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}
          className="inline-flex size-10 items-center justify-center rounded-[10px] hover:bg-chip md:hidden"><Icon name={open ? 'x' : 'menu'} className="size-5" /></button>
      </div>

      {open && (
        <div className="fixed inset-x-3 top-[calc(max(12px,env(safe-area-inset-top))+64px)] z-50 rounded-[14px] border border-line bg-surface p-3 shadow-card md:hidden">
          {NAV.map(n => <Link key={n.href} href={n.href} className="flex items-center justify-between rounded-[10px] px-3 py-3.5 text-[17px] font-medium hover:bg-chip">{n.label}<Icon name="chevron-right" className="size-4 text-faint" /></Link>)}
          <div className="mt-2 grid grid-cols-2 gap-2 border-t border-line pt-3">
            {signedIn ? <Link href="/home" className="col-span-2 inline-flex h-12 items-center justify-center rounded-[10px] bg-forest text-[15px] font-semibold text-white">Open app</Link> : (<>
              <Link href="/welcome" className="inline-flex h-12 items-center justify-center rounded-[10px] border border-line text-[15px] font-semibold">Log in</Link>
              <Link href="/start?role=performer" className="inline-flex h-12 items-center justify-center rounded-[10px] bg-lime text-[15px] font-semibold text-ink">Join</Link>
            </>)}
          </div>
        </div>
      )}
    </header>
  )
}
