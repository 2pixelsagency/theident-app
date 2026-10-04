'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Field, Steps } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { applyDraft, readDraft } from '@/lib/rc/onboarding'

export default function CreateAccount() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState<'email' | 'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [name] = useState(() => readDraft()?.firstName ?? '')

  useEffect(() => {
    if (!readDraft()) router.replace('/start')
  }, [router])

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    setBusy('email')
    const d = readDraft()
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { first_name: d?.firstName ?? '', last_name: d?.lastName ?? '' },
        emailRedirectTo: window.location.origin + '/start/finish',
      },
    })
    if (err) { setError(err.message); setBusy(null); return }

    if (!data.session) {
      // Email confirmation is on: the draft stays on this device and is applied after they confirm
      setSentTo(email.trim())
      setBusy(null)
      return
    }

    const res = await applyDraft(data.session.user.id)
    fetch('/api/send-verification', { method: 'POST', headers: { Authorization: 'Bearer ' + data.session.access_token } }).catch(() => {})
    if (!res.ok) { setError('Your account was created but we couldn’t save your profile: ' + res.error); setBusy(null); return }
    router.push('/start/plan')
  }

  const oauth = async (provider: 'apple' | 'google') => {
    setBusy(provider)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/start/finish' } })
    if (err) { setError('Couldn’t start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Please try again.'); setBusy(null) }
  }

  if (sentTo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-tint text-green-ink"><Icon name="mail" className="size-7" /></span>
        <h1 className="mt-5 text-[24px]">Check your inbox</h1>
        <p className="mt-2 max-w-80 text-[15px] text-muted">We’ve sent a confirmation link to <span className="text-ink">{sentTo}</span>. Open it on this device and we’ll finish setting up your profile.</p>
        <button type="button" onClick={() => setSentTo(null)} className="mt-6 text-sm font-medium text-green-ink">Use a different email</button>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 py-2">
        <button type="button" aria-label="Back" onClick={() => router.push('/start/profile')} className="-ml-1 inline-flex size-9 items-center justify-center rounded-full hover:bg-chip">
          <Icon name="chevron-left" className="size-6" />
        </button>
        <Steps step={3} total={3} />
      </div>

      <h1 className="mt-4 text-[26px]">{name ? 'Nearly there, ' + name : 'Create your account'}</h1>
      <p className="mt-1.5 text-[15px] text-muted">Save your profile so you can apply, post and get booked.</p>

      <div className="mt-6 flex gap-3">
        <Button variant="outline" className="flex-1" icon="apple" onClick={() => oauth('apple')} disabled={busy !== null}>{busy === 'apple' ? 'Opening…' : 'Apple'}</Button>
        <Button variant="outline" className="flex-1" icon="google" onClick={() => oauth('google')} disabled={busy !== null}>{busy === 'google' ? 'Opening…' : 'Google'}</Button>
      </div>

      <div className="my-5 flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" />or with email<span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={signUp} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        <div className="relative">
          <Field label="Password" type={showPw ? 'text' : 'password'} autoComplete="new-password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" />
          <button type="button" onClick={() => setShowPw(v => !v)} className="absolute bottom-3 right-3 text-xs font-medium text-muted">{showPw ? 'Hide' : 'Show'}</button>
        </div>
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <Button type="submit" size="lg" full trailingIcon="arrow-right" disabled={busy !== null}>{busy === 'email' ? 'Creating account…' : 'Create account'}</Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-muted">Already have an account? <Link href="/login" className="font-medium text-green-ink">Log in</Link></p>
      <p className="mt-auto pt-8 text-center text-xs text-faint">By continuing you agree to our Terms &amp; Privacy Policy.</p>
    </>
  )
}
