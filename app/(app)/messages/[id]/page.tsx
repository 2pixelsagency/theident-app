'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Avatar from '@/components/Avatar'

export default function Thread() {
  const params = useParams()
  const router = useRouter()
  const convoId = params.id as string
  const [messages, setMessages] = useState<any[]>([])
  const [other, setOther] = useState<any>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const me = session.user.id; setUid(me)
      const { data: convo } = await supabase.from('conversations').select('*').eq('id', convoId).single()
      if (!convo) { router.push('/messages'); return }
      const otherId = convo.user_a === me ? convo.user_b : convo.user_a
      const [{ data: prof }, { data: msgs }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, picture_url, slug').eq('id', otherId).single(),
        supabase.from('messages').select('*').eq('conversation_id', convoId).order('created_at'),
      ])
      setOther(prof); setMessages(msgs || []); setLoading(false)
      await supabase.from('messages').update({ read: true }).eq('conversation_id', convoId).neq('sender_id', me).eq('read', false)
    }
    load()
  }, [convoId])

  useEffect(() => {
    const channel = supabase.channel('thread-' + convoId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + convoId },
        (payload: any) => { setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, payload.new]) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [convoId])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const body = text.trim()
    if (!body || !uid) return
    setText('')
    await supabase.from('messages').insert({ conversation_id: convoId, sender_id: uid, body })
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #ebe8e1', background: '#f1f0ee', position: 'sticky', top: 0, zIndex: 10 }}>
        <button onClick={() => router.push('/messages')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <Avatar src={other?.picture_url} name={other?.first_name} size={36} ring="#e6e2d9" href={other?.slug ? '/' + other.slug + '?from=app' : undefined} />
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{((other?.first_name || '') + ' ' + (other?.last_name || '')).trim()}</p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {messages.map(m => {
          const mine = m.sender_id === uid
          return (
            <div key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '76%' }}>
              <div style={{ background: mine ? '#0c2520' : 'white', color: mine ? '#f1f0ee' : '#0c2520', padding: '10px 14px', borderRadius: mine ? '18px 18px 4px 18px' : '18px 18px 18px 4px', border: mine ? 'none' : '1px solid #ebe8e1', fontSize: '14px', lineHeight: 1.4 }}>{m.body}</div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 16px calc(env(safe-area-inset-bottom) + 12px)', borderTop: '1px solid #ebe8e1', background: '#f1f0ee', display: 'flex', gap: '8px', alignItems: 'center' }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send() }} placeholder="Message…" style={{ flex: 1, padding: '12px 16px', borderRadius: '24px', border: '1px solid #e0ddd5', fontSize: '14px', fontFamily: 'inherit', background: 'white', color: '#0c2520', outline: 'none' }} />
        <button onClick={send} disabled={!text.trim()} style={{ width: '42px', height: '42px', borderRadius: '50%', background: text.trim() ? '#0c2520' : '#d4d2cc', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
        </button>
      </div>
    </div>
  )
}
