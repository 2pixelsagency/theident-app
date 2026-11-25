'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { toast } from '@/components/rc/ui'
import type { Role } from './onboarding'

export type MyProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  slug: string | null
  location: string | null
  what_i_do: string | null
  account_role: Role
  company_name: string | null
  availability_status: string | null
  is_graduate: boolean
  graduate_school: string | null
  graduate_year: number | null
  is_verified: boolean
  email_verified: boolean
  is_demo?: boolean
  plan_status?: string | null
  plan_kind?: string | null
  graduate_verified?: boolean | null
  pro_verified?: boolean | null
  plan_period_end?: string | null
  plan_grace_until?: string | null
}

export type Me = {
  id: string
  email: string | null
  profile: MyProfile | null
  role: Role
  name: string
  unreadNotifications: number
  unreadMessages: number
  /** Paid up, on trial, in grace, demo or admin (server's has_plan) */
  hasPlan: boolean
  refresh: () => Promise<void>
}

const MeContext = createContext<Me | null>(null)

// Where to go after logging in, set by MeProvider or public pages (e.g. Apply on /jobs/[id])
export const PENDING_NEXT_KEY = 'ident.pendingNext'

const PROFILE_COLS = 'id, first_name, last_name, picture_url, slug, location, what_i_do, account_role, company_name, availability_status, is_graduate, graduate_school, graduate_year, graduate_verified, pro_verified, is_verified, email_verified, is_demo, plan_status, plan_kind, plan_period_end, plan_grace_until'

export function MeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [me, setMe] = useState<Omit<Me, 'refresh'> | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    // A deep link opened while signed out (invite, role, chat…): remember it, log in, then come back to it
    const here = window.location.pathname + window.location.search
    if (!session) {
      if (here !== '/home') try { localStorage.setItem(PENDING_NEXT_KEY, here) } catch { /* private mode */ }
      router.replace('/welcome'); return
    }
    try {
      const pending = localStorage.getItem(PENDING_NEXT_KEY)
      if (pending) { localStorage.removeItem(PENDING_NEXT_KEY); if (pending !== here && pending.startsWith('/') && !pending.startsWith('//')) router.replace(pending) }
    } catch { /* private mode */ }
    const uid = session.user.id
    const [{ data: profile }, { count: notifs }, { data: convos }, { data: plan, error: planErr }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLS).eq('id', uid).maybeSingle(),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('profile_id', uid).neq('type', 'message').eq('read', false),
      supabase.from('conversations').select('id').or('user_a.eq.' + uid + ',user_b.eq.' + uid),
      supabase.rpc('has_plan', { pid: uid }),
    ])
    let unreadMessages = 0
    if (convos?.length) {
      const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
        .in('conversation_id', convos.map(c => c.id)).eq('read', false).neq('sender_id', uid)
      unreadMessages = count || 0
    }
    const p = profile as MyProfile | null
    setMe({
      id: uid,
      email: session.user.email ?? null,
      profile: p,
      role: p?.account_role === 'caster' ? 'caster' : 'performer',
      name: p?.first_name || session.user.email?.split('@')[0] || 'there',
      unreadNotifications: notifs || 0,
      unreadMessages,
      hasPlan: planErr ? true : plan !== false, // fail open on a network blip; RLS still protects data
    })
    supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', uid).then(() => {})
  }, [router])

  useEffect(() => {
    // Async data load; state is only set after the awaited queries resolve
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    const { data: sub } = supabase.auth.onAuthStateChange(event => { if (event === 'SIGNED_OUT') router.replace('/welcome') })
    return () => sub.subscription.unsubscribe()
  }, [load, router])

  // In-app: new notifications arrive live — bump the badge and show a tappable toast (not on the page it links to)
  const uid = me?.id
  useEffect(() => {
    if (!uid) return
    const ch = supabase.channel('notifs-' + uid)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'profile_id=eq.' + uid }, payload => {
        const n = payload.new as { title?: string; body?: string; type?: string; data?: { url?: string } | null }
        const url = n.data?.url
        const isMsg = n.type === 'message'
        setMe(m => m && (isMsg ? { ...m, unreadMessages: m.unreadMessages + 1 } : { ...m, unreadNotifications: m.unreadNotifications + 1 }))
        if (url && window.location.pathname === url.split('?')[0]) return
        toast([n.title, n.body].filter(Boolean).join(' — '), url ? { label: 'Open', onClick: () => router.push(url) } : undefined)
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [uid, router])

  if (!me) return null
  return <MeContext.Provider value={{ ...me, refresh: load }}>{children}</MeContext.Provider>
}

export function useMe(): Me {
  const me = useContext(MeContext)
  if (!me) throw new Error('useMe must be used inside MeProvider')
  return me
}
