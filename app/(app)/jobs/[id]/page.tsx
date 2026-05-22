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

type ProductionType = { id: number; name: string }
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
  const [savedId, setSavedId] = useState<string | null>(null)

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
          const enriched = skillsData.map(s => ({
            ...s,
            category: cats?.find(c => c.id === s.category_id),
          }))
          setJobSkills(enriched)
        }
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: sj } = await supabase.from('saved_jobs').select('id').eq('user_id', user.id).eq('job_id', jobId).maybeSingle()
        if (sj) { setSaved(true); setSavedId(sj.id) }
      }

      setLoading(false)
    }
    load()
  }, [jobId])

  const toggleSaved = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    if (saved && savedId) {
      await supabase.from('saved_jobs').delete().eq('id', savedId)
      setSaved(false)
      setSavedId(null)
    } else {
      const { data } = await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId }).select().single()
      if (data) { setSaved(true); setSavedId(data.id) }
    }
  }

  const handleApply = () => {
    if (job?.submission_link) {
      window.open(job.submission_link, '_blank')
    } else if (job?.casting_email) {
      window.location.href = `mailto:${job.casting_email}?subject=Application for ${job.project_role || job.job_title}`
    }
  }

  if (loading) return <div style={{ padding: '32px 40px' }}>Loading...</div>
  if (!job) return <div style={{ padding: '32px 40px' }}>Job not found</div>

  const title = job.is_side_hustle ? job.job_title : job.project_role
  const subtitle = job.is_side_hustle ? job.company : job.project_in

  return (
    <div style={{ padding: '32px 40px' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .pill { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; }
      `}</style>

      <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>

        <button onClick={() => router.back()} style={{ background: 'transparent', border: 'none', padding: '0 0 16px', fontSize: '13px', color: '#666', cursor: 'pointer', fontFamily: 'inherit' }}>
          ← Back
        </button>

        <div style={{ background: 'white', borderRadius: '16px', padding: '40px', border: '1px solid #e8e6e0', marginBottom: '20px' }}>
          {job.is_spotlighted && (
            <div style={{ display: 'inline-block', background: '#92d7af', color: '#0c2520', padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, marginBottom: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Spotlight
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '8px' }}>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', fontWeight: 500, color: '#0c2520', margin: 0, lineHeight: 1.2 }}>{title}</h1>
            <button onClick={toggleSaved} style={{ background: saved ? '#0c2520' : 'white', color: saved ? '#f1f0ee' : '#0c2520', border: '1px solid #0c2520', padding: '10px 20px', borderRadius: '24px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>

          {subtitle && <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#666', margin: '0 0 16px', fontStyle: 'italic' }}>In {subtitle}</p>}

          {job.short_summary && <p style={{ fontSize: '15px', color: '#0c2520', margin: '0 0 20px', lineHeight: 1.5 }}>{job.short_summary}</p>}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
            {job.location && <span className="pill" style={{ background: '#f1f0ee', color: '#0c2520' }}>{job.location}</span>}
            {productionTypeName && <span className="pill" style={{ background: '#e8efea', color: '#0c2520' }}>{productionTypeName}</span>}
            {job.production_company && <span className="pill" style={{ background: '#f1f0ee', color: '#0c2520' }}>{job.production_company}</span>}
            {job.salary && <span className="pill" style={{ background: '#0c2520', color: '#f1f0ee' }}>{job.salary}</span>}
            {job.is_side_hustle && <span className="pill" style={{ background: '#fde6c2', color: '#8a5a2e' }}>Side Hustle</span>}
            {job.audition_friendly && <span className="pill" style={{ background: '#e8efea', color: '#0c2520' }}>Audition Friendly</span>}
            {job.dbs_required && <span className="pill" style={{ background: '#fde6c2', color: '#8a5a2e' }}>DBS Required</span>}
          </div>

          <button onClick={handleApply} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px 40px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Apply Now
          </button>
        </div>

        {!job.is_side_hustle && (job.age_range || job.gender_requirement || job.appearance || job.height || jobSkills.length > 0) && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Talent requirements</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: jobSkills.length > 0 ? '24px' : 0 }}>
              {job.age_range && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Playing Age</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.age_range}</p>
                </div>
              )}
              {job.gender_requirement && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gender</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.gender_requirement}</p>
                </div>
              )}
              {job.appearance && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Appearance</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.appearance}</p>
                </div>
              )}
              {job.height && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Height</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.height}cm</p>
                </div>
              )}
            </div>

            {jobSkills.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Required Skills</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {jobSkills.map(skill => (
                    <span key={skill.id} style={{ background: skill.category?.color || '#e8efea', color: skill.category?.text_color || '#0c2520', padding: '4px 10px', borderRadius: '6px', fontSize: '12px' }}>
                      {skill.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {job.is_side_hustle && (job.commitment_level || job.experience_level || job.schedule) && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {job.commitment_level && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Commitment</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.commitment_level}</p>
                </div>
              )}
              {job.experience_level && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Experience</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.experience_level}</p>
                </div>
              )}
              {job.schedule && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Schedule</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.schedule}</p>
                </div>
              )}
              {job.start_date && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{new Date(job.start_date).toLocaleDateString('en-GB')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {(job.contract_dates || job.application_deadline) && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>When and where</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              {job.contract_dates && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract Dates</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{job.contract_dates}</p>
                </div>
              )}
              {job.application_deadline && (
                <div>
                  <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Apply By</p>
                  <p style={{ fontSize: '14px', color: '#0c2520', margin: 0 }}>{new Date(job.application_deadline).toLocaleDateString('en-GB')}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {job.description && (
          <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0', marginBottom: '20px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px' }}>Full description</h2>
            <p style={{ fontSize: '14px', color: '#0c2520', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px' }}>How to apply</h2>
          {job.casting_team && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 8px' }}><strong>Contact:</strong> {job.casting_team}</p>}
          {job.casting_email && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 16px' }}><strong>Email:</strong> <a href={`mailto:${job.casting_email}`} style={{ color: '#0c2520' }}>{job.casting_email}</a></p>}
          <button onClick={handleApply} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px 40px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            Apply Now
          </button>
        </div>
      </div>
    </div>
  )
}
