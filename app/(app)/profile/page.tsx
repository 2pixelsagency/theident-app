'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

type Profile = {
  id: string; first_name: string | null; last_name: string | null; picture_url: string | null
  location: string | null; bio: string | null; slug: string | null; last_active: string | null; vid_1: string | null
}
type Community = { id: string; name: string; slug: string; icon_url: string | null; cover_url: string | null; member_count: number; joined: boolean }
type CalEvent = { id: string; title: string; start_date: string; start_time: string | null; event_type: string }
type PostedJob = { id: string; title: string; status: string | null; created_at: string; applicant_count: number }
type Period = 'W' | 'M' | '6M'

const PERIOD_DAYS: Record<Period, number> = { W: 7, M: 30, '6M': 180 }
const GOALS: Record<Period, { views: number; apps: number; aud: number; post: number }> = {
  W: { views: 25, apps: 5, aud: 3, post: 2 }, M: { views: 100, apps: 20, aud: 8, post: 5 }, '6M': { views: 600, apps: 120, aud: 30, post: 15 },
}
const STAGE_RANK: Record<string, number> = { submitted: 0, audition: 1, callback: 2, offer: 3, booked: 4 }
const AUDITION_THRESHOLD = 1

function pad(n: number) { return n < 10 ? '0' + n : '' + n }
function dateStr(d: Date) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

function ProgressRing({ percent, color, main, label, onDismiss }: { percent: number; color: string; main: string; label: string; onDismiss?: () => void }) {
  const [val, setVal] = useState(0)
  useEffect(() => { const t = setTimeout(() => setVal(percent), 150); return () => clearTimeout(t) }, [percent])
  const size = 78, stroke = 7, r = (size - stroke) / 2, circ = 2 * Math.PI * r
  const offset = circ - (Math.min(val, 100) / 100) * circ
  return (
    <div style={{ position: 'relative', scrollSnapAlign: 'start', flexShrink: 0, width: '108px', background: 'white', border: '1px solid #ebe8e1', borderRadius: '18px', padding: '14px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {onDismiss && (
        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss() }} style={{ position: 'absolute', top: '7px', right: '7px', width: '20px', height: '20px', borderRadius: '50%', background: '#f3f0e9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
      <div style={{ position: 'relative', width: size + 'px', height: size + 'px', marginBottom: '8px' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece9e1" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,0.61,0.36,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', fontWeight: 500, color: '#0c2520' }}>{main}</span>
        </div>
      </div>
      <p style={{ fontSize: '10px', color: '#999', margin: 0, textAlign: 'center' }}>{label}</p>
    </div>
  )
}

function MiniCalendar({ eventDates }: { eventDates: Set<string> }) {
  const now = new Date()
  const year = now.getFullYear(), month = now.getMonth()
  const lead = (new Date(year, month, 1).getDay() + 6) % 7
  const dim = new Date(year, month + 1, 0).getDate()
  const todayKey = dateStr(now)
  const cells: (number | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= dim; d++) cells.push(d)
  return (
    <Link href="/calendar" style={{ textDecoration: 'none', flex: 1 }}>
      <div className="tap" style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '14px 12px', height: '100%' }}>
        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 10px' }}>{now.toLocaleDateString('en-GB', { month: 'long' })}</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((w, i) => <span key={i} style={{ fontSize: '9px', color: '#bbb', textAlign: 'center', fontWeight: 500 }}>{w}</span>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px' }}>
          {cells.map((d, i) => {
            if (d === null) return <span key={i} />
            const key = year + '-' + pad(month + 1) + '-' + pad(d)
            const isToday = key === todayKey
            const ev = eventDates.has(key)
            return (
              <div key={i} style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <div style={{ width: '21px', height: '21px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isToday ? '#0c2520' : 'transparent' }}>
                  <span style={{ fontSize: '10px', fontWeight: isToday || ev ? 500 : 400, color: isToday ? '#f1f0ee' : ev ? '#0c2520' : '#bbb' }}>{d}</span>
                </div>
                {ev && !isToday && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#4ade80', position: 'absolute', bottom: '0' }} />}
              </div>
            )
          })}
        </div>
      </div>
    </Link>
  )
}

export default function Greenroom() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [communities, setCommunities] = useState<Community[]>([])
  const [weekEvents, setWeekEvents] = useState<CalEvent[]>([])
  const [eventDates, setEventDates] = useState<Set<string>>(new Set())
  const [postedJobs, setPostedJobs] = useState<PostedJob[]>([])
  const [completion, setCompletion] = useState(0)
  const [connections, setConnections] = useState<any[]>([])
  const [viewDates, setViewDates] = useState<Date[]>([])
  const [appDates, setAppDates] = useState<Date[]>([])
  const [audDates, setAudDates] = useState<Date[]>([])
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [streak, setStreak] = useState(0)
  const [period, setPeriod] = useState<Period>('W')
  const [dismissed, setDismissed] = useState<string[]>([])
  const [nudgeOpen, setNudgeOpen] = useState(false)
  const [viewsOpen, setViewsOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedTick, setSavedTick] = useState(false)
  const saveTimer = useRef<any>(null)

  useEffect(() => {
    if (loading) return
    try { if (sessionStorage.getItem('ident_nudge_seen')) return } catch {}
    const needsAction = profile && (!profile.picture_url || !profile.bio || !profile.location || !profile.vid_1)
    if (needsAction || weekEvents.length > 0) setNudgeOpen(true)
  }, [loading])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      const uid = user.id
      setUserId(uid)

      supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', uid).then(() => {})
      supabase.from('daily_activity').upsert({ profile_id: uid, activity_date: dateStr(new Date()) }, { onConflict: 'profile_id,activity_date' }).then(() => {})

      const cutoff90 = dateStr(new Date(Date.now() - 90 * 86400000))

      const [pRes, notesRes, viewsRes, appsRes, savedRes, jobsRes, actRes, myMemsRes, allCommsRes, connsRes, eventsRes, dismissedRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('notes').select('content').eq('profile_id', uid).maybeSingle(),
        supabase.from('profile_views').select('created_at').eq('profile_id', uid),
        supabase.from('applications').select('status, created_at').eq('profile_id', uid),
        supabase.from('saved_jobs').select('id', { count: 'exact', head: true }).eq('profile_id', uid),
        supabase.from('jobs').select('id, title, status, created_at').eq('created_by', uid).order('created_at', { ascending: false }),
        supabase.from('daily_activity').select('activity_date').eq('profile_id', uid).gte('activity_date', cutoff90),
        supabase.from('community_members').select('community_id, communities(id, name, slug, icon_url, cover_url)').eq('profile_id', uid).eq('status', 'approved'),
        supabase.from('communities').select('id, name, slug, icon_url, cover_url').limit(20),
        supabase.from('connections').select('requester_id, receiver_id, status').or('requester_id.eq.' + uid + ',receiver_id.eq.' + uid).eq('status', 'accepted'),
        supabase.from('calendar_events').select('id, title, start_date, start_time, event_type').eq('profile_id', uid),
        supabase.from('dismissed_cards').select('card_key').eq('profile_id', uid),
      ])

      const p = pRes.data as Profile | null
      setProfile(p)
      if (p) {
        const fields = [p.first_name, p.last_name, p.picture_url, p.location, p.bio, p.slug]
        setCompletion(Math.round((fields.filter(Boolean).length / fields.length) * 100))
      }
      setNotes(notesRes.data?.content || '')
      setViewDates((viewsRes.data || []).map((v: any) => new Date(v.created_at)))
      const apps = appsRes.data || []
      setAppDates(apps.map((a: any) => new Date(a.created_at)))
      setAudDates(apps.filter((a: any) => (STAGE_RANK[a.status] ?? 0) >= AUDITION_THRESHOLD).map((a: any) => new Date(a.created_at)))
      setDismissed((dismissedRes.data || []).map((d: any) => d.card_key))

      const actSet = new Set((actRes.data || []).map((a: any) => a.activity_date))
      setActiveDates(actSet)
      let s = 0; const dd = new Date()
      while (actSet.has(dateStr(dd))) { s++; dd.setDate(dd.getDate() - 1) }
      setStreak(s)

      const todayStr = dateStr(new Date())
      const allEvents = eventsRes.data || []
      setEventDates(new Set(allEvents.map((e: any) => e.start_date)))
      setWeekEvents(allEvents.filter((e: any) => e.start_date >= todayStr).sort((a: any, b: any) => a.start_date.localeCompare(b.start_date)).slice(0, 5))

      const myComms = (myMemsRes.data || []).filter((m: any) => m.communities).map((m: any) => m.communities)
      const myIds = myComms.map((c: any) => c.id)
      const sugg = (allCommsRes.data || []).filter((c: any) => !myIds.includes(c.id)).slice(0, 8)
      const jobs = jobsRes.data || []
      const conns = connsRes.data || []
      const otherIds = conns.map((c: any) => c.requester_id === uid ? c.receiver_id : c.requester_id)
      const allCommIds = [...myIds, ...sugg.map((c: any) => c.id)]
      const jobIds = jobs.map((j: any) => j.id)

      const [countsRes, applicantsRes, connProfilesRes] = await Promise.all([
        allCommIds.length ? supabase.from('community_members').select('community_id').eq('status', 'approved').in('community_id', allCommIds) : Promise.resolve({ data: [] } as any),
        jobIds.length ? supabase.from('applications').select('job_id').in('job_id', jobIds) : Promise.resolve({ data: [] } as any),
        otherIds.length ? supabase.from('profiles').select('id, first_name, picture_url, slug, last_active').in('id', otherIds) : Promise.resolve({ data: [] } as any),
      ])

      const cMap = new Map<string, number>()
      ;(countsRes.data || []).forEach((m: any) => cMap.set(m.community_id, (cMap.get(m.community_id) || 0) + 1))
      setCommunities([
        ...myComms.map((c: any) => ({ ...c, member_count: cMap.get(c.id) || 0, joined: true })),
        ...sugg.map((c: any) => ({ ...c, member_count: cMap.get(c.id) || 0, joined: false })),
      ])

      const aMap = new Map<string, number>()
      ;(applicantsRes.data || []).forEach((a: any) => aMap.set(a.job_id, (aMap.get(a.job_id) || 0) + 1))
      setPostedJobs(jobs.slice(0, 6).map((j: any) => ({ ...j, applicant_count: aMap.get(j.id) || 0 })))

      setConnections(connProfilesRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  const onNotesChange = (v: string) => {
    setNotes(v); setSavingNotes(true); setSavedTick(false)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      if (!userId) return
      try { await supabase.from('notes').upsert({ profile_id: userId, content: v, updated_at: new Date().toISOString() }, { onConflict: 'profile_id' }) } catch {}
      setSavingNotes(false); setSavedTick(true)
    }, 700)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const dismissNudge = () => { setNudgeOpen(false); try { sessionStorage.setItem('ident_nudge_seen', '1') } catch {} }
  const dismissRing = async (key: string) => {
    setDismissed(d => [...d, key])
    if (userId) { try { await supabase.from('dismissed_cards').upsert({ profile_id: userId, card_key: key }, { onConflict: 'profile_id,card_key' }) } catch {} }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const nowD = new Date()
  const fullName = ((profile?.first_name || '') + ' ' + (profile?.last_name || '')).trim()
  const publicHref = profile?.slug ? '/' + profile.slug + '?from=app' : '/profile'

  const pCut = new Date(Date.now() - PERIOD_DAYS[period] * 86400000)
  const g = GOALS[period]
  const viewsInPeriod = viewDates.filter(d => d >= pCut).length
  const appsInPeriod = appDates.filter(d => d >= pCut).length
  const audInPeriod = audDates.filter(d => d >= pCut).length
  const postedInPeriod = postedJobs.filter(j => new Date(j.created_at) >= pCut).length

  const rings = [
    { key: 'profile_strength', color: '#0c2520', main: completion + '%', label: 'profile', pct: completion, dismissible: completion >= 100, href: '/profile/edit' },
    { key: 'views', color: '#4ade80', main: '' + viewsInPeriod, label: 'views', pct: Math.min(100, (viewsInPeriod / g.views) * 100), tap: () => setViewsOpen(true) },
    { key: 'applied', color: '#92d7af', main: '' + appsInPeriod, label: 'applied', pct: Math.min(100, (appsInPeriod / g.apps) * 100), href: '/applications' },
    { key: 'auditioned', color: '#0c2520', main: '' + audInPeriod, label: 'auditioned', pct: Math.min(100, (audInPeriod / g.aud) * 100), href: '/applications' },
    { key: 'posted', color: '#92d7af', main: '' + postedInPeriod, label: 'posted', pct: Math.min(100, (postedInPeriod / g.post) * 100), href: '/my-jobs' },
  ].filter(r => !dismissed.includes(r.key))

  const dayOfWeek = (nowD.getDay() + 6) % 7
  const monday = new Date(nowD); monday.setDate(nowD.getDate() - dayOfWeek)
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
  const daysInMonth = new Date(nowD.getFullYear(), nowD.getMonth() + 1, 0).getDate()
  const dailyViews = Array.from({ length: daysInMonth }, (_, i) => { const key = nowD.getFullYear() + '-' + pad(nowD.getMonth() + 1) + '-' + pad(i + 1); return viewDates.filter(d => dateStr(d) === key).length })
  const maxDaily = Math.max(1, ...dailyViews)
  const viewsThisMonthTotal = dailyViews.reduce((a, b) => a + b, 0)
  const monthName = nowD.toLocaleDateString('en-GB', { month: 'long' })
  const totalApplicants = postedJobs.reduce((a, j) => a + j.applicant_count, 0)

  const nextEvent = weekEvents[0]
  const nextAction = !profile?.picture_url ? { label: 'Add a profile photo', sub: 'Profiles with a photo get 4x more views', href: '/profile/edit' }
    : !profile?.bio ? { label: 'Write your bio', sub: 'Tell casting who you are', href: '/profile/edit' }
    : !profile?.location ? { label: 'Add your location', sub: 'Get found for local roles', href: '/profile/edit' }
    : !profile?.vid_1 ? { label: 'Add a showreel', sub: 'Reels triple your profile views', href: '/profile/customise' } : null

  let focus: { tone: 'mint' | 'dark'; icon: React.ReactNode; eyebrow: string; title: string; sub: string; href: string; cta: string }
  if (nextEvent) {
    const ev = new Date(nextEvent.start_date + 'T12:00:00')
    const isToday = nextEvent.start_date === dateStr(nowD)
    const when = isToday ? 'Today' + (nextEvent.start_time ? ' · ' + nextEvent.start_time.slice(0, 5) : '') : ev.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    focus = { tone: 'dark', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#92d7af" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>, eyebrow: 'Up next', title: nextEvent.title, sub: when, href: '/calendar', cta: 'View' }
  } else if (nextAction) {
    focus = { tone: 'mint', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.7" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>, eyebrow: 'Suggested for you', title: nextAction.label, sub: nextAction.sub, href: nextAction.href, cta: 'Do it' }
  } else {
    focus = { tone: 'mint', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.7" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>, eyebrow: 'Ready when you are', title: 'Find your next role', sub: 'New jobs are posted daily', href: '/dashboard', cta: 'Browse' }
  }

  const menuItems = [
    { label: 'Calendar', sub: 'Auditions and bookings', href: '/calendar', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    { label: 'My applications', sub: appDates.length + ' submitted', href: '/applications', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    { label: 'Saved jobs', sub: 'Roles you bookmarked', href: '/saved', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg> },
    { label: 'Expenses', sub: 'Receipts and spending', href: '/expenses', icon: <span style={{ fontSize: '19px', fontWeight: 500, lineHeight: 1, fontFamily: 'system-ui, sans-serif' }}>£</span> },
    { label: 'Connections', sub: connections.length + ' collaborators', href: '/connections', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg> },
    { label: 'Customise your Ident', sub: 'Reorder, photo, showreels', href: '/profile/customise', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { label: 'Billing', sub: 'Plan and payments', href: '/billing', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
    { label: 'Password & security', sub: 'Change your password', href: '/security', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '100px' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px);} to { opacity:1; transform:translateY(0);} }
        @keyframes overlayIn { from { opacity:0;} to { opacity:1;} }
        @keyframes popupIn { from { opacity:0; transform:scale(0.94) translateY(10px);} to { opacity:1; transform:scale(1) translateY(0);} }
        .stagger { opacity:0; animation:fadeUp 0.5s cubic-bezier(0.22,0.61,0.36,1) forwards; }
        .ov { animation: overlayIn 0.25s ease-out; }
        .pp { animation: popupIn 0.32s cubic-bezier(0.22,0.61,0.36,1); }
        .tap { -webkit-tap-highlight-color: transparent; transition: transform 0.12s ease; cursor: pointer; }
        .tap:active { transform: scale(0.98); }
        .menu-row:active { background: #f3f0e9 !important; }
        .row::-webkit-scrollbar { display:none; }
        .row { scrollbar-width:none; }
      `}</style>

      {/* NUDGE POPUP */}
      {nudgeOpen && (
        <div className="ov" onClick={dismissNudge} style={{ position: 'fixed', inset: 0, background: 'rgba(6,20,16,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="pp" onClick={e => e.stopPropagation()} style={{ background: focus.tone === 'dark' ? '#0c2520' : 'white', border: focus.tone === 'dark' ? 'none' : '1px solid #ebe8e1', borderRadius: '24px', padding: '28px 24px 24px', maxWidth: '320px', width: '100%', position: 'relative', textAlign: 'center' }}>
            <button onClick={dismissNudge} style={{ position: 'absolute', top: '14px', right: '14px', width: '30px', height: '30px', borderRadius: '50%', background: focus.tone === 'dark' ? 'rgba(255,255,255,0.1)' : '#f3f0e9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={focus.tone === 'dark' ? '#f1f0ee' : '#888'} strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: focus.tone === 'dark' ? 'rgba(146,215,175,0.15)' : '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{focus.icon}</div>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, margin: '0 0 6px', color: focus.tone === 'dark' ? '#92d7af' : '#92a89c' }}>{focus.eyebrow}</p>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', fontWeight: 500, margin: '0 0 6px', color: focus.tone === 'dark' ? '#f1f0ee' : '#0c2520', lineHeight: 1.2 }}>{focus.title}</p>
            <p style={{ fontSize: '13px', margin: '0 0 22px', color: focus.tone === 'dark' ? 'rgba(241,240,238,0.65)' : '#888', lineHeight: 1.4 }}>{focus.sub}</p>
            <Link href={focus.href} onClick={dismissNudge} style={{ textDecoration: 'none' }}>
              <div className="tap" style={{ background: focus.tone === 'dark' ? '#92d7af' : '#0c2520', color: focus.tone === 'dark' ? '#0c2520' : '#f1f0ee', padding: '13px', borderRadius: '24px', fontSize: '14px', fontWeight: 500, textAlign: 'center' }}>{focus.cta}</div>
            </Link>
          </div>
        </div>
      )}

      {/* VIEWS POPUP */}
      {viewsOpen && (
        <div className="ov" onClick={() => setViewsOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(6,20,16,0.4)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="pp" onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', padding: '24px', maxWidth: '360px', width: '100%', position: 'relative' }}>
            <button onClick={() => setViewsOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', width: '30px', height: '30px', borderRadius: '50%', background: '#f3f0e9', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, color: '#92a89c', margin: '0 0 4px' }}>{monthName}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '20px' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '32px', fontWeight: 500, color: '#0c2520', margin: 0, lineHeight: 1 }}>{viewsThisMonthTotal}</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>profile views</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '110px' }}>
              {dailyViews.map((count, i) => {
                const isToday = i + 1 === nowD.getDate()
                return <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ height: (count / maxDaily) * 100 + '%', minHeight: count > 0 ? '4px' : '2px', background: isToday ? '#0c2520' : '#cfe6da', borderRadius: '2px' }} />
                </div>
              })}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <AppHeader title="Greenroom" />

      <div style={{ padding: '0 16px' }}>
        {/* PROFILE CARD — edit / view */}
        <div className="stagger" style={{ animationDelay: '0.03s', background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '14px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: profile?.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#e8efea', backgroundSize: 'cover', border: '1px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {!profile?.picture_url && <span style={{ fontFamily: "'ITC Symbol',Georgia,serif", fontSize: '16px', fontWeight: 500, color: '#92d7af' }}>{(profile?.first_name || '?')[0]}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName || 'Your Ident'}</p>
            <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
              <span style={{ fontSize: '12px', color: completion >= 100 ? '#7a9a2e' : '#92a89c', fontWeight: 500 }}>{completion}% complete{completion < 100 ? ' · finish it' : ''}</span>
            </Link>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <Link href="/profile/edit" style={{ textDecoration: 'none' }}>
              <div className="tap" style={{ background: '#0c2520', color: '#f1f0ee', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>Edit</div>
            </Link>
            <Link href={publicHref} style={{ textDecoration: 'none' }}>
              <div className="tap" style={{ background: 'white', color: '#0c2520', padding: '8px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, border: '1px solid #e0ddd5' }}>View</div>
            </Link>
          </div>
        </div>

        {/* STREAK */}
        <div className="stagger" style={{ animationDelay: '0.06s', background: 'white', border: '1px solid #ebe8e1', borderRadius: '18px', padding: '18px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#4ade80"><path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0 0 10 0c0-1.5-.5-3-1.5-4 .5 2-.5 3-1.5 3 .5-2-.5-4-2-5 .5 2-1 3-1 4-1-1-1-2-1-3 0-2 2-4 3-7z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: 0, lineHeight: 1 }}>{streak} day{streak === 1 ? '' : 's'}</p>
              <p style={{ fontSize: '12px', color: '#999', margin: '3px 0 0' }}>{streak > 0 ? 'Show up tomorrow to keep it going' : 'Start your streak today'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {weekDays.map((d, i) => {
              const active = activeDates.has(dateStr(d)); const future = d > nowD
              return <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: active ? '#4ade80' : 'transparent', border: active ? 'none' : '1.5px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: future ? 0.5 : 1 }}>
                  {active && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#061410" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span style={{ fontSize: '10px', color: '#aaa', fontWeight: 500 }}>{dayLetters[i]}</span>
              </div>
            })}
          </div>
        </div>

        {/* ACTIVITY — swipeable rings */}
        <div className="stagger" style={{ animationDelay: '0.1s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Your activity</p>
            <div style={{ display: 'flex', background: '#e6e2d9', borderRadius: '20px', padding: '3px' }}>
              {(['W', 'M', '6M'] as Period[]).map(p => (
                <button key={p} onClick={() => setPeriod(p)} className="tap" style={{ padding: '5px 11px', borderRadius: '16px', border: 'none', background: period === p ? '#0c2520' : 'transparent', color: period === p ? '#f1f0ee' : '#888', fontSize: '11px', fontWeight: 500, fontFamily: 'inherit' }}>{p}</button>
              ))}
            </div>
          </div>
          <div className="row" style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollSnapType: 'x mandatory', margin: '0 -16px', padding: '0 16px 4px' }}>
            {rings.map(r => {
              const inner = <ProgressRing percent={r.pct} color={r.color} main={r.main} label={r.label} onDismiss={r.dismissible ? () => dismissRing(r.key) : undefined} />
              if (r.href) return <Link key={r.key} href={r.href} style={{ textDecoration: 'none' }}>{inner}</Link>
              return <div key={r.key} className="tap" onClick={r.tap}>{inner}</div>
            })}
          </div>
        </div>

        {/* NOTES */}
        <div className="stagger" style={{ animationDelay: '0.13s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Notes</p>
            <span style={{ fontSize: '11px', color: savingNotes ? '#999' : savedTick ? '#7a9a2e' : '#bbb', fontWeight: 500, transition: 'color 0.3s' }}>{savingNotes ? 'Saving…' : savedTick ? 'Saved' : ''}</span>
          </div>
          <div style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '4px' }}>
            <textarea value={notes} onChange={e => onNotesChange(e.target.value)} placeholder="Jot down a reminder, a casting director's note, a line to learn…"
              style={{ width: '100%', minHeight: '84px', border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'inherit', fontSize: '14px', color: '#0c2520', lineHeight: 1.5, padding: '12px', boxSizing: 'border-box' }} />
          </div>
        </div>

        {/* POSTED JOBS */}
        {postedJobs.length > 0 && (
          <div className="stagger" style={{ animationDelay: '0.16s', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Your posted jobs{totalApplicants > 0 ? ' · ' + totalApplicants + ' applicants' : ''}</p>
              <Link href="/my-jobs" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>See all</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {postedJobs.slice(0, 3).map(j => {
                const posted = new Date(j.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                return (
                  <Link key={j.id} href="/my-jobs" style={{ textDecoration: 'none' }}>
                    <div className="tap" style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</p>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <span style={{ fontSize: '10px', color: '#0c2520', background: '#e8efea', padding: '2px 8px', borderRadius: '4px', fontWeight: 500, textTransform: 'capitalize' }}>{j.status || 'Active'}</span>
                          <span style={{ fontSize: '11px', color: '#aaa' }}>Posted {posted}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', background: j.applicant_count > 0 ? '#0c2520' : '#f3f0e9', borderRadius: '12px', padding: '8px 14px', minWidth: '64px' }}>
                        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', fontWeight: 500, color: j.applicant_count > 0 ? '#f1f0ee' : '#999', margin: 0, lineHeight: 1 }}>{j.applicant_count}</p>
                        <p style={{ fontSize: '9px', color: j.applicant_count > 0 ? '#92d7af' : '#aaa', margin: '3px 0 0', fontWeight: 500 }}>applicant{j.applicant_count === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* NETWORK */}
        <div className="stagger" style={{ animationDelay: '0.19s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Network</p>
            <Link href={connections.length > 0 ? '/connections' : '/browse'} style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>{connections.length > 0 ? 'See all' : 'Browse'}</Link>
          </div>
          <div className="row" style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
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
                      {c.picture_url ? <img src={c.picture_url} alt={c.first_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '18px', fontWeight: 500, color: '#92d7af', fontFamily: "'ITC Symbol',Georgia,serif" }}>{(c.first_name || '?')[0]}</span>}
                    </div>
                    {on && <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '13px', height: '13px', borderRadius: '50%', background: '#4ade80', border: '2.5px solid #f1f0ee' }} />}
                  </div>
                  <p style={{ fontSize: '11px', color: '#0c2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{c.first_name}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* CALENDAR SPLIT */}
        <div className="stagger" style={{ animationDelay: '0.22s', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Calendar</p>
            <Link href="/calendar" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>Open</Link>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
            <MiniCalendar eventDates={eventDates} />
            <div style={{ flex: 1, background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '14px 12px', display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 10px' }}>Up next</p>
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
                            <p style={{ fontSize: '12px', fontWeight: 500, color: '#0c2520', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</p>
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

        {/* COMMUNITIES — merged carousel */}
        {communities.length > 0 && (
          <div className="stagger" style={{ animationDelay: '0.25s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Communities</p>
              <Link href="/communities" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>See all</Link>
            </div>
            <div className="row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '4px' }}>
              {communities.map(c => (
                <Link key={c.id} href={'/communities/' + c.slug} style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div className="tap" style={{ width: '150px', background: 'white', borderRadius: '14px', border: '1px solid #ebe8e1', overflow: 'hidden' }}>
                    <div style={{ position: 'relative', height: '70px', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover' }}>
                      {!c.joined && <span style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(12,37,32,0.85)', color: '#92d7af', fontSize: '9px', fontWeight: 500, padding: '2px 7px', borderRadius: '4px', letterSpacing: '0.03em' }}>SUGGESTED</span>}
                    </div>
                    <div style={{ padding: '10px 12px 12px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                      <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>{c.member_count + ' members'}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* MORE */}
        <div className="stagger" style={{ animationDelay: '0.3s' }}>
          <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>More</p>
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
          <button onClick={handleLogout} className="tap" style={{ width: '100%', padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #ebe8e1', borderRadius: '16px', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit' }}>Log out</button>
          <p style={{ textAlign: 'center', fontSize: '11px', color: '#ccc', margin: '16px 0 0' }}>The Ident · Version 1.0</p>
        </div>
      </div>
    </div>
  )
}
