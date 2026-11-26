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

// Role-aware bottom tab bar, chosen at onboarding (profiles.account_role).
// Five labelled tabs; your profile lives at the top of More (and on the Home avatar).
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

// Native-style tab bar docked to the bottom: icon + label, active tab = Forest pill with a Lime icon.
export function BottomNav() {
  const pathname = usePathname()
  const { role, unreadMessages } = useMe()
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 lg:hidden">
      <ul className="mx-auto flex h-[60px] max-w-[480px] items-stretch md:max-w-[640px]">
        {NAV[role].map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/') || (item.href === '/menu' && pathname === '/me')
          return (
            <li key={item.href} className="flex-1">
              <Link href={item.href} aria-current={active ? 'page' : undefined}
                className={cx('flex h-full flex-col items-center justify-center gap-0.5 text-[10.5px] font-semibold transition-colors active:opacity-60', active ? 'text-forest' : 'text-muted')}>
                <span className={cx('relative flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-300', active && 'bg-forest text-lime')}>
                  <Icon name={item.icon} className="size-[21px]" strokeWidth={active ? 2 : 1.7} />
                  {item.href === '/chats' && unreadMessages > 0 && <span className="absolute right-2 top-0.5 size-2 rounded-full bg-red ring-2 ring-surface" />}
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
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
        <Link href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined}
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
      <Link href="/me" aria-label="Your profile" className="mt-5 rounded-full ring-2 ring-transparent transition hover:ring-line"><Avatar src={profile?.picture_url} name={name} size={40} /></Link>
      <nav className="scrollbar-none mt-6 flex w-full flex-1 flex-col items-center overflow-y-auto">
        <ul className="flex flex-col items-center gap-1">{NAV[role].filter(n => n.href !== '/me' && n.href !== '/menu').map(n => link(n, n.href === '/chats' ? unreadMessages : undefined))}
          {link({ href: '/inbox', label: 'Notifications', icon: 'bell' }, unreadNotifications)}
        </ul>
        <span className="my-4 h-px w-8 bg-line" />
        <button type="button" onClick={() => setMore(m => !m)} aria-expanded={more} aria-controls="rail-more" aria-label={more ? 'Close more' : 'More: diary, pay, tax, digs…'}
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
    // One compact row: avatar (your profile) · greeting + date · notifications. Tabs cover search, chats and castings.
    <header className="flex items-center gap-3 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))]">
      <Link href="/me" aria-label="Your profile" className="shrink-0 rounded-full">
        <Avatar src={profile?.picture_url} name={name} size={42} />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="min-h-[1.2em] truncate font-display text-[22px] font-bold leading-tight tracking-[-0.03em]"><Typewriter key={name} text={'Hi, ' + name} once="home-greeting" /></h1>
        <p className="truncate text-[13px] text-muted">{subline ?? fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>
      <IconButton icon="bell" label="Notifications" href="/inbox" dot={unreadNotifications > 0} />
    </header>
  )
}
