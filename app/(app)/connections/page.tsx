'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import { startConversation } from '@/lib/startConversation'

type Person = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  slug: string | null
}
type Conn = {
  id: string
  status: string
  created_at: string
  iAmRequester: boolean
  otherId: string
  other?: Person
}

export default function ConnectionsPage() {
  const router = useRouter()
  const [incoming, setIncoming] = useState<Conn[]>([])
  const [outgoing, setOutgoing] = useState<Conn[]>([])
  const [accepted, setAccepted] = useState<Conn[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'requests' | 'connections'>('requests')
  const [myId, setMyId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      setMyId(user.id)

      // Every connection that involves me, in either direction
      const { data: conns } = await supabase
        .from('connections')
        .select('id, requester_id, receiver_id, status, created_at')
        .or('requester_id.eq.' + user.id + ',receiver_id.eq.' + user.id)
        .order('created_at', { ascending: false })

      const all = conns || []
      const otherIds = [...new Set(all.map((c: any) => c.requester_id === user.id ? c.receiver_id : c.requester_id))]

      let profs: Person[] = []
      if (otherIds.length) {
        const { data } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, slug').in('id', otherIds)
        profs = (data || []) as Person[]
      }
      const pm = new Map(profs.map(p => [p.id, p]))

      const withOther: Conn[] = all.map((c: any) => {
        const otherId = c.requester_id === user.id ? c.receiver_id : c.requester_id
        return { id: c.id, status: c.status, created_at: c.created_at, iAmRequester: c.requester_id === user.id, otherId, other: pm.get(otherId) }
      })

      setIncoming(withOther.filter(c => c.status === 'pending' && !c.iAmRequester))
      setOutgoing(withOther.filter(c => c.status === 'pending' && c.iAmRequester))
      setAccepted(withOther.filter(c => c.status === 'accepted'))
      setLoading(false)
    }
    load()
  }, [router])

  const accept = async (c: Conn) => {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', c.id)
    setIncoming(prev => prev.filter(x => x.id !== c.id))
    setAccepted(prev => [{ ...c, status: 'accepted' }, ...prev])
  }

  // Decline an incoming request — delete so it fully resets (they can ask again later)
  const decline = async (c: Conn) => {
    await supabase.from('connections').delete().eq('id', c.id)
    setIncoming(prev => prev.filter(x => x.id !== c.id))
  }

  // Cancel a request you sent
  const cancel = async (c: Conn) => {
    await supabase.from('connections').delete().eq('id', c.id)
    setOutgoing(prev => prev.filter(x => x.id !== c.id))
  }

  // Remove an existing connection
  const remove = async (c: Conn) => {
    const name = ((c.other?.first_name || '') + ' ' + (c.other?.last_name || '')).trim() || 'this person'
    if (!confirm('Remove your connection with ' + name + '?')) return
    await supabase.from('connections').delete().eq('id', c.id)
    setAccepted(prev => prev.filter(x => x.id !== c.id))
  }

  const message = async (otherId: string) => {
    if (!myId) return
    const id = await startConversation(myId, otherId)
    if (id) router.push('/messages/' + id)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const nameOf = (c: Conn) => ((c.other?.first_name || '') + ' ' + (c.other?.last_name || '')).trim() || 'Unknown'
  const avatar = (c: Conn) => (
    <Link href={c.other?.slug ? '/' + c.other.slug + '?from=app' : '#'}>
      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: c.other?.picture_url ? 'url(' + c.other.picture_url + ') center/cover' : '#e8efea', flexShrink: 0, border: '1px solid #e0ddd5' }} />
    </Link>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '100px' }}>
      <AppHeader title="Connections" showBack />

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '0 16px 20px', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px' }}>
        {(['requests', 'connections'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === t ? 'white' : 'transparent', color: '#0c2520', fontSize: '14px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', WebkitTapHighlightColor: 'transparent' }}>
            {t === 'requests' ? ('Requests' + (incoming.length > 0 ? ' (' + incoming.length + ')' : '')) : ('Connections' + (accepted.length > 0 ? ' (' + accepted.length + ')' : ''))}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* REQUESTS TAB */}
        {tab === 'requests' && (
          incoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '14px', border: '1px solid #e8e6e0' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px', fontWeight: 500 }}>No pending requests</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Connection requests will appear here</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incoming.map(c => (
                <div key={c.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {avatar(c)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={c.other?.slug ? '/' + c.other.slug + '?from=app' : '#'} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>{nameOf(c)}</p>
                    </Link>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Wants to connect</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => accept(c)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#0c2520', color: '#f1f0ee', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Accept</button>
                    <button onClick={() => decline(c)} style={{ padding: '8px 14px', borderRadius: '20px', border: '1px solid #e0ddd5', background: 'white', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* CONNECTIONS TAB */}
        {tab === 'connections' && (
          (accepted.length === 0 && outgoing.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '14px', border: '1px solid #e8e6e0' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px', fontWeight: 500 }}>No connections yet</p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>Start connecting with people you have worked with</p>
              <Link href="/browse" style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '10px 22px', borderRadius: '22px', fontSize: '13px', fontWeight: 500 }}>Browse talent</span></Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

              {/* Requests you've sent, still pending */}
              {outgoing.map(c => (
                <div key={c.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.85 }}>
                  {avatar(c)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={c.other?.slug ? '/' + c.other.slug + '?from=app' : '#'} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>{nameOf(c)}</p>
                    </Link>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Request sent</p>
                  </div>
                  <button onClick={() => cancel(c)} style={{ padding: '8px 14px', borderRadius: '20px', border: '1px solid #e0ddd5', background: 'white', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Cancel</button>
                </div>
              ))}

              {/* Accepted connections */}
              {accepted.map(c => (
                <div key={c.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {avatar(c)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={c.other?.slug ? '/' + c.other.slug + '?from=app' : '#'} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>{nameOf(c)}</p>
                    </Link>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Connected</p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button onClick={() => message(c.otherId)} style={{ padding: '8px 14px', borderRadius: '20px', border: '1px solid #e0ddd5', background: 'white', color: '#0c2520', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      Message
                    </button>
                    <button onClick={() => remove(c)} style={{ padding: '8px 12px', borderRadius: '20px', border: '1px solid #f0d9d6', background: 'white', color: '#c0392b', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>Remove</button>
                  </div>
                </div>
              ))}

            </div>
          )
        )}

      </div>
    </div>
  )
}
