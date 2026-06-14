'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'
import Avatar from '@/components/Avatar'

type Period = 'W' | 'M' | '6M'
type Viewer = { id: string; first_name: string | null; picture_url: string | null; slug: string | null }

const PERIOD_DAYS: Record<Period, number> = { W: 7, M: 30, '6M': 180 }
const GOALS: Record<Period, { views: number; apps: number }> = {
  W: { views: 25, apps: 5 },
  M: { views: 100, apps: 20 },
  '6M': { views: 600, apps: 120 },
}

function pad(n: number) { return n < 10 ? '0' + n : '' + n }
function dateStr(d: Date) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) }

function ProgressRing({ percent, color, label, value }: { percent: number; color: string; label: string; value: string }) {
  const [val, setVal] = useState(0)
  useEffect(() => { const t = setTimeout(() => setVal(percent), 120); return () => clearTimeout(t) }, [percent])
  const size = 92, stroke = 8
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(val, 100) / 100) * circ
  return (
    <div style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '16px', padding: '14px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: size + 'px', height: size + 'px', marginBottom: '8px' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8e4de" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22,0.61,0.36,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', fontWeight: 500, color: '#0c2520', lineHeight: 1 }}>{percent}%</span>
        </div>
      </div>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#0c2520', margin: '0 0 1px', textAlign: 'center' }}>{value}</p>
      <p style={{ fontSize: '10px', color: '#888', margin: 0, textAlign: 'center' }}>{label}</p>
    </div>
  )
}

export default function ActivityPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('W')
  const [completion, setCompletion] = useState(0)
  const [viewDates, setViewDates] = useState<Date[]>([])
  const [appDates, setAppDates] = useState<Date[]>([])
  const [activeDates, setActiveDates] = useState<Set<string>>(new Set())
  const [recentViewers, setRecentViewers] = useState<Viewer[]>([])
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('first_name, last_name, picture_url, location, bio, slug').eq('id', user.id).single()
      if (prof) {
        const fields = [prof.first_name, prof.last_name, prof.picture_url, prof.location, prof.bio, prof.slug]
        setCompletion(Math.round((fields.filter(Boolean).length / fields.length) * 100))
      }

      // Log today's activity
      try { await supabase.from('daily_activity').upsert({ profile_id: user.id, activity_date: dateStr(new Date()) }, { onConflict: 'profile_id,activity_date' }) } catch {}

      // Activity days (last 90)
      try {
        const cutoff = dateStr(new Date(Date.now() - 90 * 86400000))
        const { data: acts } = await supabase.from('daily_activity').select('activity_date').eq('profile_id', user.id).gte('activity_date', cutoff)
        const set = new Set((acts || []).map((a: any) => a.activity_date))
        setActiveDates(set)
        let s = 0
        const d = new Date()
        while (set.has(dateStr(d))) { s++; d.setDate(d.getDate() - 1) }
        setStreak(s)
      } catch {}

      // Profile views
      try {
        const { data: views } = await supabase.from('profile_views').select('created_at, viewer_id').eq('profile_id', user.id).order('created_at', { ascending: false })
        setViewDates((views || []).map((v: any) => new Date(v.created_at)))
        const viewerIds = [...new Set((views || []).filter((v: any) => v.viewer_id).map((v: any) => v.viewer_id))].slice(0, 8)
        if (viewerIds.length > 0) {
          const { data: people } = await supabase.from('profiles').select('id, first_name, picture_url, slug').in('id', viewerIds)
          setRecentViewers(people || [])
        }
      } catch {}

      // Applications
      try {
        const { data: apps } = await supabase.from('applications').select('created_at').eq('profile_id', user.id)
        setAppDates((apps || []).map((a: any) => new Date(a.created_at)))
      } catch {}

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const now = new Date()
  const periodCutoff = new Date(Date.now() - PERIOD_DAYS[period] * 86400000)
  const viewsInPeriod = viewDates.filter(d => d >= periodCutoff).length
  const appsInPeriod = appDates.filter(d => d >= periodCutoff).length
  const viewsPct = Math.min(100, Math.round((viewsInPeriod / GOALS[period].views) * 100))
  const appsPct = Math.min(100, Math.round((appsInPeriod / GOALS[period].apps) * 100))

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const todayKey = dateStr(now)
  const viewsTotal = viewDates.length
  const viewsThisMonth = viewDates.filter(d => d >= startOfMonth).length
  const viewsLastMonth = viewDates.filter(d => d >= startOfLastMonth && d < startOfMonth).length
  const viewsToday = viewDates.filter(d => dateStr(d) === todayKey).length
  const momentumPct = viewsLastMonth > 0 ? Math.round(((viewsThisMonth - viewsLastMonth) / viewsLastMonth) * 100) : (viewsThisMonth > 0 ? 100 : 0)

  const dayOfWeek = (now.getDay() + 6) % 7
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek)
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); return d })
  const dayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dailyViews = Array.from({ length: daysInMonth }, (_, i) => {
    const key = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(i + 1)
    return viewDates.filter(d => dateStr(d) === key).length
  })
  const maxDaily = Math.max(1, ...dailyViews)
  const monthName = now.toLocaleDateString('en-GB', { month: 'long' })

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '100px' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        .fade { opacity:0; animation:fadeUp 0.5s ease-out forwards; }
        .bar-grow { transition: height 0.8s cubic-bezier(0.22,0.61,0.36,1); }
        .scroll-row::-webkit-scrollbar { display:none; }
      `}</style>

      {/* Header */}
      <AppHeader title="Your activity" showBack />

      {/* Period toggle */}
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', background: '#e8e4de', borderRadius: '20px', padding: '3px' }}>
          {(['W', 'M', '6M'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{ padding: '6px 12px', borderRadius: '16px', border: 'none', background: period === p ? '#0c2520' : 'transparent', color: period === p ? '#f1f0ee' : '#888', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* Rings */}
        <div className="fade" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
          <ProgressRing percent={completion} color="#0c2520" label="Profile strength" value="Your Ident" />
          <ProgressRing percent={viewsPct} color="#4ade80" label={'views this ' + (period === '6M' ? '6mo' : period === 'M' ? 'month' : 'week')} value={viewsInPeriod + ' / ' + GOALS[period].views} />
          <ProgressRing percent={appsPct} color="#92d7af" label={'applications'} value={appsInPeriod + ' / ' + GOALS[period].apps} />
        </div>

        {/* Streak card */}
        <div className="fade" style={{ background: '#0c2520', borderRadius: '20px', padding: '20px', marginBottom: '12px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(146,215,175,0.08)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px', position: 'relative' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '14px', background: 'rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="#4ade80" stroke="none"><path d="M12 2c1 3-1 5-2 6-1.5 1.5-3 3-3 6a5 5 0 0 0 10 0c0-1.5-.5-3-1.5-4 .5 2-.5 3-1.5 3 .5-2-.5-4-2-5 .5 2-1 3-1 4-1-1-1-2-1-3 0-2 2-4 3-7z"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '26px', fontWeight: 500, color: '#f1f0ee', margin: 0, lineHeight: 1 }}>{streak} day{streak === 1 ? '' : 's'}</p>
              <p style={{ fontSize: '12px', color: '#92d7af', margin: '4px 0 0' }}>{streak > 0 ? 'Show up tomorrow to keep it going' : 'Start your streak today'}</p>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            {weekDays.map((d, i) => {
              const active = activeDates.has(dateStr(d))
              const isFuture = d > now
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: active ? '#4ade80' : 'transparent', border: active ? 'none' : '1.5px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: isFuture ? 0.4 : 1 }}>
                    {active && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#061410" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize: '10px', color: 'rgba(241,240,238,0.5)', fontWeight: 500 }}>{dayLetters[i]}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Banked stats */}
        <div className="fade" style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '16px', padding: '18px', marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
          {[
            { label: 'Views all time', value: viewsTotal },
            { label: 'This month', value: viewsThisMonth },
            { label: 'Today', value: viewsToday },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', borderLeft: i > 0 ? '1px solid #f0ede5' : 'none' }}>
              <p style={{ fontSize: '11px', color: '#888', margin: '0 0 6px' }}>{s.label}</p>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: 0, lineHeight: 1 }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Momentum + recent viewers */}
        <div className="fade" style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '16px', padding: '18px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: recentViewers.length > 0 ? '16px' : 0 }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: momentumPct >= 0 ? '#e8efea' : '#f7e8e4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={momentumPct >= 0 ? '#0c2520' : '#c0392b'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {momentumPct >= 0 ? <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></> : <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></>}
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px' }}>
                {momentumPct >= 0 ? 'Up ' + momentumPct + '% on last month' : 'Down ' + Math.abs(momentumPct) + '% on last month'}
              </p>
              <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{momentumPct >= 0 ? 'Your Ident is gaining traction' : 'Share your Ident to climb back up'}</p>
            </div>
          </div>
          {recentViewers.length > 0 && (
            <>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Recently viewed your Ident</p>
              <div className="scroll-row" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                {recentViewers.map(v => (
                  <Link key={v.id} href={v.slug ? '/' + v.slug + '?from=app' : '#'} style={{ textDecoration: 'none', flexShrink: 0, textAlign: 'center', width: '52px' }}>
                    <div style={{ margin: '0 auto 4px', display: 'flex', justifyContent: 'center' }}>
                      <Avatar src={v.picture_url} name={v.first_name} size={48} ring="#e0ddd5" />
                    </div>
                    <p style={{ fontSize: '10px', color: '#0c2520', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{v.first_name}</p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Monthly performance chart */}
        <div className="fade" style={{ background: 'white', border: '1px solid #e8e4de', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '16px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Monthly performance</p>
            <span style={{ fontSize: '12px', color: '#888' }}>{monthName}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '120px' }}>
            {dailyViews.map((count, i) => {
              const isToday = i + 1 === now.getDate()
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
                  <div className="bar-grow" style={{ height: (count / maxDaily) * 100 + '%', minHeight: count > 0 ? '4px' : '0', background: isToday ? '#0c2520' : '#92d7af', borderRadius: '3px 3px 0 0', opacity: count > 0 ? 1 : 0.15 }} />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ fontSize: '10px', color: '#aaa' }}>1</span>
            <span style={{ fontSize: '10px', color: '#aaa' }}>{Math.ceil(daysInMonth / 2)}</span>
            <span style={{ fontSize: '10px', color: '#aaa' }}>{daysInMonth}</span>
          </div>
          <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', margin: '12px 0 0' }}>Profile views per day</p>
        </div>
      </div>
    </div>
  )
}
