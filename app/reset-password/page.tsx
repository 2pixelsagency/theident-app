'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, ClientOnly, Field } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'

type State = 'checking' | 'ready' | 'invalid' | 'done'

// Step 2 of a password reset: the recovery link lands here and the member sets a new password.
// Handles every shape Supabase can send: #access_token…&type=recovery (implicit flow, picked up by the
// client automatically), ?code=… (PKCE) and ?token_hash=…&type=recovery (custom email templates).
function ResetPassword() {
  const router = useRouter()
  const [state, setState] = useState<State>('checking')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let settled = false
    const ok = () => { if (!settled) { settled = true; setState('ready') } }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) ok()
    })
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const tokenHash = url.searchParams.get('token_hash')
    const code = url.searchParams.get('code')
    const linkError = hash.get('error_description') || url.searchParams.get('error_description')

    ;(async () => {
      if (linkError) { settled = true; setError(linkError.replace(/\+/g, ' ')); setState('invalid'); return }
      if (tokenHash) {
        const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (err) { settled = true; setState('invalid'); return }
      } else if (code) {
        const { error: err } = await supabase.auth.exchangeCodeForSession(code)
        if (err) { const { data } = await supabase.auth.getSession(); if (!data.session) { settled = true; setState('invalid'); return } }
      }
      const { data } = await supabase.auth.getSession()
      if (data.session) ok()
      else setTimeout(() => { if (!settled) { settled = true; setState('invalid') } }, 2500)
    })()
    return () => sub.subscription.unsubscribe()
  }, [])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Use at least 8 characters.'); return }
    if (password !== confirm) { setError('Those passwords don’t match.'); return }
    setBusy(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) {
      setError(/session|jwt|expired/i.test(err.message) ? 'This reset link has expired. Ask for a new one.' : /same/i.test(err.message) ? 'Choose a password you haven’t used before.' : err.message)
      return
    }
    // Clear the one-time tokens from the address bar
    window.history.replaceState(null, '', '/reset-password')
    setState('done')
  }

  if (state === 'checking') {
    return <div className="flex flex-1 items-center justify-center"><span className="size-10 animate-spin rounded-full border-2 border-line border-t-green" /></div>
  }

  if (state === 'invalid') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-amber-tint text-amber"><Icon name="alert" className="size-7" /></span>
        <h1 className="mt-5 text-[24px]">This link has expired</h1>
        <p className="mt-2 max-w-80 text-[15px] text-muted">{error || 'Reset links work once and only for a short time. Ask for a new one and open it on this device.'}</p>
        <Button className="mt-6" size="lg" href="/forgot-password">Send a new link</Button>
      </div>
    )
  }

  if (state === 'done') {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-tint text-green-ink"><Icon name="check" className="size-7" strokeWidth={2.2} /></span>
        <h1 className="mt-5 text-[24px]">Password updated</h1>
        <p className="mt-2 max-w-80 text-[15px] text-muted">You’re logged in with your new password.</p>
        <Button className="mt-6" size="lg" trailingIcon="arrow-right" onClick={() => router.replace('/home')}>Continue to RoleCall</Button>
      </div>
    )
  }

  return (
    <>
      <h1 className="mt-10 text-[26px]">Choose a new password</h1>
      <p className="mt-1.5 text-[15px] text-muted">Use at least 8 characters.</p>
      <form onSubmit={save} className="mt-6 space-y-4">
        <div className="relative">
          <Field label="New password" type={show ? 'text' : 'password'} autoComplete="new-password" required autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
          <button type="button" onClick={() => setShow(v => !v)} className="absolute bottom-3 right-3 text-xs font-medium text-muted">{show ? 'Hide' : 'Show'}</button>
        </div>
        <Field label="Confirm new password" type={show ? 'text' : 'password'} autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <Button type="submit" size="lg" full disabled={busy || !password || !confirm}>{busy ? 'Saving…' : 'Save new password'}</Button>
      </form>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <ClientOnly><ResetPassword /></ClientOnly>
      </div>
    </div>
  )
}
