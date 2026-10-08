'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, ClientOnly, Field } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'

// Step 1 of a password reset: email in, Supabase sends a recovery link to /reset-password.
function ForgotPassword() {
  const router = useRouter()
  const [side] = useState(() => (new URLSearchParams(window.location.search).get('side') === 'cast' ? 'cast' : 'perform'))
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const back = () => router.push('/welcome?side=' + side)

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    // Uses the public (anon) client only; the reset page must be in Supabase's Redirect URLs allow-list
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin + '/reset-password' })
    setBusy(false)
    if (err) { setError(err.status === 429 ? 'Too many requests — wait a minute and try again.' : err.message); return }
    setSentTo(email.trim())
  }

  if (sentTo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-green-tint text-green-ink"><Icon name="mail" className="size-7" /></span>
        <h1 className="mt-5 text-[24px]">Check your inbox</h1>
        <p className="mt-2 max-w-80 text-[15px] text-muted">If <span className="text-ink">{sentTo}</span> has a RoleCall account, we’ve sent a link to choose a new password. It can take a minute — check spam too.</p>
        <button type="button" onClick={() => setSentTo(null)} className="mt-6 text-sm font-medium text-green-ink">Use a different email</button>
        <button type="button" onClick={back} className="mt-3 text-sm font-medium text-muted">Back to log in</button>
      </div>
    )
  }

  return (
    <>
      <div className="py-2">
        <button type="button" aria-label="Back" onClick={back} className="-ml-1.5 inline-flex h-10 w-8 items-center justify-start text-ink active:opacity-50">
          <Icon name="chevron-left" className="size-6" />
        </button>
      </div>
      <h1 className="mt-6 text-[26px]">Reset your password</h1>
      <p className="mt-1.5 text-[15px] text-muted">Enter the email you use for RoleCall and we’ll send you a link to choose a new one.</p>
      <form onSubmit={send} className="mt-6 space-y-4">
        <Field label="Email" type="email" autoComplete="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <Button type="submit" size="lg" full disabled={busy || !email}>{busy ? 'Sending…' : 'Send reset link'}</Button>
      </form>
    </>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <ClientOnly><ForgotPassword /></ClientOnly>
      </div>
    </div>
  )
}
