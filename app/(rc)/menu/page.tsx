'use client'

import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Avatar, Card, ListRow, Pill } from '@/components/rc/ui'
import { startTour } from '@/components/rc/Tour'
import { useMe } from '@/lib/rc/me'
import { signOutAndReset } from '@/lib/rc/onboarding'
import { fullName } from '@/lib/rc/format'
import { craftTag } from '@/lib/rc/talent'

// App hub: your profile, a grid of everything that isn't a tab, then account bits
export default function MenuPage() {
  const { profile, role } = useMe()
  const caster = role === 'caster'

  const logout = signOutAndReset

  // Everything that isn't a tab, as one compact grid of shortcuts
  const tiles: { href: string; label: string; icon: string }[] = caster
    ? [
        { href: '/diary', label: 'Diary', icon: 'calendar' },
        { href: '/whats-on', label: 'What’s on', icon: 'ticket' },
        { href: '/classes', label: 'Classes', icon: 'sparkle' },
        { href: '/digs', label: 'Theatre digs', icon: 'house' },
      ]
    : [
        { href: '/money', label: 'Money', icon: 'pound' },
        { href: '/diary', label: 'Diary', icon: 'calendar' },
        { href: '/todo', label: 'To do', icon: 'check-square' },
        { href: '/blocks', label: 'Goals', icon: 'target' },
        { href: '/talent', label: 'People', icon: 'users' },
        { href: '/postings', label: 'Your postings', icon: 'megaphone' },
        { href: '/whats-on', label: 'What’s on', icon: 'ticket' },
        { href: '/classes', label: 'Classes', icon: 'sparkle' },
        { href: '/digs', label: 'Theatre digs', icon: 'house' },
      ]

  return (
    <div className="px-4 pb-8 pt-[max(12px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[24px] font-bold tracking-[-0.03em]">More</h1>
        <Link href="/settings" aria-label="Settings" className="inline-flex size-10 items-center justify-center rounded-full text-ink active:opacity-60"><Icon name="settings" className="size-[22px]" /></Link>
      </div>

      <Link href="/me" className="mt-3 flex items-center gap-3 rounded-[var(--radius)] bg-dark p-3.5 text-white">
        <Avatar src={profile?.picture_url} name={fullName(profile)} size={44} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-semibold">{profile?.first_name || 'Your profile'}</span>
          <span className="block truncate text-[13px] text-white/60">{caster ? profile?.company_name || 'Casting' : [profile && craftTag(profile), profile?.location?.split(',')[0]].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="text-[13px] font-semibold text-lime">View profile ›</span>
      </Link>

      <ul className="mt-4 grid grid-cols-3 gap-2.5">
        {tiles.map(t => (
          <li key={t.href}>
            <Link href={t.href} className="flex h-[84px] flex-col items-center justify-center gap-2 rounded-[16px] border border-line-soft bg-surface px-1 text-center text-[12.5px] font-semibold leading-tight shadow-card active:scale-[.97] transition-transform">
              <span className="flex size-9 items-center justify-center rounded-full bg-mint text-forest"><Icon name={t.icon} className="size-[19px]" strokeWidth={1.8} /></span>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>

      <Card className="mt-5 divide-y divide-line overflow-hidden">
        <ListRow icon="shield-check" title="ID verification" right={profile?.is_verified ? <Pill tone="green">Verified</Pill> : <span className="text-sm text-muted">Get verified</span>} href={profile?.is_verified ? undefined : '/help'} />
        <ListRow icon="sparkle" title="Take the tour" onClick={startTour} />
        <ListRow icon="help" title="Help & support" href="/help" />
      </Card>

      <button type="button" onClick={logout} className="mt-5 w-full text-center text-[15px] font-medium text-red">Log out</button>
    </div>
  )
}
