'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Profile = { id: string; first_name: string | null; last_name: string | null; picture_url: string | null; location: string | null; bio: string | null; slug: string | null; last_active: string | null }
type Community = { id: string; name: string; slug: string; icon_url: string | null; cover_url: string | null; category: string; member_count: number }
type CalEvent = { id: string; title: string; event_date: string; event_time: string | null; event_type: string }

function CropModal({ file, onSave, onClose }: { file: File; onSave: (blob: Blob) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const SIZE = 280

  useEffect(() => {
    const image = new Image()
    image.onload = () => setImg(image)
    image.src = URL.createObjectURL(file)
    return () => URL.revokeObjectURL(image.src)
  }, [file])

  useEffect(() => {
    if (!img || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SIZE, SIZE)
    const scale = Math.max(SIZE / img.width, SIZE / img.height) * zoom
    const w = img.width * scale
    const h = img.height * scale
    const x = (SIZE - w) / 2 + offset.x
    const y = (SIZE - h) / 2 + offset.y
    ctx.drawImage(img, x, y, w, h)
  }, [img, zoom, offset])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#f1f0ee', borderRadius: '20px', padding: '24px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 700, color: '#0c2520', margin: '0 0 16px', textAlign: 'center' }}>Crop photo</p>
        <div style={{ width: SIZE + 'px', height: SIZE + 'px', margin: '0 auto 16px', position: 'relative', borderRadius: '50%', overflow: 'hidden', border: '3px solid #e0ddd5', touchAction: 'none' }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            onPointerDown={e => { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }) }}
            onPointerMove={e => { if (dragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }}
            onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)}
            style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'grab' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '0 8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/></svg>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#0c2520' }} />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/></svg>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '30px', border: '1px solid #e0ddd5', background: 'white', color: '#0c2520', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => { if (!canvasRef.current) return; canvasRef.current.toBlob(blob => { if (blob) onSave(blob) }, 'image/jpeg', 0.9) }} style={{ flex: 1, padding: '14px', borderRadius: '30px', border: 'none', background: '#0c2520', color: '#f1f0ee', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [suggested, setSuggested] = useState<Community[]>([])
  const [weekEvents, setWeekEvents] = useState<CalEvent[]>([])
  const [stats, setStats] = useState({ applications: 0, saved: 0, posted: 0, communities: 0 })
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [completion, setCompletion] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  const isOnline = (lastActive: string | null) => { if (!lastActive) return false; return (Date.now() - new Date(lastActive).getTime()) < 15 * 60 * 1000 }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false) }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      await supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', user.id)
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)

      // Profile completion percentage
      if (p) {
        var fields = [p.first_name, p.last_name, p.picture_url, p.location, p.bio, p.slug]
        var filled = fields.filter(Boolean).length
        setCompletion(Math.round((filled / fields.length) * 100))
      }

      const { data: notifData } = await supabase.from('notifications').select('*').eq('profile_id', user.id).eq('read', false).order('created_at', { ascending: false }).limit(10)
      setNotifications(notifData || [])

     let appCount = 0, savedCount = 0, postedCount = 0
      try { const r = await supabase.from('applications').select('id', { count: 'exact', head: true }).eq('profile_id', user.id); appCount = r.count || 0 } catch {}
      try { const r = await supabase.from('saved_jobs').select('id', { count: 'exact', head: true }).eq('profile_id', user.id); savedCount = r.count || 0 } catch {}
      try { const r = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('created_by', user.id); postedCount = r.count || 0 } catch {}
      const { data: myMems } = await supabase.from('community_members').select('community_id, communities(id, name, slug, icon_url, cover_url, category)').eq('profile_id', user.id).eq('status', 'approved')

      var myComms: Community[] = []
      var myCommIds: string[] = []
      if (myMems) {
        for (var m of myMems) {
          if (m.communities) {
            const c: any = m.communities
            const { count } = await supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'approved')
            myComms.push({ ...c, member_count: count || 0 })
            myCommIds.push(c.id)
          }
        }
      }
      setMyCommunities(myComms)
      setStats({ applications: appCount || 0, saved: savedCount || 0, posted: postedCount || 0, communities: myComms.length })

      const { data: allComms } = await supabase.from('communities').select('id, name, slug, icon_url, cover_url, category').limit(20)
      var sugg: Community[] = []
      if (allComms) {
        for (var c of allComms) {
          if (!myCommIds.includes(c.id) && sugg.length < 8) {
            const { count } = await supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'approved')
            sugg.push({ ...c, member_count: count || 0 })
          }
        }
      }
      setSuggested(sugg)

    try {
        const { data: allEvents } = await supabase.from('calendar_events').select('*').eq('profile_id', user.id)
        const todayStr = new Date().toISOString().split('T')[0]
        const upcoming = (allEvents || []).filter((e: any) => e.start_date >= todayStr).sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)).slice(0, 10)
        setWeekEvents(upcoming)
      } catch (err) {}

      setLoading(false)
    }
    load()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setCropFile(file)
    e.target.value = ''
  }

  const handleCropSave = async (blob: Blob) => {
    if (!profile) return
    setUploading(true); setCropFile(null)
    const path = profile.id + '/headshot-' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('headshots').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
      await supabase.from('profiles').update({ picture_url: publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, picture_url: publicUrl })
      showToast('Profile photo updated')
    }
    setUploading(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  if (loading) return <div />

  var online = isOnline(profile?.last_active || null)
  var unreadCount = notifications.length
  var fullName = ((profile?.first_name || '') + ' ' + (profile?.last_name || '')).trim()

  const menuItems = [
    { label: 'Calendar', sub: 'Auditions and bookings', href: '/calendar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label: 'My applications', sub: stats.applications + ' submitted', href: '/applications', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { label: 'My posted jobs', sub: stats.posted + ' active', href: '/my-jobs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
    { label: 'Saved jobs', sub: stats.saved + ' bookmarked', href: '/saved', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
    { label: 'Expenses', sub: 'Receipts and spending', href: '/expenses', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label: 'Connections', sub: 'People you work with', href: '/connections', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg> },
    { label: 'Customise your Ident', sub: 'Reorder and toggle sections', href: '/profile/customise', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { label: 'Billing', sub: 'Plan and payments', href: '/billing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { label: 'Notifications', sub: 'Email and push alerts', href: '/notifications', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg> },
    { label: 'Password & security', sub: 'Change your password', href: '/security', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', paddingBottom: '100px' }}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.92) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .notif-popup { animation: popIn 0.2s ease-out; }
        .menu-row:active { background: #e8e4de !important; }
        .scroll-row::-webkit-scrollbar { display: none; }
      `}</style>

      {cropFile && <CropModal file={cropFile} onSave={handleCropSave} onClose={() => setCropFile(null)} />}
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div style={{ padding: '24px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 3px', letterSpacing: '0.02em' }}>
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500, lineHeight: 1.2 }}>
              Greenroom
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(!showNotifications)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'white', border: '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadCount > 0 && <div style={{ position: 'absolute', top: '5px', right: '5px', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', border: '1.5px solid #f1f0ee' }} />}
              </button>
              {showNotifications && (
                <div className="notif-popup" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #e8e4de', boxShadow: '0 8px 32px rgba(12,37,32,0.12)', zIndex: 300, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0ede5' }}>
                    <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 700, color: '#0c2520', margin: 0 }}>Notifications</p>
                  </div>
                  {notifications.length === 0 ? <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: '#888', margin: 0 }}>No new notifications</p></div> : (
                    <div>{notifications.slice(0, 5).map((n: any) => <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f0ede5', cursor: 'pointer' }} onClick={() => { if (n.data && n.data.url) router.push(n.data.url) }}><p style={{ fontSize: '13px', color: '#0c2520', margin: '0 0 2px', fontWeight: 500 }}>{n.body}</p></div>)}</div>
                  )}
                </div>
              )}
            </div>

            <Link href="/profile" style={{ textDecoration: 'none', flexShrink: 0, position: 'relative' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: profile?.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#e8efea', backgroundSize: 'cover', border: '2px solid #e0ddd5' }} />
              {online && <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', border: '2px solid #f1f0ee' }} />}
            </Link>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* HERO PROFILE CARD */}
        <div style={{ background: '#0c2520', borderRadius: '20px', padding: '20px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
          {/* Decorative circle */}
          <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(146,215,175,0.08)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', position: 'relative' }}>
            <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: profile?.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#1a3a32', backgroundSize: 'cover', border: '2px solid #92d7af', overflow: 'hidden' }}>
                {uploading && <div style={{ width: '100%', height: '100%', background: 'rgba(12,37,32,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '14px', height: '14px', border: '2px solid #f1f0ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
              </div>
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '22px', height: '22px', borderRadius: '50%', background: '#92d7af', border: '2px solid #0c2520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', fontWeight: 700, color: '#f1f0ee', margin: '0 0 2px', lineHeight: 1.1 }}>{fullName || 'Your Ident'}</p>
              <p style={{ fontSize: '12px', color: '#92d7af', margin: 0 }}>{completion}% complete</p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '4px', marginBottom: '16px', overflow: 'hidden', position: 'relative' }}>
            <div style={{ width: completion + '%', height: '100%', background: '#92d7af', transition: 'width 0.4s ease' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', position: 'relative' }}>
            <Link href="/profile/edit" style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ background: '#92d7af', color: '#0c2520', padding: '12px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>Edit your Ident</div>
            </Link>
            <Link href={'/' + (profile?.slug || '') + '?from=app'} style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', color: '#f1f0ee', padding: '12px', borderRadius: '24px', fontSize: '13px', fontWeight: 500, textAlign: 'center', border: '1px solid rgba(255,255,255,0.15)' }}>View public</div>
            </Link>
          </div>
        </div>

        {/* Quick stats — minimal row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '24px' }}>
          {[
            { label: 'Applied', value: stats.applications, href: '/applications' },
            { label: 'Saved', value: stats.saved, href: '/saved' },
            { label: 'Posted', value: stats.posted, href: '/my-jobs' },
            { label: 'Groups', value: stats.communities, href: '/communities' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: 'white', borderRadius: '12px', padding: '12px 8px', textAlign: 'center', border: '1px solid #e8e4de' }}>
                <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '22px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px', lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: '10px', color: '#888', margin: 0, fontWeight: 500 }}>{s.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* This week */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Coming up</p>
          <Link href="/calendar" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>See all</Link>
        </div>
        {weekEvents.length === 0 ? (
          <Link href="/calendar" style={{ textDecoration: 'none' }}>
            <div style={{ background: 'white', borderRadius: '14px', padding: '16px', marginBottom: '24px', border: '1px solid #e8e4de', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>Nothing scheduled</p>
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Add to your calendar</p>
              </div>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
          </Link>
        ) : (
          <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {weekEvents.map(e => {
              var dateObj = new Date(e.event_date + 'T12:00:00')
              var day = dateObj.toLocaleDateString('en-GB', { weekday: 'short' })
              var dateNum = dateObj.getDate()
              var isToday = e.event_date === new Date().toISOString().split('T')[0]
              return (
                <Link key={e.id} href="/calendar" style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: '#0c2520', color: '#f1f0ee', borderRadius: '12px', padding: '8px 12px', minWidth: '52px', textAlign: 'center' }}>
                      <p style={{ fontSize: '10px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{isToday ? 'Today' : day}</p>
                      <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', fontWeight: 700, margin: 0, lineHeight: 1 }}>{dateNum}</p>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px' }}>{e.title}</p>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span style={{ fontSize: '10px', color: '#0c2520', background: '#e8efea', padding: '2px 8px', borderRadius: '4px', fontWeight: 500, textTransform: 'capitalize' }}>{e.event_type}</span>
                        {e.event_time && <span style={{ fontSize: '11px', color: '#aaa' }}>{e.event_time.slice(0, 5)}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Your communities */}
        {myCommunities.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Your communities</p>
              <Link href="/communities" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>See all</Link>
            </div>
            <div className="scroll-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {myCommunities.map(c => (
                <Link key={c.id} href={'/communities/' + c.slug} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ width: '150px', background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
                    <div style={{ height: '70px', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover' }} />
                    <div style={{ padding: '8px 12px 12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid white', background: c.icon_url ? 'url(' + c.icon_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', marginTop: '-24px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!c.icon_url && <span style={{ fontSize: '14px', fontWeight: 700, color: '#888' }}>{c.name[0]}</span>}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{c.member_count + ' members'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Suggested */}
        {suggested.length > 0 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Suggested for you</p>
              <Link href="/communities" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>Discover</Link>
            </div>
            <div className="scroll-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
              {suggested.map(c => (
                <Link key={c.id} href={'/communities/' + c.slug} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ width: '150px', background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
                    <div style={{ height: '70px', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover' }} />
                    <div style={{ padding: '8px 12px 12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid white', background: c.icon_url ? 'url(' + c.icon_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', marginTop: '-24px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!c.icon_url && <span style={{ fontSize: '14px', fontWeight: 700, color: '#888' }}>{c.name[0]}</span>}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>{c.member_count + ' members'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* All menu items in one clean list */}
        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>More</p>
        <div style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e8e4de', marginBottom: '16px' }}>
          {menuItems.map((item, i) => (
            <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
              <div className="menu-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: i < menuItems.length - 1 ? '1px solid #f0ede5' : 'none', background: 'white', transition: 'background 0.15s ease', cursor: 'pointer' }}>
                <div style={{ color: '#0c2520', flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 1px', fontWeight: 500 }}>{item.label}</p>
                  <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{item.sub}</p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>

        <button onClick={handleLogout} style={{ width: '100%', padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #e8e4de', borderRadius: '14px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Log out</button>

        <p style={{ textAlign: 'center', fontSize: '11px', color: '#ccc', margin: '16px 0 0' }}>The Ident · Version 1.0</p>
      </div>
    </div>
  )
}
