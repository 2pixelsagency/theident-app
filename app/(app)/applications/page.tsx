'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Application = {
  id: string
  job_id: string
  cover_note: string | null
  nda_signed: boolean
  status: string
  created_at: string
  jobs: {
    project_role: string | null
    project_in: string | null
    job_title: string | null
    company: string | null
    production_company: string | null
    is_side_hustle: boolean
    location: string | null
  } | null
}

export default function ApplicationsPage() {
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'submitted' | 'reviewed' | 'accepted' | 'rejected'>('all')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('applications').select('*, jobs(project_role, project_in, job_title, company, production_company, is_side_hustle, location)').eq('profile_id', user.id).order('created_at', { ascending: false })
      setApplications(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? applications : applications.filter(a => a.status === filter)

  const statusColor = (s: string) => {
    if (s === 'submitted') return { bg: '#e8efea', color: '#0c2520' }
    if (s === 'reviewed') return { bg: '#fef3c7', color: '#92400e' }
    if (s === 'accepted') return { bg: '#4ade80', color: '#061410' }
    if (s === 'rejected') return { bg: '#fde8e8', color: '#c0392b' }
    return { bg: '#e8e4de', color: '#888' }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <div style={{ padding: '24px 16px 16px' }}>
        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '22px', fontWeight: 700, color: '#0c2520', margin: '0 0 16px' }}>My applications</p>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '20px', paddingBottom: '4px' }}>
          {(['all', 'submitted', 'reviewed', 'accepted', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', border: filter === f ? 'none' : '1px solid #e0ddd5', background: filter === f ? '#0c2520' : 'white', color: filter === f ? '#f1f0ee' : '#888', fontWeight: filter === f ? 600 : 400, textTransform: 'capitalize', whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>{f}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>No applications yet</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>Browse jobs and start applying</p>
            <Link href="/dashboard" style={{ fontSize: '13px', color: '#0c2520', fontWeight: 500, textDecoration: 'underline' }}>Browse jobs</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filtered.map(app => {
              const job = app.jobs
              const title = job?.is_side_hustle ? job.job_title : job?.project_role
              const subtitle = job?.is_side_hustle ? job.company : job?.project_in
              const sc = statusColor(app.status)
              return (
                <Link key={app.id} href={'/jobs/' + app.job_id} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <div>
                        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 700, color: '#0c2520', margin: '0 0 3px' }}>{title || 'Untitled'}</p>
                        {subtitle && <p style={{ fontSize: '12px', color: '#666', margin: 0, fontStyle: 'italic' }}>In {subtitle}</p>}
                      </div>
                      <span style={{ background: sc.bg, color: sc.color, padding: '3px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{app.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {job?.location && <span style={{ fontSize: '11px', color: '#888' }}>{job.location}</span>}
                      <span style={{ fontSize: '11px', color: '#aaa' }}>Applied {formatDate(app.created_at)}</span>
                      {app.nda_signed && <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>NDA signed</span>}
                    </div>
                    {app.cover_note && <p style={{ fontSize: '12px', color: '#888', margin: '8px 0 0', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any }}>{app.cover_note}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', margin: '20px 0 0' }}>{filtered.length} application{filtered.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  )
}
