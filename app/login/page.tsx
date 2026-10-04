'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, ClientOnly, Field, Toaster } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'

type Mode = 'signin' | 'forgot' | 'reset'

// Branded log in. Also handles "forgot password" and the reset link (/login?reset=1).
function LoginInner() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(window.location.search).get('reset') ? 'reset' : 'signin'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState<'email' | 'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  // Already logged in → straight into the app (but not while setting a new password)
  useEffect(() => {
    if (mode === 'reset') return
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/home') })
  }, [mode, router])

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy('email')
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err) {
      setError(err.message === 'Invalid login credentials' ? 'That email and password don’t match. Try again or reset your password.' : err.message)
      setBusy(null)
      return
    }
    router.replace('/home')
  }

  const oauth = async (provider: 'apple' | 'google') => {
    setBusy(provider)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/start/finish' } })
    if (err) { setError('Couldn’t start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Please try again.'); setBusy(null) }
  }

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy('email')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/login?reset=1' })
    setBusy(null)
    if (err) { setError(err.message); return }
    setSentTo(email.trim())
  }

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    setBusy('email')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message.includes('session') ? 'This reset link has expired. Ask for a new one.' : err.message); setBusy(null); return }
    router.replace('/home')
  }

  const back = () => {
    if (mode === 'forgot') { setMode('signin'); setError(null); setSentTo(null); return }
    router.push('/welcome')
  }

  const pwField = (label: string, autoComplete: string, placeholder: string) => (
    <div className="relative">
      <Field label={label} type={showPw ? 'text' : 'password'} autoComplete={autoComplete} required value={password} onChange={e => setPassword(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute bottom-3 right-3 text-xs font-medium text-muted">{showPw ? 'Hide' : 'Show'}</button>
    </div>
  )

  if (sentTo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-tint text-green-ink"><Icon name="mail" className="size-7" /></span>
        <h1 className="mt-5 text-[24px]">Check your inbox</h1>
        <p className="mt-2 max-w-80 text-[15px] text-muted">We’ve sent a link to <span className="text-ink">{sentTo}</span>. Open it to choose a new password.</p>
        <button type="button" onClick={() => { setSentTo(null); setMode('signin') }} className="mt-6 text-sm font-medium text-green-ink">Back to log in</button>
      </div>
    )
  }

  return (
    <>
      {mode !== 'reset' && (
        <div className="py-2">
          <button type="button" aria-label="Back" onClick={back} className="-ml-1.5 inline-flex h-10 w-8 items-center justify-start text-ink active:opacity-50">
            <Icon name="chevron-left" className="size-6" />
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-green"><Icon name="check" className="size-5 text-white" strokeWidth={2} /></span>
        <span className="font-display text-[22px] leading-none tracking-[-0.02em]">RoleCall</span>
      </div>

      {mode === 'signin' && (
        <>
          <h1 className="mt-6 text-[26px]">Welcome back</h1>
          <p className="mt-1.5 text-[15px] text-muted">Log in to pick up where you left off.</p>

          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="flex-1" icon="apple" onClick={() => oauth('apple')} disabled={busy !== null}>{busy === 'apple' ? 'Opening…' : 'Apple'}</Button>
            <Button variant="outline" className="flex-1" icon="google" onClick={() => oauth('google')} disabled={busy !== null}>{busy === 'google' ? 'Opening…' : 'Google'}</Button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" />
          </div>

          <form onSubmit={signIn} className="space-y-4">
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            {pwField('Password', 'current-password', 'Your password')}
            <div className="-mt-1 text-right">
              <button type="button" onClick={() => { setMode('forgot'); setError(null) }} className="text-sm font-medium text-green-ink">Forgot password?</button>
            </div>
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
            <Button type="submit" size="lg" full trailingIcon="arrow-right" disabled={busy !== null || !email || !password}>{busy === 'email' ? 'Logging in…' : 'Log in'}</Button>
          </form>

          <p className="mt-6 text-center text-[15px] text-muted">New to RoleCall? <Link href="/start" className="font-medium text-green-ink">Create an account</Link></p>
        </>
      )}

      {mode === 'forgot' && (
        <>
          <h1 className="mt-6 text-[26px]">Reset your password</h1>
          <p className="mt-1.5 text-[15px] text-muted">Enter your email and we’ll send you a link to choose a new one.</p>
          <form onSubmit={sendReset} className="mt-6 space-y-4">
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
            <Button type="submit" size="lg" full disabled={busy !== null || !email}>{busy ? 'Sending…' : 'Send reset link'}</Button>
          </form>
        </>
      )}

      {mode === 'reset' && (
        <>
          <h1 className="mt-6 text-[26px]">Choose a new password</h1>
          <p className="mt-1.5 text-[15px] text-muted">Use at least 8 characters.</p>
          <form onSubmit={setNewPassword} className="mt-6 space-y-4">
            {pwField('New password', 'new-password', 'At least 8 characters')}
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
            <Button type="submit" size="lg" full disabled={busy !== null || !password}>{busy ? 'Saving…' : 'Save and continue'}</Button>
          </form>
          <button type="button" onClick={() => { setMode('forgot'); setError(null); setPassword('') }} className="mt-5 text-center text-sm font-medium text-green-ink">Link expired? Send a new one</button>
        </>
      )}

      <p className="mt-auto pt-8 text-center text-xs text-faint">By continuing you agree to our Terms &amp; Privacy Policy.</p>
    </>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <ClientOnly><LoginInner /></ClientOnly>
      </div>
      <Toaster />
    </div>
  )
}
