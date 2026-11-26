'use client'

import Typewriter from './Typewriter'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'
import LogoMark from '@/components/LogoMark'
import { Avatar, IconButton, cx } from './ui'
import { useMe } from '@/lib/rc/me'
import { fmtDate } from '@/lib/rc/format'
import { signOutAndReset, type Role } from '@/lib/rc/onboarding'

// Role-aware bottom nav, chosen at onboarding (profiles.account_role).
// Your profile is the avatar top-left on Home (and at the top of More).
export const NAV: Record<Role, { href: string; label: string; icon: string }[]> = {
  performer: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/find', label: 'Find', icon: 'search' },
    { href: '/castings', label: 'Castings', icon: 'briefcase' },
    { href: '/chats', label: 'Chats', icon: 'chat' },
    { href: '/menu', label: 'More', icon: 'menu' },
  ],
  caster: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/talent', label: 'Talent', icon: 'users' },
    { href: '/postings', label: 'Postings', icon: 'megaphone' },
    { href: '/chats', label: 'Chats', icon: 'chat' },
    { href: '/menu', label: 'More', icon: 'menu' },
  ],
}

// The tab bar shows on each tab's root screen (and your profile); detail screens get a back header
export function isTabRoot(pathname: string, role: Role) {
  return pathname === '/me' || NAV[role].some(n => n.href === pathname)
}

// Frosted, see-through floating pill. A neutral white highlight slides between tabs (no colour — the pill sits over busy screens); the last button is a +
// that opens everything that isn't a tab (it turns into ×). Scrolling down shrinks the pill.
export function BottomNav() {
  const pathname = usePathname()
  const { role, unreadMessages } = useMe()
  const [compact, setCompact] = useState(false)
  const [plus, setPlus] = useState(false)

  useEffect(() => {
    let last = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (y > last + 8 && y > 80) setCompact(true)
      else if (y < last - 8 || y < 40) setCompact(false)
      last = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!plus) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPlus(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [plus])

  const tabs = NAV[role].filter(n => n.href !== '/menu')
  const slots = tabs.length + 1
  const activeIdx = tabs.findIndex(t => pathname === t.href || pathname.startsWith(t.href + '/'))
  const size = compact ? 40 : 48
  const extras = [{ href: '/me', label: 'Profile', icon: 'user' }, ...MORE[role], { href: '/settings', label: 'Settings', icon: 'settings' }]

  return (
    <>
      {/* + panel: rises out of the pill */}
      <div aria-hidden={!plus} onClick={() => setPlus(false)}
        className={cx('fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden', plus ? 'opacity-100' : 'pointer-events-none opacity-0')} />
      <div id="nav-plus" role="menu" aria-label="More"
        className={cx('fixed inset-x-5 z-50 mx-auto max-w-[360px] origin-bottom-right rounded-[26px] border border-white/50 bg-surface/70 p-3 shadow-[0_20px_50px_-20px_rgb(0_0_0/0.45)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-[cubic-bezier(.2,.9,.3,1.2)] lg:hidden',
          plus ? 'translate-y-0 scale-100 opacity-100' : 'pointer-events-none translate-y-4 scale-90 opacity-0')}
        style={{ bottom: 'calc(max(20px, env(safe-area-inset-bottom) + 10px) + 76px)' }}>
        <ul className="grid grid-cols-3 gap-1.5">
          {extras.map((n, k) => (
            <li key={n.href} style={{ transitionDelay: plus ? k * 25 + 'ms' : '0ms' }} className={cx('transition-all duration-300', plus ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0')}>
              <Link href={n.href} role="menuitem" tabIndex={plus ? 0 : -1} onClick={() => setPlus(false)}
                className="flex h-[74px] flex-col items-center justify-center gap-1.5 rounded-[16px] text-center text-[12px] font-semibold leading-tight text-ink transition active:scale-95 hover:bg-white/60">
                <span className="flex size-9 items-center justify-center rounded-full bg-white/80 text-ink shadow-card"><Icon name={n.icon} className="size-[18px]" strokeWidth={1.8} /></span>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/menu" tabIndex={plus ? 0 : -1} onClick={() => setPlus(false)} className="mt-1.5 flex h-10 items-center justify-center gap-1 rounded-[14px] text-[13px] font-semibold text-ink hover:bg-white/60">
          See everything <Icon name="arrow-right" className="size-3.5" strokeWidth={2} />
        </Link>
      </div>

      <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-5 pb-[max(20px,calc(env(safe-area-inset-bottom)+10px))] lg:hidden">
        <ul className={cx('pointer-events-auto relative flex w-full items-center rounded-full border border-white/40 bg-surface/25 px-2 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.35)] backdrop-blur-2xl backdrop-saturate-[1.8] transition-all duration-300 ease-out',
          compact ? 'h-[54px] max-w-[290px]' : 'h-[64px] max-w-[360px]')}>
          {/* Sliding highlight behind the active tab */}
          <span aria-hidden="true" className={cx('pointer-events-none absolute top-1/2 rounded-full bg-surface shadow-[0_4px_14px_-4px_rgb(0_0_0/0.25)] transition-all duration-500 ease-[cubic-bezier(.3,1.35,.5,1)]', activeIdx < 0 || plus ? 'scale-50 opacity-0' : 'scale-100 opacity-100')}
            style={{ width: size, height: size, marginTop: -size / 2, left: `calc(8px + (100% - 16px) * ${(Math.max(activeIdx, 0) + 0.5) / slots} - ${size / 2}px)` }} />
          {tabs.map((item, k) => {
            const active = k === activeIdx && !plus
            return (
              <li key={item.href} className="relative flex flex-1 justify-center">
                <Link href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined} data-tour={'tab-' + item.href.slice(1)} onClick={() => setPlus(false)}
                  className={cx('relative flex items-center justify-center rounded-full transition-[color,transform] duration-300 active:scale-90', active ? 'text-ink' : 'text-ink/65 hover:text-ink', compact ? 'size-10' : 'size-12')}>
                  <Icon name={item.icon} className={cx('transition-transform duration-300', compact ? 'size-[22px]' : 'size-6', active && 'scale-110')} strokeWidth={active ? 2 : 1.6} />
                  {item.href === '/chats' && unreadMessages > 0 && <span className="absolute bottom-2 right-2 size-2 rounded-full bg-red ring-2 ring-surface" />}
                </Link>
              </li>
            )
          })}
          <li className="relative flex flex-1 justify-center">
            <button type="button" onClick={() => setPlus(o => !o)} aria-expanded={plus} aria-controls="nav-plus" aria-label={plus ? 'Close' : 'More'} data-tour="tab-menu"
              className={cx('relative flex items-center justify-center rounded-full transition-all duration-300 active:scale-90', plus ? 'bg-surface text-ink shadow-[0_4px_14px_-4px_rgb(0_0_0/0.25)]' : 'text-ink/65 hover:text-ink', compact ? 'size-10' : 'size-12')}>
              <Icon name="plus" className={cx('transition-transform duration-300', compact ? 'size-[22px]' : 'size-6', plus && 'rotate-[135deg]')} strokeWidth={2} />
            </button>
          </li>
        </ul>
      </nav>
    </>
  )
}

// Everything that lives in the Menu on mobile, shown permanently on desktop
const MORE: Record<Role, { href: string; label: string; icon: string }[]> = {
  performer: [
    { href: '/diary', label: 'Diary', icon: 'calendar' },
    { href: '/blocks', label: 'Goals', icon: 'target' },
    { href: '/postings', label: 'Your postings', icon: 'megaphone' },
    { href: '/whats-on', label: 'What’s on', icon: 'ticket' },
    { href: '/classes', label: 'Classes', icon: 'sparkle' },
    { href: '/digs', label: 'Theatre digs', icon: 'house' },
    { href: '/money', label: 'Money', icon: 'pound' },
  ],
  caster: [
    { href: '/diary', label: 'Diary', icon: 'calendar' },
    { href: '/whats-on', label: 'What’s on', icon: 'ticket' },
    { href: '/classes', label: 'Classes', icon: 'sparkle' },
    { href: '/digs', label: 'Theatre digs', icon: 'house' },
  ],
}

// Desktop (lg+) slim icon rail (Upwork-style); labels appear on hover. Replaces the floating pill.
export function SideNav() {
  const pathname = usePathname()
  const { role, unreadMessages, unreadNotifications, profile, name } = useMe()
  // The + opens a labelled panel that slides out of the rail with everything that isn't a main tab
  const [more, setMore] = useState(false)
  const moreActive = MORE[role].some(n => pathname === n.href || pathname.startsWith(n.href + '/'))
  useEffect(() => {
    if (!more) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [more])
  const link = (item: { href: string; label: string; icon: string }, badge?: number) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <li key={item.href}>
        <Link href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined} data-tour={'tab-' + item.href.slice(1)}
          className={cx('group relative flex size-11 items-center justify-center rounded-[14px] transition-colors duration-300', active ? 'bg-forest text-lime' : 'text-muted hover:bg-sand hover:text-ink')}>
          <Icon name={item.icon} className="size-[22px]" strokeWidth={active ? 2 : 1.6} />
          {!!badge && <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-red ring-2 ring-surface" />}
          <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-dark px-2.5 py-1.5 text-[13px] font-medium text-white opacity-0 shadow-card transition group-hover:opacity-100">{item.label}</span>
        </Link>
      </li>
    )
  }
  return (
    <aside aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-[76px] flex-col items-center border-r border-line-soft bg-sand py-5 lg:flex">
      <Link href="/home" aria-label="The Ident home" className="flex size-11 items-center justify-center rounded-full bg-forest text-lime"><LogoMark className="size-5" /></Link>
      <Link href="/me" data-tour="profile" aria-label="Your profile" className="mt-5 rounded-full ring-2 ring-transparent transition hover:ring-line"><Avatar src={profile?.picture_url} name={name} size={40} /></Link>
      <nav className="scrollbar-none mt-6 flex w-full flex-1 flex-col items-center overflow-y-auto">
        <ul className="flex flex-col items-center gap-1">{NAV[role].filter(n => n.href !== '/me' && n.href !== '/menu').map(n => link(n, n.href === '/chats' ? unreadMessages : undefined))}
          {link({ href: '/inbox', label: 'Notifications', icon: 'bell' }, unreadNotifications)}
        </ul>
        <span className="my-4 h-px w-8 bg-line" />
        <button type="button" data-tour="tab-menu" onClick={() => setMore(m => !m)} aria-expanded={more} aria-controls="rail-more" aria-label={more ? 'Close more' : 'More: diary, pay, tax, digs…'}
          className={cx('group relative flex size-11 items-center justify-center rounded-[14px] transition-colors duration-300', more || moreActive ? 'bg-forest text-lime' : 'text-muted hover:bg-sand hover:text-ink')}>
          <Icon name="plus" className={cx('size-[22px] transition-transform duration-300', more && 'rotate-45')} strokeWidth={2} />
        </button>
      </nav>
      {more && <>
        <button type="button" aria-label="Close" onClick={() => setMore(false)} className="fixed inset-0 left-[76px] z-30 cursor-default bg-ink/10" />
        <div id="rail-more" className="fixed left-[76px] top-0 z-40 flex h-dvh w-[260px] animate-[rail-out_220ms_cubic-bezier(.2,.8,.2,1)] flex-col border-r border-line-soft bg-sand px-3 py-5 shadow-[20px_0_40px_-30px_rgb(18_49_39/0.5)]">
          <p className="px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">More</p>
          <ul className="space-y-0.5">
            {MORE[role].map(n => {
              const active = pathname === n.href || pathname.startsWith(n.href + '/')
              return (
                <li key={n.href}>
                  <Link href={n.href} onClick={() => setMore(false)} aria-current={active ? 'page' : undefined}
                    className={cx('flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-[15px] font-medium transition-colors', active ? 'bg-forest text-lime' : 'text-ink hover:bg-surface')}>
                    <Icon name={n.icon} className="size-5" strokeWidth={active ? 2 : 1.6} />{n.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </>}
      <ul className="mt-4 flex flex-col items-center gap-1">
        {link({ href: '/settings', label: 'Settings', icon: 'settings' })}
        {link({ href: '/help', label: 'Help & support', icon: 'help' })}
        <li>
          <button type="button" onClick={() => signOutAndReset()} aria-label="Log out"
            className="group relative flex size-11 items-center justify-center rounded-[14px] text-muted transition-colors duration-300 hover:bg-sand hover:text-red">
            <Icon name="logout" className="size-[22px]" strokeWidth={1.6} />
            <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-dark px-2.5 py-1.5 text-[13px] font-medium text-white opacity-0 shadow-card transition group-hover:opacity-100">Log out</span>
          </button>
        </li>
      </ul>
    </aside>
  )
}

// "Hi, [name]" dashboard header with thin outline icons (search, chat, inbox-with-dot, bell)
export function HomeHeader({ subline }: { subline?: string }) {
  const { name, profile, unreadNotifications } = useMe()
  return (
    <header className="px-4 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <Link href="/me" aria-label="Your profile" data-tour="profile-home" className="rounded-full">
          <Avatar src={profile?.picture_url} name={name} size={40} />
        </Link>
        <span data-tour="home-alerts"><IconButton icon="bell" label="Notifications" href="/inbox" dot={unreadNotifications > 0} /></span>
      </div>
      <h1 className="mt-4 min-h-[1.2em] font-display text-[30px] font-bold tracking-[-0.03em]"><Typewriter key={name} text={'Hi, ' + name} once="home-greeting" /></h1>
      <p className="rise mt-1 text-sm text-muted" style={{ '--d': '350ms' } as React.CSSProperties}>{subline ?? fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </header>
  )
}
