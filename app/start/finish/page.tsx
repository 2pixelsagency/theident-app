'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { applyDraft, readDraft } from '@/lib/rc/onboarding'

// Landing page after Apple/Google sign-in or the email confirmation link.
export default function FinishSignup() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let done = false
    const finish = async (uid: string) => {
      if (done) return
      done = true
      const hadDraft = !!readDraft()
      const res = await applyDraft(uid)
      if (!res.ok) { setError(res.error || 'Something went wrong'); return }
      router.replace(hadDraft ? '/start/plan' : '/home')
    }
    // The session arrives from the URL; wait for it rather than redirecting too early
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) finish(session.user.id) })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session.user.id)
      else setTimeout(() => { if (!done) router.replace('/welcome') }, 4000)
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      {error ? (
        <>
          <p className="text-[15px]">We couldn’t finish setting up your profile.</p>
          <p className="mt-1 text-sm text-muted">{error}</p>
          <Button className="mt-5" variant="dark" href="/home">Continue to the app</Button>
        </>
      ) : (
        <>
          <span className="size-10 animate-spin rounded-full border-2 border-line border-t-green" />
          <p className="mt-4 text-[15px] text-muted">Setting up your profile…</p>
        </>
      )}
    </div>
  )
}
