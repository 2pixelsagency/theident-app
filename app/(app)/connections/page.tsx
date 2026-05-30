'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Connection = {
  id: string
  requester_id: string
  status: string
  created_at: string
  requester: {
    first_name: string | null
    last_name: string | null
    picture_url: string | null
    slug: string | null
  }
}

export default function ConnectionsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<Connection[]>([])
  const [connected, setConnected] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'connected'>('pending')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('connections')
        .select('id, requester_id, status, created_at, requester:profiles!connections_requester_id_fkey(first_name, last_name, picture_url, slug)')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })

      const all = (data || []) as unknown as Connection[]
      setPending(all.filter(c => c.status === 'pending'))
      setConnected(all.filter(c => c.status === 'accepted'))
      setLoading(false)
    }
    load()
  }, [router])

  const accept = async (id: string) => {
    await supabase.from('connections').update({ status: 'accepted' }).eq('id', id)
    const conn = pending.find(c => c.id === id)!
    setPending(prev => prev.filter(c => c.id !== id))
    setConnected(prev => [{ ...conn, status: 'accepted' }, ...prev])
  }

  const decline = async (id: string) => {
    await supabase.from('connections').update({ status: 'declined' }).eq('id', id)
    setPending(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <div />

  const list = tab === 'pending' ? pending : connected

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '680px', margin: '0 auto', padding: '0 0 80px' }}>
      <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500 }}>Connections</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', margin: '0 20px 20px', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px' }}>
        {(['pending', 'connected'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === t ? 'white' : 'transparent', color: '#0c2520', fontSize: '14px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', WebkitTapHighlightColor: 'transparent' }}>
            {t === 'pending' ? `Requests${pending.length > 0 ? ` (${pending.length})` : ''}` : 'Connected'}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '14px', border: '1px solid #e8e6e0' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>
              {tab === 'pending' ? 'No pending requests' : 'No connections yet'}
            </p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
              {tab === 'pending' ? 'Connection requests will appear here' : 'Start connecting with people you have worked with'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {list.map(conn => {
              const name = `${conn.requester.first_name || ''} ${conn.requester.last_name || ''}`.trim()
              return (
                <div key={conn.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Link href={conn.requester.slug ? `/${conn.requester.slug}` : '#'}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: conn.requester.picture_url ? `url(${conn.requester.picture_url}) center/cover` : '#e8efea', flexShrink: 0, border: '1px solid #e0ddd5' }} />
                  </Link>
                  <div style={{ flex: 1 }}>
                    <Link href={conn.requester.slug ? `/${conn.requester.slug}` : '#'} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>{name}</p>
                    </Link>
                    <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>
                      {tab === 'pending' ? 'Wants to connect' : 'Connected'}
                    </p>
                  </div>
                  {tab === 'pending' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => accept(conn.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: '#0c2520', color: '#f1f0ee', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Accept
                      </button>
                      <button onClick={() => decline(conn.id)} style={{ padding: '8px 16px', borderRadius: '20px', border: '1px solid #e0ddd5', background: 'white', color: '#888', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
