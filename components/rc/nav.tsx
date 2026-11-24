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

// Role-aware bottom nav, chosen at onboarding (profiles.account_role)
export const NAV: Record<Role, { href: string; label: string; icon: string }[]> = {
  performer: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/find', label: 'Find', icon: 'search' },
    { href: '/castings', label: 'Castings', icon: 'briefcase' },
    { href: '/chats', label: 'Chats', icon: 'chat' },
    { href: '/menu', label: 'More', icon: 'menu' },
    { href: '/me', label: 'Profile', icon: 'user' },
  ],
  caster: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/talent', label: 'Talent', icon: 'users' },
    { href: '/postings', label: 'Postings', icon: 'megaphone' },
    { href: '/chats', label: 'Chats', icon: 'chat' },
    { href: '/menu', label: 'More', icon: 'menu' },
    { href: '/me', label: 'Profile', icon: 'user' },
  ],
}

// The nav shows on each tab's root screen only; detail screens get a back header
export function isTabRoot(pathname: string, role: Role) {
  return NAV[role].some(n => n.href === pathname)
}

// Instagram-style frosted-glass floating pill. Active tab gets a soft circle;
// scrolling down shrinks the pill, scrolling up brings it back.
export function BottomNav() {
  const pathname = usePathname()
  const { role, unreadMessages, profile, name } = useMe()
  const [compact, setCompact] = useState(false)

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

  return (
    <nav aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-5 pb-[max(20px,calc(env(safe-area-inset-bottom)+10px))] lg:hidden">
      <ul className={cx('pointer-events-auto flex w-full items-center justify-between rounded-full border border-white/60 bg-surface/55 px-2 shadow-[0_10px_30px_-10px_rgb(0_0_0/0.3)] backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out',
        compact ? 'h-[54px] max-w-[300px]' : 'h-[64px] max-w-[400px]')}>
        {NAV[role].map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          const isProfile = item.href === '/me'
          return (
            <li key={item.href} className="flex flex-1 justify-center">
              <Link href={item.href} aria-label={item.label} aria-current={active ? 'page' : undefined}
                className={cx('relative flex items-center justify-center rounded-full text-ink transition-all duration-300',
                  active ? (isProfile ? 'ring-2 ring-lime' : 'bg-forest text-lime') : 'text-ink/75 hover:text-ink',
                  compact ? 'size-10' : 'size-12')}>
                {isProfile
                  ? <Avatar src={profile?.picture_url} name={name} size={compact ? 26 : 30} />
                  : <Icon name={item.icon} className={compact ? 'size-[22px]' : 'size-6'} strokeWidth={active ? 2 : 1.6} />}
                {item.href === '/chats' && unreadMessages > 0 && <span className="absolute bottom-2 right-2 size-2 rounded-full bg-red ring-2 ring-surface" />}
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
    { href: '/pay', label: 'Pay & earnings', icon: 'card' },
    { href: '/tax', label: 'Tax & expenses', icon: 'pound' },
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
        <ul className="flex flex-col items-center gap-1">{MORE[role].map(n => link(n))}</ul>
      </nav>
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
  const { name, profile, unreadNotifications, unreadMessages, role } = useMe()
  return (
    <header className="px-4 pb-2 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center gap-1">
        <Link href="/menu" aria-label="Menu" className="mr-2 rounded-full">
          <Avatar src={profile?.picture_url} name={name} size={40} />
        </Link>
        <span className="flex-1" />
        <IconButton icon="search" label="Search" href={role === 'caster' ? '/talent' : '/find'} />
        <IconButton icon="chat" label="Chats" href="/chats" dot={unreadMessages > 0} />
        {/* Work inbox: castings pipeline for performers, submissions for casters */}
        <IconButton icon="inbox" label={role === 'caster' ? 'Submissions' : 'Castings'} href={role === 'caster' ? '/postings' : '/castings'} />
        <IconButton icon="bell" label="Notifications" href="/inbox" dot={unreadNotifications > 0} />
      </div>
      <h1 className="mt-4 min-h-[1.2em] font-display text-[30px] font-bold tracking-[-0.03em]"><Typewriter key={name} text={'Hi, ' + name} once="home-greeting" /></h1>
      <p className="rise mt-1 text-sm text-muted" style={{ '--d': '350ms' } as React.CSSProperties}>{subline ?? fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </header>
  )
}
