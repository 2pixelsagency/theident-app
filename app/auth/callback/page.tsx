'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthShell, AuthState } from '@/components/rc/auth'
import { supabase } from '@/lib/supabase'
import { safeNext } from '@/lib/rc/onboarding'

// Every emailed link (password reset, sign-up) and OAuth sign-in comes back here with ?code=… (PKCE).
// The Supabase client exchanges the code for a session on load; we wait for it, then go to ?next=.
function Callback() {
  const router = useRouter()
  const [failure, setFailure] = useState<{ title: string; body: string; next: string } | null>(null)

  useEffect(() => {
    const url = new URL(window.location.href)
    const hash = new URLSearchParams(url.hash.slice(1))
    const next = safeNext(url.searchParams.get('next'), '/home')
    const isReset = next.startsWith('/reset-password')
    const code = url.searchParams.get('error_code') || hash.get('error_code')
    const desc = url.searchParams.get('error_description') || hash.get('error_description')

    const fail = (reason?: string | null) => {
      const expired = /expired|invalid|otp/i.test((code || '') + ' ' + (reason || ''))
      setFailure({
        title: isReset ? 'This reset link has expired' : expired ? 'This link has expired' : 'We couldn’t sign you in',
        body: isReset
          ? 'Reset links work once, for an hour, and on the device that asked for them. Ask for a new one below.'
          : /verifier|flow state/i.test(reason || '')
            ? 'Open the link on the same phone or browser you started on, or start again here.'
            : (reason?.replace(/\+/g, ' ') || 'Please try again.'),
        next: isReset ? '/forgot-password' : '/welcome',
      })
    }

    if (code || desc) { fail(desc); return }

    let done = false
    const go = () => { if (!done) { done = true; router.replace(next) } }
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => { if (session) go() })
    // getSession() waits for the client to finish exchanging ?code= for a session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (session) go()
      else if (error) { done = true; fail(error.message) }
      else setTimeout(() => { if (!done) { done = true; fail('This link has already been used or has expired.') } }, 4000)
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  if (failure) {
    return <AuthState tone="warning" icon="alert" title={failure.title} body={failure.body}
      action={{ label: failure.next === '/forgot-password' ? 'Send a new link' : 'Back to log in', href: failure.next }} />
  }
  return <AuthState tone="loading" title="Signing you in…" />
}

export default function AuthCallbackPage() {
  return <AuthShell><Callback /></AuthShell>
}
