'use client'

import { useEffect, useState } from 'react'
import { BackHeader, Card, ListRow, PageLoading, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { PLANS, planFor, price } from '@/lib/rc/plans'
import { isNativeApp } from '@/lib/rc/authRedirect'
import { fullName } from '@/lib/rc/format'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'
import { NOTIFICATION_TYPES, disablePush, enablePush, pushState, type PrefKey, type PushState } from '@/lib/rc/push'

type Prefs = Record<PrefKey | 'marketing', boolean>

export default function SettingsPage() {
  const me = useMe()
  const [push, setPush] = useState<PushState | 'busy' | null>(null)
  useEffect(() => { let live = true; pushState().then(s => live && setPush(s)); return () => { live = false } }, [])
  const togglePush = async (on: boolean) => {
    setPush('busy')
    try {
      const s = on ? await enablePush() : await disablePush()
      setPush(s)
      toast(s === 'on' ? 'Notifications on for this device' : s === 'denied' ? 'Notifications are blocked in your browser settings' : 'Notifications off for this device')
    } catch { setPush(await pushState()); toast('Couldn’t turn on notifications') }
  }
  const { data, loading, mutate } = useAsync(async () => {
    const { data: p } = await supabase.from('profiles').select('first_name, last_name, show_talent, feature_on_site, availability_status, email_alerts_enabled, notification_prefs, account_role').eq('id', me.id).maybeSingle()
    return p as { first_name: string | null; last_name: string | null; show_talent: boolean | null; feature_on_site?: boolean | null; availability_status: string | null; email_alerts_enabled: boolean | null; notification_prefs: Partial<Prefs> | null; account_role: string } | null
  }, [me.id])

  // Membership: status line + the right action (Stripe portal to manage, or subscribe)
  const p = me.profile
  const endLabel = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
  const portal = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/plan/portal', { method: 'POST', headers: { Authorization: 'Bearer ' + (session?.access_token || '') } })
    const j = await res.json().catch(() => ({}))
    if (j.url) window.location.assign(j.url); else toast('Couldn’t open billing. Please try again.')
  }
  const native = isNativeApp()
  const kindName = PLANS[planFor(me.role)].name
  const membership: { sub: string; action?: string; onClick?: () => void; href?: string } =
    p?.is_demo ? { sub: 'Demo account · full access' }
    : p?.plan_status === 'trialing' ? { sub: kindName + ' · free trial until ' + endLabel(p.plan_period_end), action: native ? undefined : 'Manage', onClick: native ? undefined : portal }
    : p?.plan_status === 'active' ? { sub: kindName + ' · ' + price(PLANS[planFor(me.role)].pence) + '/month' + (p.plan_period_end ? ' · renews ' + endLabel(p.plan_period_end) : ''), action: native ? undefined : 'Manage', onClick: native ? undefined : portal }
    : p?.plan_status === 'past_due' ? { sub: 'Payment failed — update your card to keep access', action: native ? undefined : 'Fix', onClick: native ? undefined : portal }
    : p?.plan_grace_until && new Date(p.plan_grace_until) > new Date() ? { sub: 'Free access until ' + endLabel(p.plan_grace_until), action: native ? undefined : 'Subscribe', href: native ? undefined : '/plan' }
    : { sub: me.hasPlan ? 'Full access' : 'No active membership', action: native || me.hasPlan ? undefined : 'Subscribe', href: native || me.hasPlan ? undefined : '/plan' }

  if (loading || !data) return <><BackHeader title="Settings" /><PageLoading /></>
  const legacy = data.notification_prefs || {}
  const prefs: Prefs = { matches: true, applications: true, messages: true, cast_chats: legacy.messages ?? true, connections: true, marketing: false, ...legacy }

  const update = async (patch: Record<string, unknown>, ok = 'Saved') => {
    mutate(d => d && { ...d, ...patch } as typeof d)
    const { error } = await supabase.from('profiles').update(patch).eq('id', me.id)
    if (error) toast('Couldn’t save that'); else toast(ok)
  }
  const setPref = (k: keyof Prefs, v: boolean) => update({ notification_prefs: { ...prefs, [k]: v }, ...(k === 'matches' ? { email_alerts_enabled: v } : {}) })


  const section = (title: string) => <p className="mb-2 mt-6 text-xs font-semibold uppercase tracking-[0.08em] text-muted">{title}</p>
  const toggleRow = (title: string, sub: string | null, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1"><p className="text-[15px] font-medium">{title}</p>{sub && <p className="text-[13px] text-muted">{sub}</p>}</div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )

  return (
    <>
      <BackHeader title="Settings" />
      <div className="px-4 pb-12">
        {section('Account')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow icon={me.role === 'caster' ? 'megaphone' : 'sparkle'} title={me.role === 'caster' ? 'Casting account' : 'Performer account'} sub="Set when you join — contact support to change it" href={'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent('Change my account type')} chevron={false} />
          <ListRow icon="user" title="Name" sub={fullName(data)} href="/me/edit" />
          <ListRow icon="mail" title="Email" sub={me.email || '—'} chevron={false} />
          <ListRow icon="lock" title="Password" sub="Change your password" href="/settings/password" />
        </Card>

        {section('Profile & visibility')}
        <Card className="divide-y divide-line overflow-hidden">
          {me.role === 'performer' && toggleRow('Open to work', 'Show the green badge on your profile', data.availability_status === 'available', v => update({ availability_status: v ? 'available' : null }))}
          {me.role === 'performer' && toggleRow('Feature me on theident.me', 'Show your headshot and first name on our website', !!data.feature_on_site, v => update({ feature_on_site: v }, v ? 'You may appear on theident.me' : 'Removed from the website'))}
          {toggleRow('Public profile', data.show_talent === false ? 'Hidden from talent search and your public link' : 'Visible in talent search, at your public link and on Google', data.show_talent !== false, v => update({ show_talent: v }))}
        </Card>

        {section('Notifications')}
        <Card className="divide-y divide-line overflow-hidden">
          {push === 'ios-install' ? (
            <p className="px-4 py-3.5 text-[13px] text-muted">On iPhone, tap <span className="font-medium text-ink">Share → Add to Home Screen</span>, open The Ident from there, then turn notifications on here.</p>
          ) : push === 'unsupported' ? (
            <p className="px-4 py-3.5 text-[13px] text-muted">This browser can’t show notifications. You’ll still see everything in your inbox.</p>
          ) : push === 'denied' ? (
            <p className="px-4 py-3.5 text-[13px] text-muted">Notifications are blocked for The Ident in your browser or phone settings. Allow them there, then come back.</p>
          ) : toggleRow('Push notifications on this device', push === 'on' ? 'Alerts arrive even when the app is closed' : 'Get alerts for castings and messages', push === 'on', v => push !== 'busy' && push !== null && togglePush(v))}
        </Card>
        <p className="mb-2 mt-4 px-1 text-[13px] text-muted">Choose what alerts you — everything still appears in your inbox.</p>
        <Card className="divide-y divide-line overflow-hidden">
          {NOTIFICATION_TYPES.filter(t => me.role === 'performer' || t.key !== 'matches').map(t => (
            <div key={t.key}>{toggleRow(t.title, t.sub, prefs[t.key], v => setPref(t.key, v))}</div>
          ))}
          {toggleRow('Tips & news from The Ident', null, prefs.marketing, v => setPref('marketing', v))}
        </Card>

        {section('Membership')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow icon="star" title="Membership" sub={membership.sub} right={membership.action && <span className="text-sm font-medium text-green-ink">{membership.action}</span>} onClick={membership.onClick} href={membership.href} chevron={false} />
        </Card>

        {section('Privacy')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow icon="shield-check" title="Data & privacy" sub="Request a copy or deletion of your data" href={'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent('Data request')} />
          <ListRow icon="file" title="Privacy policy" href="/privacy" />
          <ListRow icon="file" title="Terms of use" href="/terms" />
        </Card>

        <p className="mt-6 text-center text-xs text-faint">The Ident · beta</p>
      </div>
    </>
  )
}
