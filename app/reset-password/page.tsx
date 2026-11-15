'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell, AuthState, AuthTitle, FormMessage, PasswordField, passwordIssues } from '@/components/rc/auth'
import { Button } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { dashboardFor, isRole } from '@/lib/rc/onboarding'

type State = 'checking' | 'ready' | 'invalid' | 'done'

// Step 2 of a reset. The emailed link goes through /auth/callback (PKCE code → session) and lands here
// signed in. Older template links with ?token_hash=…&type=recovery are verified here directly.
function SetNewPassword() {
  const router = useRouter()
  const [state, setState] = useState<State>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [home, setHome] = useState('/home')

  useEffect(() => {
    const url = new URL(window.location.href)
    const tokenHash = url.searchParams.get('token_hash')
    ;(async () => {
      if (tokenHash) {
        const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        window.history.replaceState(null, '', '/reset-password')
        if (err) { setState('invalid'); return }
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setState('invalid'); return }
      const { data: p } = await supabase.from('profiles').select('account_role').eq('id', session.user.id).maybeSingle()
      if (isRole(p?.account_role)) setHome(dashboardFor(p.account_role))
      setState('ready')
    })()
  }, [])

  // After success: brief confirmation, then straight into the app (they're already signed in)
  useEffect(() => {
    if (state !== 'done') return
    const t = setTimeout(() => router.replace(home), 1800)
    return () => clearTimeout(t)
  }, [state, home, router])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const issues = passwordIssues(password)
    if (issues.length) { setError('Your password needs ' + issues.join(', ') + '.'); return }
    if (password !== confirm) { setError('The two passwords don’t match.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) {
      setBusy(false)
      setError(err.status === 429 ? 'Too many attempts — wait a minute and try again.'
        : /different from the old|same/i.test(err.message) ? 'Choose a password you haven’t used for this account before.'
        : /weak/i.test(err.message) ? 'That password is too easy to guess — try a longer one.'
        : /session|jwt|expired|not authenticated/i.test(err.message) ? 'This reset link has expired. Ask for a new one.'
        : err.message)
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (session) fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify({ type: 'password_changed' }) }).catch(() => {})
    setState('done')
  }

  if (state === 'checking') return <AuthState tone="loading" title="Opening your reset link…" />
  if (state === 'invalid') {
    return <AuthState tone="warning" icon="alert" title="This reset link has expired"
      body="Reset links work once, for an hour, and on the device that asked for them. Ask for a new one and open it here."
      action={{ label: 'Send a new link', href: '/forgot-password' }} />
  }
  if (state === 'done') {
    return <AuthState tone="success" icon="check" title="Password updated" body="You’re signed in with your new password. Taking you to The Ident…"
      action={{ label: 'Continue', onClick: () => router.replace(home) }} />
  }

  return (
    <>
      <AuthTitle title="Set a new password" sub="Make it at least 8 characters, with a letter and a number." />
      <form onSubmit={save} noValidate className="mt-6 space-y-4">
        <PasswordField label="New password" autoComplete="new-password" value={password} onChange={v => { setPassword(v); setError(null) }} showMeter autoFocus />
        <PasswordField label="Confirm new password" autoComplete="new-password" value={confirm} onChange={v => { setConfirm(v); setError(null) }} />
        {error && <FormMessage>{error}</FormMessage>}
        <Button type="submit" size="lg" full disabled={busy || !password || !confirm}>{busy ? 'Saving…' : 'Save and sign in'}</Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return <AuthShell><SetNewPassword /></AuthShell>
}
