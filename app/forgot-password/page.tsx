'use client'

import { useState } from 'react'
import { AuthBack, AuthShell, AuthState, AuthTitle, FormMessage } from '@/components/rc/auth'
import { Button, Field } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { authRedirect } from '@/lib/rc/authRedirect'

// Step 1 of a reset: email in → Supabase emails a link → /auth/callback → Set new password.
function ForgotPassword() {
  const [side] = useState(() => (new URLSearchParams(window.location.search).get('side') === 'cast' ? 'cast' : 'perform'))
  const [email, setEmail] = useState(() => new URLSearchParams(window.location.search).get('email') || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect('/reset-password') })
    setBusy(false)
    // Unknown emails get the same confirmation as real ones, so this never reveals who has an account
    if (err && err.status === 429) { setError('Too many requests — please wait a minute before asking again.'); return }
    if (err && !/not found|no user/i.test(err.message)) { setError('We couldn’t send the email just now. Check your connection and try again.'); return }
    setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <AuthState tone="success" icon="mail" title="Check your email"
        body={<>If <span className="font-medium text-ink">{sentTo}</span> has an account, we’ve sent a link to choose a new password. It works for an hour — open it on this device. Check spam if it doesn’t arrive.</>}
        action={{ label: 'Back to log in', href: '/welcome?side=' + side }}
        secondary={<button type="button" onClick={() => send()} disabled={busy} className="text-sm font-semibold text-green-ink">{busy ? 'Sending…' : 'Resend the email'}</button>} />
    )
  }

  return (
    <>
      <AuthTitle title="Forgot your password?" sub="Enter the email you use for The Ident and we’ll send you a link to choose a new one." />
      <form onSubmit={send} noValidate className="mt-6 space-y-4">
        <Field label="Email" type="email" inputMode="email" autoComplete="email" autoFocus value={email} onChange={e => { setEmail(e.target.value); setError(null) }} placeholder="you@example.com" />
        {error && <FormMessage>{error}</FormMessage>}
        <Button type="submit" size="lg" full disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</Button>
      </form>
      <div className="mt-5"><AuthBack href={'/welcome?side=' + side} /></div>
    </>
  )
}

export default function ForgotPasswordPage() {
  return <AuthShell><ForgotPassword /></AuthShell>
}
