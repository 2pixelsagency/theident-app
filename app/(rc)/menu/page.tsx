'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Avatar, Card, ListRow, Pill } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { fullName } from '@/lib/rc/format'
import { craftTag } from '@/lib/rc/talent'

// App hub linking everything that isn't in the bottom nav
export default function MenuPage() {
  const router = useRouter()
  const { profile, role, unreadNotifications } = useMe()
  const caster = role === 'caster'

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/welcome')
  }

  return (
    <div className="px-4 pb-10 pt-[max(16px,env(safe-area-inset-top))]">
      <div className="flex items-center justify-between">
        <h1 className="text-[22px]">Menu</h1>
        <button type="button" aria-label="Close menu" onClick={() => (window.history.length > 1 ? router.back() : router.push('/home'))} className="inline-flex size-10 items-center justify-center rounded-full hover:bg-chip"><Icon name="x" className="size-6" /></button>
      </div>

      <Link href="/me" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] bg-dark p-4 text-white">
        <Avatar src={profile?.picture_url} name={fullName(profile)} size={52} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-medium">{profile?.first_name || 'Your profile'}</span>
          <span className="block truncate text-[13px] text-white/60">{caster ? profile?.company_name || 'Casting' : [profile && craftTag(profile), profile?.location?.split(',')[0]].filter(Boolean).join(' · ')}</span>
        </span>
        <span className="text-sm font-medium text-green">View profile ›</span>
      </Link>

      <Card className="mt-4 divide-y divide-line overflow-hidden">
        {!caster && <ListRow icon="grid" title="Your Blocks" href="/blocks" />}
        {!caster && <ListRow icon="briefcase" title="Castings" href="/castings" />}
        <ListRow icon="calendar" title="Diary" href="/diary" />
        <ListRow icon="megaphone" title="Your postings" href="/postings" />
        {caster && <ListRow icon="users" title="Find talent" href="/talent" />}
        <ListRow icon="ticket" tone="purple" title="What’s on" sub="Auditions, workshops, talks & premieres" href="/whats-on" />
        <ListRow icon="house" tone="purple" title="Theatre digs" sub="Find places to stay on tour" href="/digs" />
      </Card>

      <Card className="mt-4 divide-y divide-line overflow-hidden">
        <ListRow icon="pound" tone="amber" title="Tax & expenses" sub="Track earnings & claimables" href="/tax" />
        <ListRow icon="card" title="Pay & earnings" href="/pay" />
      </Card>

      <Card className="mt-4 divide-y divide-line overflow-hidden">
        <ListRow icon="bell" title="Notifications" href="/inbox" right={unreadNotifications > 0 ? <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-green px-1.5 text-xs font-medium text-white">{unreadNotifications}</span> : undefined} />
        <ListRow icon="shield-check" title="ID verification" right={profile?.is_verified ? <Pill tone="green">Verified</Pill> : <span className="text-sm text-muted">Get verified</span>} href={profile?.is_verified ? undefined : '/help'} />
        <ListRow icon="settings" title="Settings" href="/settings" />
        <ListRow icon="help" title="Help & support" href="/help" />
      </Card>

      <button type="button" onClick={logout} className="mt-6 w-full text-center text-[15px] font-medium text-red">Log out</button>
    </div>
  )
}
