'use client'

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

export function BottomNav() {
  const pathname = usePathname()
  const { role, unreadMessages } = useMe()
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-[480px]">
        {NAV[role].map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <li key={item.href} className="flex-1">
              <Link href={item.href} aria-current={active ? 'page' : undefined}
                className={cx('relative flex flex-col items-center gap-1 pb-2.5 pt-3 text-[11px] transition', active ? 'font-medium text-ink' : 'text-faint')}>
                <Icon name={item.icon} className="size-6" strokeWidth={active ? 1.8 : 1.5} />
                {item.label}
                {item.href === '/chats' && unreadMessages > 0 && <span className="absolute left-1/2 top-2.5 ml-2 size-2 rounded-full bg-green" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
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
