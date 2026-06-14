'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import Avatar from '@/components/Avatar'

export default function Messages() {
  const router = useRouter()
  const [convos, setConvos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uid, setUid] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const me = session.user.id; setUid(me)
      const { data: cs } = await supabase.from('conversations')
        .select('*').or('user_a.eq.' + me + ',user_b.eq.' + me)
        .order('last_message_at', { ascending: false, nullsFirst: false })
      const list = cs || []
      const otherIds = list.map((c: any) => c.user_a === me ? c.user_b : c.user_a)
      let profs: any[] = []
      if (otherIds.length) {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, slug, last_active').in('id', otherIds)
        profs = data || []
      }
      const { data: unread } = await supabase.from('messages')
        .select('conversation_id').eq('read', false).neq('sender_id', me)
        .in('conversation_id', list.length ? list.map((c: any) => c.id) : ['none'])
      const unreadMap = new Map<string, number>()
      ;(unread || []).forEach((m: any) => unreadMap.set(m.conversation_id, (unreadMap.get(m.conversation_id) || 0) + 1))

      setConvos(list.map((c: any) => {
        const other = profs.find((p: any) => p.id === (c.user_a === me ? c.user_b : c.user_a))
        return { ...c, other, unread: unreadMap.get(c.id) || 0 }
      }))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '100px' }}>
      <AppHeader title="Messages" />
      <div style={{ padding: '0 16px' }}>
        {convos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: '0 0 8px', fontWeight: 500 }}>No messages yet</p>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 20px' }}>Connect with people to start a conversation</p>
            <Link href="/browse" style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '11px 24px', borderRadius: '24px', fontSize: '14px', fontWeight: 500 }}>Browse talent</span></Link>
          </div>
        ) : convos.map(c => (
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
      </div>
    </div>
  )
}
