'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import Avatar from '@/components/Avatar'
import { startConversation } from '@/lib/startConversation'

type Person = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  slug: string | null
  last_active: string | null
}

export default function Messages() {
  const router = useRouter()
  const [convos, setConvos] = useState<any[]>([])
  const [connections, setConnections] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const me = session.user.id
      setUid(me)

      // Conversations + accepted connections in parallel
      const [{ data: cs }, { data: conns }] = await Promise.all([
        supabase.from('conversations').select('*').or('user_a.eq.' + me + ',user_b.eq.' + me).order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase.from('connections').select('requester_id, receiver_id, status').or('requester_id.eq.' + me + ',receiver_id.eq.' + me).eq('status', 'accepted'),
      ])

      const convList = cs || []
      const convoOtherIds = convList.map((c: any) => c.user_a === me ? c.user_b : c.user_a)
      const convoOtherSet = new Set(convoOtherIds)
      const connOtherIds = [...new Set((conns || []).map((c: any) => c.requester_id === me ? c.receiver_id : c.requester_id))]

      // One profile fetch for everyone we need to display
      const allIds = [...new Set([...convoOtherIds, ...connOtherIds])]
      let profs: Person[] = []
      if (allIds.length) {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, slug, last_active').in('id', allIds)
        profs = (data || []) as Person[]
      }
      const profMap = new Map(profs.map(p => [p.id, p]))

      // Unread counts per conversation
      const { data: unread } = await supabase.from('messages')
        .select('conversation_id').eq('read', false).neq('sender_id', me)
        .in('conversation_id', convList.length ? convList.map((c: any) => c.id) : ['none'])
      const unreadMap = new Map<string, number>()
      ;(unread || []).forEach((m: any) => unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1))

      setConvos(convList.map((c: any) => {
        const otherId = c.user_a === me ? c.user_b : c.user_a
        return { ...c, other: profMap.get(otherId), unread: unreadMap.get(c.id) || 0 }
      }))

      // Connections you can start a NEW chat with (no existing conversation yet)
      const fresh = connOtherIds
        .filter(id => !convoOtherSet.has(id))
        .map(id => profMap.get(id))
        .filter(Boolean) as Person[]
      setConnections(fresh)

      setLoading(false)
    }
    load()
  }, [router])

  const message = async (otherId: string) => {
    if (!uid || starting) return
    setStarting(otherId)
    const id = await startConversation(uid, otherId)
    if (id) router.push('/messages/' + id)
    else setStarting(null)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '100px' }}>
      <style>{`.hscroll::-webkit-scrollbar { display:none; }`}</style>

      <AppHeader title="Messages" />

      <div style={{ padding: '0 16px' }}>

        {/* Start a conversation — connections without a chat yet */}
        {connections.length > 0 && (
          <div style={{ marginBottom: convos.length ? '24px' : '8px' }}>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 12px' }}>Start a conversation</p>
            <div className="hscroll" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {connections.map(p => (
                <button
                  key={p.id}
                  onClick={() => message(p.id)}
                  disabled={!!starting}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, width: '64px', opacity: starting && starting !== p.id ? 0.4 : 1, WebkitTapHighlightColor: 'transparent' }}
                >
                  <div style={{ position: 'relative' }}>
                    <Avatar src={p.picture_url} name={p.first_name} size={56} ring="#e6e2d9" />
                    <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '22px', height: '22px', borderRadius: '50%', background: '#0c2520', border: '2px solid #f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#0c2520', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '64px' }}>{p.first_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing conversations */}
        {convos.length > 0 ? (
          <>
            {connections.length > 0 && <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 4px' }}>Recent</p>}
            {convos.map(c => (
              <Link key={c.id} href={'/messages/' + c.id} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: '1px solid #ebe8e1' }}>
                  <Avatar src={c.other?.picture_url} name={c.other?.first_name} size={52} ring="#e6e2d9" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '15px', fontWeight: c.unread ? 600 : 500, color: '#0c2520', margin: 0 }}>{((c.other?.first_name || '') + ' ' + (c.other?.last_name || '')).trim() || 'Unknown'}</p>
                      {c.last_message_at && <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(c.last_message_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                    </div>
                    <p style={{ fontSize: '13px', color: c.unread ? '#0c2520' : '#999', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: c.unread ? 500 : 400 }}>{c.last_message || 'Say hello'}</p>
                  </div>
                  {c.unread > 0 && <div style={{ minWidth: '20px', height: '20px', borderRadius: '10px', background: '#4ade80', color: '#061410', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>{c.unread}</div>}
                </div>
              </Link>
            ))}
          </>
        ) : connections.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: '0 0 8px', fontWeight: 500 }}>No messages yet</p>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 20px' }}>Connect with people to start a conversation</p>
            <Link href="/browse" style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '11px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 500 }}>Browse talent</span></Link>
          </div>
        ) : null}

      </div>
    </div>
  )
}
