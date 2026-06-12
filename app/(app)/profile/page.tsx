'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string; first_name: string | null; last_name: string | null; picture_url: string | null
  location: string | null; bio: string | null; slug: string | null; last_active: string | null
  vid_1: string | null
}
type Community = { id: string; name: string; slug: string; icon_url: string | null; cover_url: string | null; category: string; member_count: number }
type CalEvent = { id: string; title: string; start_date: string; start_time: string | null; event_type: string; location: string | null }
type Period = 'W' | 'M' | '6M'

const PERIOD_DAYS: Record<Period, number> = { W: 7, M: 30, '6M': 180 }
const GOALS: Record<Period, { views: number; apps: number }> = {
  W: { views: 25, apps: 5 }, M: { views: 100, apps: 20 }, '6M': { views: 600, apps: 120 },
}
function pad(n: number) { return n < 10 ? '0' + n : '' + n }
function dateStr(d: Date) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

function ProgressRing({ percent, color, label, value }: { percent: number; color: string; label: string; value: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => { const t = setTimeout(() => setVal(percent), 150); return () => clearTimeout(t) }, [percent])
  const size = 80, stroke = 7
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(val, 100) / 100) * circ
  return (
    <div style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '18px', padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size + 'px', height: size + 'px', marginBottom: '8px' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece9e1" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,0.61,0.36,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', fontWeight: 700, color: '#0c2520' }}>{percent}%</span>
        </div>
      </div>
      <p style={{ fontSize: '11px', fontWeight: 600, color: '#0c2520', margin: '0 0 1px', textAlign: 'center' }}>{value}</p>
      <p style={{ fontSize: '10px', color: '#999', margin: 0, textAlign: 'center' }}>{label}</p>
    </div>
  )
}

function MiniCalendar({ eventDates }: { eventDates: Set<string> }) {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth()
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const dim = new Date(year, month + 1, 0).getDate()
  const todayKey = dateStr(now)
  const cells: (number | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)
  const wk = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  return (
    <Link href="/calendar" style={{ textDecoration: 'none', flex: 1 }}>
      <div className="tap" style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '14px 12px', height: '100%' }}>
        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '14px', fontWeight: 700, color: '#0c2520', margin: '0 0 10px' }}>{now.toLocaleDateString('en-GB', { month: 'long' })}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
          {wk.map((w, i) => <span key={i} style={{ fontSize: '9px', color: '#bbb', textAlign: 'center', fontWeight: 600 }}>{w}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />
            const key = year + '-' + pad(month + 1) + '-' + pad(d)
            const isToday = key === todayKey
            const hasEvent = eventDates.has(key)
            return (
              <div key={i} style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: '21px', height: '21px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#0c2520' : 'transparent' }}>
                  <span style={{ fontSize: '10px', fontWeight: isToday || hasEvent ? 700 : 400, color: isToday ? '#f1f0ee' : hasEvent ? '#0c2520' : '#bbb' }}>{d}</span>
                </div>
                {hasEvent && !isToday && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#4ade80', position: 'absolute', bottom: '0' }} />}
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

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
    const w = img.width * scale, h = img.height * scale
    const x = (SIZE - w) / 2 + offset.x, y = (SIZE - h) / 2 + offset.y
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

export default function Greenroom() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [suggested, setSuggested] = useState<Community[]>([])
  const [weekEvents, setWeekEvents] = useState<CalEvent[]>([])
  const [eventDates, setEventDates] = useState<Set<string>>(new Set())
  const [stats, setStats] = useState({ applications: 0, saved: 0, posted: 0, communities: 0 })
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [completion, setCompletion] = useState(0)
  const [connections, setConnections] = useState<any[]>([])
  const [networkSuggestions, setNetworkSuggestions] = useState<any[]>([])
  const [viewsWeek, setViewsWeek] = useState(0)
  const [period, setPeriod] = useState<Period>('W')
  const [viewDates, setViewDates] = useState<Date[]>([])
  const [appDates, setAppDates] = useState<Date[]>([])
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)
  const notifRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }

      supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', user.id).then(() => {})
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      if (p) {
        const fields = [p.first_name, p.last_name, p.picture_url, p.location, p.bio, p.slug]
        setCompletion(Math.round((fields.filter(Boolean).length / fields.length) * 100))
      }

      supabase.from('notifications').select('*').eq('profile_id', user.id).eq('read', false).order('created_at', { ascending: false }).limit(10).then(({ data }) => setNotifications(data || []))

      try {
        const { data: vrows } = await supabase.from('profile_views').select('created_at').eq('profile_id', user.id)
        const dates = (vrows || []).map((v: any) => new Date(v.created_at))
        setViewDates(dates)
        const weekAgo = Date.now() - 7 * 86400000
        setViewsWeek(dates.filter(d => d.getTime() >= weekAgo).length)
      } catch {}

      let appCount = 0
      try {
        const { data: arows } = await supabase.from('applications').select('created_at').eq('profile_id', user.id)
        setAppDates((arows || []).map((a: any) => new Date(a.created_at)))
        appCount = (arows || []).length
      } catch {}

      let savedCount = 0, postedCount = 0
      try { const r = await supabase.from('saved_jobs').select('id', { count: 'exact', head: true }).eq('profile_id', user.id); savedCount = r.count || 0 } catch {}
      try { const r = await supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('created_by', user.id); postedCount = r.count || 0 } catch {}

      try { await supabase.from('daily_activity').upsert({ profile_id: user.id, activity_date: dateStr(new Date()) }, { onConflict: 'profile_id,activity_date' }) } catch {}
      try {
        const cutoff = dateStr(new Date(Date.now() - 90 * 86400000))
        const { data: acts } = await supabase.from('daily_activity').select('activity_date').eq('profile_id', user.id).gte('activity_date', cutoff)
        const set = new Set((acts || []).map((a: any) => a.activity_date))
        setActiveDates(set)
        let s = 0; const d = new Date()
        while (set.has(dateStr(d))) { s++; d.setDate(d.getDate() - 1) }
        setStreak(s)
      } catch {}

      const { data: myMems } = await supabase.from('community_members').select('community_id, communities(id, name, slug, icon_url, cover_url, category)').eq('profile_id', user.id).eq('status', 'approved')
      const myComms = (myMems || []).filter((m: any) => m.communities).map((m: any) => m.communities)
      const myCommIds = myComms.map((c: any) => c.id)
      const { data: allComms } = await supabase.from('communities').select('id, name, slug, icon_url, cover_url, category').limit(20)
      const suggestedRaw = (allComms || []).filter((c: any) => !myCommIds.includes(c.id)).slice(0, 8)
      const allIds = [...myCommIds, ...suggestedRaw.map((c: any) => c.id)]
      const countMap = new Map<string, number>()
      if (allIds.length) {
        const { data: mems } = await supabase.from('community_members').select('community_id').eq('status', 'approved').in('community_id', allIds)
        ;(mems || []).forEach((m: any) => countMap.set(m.community_id, (countMap.get(m.community_id) || 0) + 1))
      }
      setMyCommunities(myComms.map((c: any) => ({ ...c, member_count: countMap.get(c.id) || 0 })))
      setSuggested(suggestedRaw.map((c: any) => ({ ...c, member_count: countMap.get(c.id) || 0 })))
      setStats({ applications: appCount, saved: savedCount, posted: postedCount, communities: myComms.length })

      try {
        const { data: conns } = await supabase.from('connections').select('requester_id, receiver_id, status').or('requester_id.eq.' + user.id + ',receiver_id.eq.' + user.id).eq('status', 'accepted')
        const otherIds = (conns || []).map((c: any) => c.requester_id === user.id ? c.receiver_id : c.requester_id)
        if (otherIds.length > 0) {
          const { data: people } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, slug, last_active').in('id', otherIds)
          setConnections(people || [])
        }
      } catch {}
      try {
        const { data: sugg } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, slug, last_active').not('first_name', 'is', null).neq('id', user.id).limit(10)
        setNetworkSuggestions(sugg || [])
      } catch {}

      try {
        const { data: allEvents } = await supabase.from('calendar_events').select('*').eq('profile_id', user.id)
        setEventDates(new Set((allEvents || []).map((e: any) => e.start_date)))
        const todayStr = dateStr(new Date())
        const upcoming = (allEvents || []).filter((e: any) => e.start_date >= todayStr).sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)).slice(0, 5)
        setWeekEvents(upcoming)
      } catch {}

      setLoading(false)
    }
    load()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }
  const handleCropSave = async (blob: Blob) => {
    if (!profile) return
    setUploading(true); setCropFile(null)
    const path = profile.id + '/headshot-' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('headshots').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
      await supabase.from('profiles').update({ picture_url: publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, picture_url: publicUrl })
      setToast('Profile photo updated'); setTimeout(() => setToast(null), 3000)
    }
    setUploading(false)
  }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const nowD = new Date()
  const unreadCount = notifications.length

  const pCut = new Date(Date.now() - PERIOD_DAYS[period] * 86400000)
  const viewsInPeriod = viewDates.filter(d => d >= pCut).length
  const appsInPeriod = appDates.filter(d => d >= pCut).length
  const viewsPct = Math.min(100, Math.round((viewsInPeriod / GOALS[period].views) * 100))
  const appsPct = Math.min(100, Math.round((appsInPeriod / GOALS[period].apps) * 100))
  const dayOfWeek = (nowD.getDay() + 6) % 7
  const monday = new Date(nowD); monday.setDate(nowD.getDate() - dayOfWeek)
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate()
  const dailyViews = Array.from({ length: daysInMonth }, (_, i) => { const key = nowD.getFullYear() + '-' + pad(nowD.getMonth() + 1) + '-' + pad(i + 1); return viewDates.filter(d => dateStr(d) === key).length })
  const maxDaily = Math.max(1, ...dailyViews)
  const viewsThisMonthTotal = dailyViews.reduce((a, b) => a + b, 0)
  const monthName = nowD.toLocaleDateString('en-GB', { month: 'long' })

  const nextEvent = weekEvents[0]
  const nextAction = !profile?.picture_url ? { label: 'Add a profile photo', sub: 'Profiles with a photo get 4x more views', href: '/profile/edit' }
    : !profile?.bio ? { label: 'Write your bio', sub: 'Tell casting who you are', href: '/profile/edit' }
    : !profile?.location ? { label: 'Add your location', sub: 'Get found for local roles', href: '/profile/edit' }
    : !profile?.vid_1 ? { label: 'Add a showreel', sub: 'Reels triple your profile views', href: '/profile/customise' }
    : null

  let focus: { tone: 'mint' | 'dark'; icon: React.ReactNode; eyebrow: string; title: string; sub: string; href: string; cta: string }
  if (nextEvent) {
    const ev = new Date(nextEvent.start_date + 'T12:00:00')
    const isToday = nextEvent.start_date === dateStr(nowD)
    const when = isToday ? 'Today' + (nextEvent.start_time ? ' · ' + nextEvent.start_time.slice(0, 5) : '') : ev.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    focus = { tone: 'dark', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92d7af" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, eyebrow: 'Up next', title: nextEvent.title, sub: when, href: '/calendar', cta: 'View' }
  } else if (nextAction) {
    focus = { tone: 'mint', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>, eyebrow: 'Suggested for you', title: nextAction.label, sub: nextAction.sub, href: nextAction.href, cta: 'Do it' }
  } else if (viewsWeek > 0) {
    focus = { tone: 'dark', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92d7af" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>, eyebrow: 'Good news', title: viewsWeek + ' new ' + (viewsWeek === 1 ? 'view' : 'views') + ' this week', sub: 'People are finding your Ident', href: '/' + (profile?.slug || '') + '?from=app', cta: 'View' }
  } else {
    focus = { tone: 'mint', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, eyebrow: 'Ready when you are', title: 'Find your next role', sub: 'New jobs are posted daily', href: '/dashboard', cta: 'Browse' }
  }

  const menuItems = [
    { label: 'Calendar', sub: 'Auditions and bookings', href: '/calendar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label: 'My applications', sub: stats.applications + ' submitted', href: '/applications', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { label: 'My posted jobs', sub: stats.posted + ' active', href: '/my-jobs', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg> },
    { label: 'Saved jobs', sub: stats.saved + ' bookmarked', href: '/saved', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
    { label: 'Expenses', sub: 'Receipts and spending', href: '/expenses', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
    { label: 'Connections', sub: connections.length + ' collaborators', href: '/connections', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg> },
    { label: 'Customise your Ident', sub: 'Reorder and toggle sections', href: '/profile/customise', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { label: 'Billing', sub: 'Plan and payments', href: '/billing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { label: 'Password & security', sub: 'Change your password', href: '/security', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '100px' }}>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes popIn { from { opacity:0; transform:scale(0.92) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .stagger { opacity:0; animation:fadeUp 0.5s cubic-bezier(0.22,0.61,0.36,1) forwards; }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .notif-popup { animation: popIn 0.2s ease-out; }
        .tap { -webkit-tap-highlight-color: transparent; transition: transform 0.12s ease; }
        .tap:active { transform: scale(0.98); }
        .menu-row:active { background: #f3f0e9 !important; }
        .scroll-row::-webkit-scrollbar { display: none; }
      `}</style>

      {cropFile && <CropModal file={cropFile} onSave={handleCropSave} onClose={() => setCropFile(null)} />}
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div className="stagger" style={{ animationDelay: '0s', padding: '24px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '12px', color: '#888', margin: '0 0 3px', letterSpacing: '0.02em' }}>{nowD.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500, lineHeight: 1.2 }}>Greenroom</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="tap" style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'white', border: '1px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                {unreadCount > 0 && <div style={{ position: 'absolute', top: '8px', right: '8px', width: '7px', height: '7px', borderRadius: '50%', background: '#4ade80', border: '1.5px solid white' }} />}
              </button>
              {showNotifications && (
                <div className="notif-popup" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #ebe8e1', boxShadow: '0 12px 36px rgba(12,37,32,0.14)', zIndex: 300, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0ede5' }}>
                    <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 700, color: '#0c2520', margin: 0 }}>Notifications</p>
                  </div>
                  {notifications.length === 0 ? <div style={{ padding: '24px 16px', textAlign: 'center' }}><p style={{ fontSize: '13px', color: '#999', margin: 0 }}>You're all caught up</p></div> : (
                    <div>{notifications.slice(0, 5).map((n: any) => <div key={n.id} style={{ padding: '11px 16px', borderBottom: '1px solid #f0ede5', cursor: 'pointer' }} onClick={() => { if (n.data && n.data.url) router.push(n.data.url) }}><p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{n.body}</p></div>)}</div>
                  )}
                </div>
              )}
            </div>
            <label style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: profile?.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#e8efea', backgroundSize: 'cover', border: '2px solid #e6e2d9', overflow: 'hidden' }}>
                {uploading && <div style={{ width: '100%', height: '100%', background: 'rgba(12,37,32,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: '13px', height: '13px', border: '2px solid #f1f0ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>}
              </div>
              <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '18px', height: '18px', borderRadius: '50%', background: '#92d7af', border: '2px solid #f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <input type="file" accept="image/*" onChange={handleFileSelect} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>

        {/* UP NEXT (focus) */}
        <Link href={focus.href} style={{ textDecoration: 'none' }}>
          <div className="stagger tap" style={{ animationDelay: '0.05s', background: focus.tone === 'dark' ? '#0c2520' : '#92d7af', borderRadius: '20px', padding: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '14px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: '-30px', right: '-20px', width: '120px', height: '120px', borderRadius: '50%', background: focus.tone === 'dark' ? 'rgba(146,215,175,0.08)' : 'rgba(255,255,255,0.18)' }} />
            <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: focus.tone === 'dark' ? 'rgba(146,215,175,0.15)' : 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>{focus.icon}</div>
            <div style={{ flex: 1, position: 'relative' }}>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 700, margin: '0 0 3px', color: focus.tone === 'dark' ? '#92d7af' : '#0c2520', opacity: focus.tone === 'dark' ? 1 : 0.7 }}>{focus.eyebrow}</p>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', fontWeight: 700, margin: '0 0 1px', color: focus.tone === 'dark' ? '#f1f0ee' : '#0c2520', lineHeight: 1.15 }}>{focus.title}</p>
              <p style={{ fontSize: '12px', margin: 0, color: focus.tone === 'dark' ? 'rgba(241,240,238,0.6)' : '#0c2520', opacity: focus.tone === 'dark' ? 1 : 0.65 }}>{focus.sub}</p>
            </div>
            <div style={{ background: focus.tone === 'dark' ? '#92d7af' : '#0c2520', color: focus.tone === 'dark' ? '#0c2520' : '#f1f0ee', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, flexShrink: 0, position: 'relative' }}>{focus.cta}</div>
          </div>
        </Link>

        {/* YOUR ACTIVITY */}
        <div className="stagger" style={{ animationDelay: '0.1s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Your activity</p>
            <div style={{ display: 'flex', background: '#e6e2d9', borderRadius: '20px', padding: '3px' }}>
              {(['W', 'M', '6M'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className="tap" style={{ padding: '5px 11px', borderRadius: '16px', border: 'none', background: period === p ? '#0c2520' : 'transparent', color: period === p ? '#f1f0ee' : '#888', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{p}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
            <ProgressRing percent={completion} color="#0c2520" value="Profile" label="strength" />
            <ProgressRing percent={viewsPct} color="#4ade80" value={viewsInPeriod + '/' + GOALS[period].views} label="views" />
            <ProgressRing percent={appsPct} color="#92d7af" value={appsInPeriod + '/' + GOALS[period].apps} label="applied" />
          </div>

          {/* Streak — light */}
          <div style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '18px', padding: '18px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#4ade80" stroke="none"><path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0 0 10 0c0-1.5-.5-3-1.5-4 .5 2-.5 3-1.5 3 .5-2-.5-4-2-5 .5 2-1 3-1 4-1-1-1-2-1-3 0-2 2-4 3-7z"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 700, color: '#0c2520', margin: 0, lineHeight: 1 }}>{streak} day{streak === 1 ? '' : 's'}</p>
                <p style={{ fontSize: '12px', color: '#999', margin: '3px 0 0' }}>{streak > 0 ? 'Show up tomorrow to keep it going' : 'Start your streak today'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {weekDays.map((d, i) => {
                const active = activeDates.has(dateStr(d))
                const isFuture = d > nowD
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: active ? '#4ade80' : 'transparent', border: active ? 'none' : '1.5px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isFuture ? 0.5 : 1 }}>
                      {active && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#061410" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 500 }}>{dayLetters[i]}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Monthly chart */}
          <div style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
              <div>
                <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Profile views</p>
                <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0' }}>{monthName}</p>
              </div>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '22px', fontWeight: 700, color: '#0c2520', margin: 0 }}>{viewsThisMonthTotal}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '70px' }}>
              {dailyViews.map((count, i) => {
                const isToday = i + 1 === nowD.getDate()
                return (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ height: (count / maxDaily) * 100 + '%', minHeight: count > 0 ? '4px' : '2px', background: isToday ? '#0c2520' : '#cfe6da', borderRadius: '2px', transition: 'height 0.8s cubic-bezier(0.22,0.61,0.36,1)' }} />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* NETWORK */}
        <div className="stagger" style={{ animationDelay: '0.15s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Network</p>
            <Link href={connections.length > 0 ? '/connections' : '/browse'} style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 600 }}>{connections.length > 0 ? 'See all' : 'Browse'}</Link>
          </div>
          {connections.length > 0 ? (
            <div className="scroll-row" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
              <Link href="/browse" style={{ textDecoration: 'none', flexShrink: 0, width: '64px', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed #d4d2cc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </div>
                <p style={{ fontSize: '11px', color: '#999', margin: 0, fontWeight: 500 }}>Find</p>
              </Link>
              {connections.map(c => {
                const on = c.last_active && (Date.now() - new Date(c.last_active).getTime()) < 15 * 60 * 1000
                return (
                  <Link key={c.id} href={c.slug ? '/' + c.slug + '?from=app' : '#'} style={{ textDecoration: 'none', flexShrink: 0, width: '64px', textAlign: 'center' }}>
                    <div style={{ position: 'relative', width: '60px', height: '60px', margin: '0 auto 6px' }}>
                      <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #92d7af', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.picture_url ? <img src={c.picture_url} alt={c.first_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '18px', fontWeight: 700, color: '#92d7af', fontFamily: "'ITC Symbol',Georgia,serif" }}>{(c.first_name || '?')[0]}</span>}
                      </div>
                      {on && <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '13px', height: '13px', borderRadius: '50%', background: '#4ade80', border: '2.5px solid #f1f0ee' }} />}
                    </div>
                    <p style={{ fontSize: '11px', color: '#0c2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.first_name}</p>
                  </Link>
                )
              })}
            </div>
          ) : networkSuggestions.length > 0 ? (
            <>
              <div className="scroll-row" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                {networkSuggestions.map(c => (
                  <Link key={c.id} href={c.slug ? '/' + c.slug + '?from=app' : '#'} style={{ textDecoration: 'none', flexShrink: 0, width: '64px', textAlign: 'center' }}>
                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #e6e2d9', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                      {c.picture_url ? <img src={c.picture_url} alt={c.first_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '18px', fontWeight: 700, color: '#92d7af', fontFamily: "'ITC Symbol',Georgia,serif" }}>{(c.first_name || '?')[0]}</span>}
                    </div>
                    <p style={{ fontSize: '11px', color: '#0c2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.first_name}</p>
                  </Link>
                ))}
                <Link href="/browse" style={{ textDecoration: 'none', flexShrink: 0, width: '64px', textAlign: 'center' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px dashed #d4d2cc', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', margin: 0, fontWeight: 500 }}>More</p>
                </Link>
              </div>
              <p style={{ fontSize: '12px', color: '#999', margin: '10px 0 0' }}>Connect with performers to grow your network</p>
            </>
          ) : (
            <Link href="/browse" style={{ textDecoration: 'none' }}>
              <div className="tap" style={{ background: '#0c2520', borderRadius: '16px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '16px', fontWeight: 700, color: '#f1f0ee', margin: '0 0 4px' }}>Build your network</p>
                  <p style={{ fontSize: '12px', color: '#92d7af', margin: 0 }}>Find performers to collaborate with</p>
                </div>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#92d7af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* CALENDAR SPLIT */}
        <div className="stagger" style={{ animationDelay: '0.2s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Calendar</p>
            <Link href="/calendar" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 600 }}>Open</Link>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            <MiniCalendar eventDates={eventDates} />
            <div style={{ flex: 1, background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '14px 12px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '14px', fontWeight: 700, color: '#0c2520', margin: '0 0 10px' }}>Up next</p>
              {weekEvents.length === 0 ? (
                <Link href="/calendar" style={{ textDecoration: 'none', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', margin: 0, textAlign: 'center' }}>Nothing scheduled</p>
                </Link>
              ) : (
                <div>
                  {weekEvents.slice(0, 4).map((e, i) => {
                    const dObj = new Date(e.start_date + 'T12:00:00')
                    const isToday = e.start_date === dateStr(nowD)
                    const lbl = isToday ? 'Today' : dObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
                    return (
                      <Link key={e.id} href="/calendar" style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', gap: '8px', padding: '8px 0', borderBottom: i < Math.min(weekEvents.length, 4) - 1 ? '1px solid #f3f0e9' : 'none' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', marginTop: '5px', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: 600, color: '#0c2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                            <p style={{ fontSize: '10px', color: '#999', margin: '1px 0 0' }}>{lbl}{e.start_time ? ' · ' + e.start_time.slice(0, 5) : ''}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COMMUNITIES */}
        {myCommunities.length > 0 && (
          <div className="stagger" style={{ animationDelay: '0.25s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Your communities</p>
              <Link href="/communities" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 600 }}>See all</Link>
            </div>
            <div className="scroll-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '4px' }}>
              {myCommunities.map(c => (
                <Link key={c.id} href={'/communities/' + c.slug} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="tap" style={{ width: '150px', background: 'white', borderRadius: '14px', border: '1px solid #ebe8e1', overflow: 'hidden' }}>
                    <div style={{ height: '70px', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover' }} />
                    <div style={{ padding: '8px 12px 12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid white', background: c.icon_url ? 'url(' + c.icon_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', marginTop: '-24px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!c.icon_url && <span style={{ fontSize: '14px', fontWeight: 700, color: '#888' }}>{c.name[0]}</span>}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>{c.member_count + ' members'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {suggested.length > 0 && (
          <div className="stagger" style={{ animationDelay: '0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: 0 }}>Suggested for you</p>
              <Link href="/communities" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 600 }}>Discover</Link>
            </div>
            <div className="scroll-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '4px' }}>
              {suggested.map(c => (
                <Link key={c.id} href={'/communities/' + c.slug} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="tap" style={{ width: '150px', background: 'white', borderRadius: '14px', border: '1px solid #ebe8e1', overflow: 'hidden' }}>
                    <div style={{ height: '70px', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover' }} />
                    <div style={{ padding: '8px 12px 12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid white', background: c.icon_url ? 'url(' + c.icon_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', marginTop: '-24px', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {!c.icon_url && <span style={{ fontSize: '14px', fontWeight: 700, color: '#888' }}>{c.name[0]}</span>}
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                      <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>{c.member_count + ' members'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* MORE */}
        <div className="stagger" style={{ animationDelay: '0.35s' }}>
          <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, margin: '0 0 8px' }}>More</p>
          <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '1px solid #ebe8e1', marginBottom: '16px' }}>
            {menuItems.map((item, i) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
                <div className="menu-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: i < menuItems.length - 1 ? '1px solid #f0ede5' : 'none', background: 'white', cursor: 'pointer' }}>
                  <div style={{ color: '#0c2520', flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 1px', fontWeight: 500 }}>{item.label}</p>
                    <p style={{ fontSize: '12px', color: '#999', margin: 0 }}>{item.sub}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </div>
              </Link>
            ))}
          </div>

          <button onClick={handleLogout} className="tap" style={{ width: '100%', padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #ebe8e1', borderRadius: '16px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Log out</button>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#ccc', margin: '16px 0 0' }}>The Ident · Version 1.0</p>
        </div>
      </div>
    </div>
  )
}
