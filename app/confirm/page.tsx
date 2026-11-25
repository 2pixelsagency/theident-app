'use client'

import { useEffect, useState } from 'react'
import { AuthShell, AuthState } from '@/components/rc/auth'

// Landing page for verification emails (/confirm?token=…): a school confirming a graduate's email, or an
// agent confirming they represent a performer. The person clicking is often not a member, so no login needed.
type Res = { status?: string; kind?: string; method?: string; error?: string }

function Confirm() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [res, setRes] = useState<Res | null>(token ? null : { error: 'invalid' })

  useEffect(() => {
    if (!token) return
    fetch('/api/verification/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async r => setRes(await r.json().catch(() => ({ error: 'invalid' }))))
      .catch(() => setRes({ error: 'invalid' }))
  }, [token])

  if (!res) return <AuthState tone="loading" title="Confirming…" />
  if (res.error) return (
    <AuthState tone="warning" icon="alert" title={res.error === 'expired' ? 'This link has expired' : 'This link doesn’t work'}
      body={res.error === 'expired' ? 'Confirmation links last 7 days. Ask for a new one from Customise profile → Verification.' : 'It may have been used already.'}
      action={{ label: 'Open The Ident', href: '/home' }} />
  )
  const agent = res.method === 'agent'
  if (res.status === 'approved') return (
    <AuthState tone="success" icon="check" title="Thank you — confirmed"
      body={agent ? 'You’ve confirmed you represent them. Their profile now shows they’re a verified professional.' : 'Your school email is confirmed. The graduate price now applies to your membership.'}
      action={{ label: 'Open The Ident', href: '/home' }} />
  )
  return (
    <AuthState tone="success" icon="check" title="Thanks — we’ve got it"
      body={agent ? 'Thanks for confirming. Our team will finish the check shortly.' : 'Your email is confirmed. Our team will finish checking your graduation shortly.'}
      action={{ label: 'Open The Ident', href: '/home' }} />
  )
}

export default function ConfirmPage() {
  return <AuthShell><Confirm /></AuthShell>
}
