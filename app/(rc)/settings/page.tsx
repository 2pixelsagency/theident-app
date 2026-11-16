'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackHeader, Card, ListRow, PageLoading, Segmented, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { signOutAndReset } from '@/lib/rc/onboarding'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'
import { NOTIFICATION_TYPES, disablePush, enablePush, pushState, type PrefKey, type PushState } from '@/lib/rc/push'

type Prefs = Record<PrefKey | 'marketing', boolean>

export default function SettingsPage() {
  const router = useRouter()
  const me = useMe()
  const [switching, setSwitching] = useState(false)
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
    const { data: p } = await supabase.from('profiles').select('first_name, last_name, show_talent, availability_status, email_alerts_enabled, notification_prefs, account_role').eq('id', me.id).maybeSingle()
    return p as { first_name: string | null; last_name: string | null; show_talent: boolean | null; availability_status: string | null; email_alerts_enabled: boolean | null; notification_prefs: Partial<Prefs> | null; account_role: string } | null
  }, [me.id])

  if (loading || !data) return <><BackHeader title="Settings" /><PageLoading /></>
  const legacy = data.notification_prefs || {}
  const prefs: Prefs = { matches: true, applications: true, messages: true, cast_chats: legacy.messages ?? true, connections: true, marketing: false, ...legacy }

  const update = async (patch: Record<string, unknown>, ok = 'Saved') => {
    mutate(d => d && { ...d, ...patch } as typeof d)
    const { error } = await supabase.from('profiles').update(patch).eq('id', me.id)
    if (error) toast('Couldn’t save that'); else toast(ok)
  }
  const setPref = (k: keyof Prefs, v: boolean) => update({ notification_prefs: { ...prefs, [k]: v }, ...(k === 'matches' ? { email_alerts_enabled: v } : {}) })

  const switchRole = async (role: 'performer' | 'caster') => {
    if (role === me.role) return
    setSwitching(true)
    const { error } = await supabase.from('profiles').update({ account_role: role }).eq('id', me.id)
    if (error) { setSwitching(false); toast('Couldn’t switch'); return }
    await me.refresh()
    setSwitching(false)
    toast(role === 'caster' ? 'Switched to casting' : 'Switched to performer')
    router.push('/home')
  }

  const logout = signOutAndReset

  const section = (title: string) => <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-[0.08em] text-muted">{title}</p>
  const toggleRow = (title: string, sub: string | null, checked: boolean, onChange: (v: boolean) => void) => (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1"><p className="text-[15px] font-medium">{title}</p>{sub && <p className="text-[13px] text-muted">{sub}</p>}</div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
  const soon = () => toast('Coming soon')

  return (
    <>
      <BackHeader title="Settings" />
      <div className="px-4 pb-12">
        {section('Using The Ident as')}
        <Segmented value={me.role} onChange={v => !switching && switchRole(v)} options={[{ value: 'performer', label: 'Performer' }, { value: 'caster', label: 'Casting / hiring' }]} />
        <p className="mt-2 text-xs text-muted">Switches your home screen and bottom nav. Your profile and history stay the same.</p>

        {section('Account')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow icon="user" title="Name" sub={fullName(data)} href="/me/edit" />
          <ListRow icon="mail" title="Email" sub={me.email || '—'} chevron={false} />
          <ListRow icon="lock" title="Password" sub="Change your password" href="/settings/password" />
        </Card>

        {section('Profile & visibility')}
        <Card className="divide-y divide-line overflow-hidden">
          {me.role === 'performer' && toggleRow('Open to work', 'Show the green badge on your profile', data.availability_status === 'available', v => update({ availability_status: v ? 'available' : null }))}
          {toggleRow('Public profile', data.show_talent === false ? 'Hidden from talent search and your public link' : 'Visible in talent search and at your public link', data.show_talent !== false, v => update({ show_talent: v }))}
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
        <p className="mb-2 mt-4 text-[13px] text-muted">Choose what alerts you. Everything still appears in your inbox.</p>
        <Card className="divide-y divide-line overflow-hidden">
          {NOTIFICATION_TYPES.filter(t => me.role === 'performer' || t.key !== 'matches').map(t => (
            <div key={t.key}>{toggleRow(t.title, t.sub, prefs[t.key], v => setPref(t.key, v))}</div>
          ))}
          {toggleRow('Tips & news from The Ident', null, prefs.marketing, v => setPref('marketing', v))}
        </Card>

        {section('Payments')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow icon="card" title="Payout method" sub="Coming soon" onClick={soon} />
          <ListRow icon="pound" title="Tax & expenses" href="/tax" />
          <ListRow title="Membership" sub="Free plan · upgrade for priority" right={<span className="text-sm font-medium text-green-ink">Upgrade</span>} href="/start/plan" chevron={false} />
        </Card>

        {section('Privacy & safety')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow title="Who can message me" right={<span className="text-sm font-medium">Connections</span>} chevron={false} />
          <ListRow title="Blocked accounts" onClick={soon} />
          <ListRow title="Data & privacy" sub="Request a copy or deletion of your data" href={'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent('Data request')} />
        </Card>

        {section('Preferences')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow title="Appearance" right={<span className="text-sm font-medium">Light</span>} chevron={false} />
          <ListRow title="Language" right={<span className="text-sm font-medium">English (UK)</span>} chevron={false} />
        </Card>

        <Card className="mt-6 divide-y divide-line overflow-hidden">
          <ListRow title="Help & support" href="/help" />
          <ListRow title="Log out" danger onClick={logout} chevron={false} />
        </Card>
        <p className="mt-6 text-center text-xs text-faint">The Ident · beta</p>
      </div>
    </>
  )
}
