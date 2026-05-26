'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Job = {
  id: string
  project_role: string | null
  project_in: string | null
  production_company: string | null
  short_summary: string | null
  location: string | null
  salary: string | null
  description: string | null
  is_side_hustle: boolean
  is_spotlighted: boolean
  production_type_id: number | null
  age_range: string | null
  gender_requirement: string | null
  appearance: string | null
  height: string | null
  casting_email: string | null
  casting_team: string | null
  submission_link: string | null
  contract_dates: string | null
  application_deadline: string | null
  job_title: string | null
  company: string | null
  job_category: string | null
  commitment_level: string | null
  experience_level: string | null
  audition_friendly: boolean
  schedule: string | null
  dbs_required: boolean
  start_date: string | null
  created_at: string
}

type Skill = { id: number; name: string; category_id: number | null }
type SkillCategory = { id: number; name: string; color: string; text_color: string }

export default function JobDetail() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string

  const [job, setJob] = useState<Job | null>(null)
  const [productionTypeName, setProductionTypeName] = useState<string>('')
  const [jobSkills, setJobSkills] = useState<Array<Skill & { category?: SkillCategory }>>([])
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState<'saved' | 'unsaved' | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: jobData } = await supabase.from('jobs').select('*').eq('id', jobId).single()
      if (!jobData) { setLoading(false); return }
      setJob(jobData)

      if (jobData.production_type_id) {
        const { data: pt } = await supabase.from('production_types').select('name').eq('id', jobData.production_type_id).single()
        if (pt) setProductionTypeName(pt.name)
      }

      const { data: js } = await supabase.from('job_skills').select('skill_id').eq('job_id', jobId)
      if (js && js.length > 0) {
        const skillIds = js.map(x => x.skill_id)
        const { data: skillsData } = await supabase.from('skills').select('id, name, category_id').in('id', skillIds)
        const { data: cats } = await supabase.from('skills_categories').select('id, name, color, text_color')
        if (skillsData) {
          setJobSkills(skillsData.map(s => ({ ...s, category: cats?.find(c => c.id === s.category_id) })))
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: sj } = await supabase.from('saved_jobs').select('job_id').eq('profile_id', user.id).eq('job_id', jobId).maybeSingle()
        if (sj) setSaved(true)
      }

      setLoading(false)
    }
    load()
  }, [jobId])

  const showToast = (type: 'saved' | 'unsaved') => {
    setToast(type)
    setTimeout(() => setToast(null), 3000)
  }

  const toggleSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    if (saved) {
      await supabase.from('saved_jobs').delete().eq('profile_id', user.id).eq('job_id', jobId)
      setSaved(false)
      showToast('unsaved')
    } else {
      await supabase.from('saved_jobs').insert({ profile_id: user.id, job_id: jobId })
      setSaved(true)
      showToast('saved')
    }
  }

  const handleApply = () => {
    if (job?.submission_link) {
      window.open(job.submission_link, '_blank')
    } else if (job?.casting_email) {
      window.location.href = `mailto:${job.casting_email}?subject=Application for ${job.project_role || job.job_title}`
    }
  }

  const formatRelativeDate = (dateStr: string) => {
    const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return 'Last week'
    return `${Math.floor(diffDays / 7)} weeks ago`
  }

  if (loading) return <div style={{ minHeight: '100vh', background: 'white' }} />
  if (!job) return (
    <div style={{ minHeight: '100vh', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0c2520' }}>Job not found</p>
    </div>
  )

  const title = job.is_side_hustle ? job.job_title : job.project_role
  const subtitle = job.is_side_hustle ? job.company : job.project_in

  return (
    <div style={{ minHeight: '100vh', background: 'white', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .section-card { background: #f9f8f6; border-radius: 14px; padding: 20px; margin-bottom: 10px; }
        .apply-btn-main { transition: opacity 0.2s ease, transform 0.1s ease; -webkit-tap-highlight-color: transparent; }
        .apply-btn-main:active { opacity: 0.85; transform: scale(0.98); }
      `}</style>

      {toast && (
        <div className="toast-anim" style={{
          position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
          background: '#0c2520', color: '#f1f0ee', padding: '12px 24px',
          borderRadius: '30px', fontSize: '13px', fontWeight: 500,
          zIndex: 300, whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}>
          {toast === 'saved' ? 'Job saved' : 'Removed from saved'}
        </div>
      )}

      {/* Dark green header */}
      <div style={{
        background: '#0c2520',
        padding: '0 20px 24px',
        paddingTop: 'max(56px, env(safe-area-inset-top))',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <button
            onClick={() => router.back()}
            style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <button
            onClick={toggleSaved}
            style={{ background: saved ? '#92d7af' : 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s ease', WebkitTapHighlightColor: 'transparent' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#0c2520' : 'none'} stroke={saved ? '#0c2520' : '#f1f0ee'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>

        {job.is_spotlighted && (
          <span style={{ display: 'inline-block', background: '#92d7af', color: '#0c2520', padding: '3px 10px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '10px' }}>
            Spotlight
          </span>
        )}
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', fontWeight: 500, color: '#f1f0ee', margin: '0 0 6px', lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '14px', color: '#a8c4b4', margin: '0 0 16px', fontStyle: 'italic' }}>In {subtitle}</p>}

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {job.location && <span style={{ background: 'rgba(255,255,255,0.12)', color: '#f1f0ee', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>{job.location}</span>}
          {productionTypeName && <span style={{ background: 'rgba(255,255,255,0.12)', color: '#f1f0ee', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>{productionTypeName}</span>}
          {job.salary && <span style={{ background: '#92d7af', color: '#0c2520', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{job.salary}</span>}
          {job.audition_friendly && <span style={{ background: 'rgba(255,255,255,0.12)', color: '#f1f0ee', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>Audition friendly</span>}
          {job.dbs_required && <span style={{ background: 'rgba(255,165,0,0.2)', color: '#ffd580', padding: '5px 12px', borderRadius: '20px', fontSize: '12px' }}>DBS required</span>}
        </div>
      </div>

      {/* Content */}
      <div className="fade-in" style={{ padding: '16px 16px 110px' }}>

        {job.short_summary && (
          <div className="section-card">
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 8px' }}>About this role</p>
            <p style={{ fontSize: '14px', color: '#0c2520', margin: 0, lineHeight: 1.6 }}>{job.short_summary}</p>
          </div>
        )}

        {!job.is_side_hustle && (job.age_range || job.gender_requirement || job.appearance || job.height || jobSkills.length > 0) && (
          <div className="section-card">
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 14px' }}>Talent requirements</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: jobSkills.length > 0 ? '16px' : 0 }}>
              {job.age_range && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Playing age</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.age_range}</p></div>}
              {job.gender_requirement && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Gender</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.gender_requirement}</p></div>}
              {job.appearance && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Appearance</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.appearance}</p></div>}
              {job.height && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Height</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.height}cm</p></div>}
            </div>
            {jobSkills.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px' }}>Required skills</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {jobSkills.map(skill => (
                    <span key={skill.id} style={{ background: skill.category?.color || '#e8efea', color: skill.category?.text_color || '#0c2520', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>{skill.name}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {job.is_side_hustle && (job.commitment_level || job.experience_level || job.schedule || job.start_date) && (
          <div className="section-card">
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 14px' }}>Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {job.commitment_level && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Commitment</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.commitment_level}</p></div>}
              {job.experience_level && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Experience</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.experience_level}</p></div>}
              {job.schedule && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Schedule</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.schedule}</p></div>}
              {job.start_date && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Start date</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{new Date(job.start_date).toLocaleDateString('en-GB')}</p></div>}
            </div>
          </div>
        )}

        {(job.contract_dates || job.application_deadline) && (
          <div className="section-card">
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 14px' }}>When</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {job.contract_dates && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Contract dates</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{job.contract_dates}</p></div>}
              {job.application_deadline && <div><p style={{ fontSize: '11px', color: '#888', margin: '0 0 3px' }}>Apply by</p><p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{new Date(job.application_deadline).toLocaleDateString('en-GB')}</p></div>}
            </div>
          </div>
        )}

        {job.description && (
          <div className="section-card">
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 10px' }}>Full description</p>
            <p style={{ fontSize: '14px', color: '#0c2520', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>
        )}

        {(job.casting_team || job.casting_email) && (
          <div className="section-card">
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, margin: '0 0 10px' }}>Contact</p>
            {job.casting_team && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 4px' }}>{job.casting_team}</p>}
            {job.casting_email && <a href={`mailto:${job.casting_email}`} style={{ fontSize: '14px', color: '#0c2520', textDecoration: 'underline' }}>{job.casting_email}</a>}
          </div>
        )}

        <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', margin: '16px 0 0' }}>
          Posted {formatRelativeDate(job.created_at)}
        </p>
      </div>

      {/* Sticky apply bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white',
        borderTop: '1px solid #e8e6e0',
        padding: '12px 16px',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        zIndex: 150,
      }}>
        <button
          onClick={handleApply}
          className="apply-btn-main"
          style={{
            width: '100%', padding: '16px',
            background: '#0c2520', color: '#f1f0ee',
            border: 'none', borderRadius: '30px',
            fontSize: '16px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Apply now
        </button>
      </div>
    </div>
  )
}
