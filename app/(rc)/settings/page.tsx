'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BackHeader, Card, ListRow, PageLoading, Segmented, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

type Prefs = { matches: boolean; applications: boolean; messages: boolean; marketing: boolean }

export default function SettingsPage() {
  const router = useRouter()
  const me = useMe()
  const [switching, setSwitching] = useState(false)
  const { data, loading, mutate } = useAsync(async () => {
    const { data: p } = await supabase.from('profiles').select('first_name, last_name, show_talent, availability_status, email_alerts_enabled, notification_prefs, account_role').eq('id', me.id).maybeSingle()
    return p as { first_name: string | null; last_name: string | null; show_talent: boolean | null; availability_status: string | null; email_alerts_enabled: boolean | null; notification_prefs: Partial<Prefs> | null; account_role: string } | null
  }, [me.id])

  if (loading || !data) return <><BackHeader title="Settings" /><PageLoading /></>
  const prefs: Prefs = { matches: true, applications: true, messages: true, marketing: false, ...(data.notification_prefs || {}) }

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

  const resetPassword = async () => {
    if (!me.email) return
    const { error } = await supabase.auth.resetPasswordForEmail(me.email, { redirectTo: window.location.origin + '/reset-password' })
    toast(error ? 'Couldn’t send the email' : 'Password reset link sent to ' + me.email)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.replace('/welcome')
  }

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
        {section('Using RoleCall as')}
        <Segmented value={me.role} onChange={v => !switching && switchRole(v)} options={[{ value: 'performer', label: 'Performer' }, { value: 'caster', label: 'Casting / hiring' }]} />
        <p className="mt-2 text-xs text-muted">Switches your home screen and bottom nav. Your profile and history stay the same.</p>

        {section('Account')}
        <Card className="divide-y divide-line overflow-hidden">
          <ListRow icon="user" title="Name" sub={fullName(data)} href="/me/edit" />
          <ListRow icon="mail" title="Email" sub={me.email || '—'} chevron={false} />
          <ListRow icon="lock" title="Password & security" sub="Send a reset link" onClick={resetPassword} />
        </Card>

        {section('Profile & visibility')}
        <Card className="divide-y divide-line overflow-hidden">
          {me.role === 'performer' && toggleRow('Open to work', 'Show the green badge on your profile', data.availability_status === 'available', v => update({ availability_status: v ? 'available' : null }))}
          {toggleRow('Public profile', data.show_talent === false ? 'Hidden from talent search and your public link' : 'Visible in talent search and at your public link', data.show_talent !== false, v => update({ show_talent: v }))}
        </Card>

        {section('Notifications')}
        <Card className="divide-y divide-line overflow-hidden">
          {toggleRow('New roles matching me', null, prefs.matches, v => setPref('matches', v))}
          {toggleRow('Application updates', null, prefs.applications, v => setPref('applications', v))}
          {toggleRow('Messages & cast chats', null, prefs.messages, v => setPref('messages', v))}
          {toggleRow('Marketing & tips', null, prefs.marketing, v => setPref('marketing', v))}
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
        <p className="mt-6 text-center text-xs text-faint">RoleCall · beta</p>
      </div>
    </>
  )
}
