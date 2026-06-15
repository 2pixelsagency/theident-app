'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

type PostedJob = {
  id: string
  project_role: string | null
  project_in: string | null
  job_title: string | null
  company: string | null
  is_side_hustle: boolean
  location: string | null
  created_at: string
  is_published: boolean
  application_count: number
}

export default function MyJobsPage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<PostedJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      const { data: jobsData } = await supabase.from('jobs').select('id, project_role, project_in, job_title, company, is_side_hustle, location, created_at, is_published').eq('created_by', user.id).order('created_at', { ascending: false })
      if (jobsData && jobsData.length) {
        // One query for all applications across these jobs, then count in memory (was N+1 before)
        const jobIds = jobsData.map(j => j.id)
        const { data: apps } = await supabase.from('applications').select('job_id').in('job_id', jobIds)
        const countMap = new Map<string, number>()
        ;(apps || []).forEach((a: any) => countMap.set(a.job_id, (countMap.get(a.job_id) || 0) + 1))
        setJobs(jobsData.map(j => ({ ...j, application_count: countMap.get(j.id) || 0 })))
      } else {
        setJobs([])
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      {/* Header */}
      <AppHeader title="My posted jobs" showBack />

      {/* Post job */}
      <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/post-job" style={{ background: '#0c2520', color: '#f1f0ee', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>+ Post job</Link>
      </div>

      <div style={{ padding: '0 16px' }}>
        {jobs.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>No jobs posted yet</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>Post your first job to start receiving applications</p>
            <Link href="/post-job" style={{ fontSize: '13px', color: '#0c2520', fontWeight: 500, textDecoration: 'underline' }}>Post a job</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {jobs.map(job => {
              const title = job.is_side_hustle ? job.job_title : job.project_role
              const subtitle = job.is_side_hustle ? job.company : job.project_in
              return (
                <Link key={job.id} href={'/my-jobs/' + job.id} style={{ textDecoration: 'none' }}>
                  <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 3px' }}>{title || 'Untitled'}</p>
                      {subtitle && <p style={{ fontSize: '12px', color: '#888', margin: '0 0 6px', fontStyle: 'italic' }}>{subtitle}</p>}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {job.location && <span style={{ fontSize: '11px', color: '#aaa' }}>{job.location}</span>}
                        <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(job.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        {!job.is_published && <span style={{ fontSize: '10px', color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Draft</span>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '22px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{job.application_count}</p>
                        <p style={{ fontSize: '10px', color: '#888', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>applicants</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
