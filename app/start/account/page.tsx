'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AuthBack, AuthState, AuthTitle, FormMessage, PasswordField, passwordIssues } from '@/components/rc/auth'
import { Button, Field } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { authRedirect } from '@/lib/rc/authRedirect'
import { readDraft, switchSide } from '@/lib/rc/onboarding'

// Sign up, step 0: create the account for the side picked on the entry screen (never asked again),
// then straight into the onboarding questions at question 1. Email verification runs in parallel.
export default function CreateAccount() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'email' | 'apple' | 'google' | null>(null)
  const [error, setError] = useState<React.ReactNode | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [role] = useState(() => readDraft()?.role ?? 'performer')
  const side = role === 'caster' ? 'cast' : 'perform'

  // No side chosen (typed URL) → back to the entry screen to pick one
  // Already signed in → the account exists, carry on with the questions
  useEffect(() => {
    if (!readDraft()) { router.replace('/welcome'); return }
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/start/profile') })
  }, [router])

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    const issues = passwordIssues(password)
    if (issues.length) { setError('Your password needs ' + issues.join(', ') + '.'); return }
    setBusy('email')
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: authRedirect('/start/profile') },
    })
    if (err) {
      setBusy(null)
      if (/already registered|already exists/i.test(err.message) || err.code === 'user_already_exists') {
        setError(<>There’s already an account with this email. <Link href={'/welcome?side=' + side} className="font-semibold underline">Log in</Link> or <Link href={'/forgot-password?side=' + side + '&email=' + encodeURIComponent(email.trim())} className="font-semibold underline">reset your password</Link>.</>)
      } else if (err.status === 429) setError('Too many sign-up attempts — please wait a minute and try again.')
      else if (/weak|password/i.test(err.message)) setError('That password is too easy to guess — try a longer one.')
      else setError('We couldn’t create your account: ' + err.message)
      return
    }
    // Supabase hides "already exists" when confirmations are on: an existing user comes back with no identities
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setBusy(null)
      setError(<>There’s already an account with this email. <Link href={'/welcome?side=' + side} className="font-semibold underline">Log in</Link> instead.</>)
      return
    }
    if (!data.session) { setBusy(null); setSentTo(email.trim()); return } // confirm-email mode (if switched on in Supabase)

    await switchSide(data.session.user.id, role)
    fetch('/api/send-verification', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token } }).catch(() => {})
    router.push('/start/profile')
  }

  const oauth = async (provider: 'apple' | 'google') => {
    setBusy(provider)
    setError(null)
    try { sessionStorage.setItem('rc-side', role) } catch { /* storage blocked */ }
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: authRedirect('/start/finish') } })
    if (err) { setError('Couldn’t start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Please try again.'); setBusy(null) }
  }

  if (sentTo) {
    return <AuthState tone="success" icon="mail" title="Check your email"
      body={<>We’ve sent a link to <span className="font-medium text-ink">{sentTo}</span>. Open it on this device to carry on setting up your profile.</>}
      secondary={<button type="button" onClick={() => setSentTo(null)} className="text-sm font-semibold text-green-ink">Use a different email</button>} />
  }

  return (
    <>
      <AuthBack href={'/welcome?side=' + side} />
      <span className="mx-auto mt-2 inline-flex w-fit items-center rounded-full bg-lime px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-ink">
        {role === 'caster' ? 'Casting' : 'Performer'}
      </span>
      <AuthTitle title={role === 'caster' ? 'Create your casting account' : 'Create your account'} sub="Then a few quick questions to set up your profile." />

      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" icon="apple" onClick={() => oauth('apple')} disabled={busy !== null}>{busy === 'apple' ? 'Opening…' : 'Apple'}</Button>
        <Button variant="outline" className="flex-1" icon="google" onClick={() => oauth('google')} disabled={busy !== null}>{busy === 'google' ? 'Opening…' : 'Google'}</Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" /></div>

      <form onSubmit={signUp} noValidate className="space-y-4">
        <Field label="Email" type="email" inputMode="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setError(null) }} placeholder="you@example.com" />
        <PasswordField label="Password" autoComplete="new-password" value={password} onChange={v => { setPassword(v); setError(null) }} showMeter placeholder="8+ characters, a letter and a number" />
        {error && <FormMessage>{error}</FormMessage>}
        <Button type="submit" size="lg" full trailingIcon="arrow-right" disabled={busy !== null}>{busy === 'email' ? 'Creating account…' : 'Create account'}</Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-muted">Already have an account? <Link href={'/welcome?side=' + side} className="font-semibold text-green-ink">Log in</Link></p>
      <p className="mt-auto pt-8 text-center text-xs text-muted">By continuing you agree to our Terms &amp; Privacy Policy. We’ll email you once to verify your address.</p>
    </>
  )
}
