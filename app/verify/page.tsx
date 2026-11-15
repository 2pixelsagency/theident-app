'use client'

import { useEffect, useState } from 'react'
import { AuthShell, AuthState } from '@/components/rc/auth'

// Landing page for the "Verify your email" link (/verify?token=…). Marks the email verified server-side.
function Verify() {
  const [token] = useState(() => new URLSearchParams(window.location.search).get('token'))
  const [status, setStatus] = useState<'loading' | 'ok' | 'expired' | 'invalid'>(token ? 'loading' : 'invalid')

  useEffect(() => {
    if (!token) return
    fetch('/api/verify-confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async r => {
        const d = await r.json().catch(() => ({}))
        setStatus(r.ok ? 'ok' : d.error === 'expired' ? 'expired' : 'invalid')
      })
      .catch(() => setStatus('invalid'))
  }, [token])

  useEffect(() => {
    if (status !== 'ok') return
    const t = setTimeout(() => window.location.replace('/home'), 2000)
    return () => clearTimeout(t)
  }, [status])

  if (status === 'loading') return <AuthState tone="loading" title="Verifying your email…" />
  if (status === 'ok') return <AuthState tone="success" icon="check" title="Email verified" body="You can now apply for roles and post jobs. Taking you to The Ident…" action={{ label: 'Open The Ident', href: '/home' }} />
  return (
    <AuthState tone="warning" icon="alert"
      title={status === 'expired' ? 'This link has expired' : 'This link doesn’t work'}
      body={status === 'expired' ? 'Verification links last 24 hours. Open The Ident and tap “Resend” for a fresh one.' : 'It may have been used already. If you’re still not verified, open The Ident and tap “Resend”.'}
      action={{ label: 'Open The Ident', href: '/home' }} />
  )
}

export default function VerifyPage() {
  return <AuthShell><Verify /></AuthShell>
}
