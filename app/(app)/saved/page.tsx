'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Lookup = { id: number; name: string }

type Job = {
  id: string
  project_role: string | null
  project_in: string | null
  production_company: string | null
  company: string | null
  casting_team: string | null
  location: string | null
  short_summary: string | null
  is_side_hustle: boolean
  is_spotlighted: boolean
  production_type_id: number | null
  salary: string | null
  created_at: string
  job_title: string | null
}

type SavedJob = Job & { saved_at: string; saved_id: string }

export default function SavedJobs() {
  const router = useRouter()
  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const [{ data: pt }, { data: saved }] = await Promise.all([
        supabase.from('production_types').select('id, name').order('name'),
        supabase
          .from('saved_jobs')
          .select('profile_id, created_at, job_id, jobs!inner(*)')
          .eq('profile_id', user.id)
          .order('created_at', { ascending: false }),
      ])

      setProductionTypes(pt || [])

      const flat: SavedJob[] = (saved || [])
        .filter(s => s.jobs)
        .map(s => ({
          ...(s.jobs as unknown as Job),
          saved_at: s.created_at,
          saved_id: s.job_id,
        }))

      setSavedJobs(flat)
      setLoading(false)
    }
    load()
  }, [router])

  const unsave = async (e: React.MouseEvent, savedId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_jobs').delete().eq('profile_id', user.id).eq('job_id', savedId)
    setSavedJobs(savedJobs.filter(j => j.saved_id !== savedId))
  }

  const getProductionTypeName = (id: number | null) => {
    if (!id) return null
    return productionTypes.find(pt => pt.id === id)?.name
  }

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return diffDays + ' days ago'
    if (diffDays < 14) return 'Last week'
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago'
    if (diffDays < 60) return 'Last month'
    return Math.floor(diffDays / 30) + ' months ago'
  }

  const getSentBy = (job: Job) => {
    return job.is_side_hustle ? job.company : (job.casting_team || job.production_company)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .job-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .job-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(12,37,32,0.08); }
        .save-btn:active { opacity: 0.7; }
      `}</style>

      <div className="fade-in">

        {/* Header — matches app standard */}
        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 3px', letterSpacing: '0.02em' }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500, lineHeight: 1.2 }}>
                Saved jobs
              </p>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 16px 100px' }}>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 14px' }}>
            {savedJobs.length === 0 ? 'Jobs you save will appear here' : savedJobs.length + ' saved ' + (savedJobs.length === 1 ? 'job' : 'jobs')}
          </p>

          {savedJobs.length === 0 ? (
            <div style={{ background: 'white', borderRadius: '14px', padding: '48px 24px', border: '1px solid #e8e4de', textAlign: 'center' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>No saved jobs yet</p>
              <p style={{ fontSize: '13px', color: '#888', margin: '0 0 20px' }}>Browse the job board and tap Save to bookmark roles for later.</p>
              <Link href="/dashboard" style={{ display: 'inline-block', background: '#0c2520', color: '#f1f0ee', padding: '10px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, textDecoration: 'none', fontFamily: 'inherit' }}>
                Browse jobs
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {savedJobs.map(job => {
                const title = job.is_side_hustle ? job.job_title : job.project_role
                const subtitle = job.is_side_hustle ? job.company : job.project_in
                const productionTypeName = getProductionTypeName(job.production_type_id)
                const sentBy = getSentBy(job)
                return (
                  <Link key={job.saved_id} href={'/jobs/' + job.id} style={{ textDecoration: 'none' }}>
                    <div className="job-card" style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                        <button onClick={(e) => unsave(e, job.saved_id)} className="save-btn" style={{ background: '#0c2520', color: '#f1f0ee', border: '1px solid #0c2520', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}>
                          Saved
                        </button>
                      </div>
                      <div style={{ paddingRight: '72px' }}>
                        <h3 style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '16px', fontWeight: 500, color: '#0c2520', margin: '0 0 3px', lineHeight: 1.2 }}>{title}</h3>
                        {subtitle && <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px', fontStyle: 'italic' }}>In {subtitle}</p>}
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          {job.location && <span style={{ background: '#f1f0ee', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', color: '#0c2520' }}>{job.location}</span>}
                          {productionTypeName && <span style={{ background: '#e8efea', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', color: '#0c2520' }}>{productionTypeName}</span>}
                          {job.salary && <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', fontWeight: 500 }}>{job.salary}</span>}
                          {job.is_side_hustle && <span style={{ background: '#fde6c2', color: '#8a5a2e', padding: '3px 9px', borderRadius: '5px', fontSize: '11px' }}>Side hustle</span>}
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #f0ede5', paddingTop: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#888' }}>{formatRelativeDate(job.created_at)}{sentBy ? ' · via ' + sentBy : ''}</span>
                        <span style={{ fontSize: '11px', color: '#92d7af', fontWeight: 500 }}>Saved {formatRelativeDate(job.saved_at)}</span>
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
  )
}
