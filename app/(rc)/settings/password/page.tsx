'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthState, FormMessage, PasswordField, passwordIssues } from '@/components/rc/auth'
import { BackHeader, Button, PageLoading } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { authRedirect } from '@/lib/rc/authRedirect'

// Settings → Change password. Supabase's updateUser doesn't check the current password, so we
// re-authenticate with it first. Google/Apple-only accounts set a password via the reset email instead.
export default function ChangePasswordPage() {
  const router = useRouter()
  const me = useMe()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  const { data: hasPassword, loading } = useAsync(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [user?.app_metadata?.provider as string]
    return providers.includes('email')
  }, [me.id])

  if (loading) return <><BackHeader title="Change password" back="/settings" /><PageLoading /></>

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!current) { setError('Enter your current password.'); return }
    const issues = passwordIssues(password)
    if (issues.length) { setError('Your new password needs ' + issues.join(', ') + '.'); return }
    if (password !== confirm) { setError('The two new passwords don’t match.'); return }
    if (password === current) { setError('Choose a new password that’s different from your current one.'); return }
    setBusy(true)
    const { error: authErr } = await supabase.auth.signInWithPassword({ email: me.email!, password: current })
    if (authErr) {
      setBusy(false)
      setError(authErr.status === 429 ? 'Too many attempts — wait a minute and try again.' : 'Your current password isn’t right. Try again, or reset it by email.')
      return
    }
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setBusy(false)
      setError(/weak/i.test(err.message) ? 'That password is too easy to guess — try a longer one.' : err.message)
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ type: 'password_changed' }) }).catch(() => {})
    setBusy(false)
    setDone(true)
  }

  const sendSetLink = async () => {
    setBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(me.email!, { redirectTo: authRedirect('/reset-password') })
    setBusy(false)
    if (err) { setError(err.status === 429 ? 'Too many requests — wait a minute and try again.' : 'We couldn’t send the email. Try again.'); return }
    setLinkSent(true)
  }

  return (
    <>
      <BackHeader title="Change password" back="/settings" />
      <div className="flex min-h-[70dvh] flex-col px-4 pb-10">
        {done ? (
          <AuthState tone="success" icon="check" title="Password changed" body={<>You’re still signed in. We’ve emailed <span className="font-medium text-ink">{me.email}</span> to confirm the change.</>}
            action={{ label: 'Back to settings', onClick: () => router.replace('/settings') }} />
        ) : !hasPassword ? (
          linkSent
            ? <AuthState tone="success" icon="mail" title="Check your email" body={<>We’ve sent a link to <span className="font-medium text-ink">{me.email}</span> to set a password for your account.</>} />
            : (
              <div className="pt-4">
                <p className="text-[15px] leading-relaxed text-muted">You sign in with Google or Apple, so there’s no password on this account yet. We can email you a link to set one.</p>
                {error && <div className="mt-4"><FormMessage>{error}</FormMessage></div>}
                <Button className="mt-6" size="lg" full onClick={sendSetLink} disabled={busy}>{busy ? 'Sending…' : 'Email me a link'}</Button>
              </div>
            )
        ) : (
          <form onSubmit={save} noValidate className="space-y-4 pt-4">
            <PasswordField label="Current password" autoComplete="current-password" value={current} onChange={v => { setCurrent(v); setError(null) }} autoFocus />
            <PasswordField label="New password" autoComplete="new-password" value={password} onChange={v => { setPassword(v); setError(null) }} showMeter />
            <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={v => { setConfirm(v); setError(null) }} />
            {error && <FormMessage>{error}</FormMessage>}
            <Button type="submit" size="lg" full disabled={busy || !current || !password || !confirm}>{busy ? 'Saving…' : 'Change password'}</Button>
            <button type="button" onClick={() => router.push('/forgot-password?email=' + encodeURIComponent(me.email || ''))} className="w-full text-center text-sm font-semibold text-green-ink">Forgotten your current password?</button>
          </form>
        )}
      </div>
    </>
  )
}
