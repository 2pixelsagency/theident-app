'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NotificationBell() {
  const router = useRouter()
  const [items, setItems] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  const ref = useRef<HTMLDivElement>(null)
  const touch = useRef<{ id: string; startX: number; startOffset: number; moved: boolean } | null>(null)
  const skipClick = useRef(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('notifications')
        .select('*').eq('profile_id', session.user.id)
        .order('created_at', { ascending: false }).limit(12)
      setItems(data || [])
    }
    load()
  }, [])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const unreadCount = items.filter(n => !n.read).length

  const openItem = async (n: any) => {
    if (!n.read) {
      try { await supabase.from('notifications').update({ read: true }).eq('id', n.id) } catch {}
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))
    }
    let d: any = n.data
    if (typeof d === 'string') { try { d = JSON.parse(d) } catch { d = {} } }
    setOpen(false)
    if (d && d.url) router.push(d.url)
  }

  const deleteItem = async (id: string) => {
    try { await supabase.from('notifications').delete().eq('id', id) } catch {}
    setItems(prev => prev.filter(x => x.id !== id))
    setOffsets(prev => { const c = { ...prev }; delete c[id]; return c })
  }

  const onTouchStart = (e: React.TouchEvent, id: string) => {
    touch.current = { id, startX: e.touches[0].clientX, startOffset: offsets[id] || 0, moved: false }
  }
  const onTouchMove = (e: React.TouchEvent, id: string) => {
    if (!touch.current || touch.current.id !== id) return
    const dx = e.touches[0].clientX - touch.current.startX
    if (Math.abs(dx) > 6) touch.current.moved = true
    let next = touch.current.startOffset + dx
    if (next > 0) next = 0
    if (next < -96) next = -96
    setOffsets(prev => ({ ...prev, [id]: next }))
  }
  const onTouchEnd = (id: string) => {
    if (!touch.current || touch.current.id !== id) return
    const moved = touch.current.moved
    const cur = offsets[id] || 0
    setOffsets(prev => ({ ...prev, [id]: cur < -48 ? -88 : 0 }))
    skipClick.current = moved
    touch.current = null
  }

  const handleClick = (n: any) => {
    if (skipClick.current) { skipClick.current = false; return }
    if ((offsets[n.id] || 0) < -20) { setOffsets(prev => ({ ...prev, [n.id]: 0 })); return }
    openItem(n)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'white', border: '1px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.7" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
        {unreadCount > 0 && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', border: '1.5px solid white' }} />}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #ebe8e1', boxShadow: '0 12px 36px rgba(12,37,32,0.14)', zIndex: 400, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0ede5' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Notifications</p>
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: '#999', margin: 0 }}>You&apos;re all caught up</p></div>
          ) : items.slice(0, 8).map(n => (
            <div key={n.id} style={{ position: 'relative', borderBottom: '1px solid #f0ede5', overflow: 'hidden' }}>
              <button onClick={() => deleteItem(n.id)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '88px', background: '#c0392b', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
              <div
                onTouchStart={(e) => onTouchStart(e, n.id)}
                onTouchMove={(e) => onTouchMove(e, n.id)}
                onTouchEnd={() => onTouchEnd(n.id)}
                onClick={() => handleClick(n)}
                style={{ position: 'relative', background: 'white', padding: '11px 16px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '8px', transform: 'translateX(' + (offsets[n.id] || 0) + 'px)', transition: touch.current && touch.current.id === n.id ? 'none' : 'transform 0.2s ease', WebkitTapHighlightColor: 'transparent' }}
              >
                {!n.read && <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', marginTop: '5px', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0, paddingLeft: n.read ? '15px' : '0' }}>
                  {n.title && <p style={{ fontSize: '12px', color: '#92a89c', margin: '0 0 2px', fontWeight: 600 }}>{n.title}</p>}
                  <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{n.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
