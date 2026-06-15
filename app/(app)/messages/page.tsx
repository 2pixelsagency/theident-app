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
  const [showSheet, setShowSheet] = useState(false)
  const [starting, setStarting] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const me = session.user.id
      setUid(me)

      const [{ data: cs }, { data: conns }] = await Promise.all([
        supabase.from('conversations').select('*').or('user_a.eq.' + me + ',user_b.eq.' + me).order('last_message_at', { ascending: false, nullsFirst: false }),
        supabase.from('connections').select('requester_id, receiver_id, status').or('requester_id.eq.' + me + ',receiver_id.eq.' + me).eq('status', 'accepted'),
      ])

      const convList = cs || []
      const convoOtherIds = convList.map((c: any) => c.user_a === me ? c.user_b : c.user_a)
      const connOtherIds = [...new Set((conns || []).map((c: any) => c.requester_id === me ? c.receiver_id : c.requester_id))]

      const allIds = [...new Set([...convoOtherIds, ...connOtherIds])]
      let profs: Person[] = []
      if (allIds.length) {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, slug, last_active').in('id', allIds)
        profs = (data || []) as Person[]
      }
      const profMap = new Map(profs.map(p => [p.id, p]))

      const { data: unread } = await supabase.from('messages')
        .select('conversation_id').eq('read', false).neq('sender_id', me)
        .in('conversation_id', convList.length ? convList.map((c: any) => c.id) : ['none'])
      const unreadMap = new Map<string, number>()
      ;(unread || []).forEach((m: any) => unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1))

      setConvos(convList.map((c: any) => {
        const otherId = c.user_a === me ? c.user_b : c.user_a
        return { ...c, other: profMap.get(otherId), unread: unreadMap.get(c.id) || 0 }
      }))

      const people = connOtherIds.map(id => profMap.get(id)).filter(Boolean) as Person[]
      people.sort((a, b) => (a.first_name || '').localeCompare(b.first_name || ''))
      setConnections(people)

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
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .sheet-list::-webkit-scrollbar { display:none; }
        .conv-row:active { background:#eae8e3; }
        .pick-row:active { background:#eae8e3; }
      `}</style>

      <AppHeader title="Messages" />

      <div style={{ padding: '0 16px 14px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => setShowSheet(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '22px', padding: '9px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
          New message
        </button>
      </div>

      <div style={{ padding: '0 16px' }}>
        {convos.length > 0 ? (
          convos.map(c => (
            <Link key={c.id} href={'/messages/' + c.id} style={{ textDecoration: 'none' }}>
              <div className="conv-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 8px', margin: '0 -8px', borderRadius: '12px', borderBottom: '1px solid #ebe8e1' }}>
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
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '52px 24px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: '0 0 8px', fontWeight: 500 }}>No messages yet</p>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 20px' }}>
              {connections.length > 0 ? 'Tap "New message" to start chatting with a connection' : 'Connect with people to start a conversation'}
            </p>
            {connections.length > 0 ? (
              <button onClick={() => setShowSheet(true)} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '11px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>New message</button>
            ) : (
              <Link href="/browse" style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '11px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 500 }}>Browse talent</span></Link>
            )}
          </div>
        )}
      </div>

      {showSheet && <div onClick={() => setShowSheet(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />}
      {showSheet && (
        <div className="sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '80vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 14px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: 0 }}>New message</p>
            <button onClick={() => setShowSheet(false)} style={{ background: '#e8e4de', border: 'none', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>

          <div className="sheet-list" style={{ overflowY: 'auto', padding: '0 16px 20px', scrollbarWidth: 'none' }}>
            {connections.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                <p style={{ fontSize: '14px', color: '#888', margin: '0 0 16px' }}>You have no connections yet. Connect with people first, then you can message them here.</p>
                <Link href="/browse" onClick={() => setShowSheet(false)} style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '10px 22px', borderRadius: '22px', fontSize: '13px', fontWeight: 500 }}>Browse talent</span></Link>
              </div>
            ) : (
              connections.map(p => {
                const name = ((p.first_name || '') + ' ' + (p.last_name || '')).trim() || 'Unknown'
                const isStarting = starting === p.id
                return (
                  <button
                    key={p.id}
                    className="pick-row"
                    onClick={() => message(p.id)}
                    disabled={!!starting}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 8px', margin: '0 -8px', borderRadius: '12px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', opacity: starting && !isStarting ? 0.4 : 1, WebkitTapHighlightColor: 'transparent' }}
                  >
                    <Avatar src={p.picture_url} name={p.first_name} size={46} ring="#e6e2d9" />
                    <p style={{ flex: 1, fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{name}</p>
                    {isStarting ? (
                      <div style={{ width: '16px', height: '16px', border: '2px solid #0c2520', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                    )}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
