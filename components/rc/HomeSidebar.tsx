'use client'

import Link from 'next/link'
import Icon from './Icon'
import { Avatar, Progress, Toggle, cx, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { loadCompleteness } from '@/lib/rc/completeness'
import { fullName } from '@/lib/rc/format'
import { craftTag } from '@/lib/rc/talent'
import { PLANS, planFor } from '@/lib/rc/plans'
import { profilePath } from '@/lib/rc/profile'

const card = 'rounded-[10px] bg-surface p-6 shadow-card'
const endLabel = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '')

// Desktop Home right-hand column: you at a glance (Upwork-style) — profile, visibility, reach, membership.
export default function HomeSidebar() {
  const me = useMe()
  const p = me.profile
  const caster = me.role === 'caster'
  const { data, mutate } = useAsync(async () => {
    const week = new Date(Date.now() - 7 * 864e5).toISOString()
    const [{ data: row }, comp, views, { data: shortlists }, conns] = await Promise.all([
      supabase.from('profiles').select('show_talent, availability_status, slug, account_role').eq('id', me.id).maybeSingle(),
      loadCompleteness(me.id),
      supabase.from('profile_views').select('id', { count: 'exact', head: true }).eq('profile_id', me.id).gte('created_at', week),
      supabase.rpc('shortlist_count', { pid: me.id }),
      supabase.from('connections').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${me.id},receiver_id.eq.${me.id}`),
    ])
    return {
      row: row as { show_talent: boolean | null; availability_status: string | null; slug: string | null; account_role: string | null } | null, comp,
      stats: { views: views.count || 0, shortlists: (shortlists as number | null) ?? 0, connections: conns.count || 0 },
    }
  }, [me.id])

  const set = async (patch: Record<string, unknown>, ok: string) => {
    mutate(d => d && { ...d, row: d.row && { ...d.row, ...patch } as typeof d.row })
    const { error } = await supabase.from('profiles').update(patch).eq('id', me.id)
    toast(error ? 'Couldn’t save that' : ok)
  }
  const score = data?.comp?.score ?? 0
  const visible = data?.row?.show_talent !== false
  const open = data?.row?.availability_status === 'available'
  const plan = p?.is_demo ? 'Demo · full access'
    : p?.plan_status === 'trialing' ? 'Free trial until ' + endLabel(p.plan_period_end)
    : p?.plan_status === 'active' ? PLANS[planFor(me.role)].name + ' · renews ' + endLabel(p.plan_period_end)
    : p?.plan_status === 'past_due' ? 'Payment failed — update card'
    : p?.plan_grace_until ? 'Free access until ' + endLabel(p.plan_grace_until) : 'Full access'

  return (
    <aside className="space-y-4">
      <div className={card}>
        <Link href="/me" className="flex items-center gap-4">
          <span className="relative">
            <Avatar src={p?.picture_url} name={me.name} size={64} />
            {open && <span title="Open to work" className="absolute bottom-0.5 right-0.5 size-3.5 rounded-full bg-lime ring-2 ring-surface" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[18px] font-semibold">{fullName(p) || me.name}</span>
            <span className="block truncate text-[14px] text-muted">{caster ? p?.company_name || 'Casting' : (p && craftTag(p)) || 'Performer'}</span>
          </span>
        </Link>
        <div className="mt-5 flex items-center justify-between text-[14px]">
          <span className="font-medium">Profile visibility</span>
          <span className={visible ? 'font-semibold text-green-ink' : 'font-semibold text-muted'}>{visible ? 'Public' : 'Hidden'}</span>
        </div>
        {data && score >= 100 ? (
          // Complete: show how the profile is doing this week, and the link to share
          <>
            <dl className={cx('mt-4 grid gap-2 text-center', caster ? 'grid-cols-2' : 'grid-cols-3')}>
              {(caster ? [['Views', data.stats.views], ['Connections', data.stats.connections]] : [['Views', data.stats.views], ['Shortlists', data.stats.shortlists], ['Connections', data.stats.connections]] as [string, number][]).map(([k, v]) => (
                  <div key={k} className="rounded-[14px] bg-sand px-2 py-3"><dd className="font-display text-[22px] font-bold leading-none">{v}</dd><dt className="mt-1 text-[11px] text-muted">{k}</dt></div>
                ))}
            </dl>
            <p className="mt-2 text-[12px] text-muted">{caster ? 'This week' : 'This week · shortlists by casting'}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link href="/me/edit" className="text-[14px] font-semibold text-green-ink">Edit profile</Link>
              {data.row?.slug && <button type="button" onClick={async () => {
                const url = window.location.origin + profilePath({ slug: data.row!.slug, account_role: data.row!.account_role })
                try { await navigator.clipboard.writeText(url); toast('Profile link copied') } catch { toast(url) }
              }} className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-green-ink"><Icon name="link" className="size-4" />Copy profile link</button>}
            </div>
          </>
        ) : (
          <>
            <Link href="/me/edit" className="mt-4 block text-[14px] font-semibold text-green-ink">Complete your profile</Link>
            <div className="mt-2 flex items-center gap-3">
              <Progress value={score} className="flex-1" />
              <span className="text-[13px] font-medium">{data ? score + '%' : '–'}</span>
            </div>
          </>
        )}
      </div>

      <div className={card}>
        <p className="text-[17px] font-semibold">{caster ? 'Your presence' : 'Get seen by casting'}</p>
        <div className="mt-4 space-y-4 text-[14px]">
          {!caster && (
            <div className="flex items-center justify-between gap-3"><span><span className="block font-medium">Open to work</span><span className="text-[12px] text-muted">Green badge on your profile</span></span>
              <Toggle checked={open} onChange={v => set({ availability_status: v ? 'available' : null }, v ? 'You’re open to work' : 'Badge hidden')} label="Open to work" /></div>
          )}
          <div className="flex items-center justify-between gap-3"><span><span className="block font-medium">Public profile</span><span className="text-[12px] text-muted">{caster ? 'Listed for performers' : 'In talent search'}</span></span>
            <Toggle checked={visible} onChange={v => set({ show_talent: v }, v ? 'Profile is public' : 'Profile hidden')} label="Public profile" /></div>
        </div>
      </div>

      <Link href="/settings" className={card + ' flex items-center gap-3'}>
        <span className="flex size-10 items-center justify-center rounded-full bg-lime text-ink"><Icon name="star" className="size-5" /></span>
        <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{PLANS[planFor(me.role)].name} membership</span><span className="block truncate text-[13px] text-muted">{plan}</span></span>
        <Icon name="chevron-right" className="size-4 text-faint" />
      </Link>
    </aside>
  )
}
