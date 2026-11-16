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
}

export type Me = {
  id: string
  email: string | null
  profile: MyProfile | null
  role: Role
  name: string
  unreadNotifications: number
  unreadMessages: number
  refresh: () => Promise<void>
}

const MeContext = createContext<Me | null>(null)

const PROFILE_COLS = 'id, first_name, last_name, picture_url, slug, location, what_i_do, account_role, company_name, availability_status, is_graduate, graduate_school, graduate_year, is_verified, email_verified'

export function MeProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [me, setMe] = useState<Omit<Me, 'refresh'> | null>(null)

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    // An invite link opened while signed out: remember it, log in, then come back to it
    const joinPath = window.location.pathname.match(/^\/join\/([A-Za-z0-9]{6})$/)
    if (!session) {
      if (joinPath) try { localStorage.setItem('ident.pendingJoin', joinPath[1]) } catch { /* private mode */ }
      router.replace('/welcome'); return
    }
    try {
      const pending = localStorage.getItem('ident.pendingJoin')
      if (pending) { localStorage.removeItem('ident.pendingJoin'); if (!joinPath) router.replace('/join/' + pending) }
    } catch { /* private mode */ }
    const uid = session.user.id
    const [{ data: profile }, { count: notifs }, { data: convos }] = await Promise.all([
      supabase.from('profiles').select(PROFILE_COLS).eq('id', uid).maybeSingle(),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('profile_id', uid).eq('read', false),
      supabase.from('conversations').select('id').or('user_a.eq.' + uid + ',user_b.eq.' + uid),
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
