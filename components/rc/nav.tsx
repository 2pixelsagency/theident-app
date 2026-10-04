'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from './Icon'
import { Avatar, IconButton, cx } from './ui'
import { useMe } from '@/lib/rc/me'
import { fmtDate } from '@/lib/rc/format'
import type { Role } from '@/lib/rc/onboarding'

// Role-aware bottom nav, chosen at onboarding (profiles.account_role)
export const NAV: Record<Role, { href: string; label: string; icon: string }[]> = {
  performer: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/find', label: 'Find', icon: 'search' },
    { href: '/castings', label: 'Castings', icon: 'briefcase' },
    { href: '/chats', label: 'Chats', icon: 'chat' },
    { href: '/me', label: 'Profile', icon: 'user' },
  ],
  caster: [
    { href: '/home', label: 'Home', icon: 'home' },
    { href: '/talent', label: 'Talent', icon: 'users' },
    { href: '/postings', label: 'Postings', icon: 'megaphone' },
    { href: '/chats', label: 'Chats', icon: 'chat' },
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
                  active ? 'bg-ink/[0.07] ring-1 ring-white/70' : 'text-ink/75',
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
    { href: '/blocks', label: 'Your Blocks', icon: 'grid' },
    { href: '/postings', label: 'Your postings', icon: 'megaphone' },
    { href: '/whats-on', label: 'What’s on', icon: 'ticket' },
    { href: '/digs', label: 'Theatre digs', icon: 'house' },
    { href: '/pay', label: 'Pay & earnings', icon: 'card' },
    { href: '/tax', label: 'Tax & expenses', icon: 'pound' },
  ],
  caster: [
    { href: '/diary', label: 'Diary', icon: 'calendar' },
    { href: '/whats-on', label: 'What’s on', icon: 'ticket' },
    { href: '/digs', label: 'Theatre digs', icon: 'house' },
    { href: '/pay', label: 'Pay & earnings', icon: 'card' },
    { href: '/tax', label: 'Tax & expenses', icon: 'pound' },
  ],
}

// Desktop (lg+) left rail; replaces the floating pill
export function SideNav() {
  const pathname = usePathname()
  const { role, unreadMessages, unreadNotifications, profile, name } = useMe()
  const link = (item: { href: string; label: string; icon: string }, badge?: number) => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <li key={item.href}>
        <Link href={item.href} aria-current={active ? 'page' : undefined}
          className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition hover:bg-chip', active ? 'bg-chip font-medium text-ink' : 'text-muted')}>
          <Icon name={item.icon} className="size-[22px]" strokeWidth={active ? 1.9 : 1.6} />
          <span className="flex-1">{item.label}</span>
          {!!badge && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1.5 text-[11px] font-medium text-white">{badge}</span>}
        </Link>
      </li>
    )
  }
  return (
    <aside aria-label="Main" className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-line bg-surface px-3 py-6 lg:flex">
      <Link href="/home" className="mb-6 px-3 text-[22px] font-medium tracking-tight">RoleCall</Link>
      <nav className="scrollbar-none flex-1 overflow-y-auto">
        <ul className="space-y-0.5">{NAV[role].filter(n => n.href !== '/me').map(n => link(n, n.href === '/chats' ? unreadMessages : undefined))}</ul>
        <p className="mb-1 mt-6 px-3 text-xs font-medium uppercase tracking-[0.08em] text-faint">More</p>
        <ul className="space-y-0.5">{MORE[role].map(n => link(n))}</ul>
        <ul className="mt-6 space-y-0.5">
          {link({ href: '/inbox', label: 'Notifications', icon: 'bell' }, unreadNotifications)}
          {link({ href: '/settings', label: 'Settings', icon: 'settings' })}
          {link({ href: '/help', label: 'Help & support', icon: 'help' })}
        </ul>
      </nav>
      <Link href="/me" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-chip">
        <Avatar src={profile?.picture_url} name={name} size={36} />
        <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{name || 'Your profile'}</span><span className="block text-[13px] text-muted">View profile</span></span>
      </Link>
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
      <h1 className="mt-4 text-[26px]">Hi, {name}</h1>
      <p className="mt-1 text-sm text-muted">{subline ?? fmtDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
    </header>
  )
}
