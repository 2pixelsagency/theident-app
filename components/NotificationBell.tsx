'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('notifications')
        .select('*').eq('profile_id', session.user.id).eq('read', false)
        .order('created_at', { ascending: false }).limit(10)
      setItems(data || [])
    }
    load()
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const openItem = async (n: any) => {
    try { await supabase.from('notifications').update({ read: true }).eq('id', n.id) } catch {}
    setItems(prev => prev.filter(x => x.id !== n.id))
    setOpen(false)
    if (n.data && n.data.url) router.push(n.data.url)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'white', border: '1px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {items.length > 0 && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', border: '1.5px solid white' }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #ebe8e1', boxShadow: '0 12px 36px rgba(12,37,32,0.14)', zIndex: 400, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0ede5' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Notifications</p>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: '#999', margin: 0 }}>You're all caught up</p></div>
          ) : items.slice(0, 6).map(n => (
            <div key={n.id} onClick={() => openItem(n)} style={{ padding: '11px 16px', borderBottom: '1px solid #f0ede5', cursor: 'pointer' }}>
              {n.title && <p style={{ fontSize: '12px', color: '#92a89c', margin: '0 0 2px', fontWeight: 600 }}>{n.title}</p>}
              <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
