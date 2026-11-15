'use client'

import { useState } from 'react'
import Icon from './Icon'
import { Button, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'

// Email verification soft gate: browse freely, verify before applying or posting.

export function useResendVerification() {
  const [busy, setBusy] = useState(false)
  const resend = async () => {
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setBusy(false); return }
    const res = await fetch('/api/send-verification', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token } }).catch(() => null)
    setBusy(false)
    if (!res) { toast('Couldn’t send — check your connection'); return }
    const body = await res.json().catch(() => ({}))
    if (res.status === 429) toast('Please wait a few minutes before asking for another email')
    else if (body.verified_by || body.already) toast('Your email is already verified')
    else if (res.ok) toast('Sent — check your inbox')
    else toast('Couldn’t send the email — try again')
  }
  return { resend, busy }
}

// Reminder card on the Home dashboard
export function VerifyBanner() {
  const { profile, email } = useMe()
  const { resend, busy } = useResendVerification()
  if (!profile || profile.email_verified) return null
  return (
    <div role="status" className="mx-4 mt-3 flex items-center gap-2.5 rounded-2xl bg-butter px-4 py-3 text-[13px] text-ink">
      <Icon name="mail" className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">Verify <span className="font-semibold">{email}</span> to apply and post.</span>
      <button type="button" onClick={resend} disabled={busy} className="shrink-0 rounded-md font-semibold underline focus-visible:outline-2 focus-visible:outline-forest">{busy ? 'Sending…' : 'Resend'}</button>
    </div>
  )
}

// Full-screen gate shown instead of Apply / Post a role until the email is verified
export function VerifyGate({ action }: { action: 'apply' | 'post' }) {
  const { email, refresh } = useMe()
  const { resend, busy } = useResendVerification()
  const [checking, setChecking] = useState(false)
  const check = async () => {
    setChecking(true)
    await refresh()
    setChecking(false)
    toast('Still waiting for you to tap the link in the email')
  }
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-butter text-ink"><Icon name="mail" className="size-7" /></span>
      <h1 className="mt-5 text-[24px]">Verify your email to {action === 'apply' ? 'apply' : 'post a role'}</h1>
      <p className="mt-2 max-w-80 text-[15px] leading-relaxed text-muted">We sent a link to <span className="font-medium text-ink">{email}</span>. Tap it, then come back here. You can keep browsing in the meantime.</p>
      <Button className="mt-6" size="lg" onClick={resend} disabled={busy}>{busy ? 'Sending…' : 'Resend the email'}</Button>
      <button type="button" onClick={check} disabled={checking} className="mt-4 text-sm font-semibold text-green-ink">{checking ? 'Checking…' : 'I’ve verified — continue'}</button>
    </div>
  )
}
