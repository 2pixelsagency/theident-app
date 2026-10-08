'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, ClientOnly, Field, Toaster } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { safeNext } from '@/lib/rc/onboarding'

type Mode = 'signin' | 'forgot' | 'reset'

// Forgot password (/login?forgot=1) and the reset link (/login?reset=1). Logging in itself happens on the
// photo entry screen (/welcome), so any other visit to /login is sent there, on the right Perform/Cast side.
function LoginInner() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>(() => { const q = new URLSearchParams(window.location.search); return q.get('reset') ? 'reset' : q.get('forgot') ? 'forgot' : 'signin' })
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  // Perform / Cast on the entry screen pass where to land after logging in
  const [next] = useState(() => safeNext(new URLSearchParams(window.location.search).get('next')))

  const entry = '/welcome?side=' + (next === '/postings' || new URLSearchParams(window.location.search).get('side') === 'cast' ? 'cast' : 'perform')

  // Plain log in lives on the entry screen
  useEffect(() => { if (mode === 'signin') router.replace(entry) }, [mode, router, entry])

  // Already logged in → straight into the app (but not while setting a new password)
  useEffect(() => {
    if (mode === 'reset') return
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace(next) })
  }, [mode, router, next])

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/login?reset=1' })
    setBusy(false)
    if (err) { setError(err.message); return }
    setSentTo(email.trim())
  }

  const setNewPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message.includes('session') ? 'This reset link has expired. Ask for a new one.' : err.message); setBusy(false); return }
    router.replace('/home')
  }


  const pwField = (label: string, autoComplete: string, placeholder: string) => (
    <div className="relative">
      <Field label={label} type={showPw ? 'text' : 'password'} autoComplete={autoComplete} required value={password} onChange={e => setPassword(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={() => setShowPw(v => !v)} className="absolute bottom-3 right-3 text-xs font-medium text-muted">{showPw ? 'Hide' : 'Show'}</button>
    </div>
  )

  if (mode === 'signin') return null // redirecting to the entry screen

  if (sentTo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-tint text-green-ink"><Icon name="mail" className="size-7" /></span>
        <h1 className="mt-5 text-[24px]">Check your inbox</h1>
        <p className="mt-2 max-w-80 text-[15px] text-muted">We’ve sent a link to <span className="text-ink">{sentTo}</span>. Open it to choose a new password.</p>
        <button type="button" onClick={() => router.push(entry)} className="mt-6 text-sm font-medium text-green-ink">Back to log in</button>
      </div>
    )
  }

  return (
    <>
      {mode !== 'reset' && (
        <div className="py-2">
          <button type="button" aria-label="Back" onClick={() => router.push(entry)} className="-ml-1.5 inline-flex h-10 w-8 items-center justify-start text-ink active:opacity-50">
            <Icon name="chevron-left" className="size-6" />
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg bg-green"><Icon name="check" className="size-5 text-white" strokeWidth={2} /></span>
        <span className="font-display text-[22px] leading-none tracking-[-0.02em]">RoleCall</span>
      </div>

      {mode === 'forgot' && (
        <>
          <h1 className="mt-6 text-[26px]">Reset your password</h1>
          <p className="mt-1.5 text-[15px] text-muted">Enter your email and we’ll send you a link to choose a new one.</p>
          <form onSubmit={sendReset} className="mt-6 space-y-4">
            <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            {error && <p role="alert" className="text-sm text-red">{error}</p>}
            <Button type="submit" size="lg" full disabled={busy || !email}>{busy ? 'Sending…' : 'Send reset link'}</Button>
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
            <Button type="submit" size="lg" full disabled={busy || !password}>{busy ? 'Saving…' : 'Save and continue'}</Button>
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
