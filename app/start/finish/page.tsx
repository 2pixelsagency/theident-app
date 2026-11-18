'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthState } from '@/components/rc/auth'
import { supabase } from '@/lib/supabase'
import { dashboardFor, emptyDraft, isRole, readDraft, switchSide, writeDraft, type Role } from '@/lib/rc/onboarding'

// Where Google/Apple sign-in lands (via /auth/callback). New accounts go to onboarding question 1;
// returning members go to the dashboard for the side they picked on the entry screen.
function Finish() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let done = false
    const finish = async (uid: string, token: string) => {
      if (done) return
      done = true
      let picked: string | null = null
      try { picked = sessionStorage.getItem('rc-side'); sessionStorage.removeItem('rc-side'); sessionStorage.removeItem('rc-next') } catch { /* storage blocked */ }
      const draft = readDraft()
      const { data: p, error: err } = await supabase.from('profiles').select('first_name, account_role').eq('id', uid).maybeSingle()
      if (err) { setError(err.message); return }
      // Existing (onboarded) accounts keep their type; only a brand-new account takes the side picked at sign-up
      const role: Role = p?.first_name && isRole(p.account_role) ? p.account_role : isRole(picked) ? picked : draft?.role ?? (isRole(p?.account_role) ? p.account_role : 'performer')
      if (!p?.first_name) await switchSide(uid, role)

      if (!p?.first_name) {
        // Brand-new account: verification (Google/Apple emails count as verified) then question 1
        fetch('/api/send-verification', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {})
        if (!draft || draft.role !== role) writeDraft({ ...(draft ?? emptyDraft(role)), role })
        router.replace('/start/profile')
        return
      }
      router.replace(dashboardFor(role))
    }
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => { if (session) finish(session.user.id, session.access_token) })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session.user.id, session.access_token)
      else setTimeout(() => { if (!done) router.replace('/welcome') }, 4000)
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  if (error) return <AuthState tone="warning" icon="alert" title="We couldn’t finish signing you in" body={error} action={{ label: 'Try again', href: '/welcome' }} />
  return <AuthState tone="loading" title="Signing you in…" />
}

// app/start/layout.tsx already provides the page shell
export default function FinishSignup() {
  return <Finish />
}
