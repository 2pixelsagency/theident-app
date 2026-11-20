'use client'

import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Avatar, Card, ListRow, Pill, useGoBack } from '@/components/rc/ui'
import { useMe } from '@/lib/rc/me'
import { signOutAndReset } from '@/lib/rc/onboarding'
import { fullName } from '@/lib/rc/format'
import { craftTag } from '@/lib/rc/talent'

// App hub linking everything that isn't in the bottom nav
export default function MenuPage() {
  const goBack = useGoBack('/home')
  const { profile, role, unreadNotifications } = useMe()
  const caster = role === 'caster'

  const logout = signOutAndReset

  return (
    <div className="px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px]">Menu</h1>
        <button type="button" aria-label="Close menu" onClick={goBack} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-chip"><Icon name="x" className="size-6" /></button>
      </div>

      <Link href="/me" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] bg-dark p-4 text-white">
        <Avatar src={profile?.picture_url} name={fullName(profile)} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-medium">{profile?.first_name || 'Your profile'}</span>
          <span className="block truncate text-[13px] text-white/60">{caster ? profile?.company_name || 'Casting' : [profile && craftTag(profile), profile?.location?.split(',')[0]].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="text-sm font-medium text-green">View profile ›</span>
      </Link>

      {/* Grouped by what you're doing; nothing here repeats the bottom bar */}
      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{caster ? 'Your work' : 'Your career'}</p>
      <Card className="divide-y divide-line overflow-hidden">
        {!caster && <ListRow icon="target" title="Goals" sub="Weekly actions towards what you want" href="/blocks" />}
        {!caster && <ListRow icon="check-square" title="To do" href="/todo" />}
        <ListRow icon="calendar" title="Diary" href="/diary" />
        {!caster && <ListRow icon="megaphone" title="Your postings" sub="Side hustles and jobs you've posted" href="/postings" />}
        {!caster && <ListRow icon="plus" title="Post a job" href="/postings/new" />}
      </Card>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted">On the road</p>
      <Card className="divide-y divide-line overflow-hidden">
        <ListRow icon="ticket" title="What’s on" sub="Auditions, workshops, talks & premieres" href="/whats-on" />
        <ListRow icon="sparkle" title="Classes" sub="Spare class spaces & classes to book" href="/classes" />
        <ListRow icon="house" title="Theatre digs" sub="Places to stay near the theatre" href="/digs" />
      </Card>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Money</p>
      <Card className="divide-y divide-line overflow-hidden">
        <ListRow icon="card" title="Pay & earnings" href="/pay" />
        <ListRow icon="pound" title="Tax & expenses" sub="Receipts, claimables and your tax estimate" href="/tax" />
      </Card>

      <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted">Account</p>
      <Card className="divide-y divide-line overflow-hidden">
        <ListRow icon="bell" title="Notifications" href="/inbox" right={unreadNotifications > 0 ? <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-green px-1.5 text-xs font-medium text-white">{unreadNotifications}</span> : undefined} />
        <ListRow icon="shield-check" title="ID verification" right={profile?.is_verified ? <Pill tone="green">Verified</Pill> : <span className="text-sm text-muted">Get verified</span>} href={profile?.is_verified ? undefined : '/help'} />
        <ListRow icon="settings" title="Settings" href="/settings" />
        <ListRow icon="help" title="Help & support" href="/help" />
      </Card>

      <button type="button" onClick={logout} className="mt-6 w-full text-center text-[15px] font-medium text-red">Log out</button>
    </div>
  )
}
