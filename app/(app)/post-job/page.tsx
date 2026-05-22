'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Lookup = { id: number; name: string }
type Skill = { id: number; name: string; category_id: number | null }
type SkillCategory = { id: number; name: string; color: string; text_color: string }

export default function PostJob() {
  const router = useRouter()
  const [isSideHustle, setIsSideHustle] = useState(false)
  const [spotlightJob, setSpotlightJob] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvc, setCardCvc] = useState('')
  const [processing, setProcessing] = useState(false)

  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([])

  // Industry job fields
  const [projectRole, setProjectRole] = useState('')
  const [projectIn, setProjectIn] = useState('')
  const [productionCompany, setProductionCompany] = useState('')
  const [shortSummary, setShortSummary] = useState('')
  const [salaryType, setSalaryType] = useState('Paid')
  const [salaryAmount, setSalaryAmount] = useState('')
  const [productionTypeId, setProductionTypeId] = useState<number | null>(null)
  const [location, setLocation] = useState('')
  const [contractDates, setContractDates] = useState('')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(40)
  const [genderRequirement, setGenderRequirement] = useState('')
  const [appearance, setAppearance] = useState('')
  const [height, setHeight] = useState('')
  const [castingEmail, setCastingEmail] = useState('')
  const [castingTeam, setCastingTeam] = useState('')
  const [submissionLink, setSubmissionLink] = useState('')
  const [description, setDescription] = useState('')

  // Side hustle fields
  const [jobTitle, setJobTitle] = useState('')
  const [company, setCompany] = useState('')
  const [jobCategory, setJobCategory] = useState('')
  const [commitmentLevel, setCommitmentLevel] = useState('')
  const [experience, setExperience] = useState('')
  const [auditionFriendly, setAuditionFriendly] = useState(false)
  const [schedule, setSchedule] = useState('')
  const [dbsRequired, setDbsRequired] = useState(false)
  const [applyEmail, setApplyEmail] = useState('')
  const [startDate, setStartDate] = useState('')

  const [skillSearch, setSkillSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setCastingEmail(user.email)
        setApplyEmail(user.email)
      }

      const [{ data: pt }, { data: s }, { data: sc }] = await Promise.all([
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('skills').select('id, name, category_id').order('name'),
        supabase.from('skills_categories').select('id, name, color, text_color'),
      ])
      setProductionTypes(pt || [])
      setSkills(s || [])
      setSkillCategories(sc || [])
    }
    load()
  }, [])

  const toggleSkill = (id: number) => {
    setSelectedSkills(selectedSkills.includes(id) ? selectedSkills.filter(x => x !== id) : [...selectedSkills, id])
  }

  const getCategoryForSkill = (skillId: number): SkillCategory | undefined => {
    const skill = skills.find(s => s.id === skillId)
    if (!skill || !skill.category_id) return undefined
    return skillCategories.find(c => c.id === skill.category_id)
  }

  const filteredSkills = skillSearch
    ? skills.filter(s => s.name.toLowerCase().includes(skillSearch.toLowerCase())).slice(0, 8)
    : []

  const validate = (): string | null => {
    if (isSideHustle) {
      if (!jobTitle.trim()) return 'Job title is required'
      if (!company.trim()) return 'Company is required'
      if (!applyEmail.trim()) return 'Apply email is required'
      if (!description.trim()) return 'Description is required'
    } else {
      if (!projectRole.trim()) return 'Project role is required'
      if (!projectIn.trim()) return 'Project name is required'
      if (!productionCompany.trim()) return 'Production company is required'
      if (!shortSummary.trim()) return 'Short summary is required'
      if (!castingEmail.trim()) return 'Casting email is required'
      if (!description.trim()) return 'Description is required'
    }
    return null
  }

  const handleSubmit = async () => {
    const err = validate()
    if (err) { alert(err); return }

    // If spotlight is on and we haven't gone through payment yet
    if (spotlightJob && !showPayment && !processing) {
      setShowPayment(true)
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    const salary = salaryType === 'Paid' ? salaryAmount : salaryType

    const spotlightFields = spotlightJob ? {
      is_spotlighted: true,
      spotlight_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    } : {}

    const baseData = {
      created_by: user.id,
      is_side_hustle: isSideHustle,
      is_published: true,
      location,
      salary,
      description,
      casting_email: isSideHustle ? applyEmail : castingEmail,
    }

    const jobData: Record<string, unknown> = isSideHustle
      ? {
          ...baseData,
          ...spotlightFields,
          job_title: jobTitle,
          company,
          job_category: jobCategory,
          commitment_level: commitmentLevel,
          experience_level: experience,
          audition_friendly: auditionFriendly,
          schedule,
          dbs_required: dbsRequired,
          start_date: startDate || null,
        }
      : {
          ...baseData,
          ...spotlightFields,
          project_role: projectRole,
          project_in: projectIn,
          production_company: productionCompany,
          short_summary: shortSummary,
          production_type_id: productionTypeId,
          contract_dates: contractDates,
          application_deadline: applicationDeadline || null,
          age_range: `${minAge}-${maxAge}`,
          gender_requirement: genderRequirement,
          appearance,
          height,
          casting_team: castingTeam,
          submission_link: submissionLink,
        }

    const { data: newJob, error } = await supabase.from('jobs').insert(jobData).select().single()

    if (error) {
      alert('Failed to post job: ' + error.message)
      setSaving(false)
      return
    }

    if (!isSideHustle && newJob && selectedSkills.length > 0) {
      await supabase.from('job_skills').insert(selectedSkills.map(skillId => ({ job_id: newJob.id, skill_id: skillId })))
    }

    router.push('/dashboard')
  }

  const handlePayment = async () => {
    setProcessing(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setShowPayment(false)
    await handleSubmit()
    setProcessing(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '8px',
    fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '12px', color: '#0c2520', marginBottom: '6px', fontWeight: 500,
  }

  const sectionStyle: React.CSSProperties = {
    fontFamily: 'Georgia, serif', fontSize: '15px', fontWeight: 500, color: '#0c2520',
    margin: '24px 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em',
  }

  return (
    <div style={{ padding: '32px 40px' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        input:focus, textarea:focus, select:focus { border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520 !important; }
        .toggle-switch {
          position: relative; width: 44px; height: 24px;
          background: #d4d2cc; border-radius: 12px; cursor: pointer;
          transition: background 0.2s ease;
        }
        .toggle-switch.on { background: #0c2520; }
        .toggle-knob {
          position: absolute; top: 2px; left: 2px; width: 20px; height: 20px;
          background: white; border-radius: 50%; transition: transform 0.2s ease;
        }
        .toggle-switch.on .toggle-knob { transform: translateX(20px); }
        .salary-pill {
          padding: 8px 14px; border-radius: 8px; font-size: 13px;
          cursor: pointer; transition: all 0.2s ease; font-family: inherit;
        }
        .salary-pill:hover { border-color: #0c2520 !important; }
        .range-slider {
          -webkit-appearance: none; appearance: none; width: 100%;
          height: 4px; background: #d4d2cc; border-radius: 2px; outline: none;
        }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; background: #0c2520; border-radius: 50%; cursor: pointer; border: none;
        }
        .range-slider::-moz-range-thumb {
          width: 16px; height: 16px; background: #0c2520; border-radius: 50%; cursor: pointer; border: none;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
      `}</style>

      <div className="fade-in" style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', margin: '0 0 6px' }}>Post a Job</h1>
            <p style={{ fontSize: '13px', color: '#666', margin: 0, maxWidth: '600px' }}>Please give at least 7 days&apos; notice so talent has time to put in their best work.</p>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'transparent', border: '1px solid #e0ddd5', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', color: '#0c2520', fontFamily: 'inherit' }}>
            Cancel
          </button>
        </div>

        {/* Spotlight Toggle */}
        <div style={{ background: 'linear-gradient(135deg, #92d7af 0%, #b5e5c5 100%)', border: '1px solid #6db98a', borderRadius: '12px', padding: '16px 20px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <p style={{ fontWeight: 600, fontSize: '14px', color: '#0c2520', margin: 0 }}>✨ Spotlight this job</p>
              <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>£5</span>
            </div>
            <p style={{ fontSize: '12px', color: '#0c2520', margin: 0 }}>Featured at the top of the dashboard for 7 days. Get booked faster.</p>
          </div>
          <div className={`toggle-switch ${spotlightJob ? 'on' : ''}`} onClick={() => setSpotlightJob(!spotlightJob)}>
            <div className="toggle-knob" />
          </div>
        </div>

        {/* Side Hustle Toggle */}
        <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <p style={{ fontWeight: 500, fontSize: '14px', color: '#0c2520', margin: 0 }}>Side Hustle</p>
              {isSideHustle && <span style={{ background: '#fde6c2', color: '#8a5a2e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>ON</span>}
            </div>
            <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>Toggle for non-industry jobs (teaching, hospitality, etc.)</p>
          </div>
          <div className={`toggle-switch ${isSideHustle ? 'on' : ''}`} onClick={() => setIsSideHustle(!isSideHustle)}>
            <div className="toggle-knob" />
          </div>
        </div>

        {/* INDUSTRY JOB FORM */}
        {!isSideHustle && (
          <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '28px' }}>

            <h2 style={{ ...sectionStyle, margin: '0 0 14px' }}>The Project</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Role <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={projectRole} onChange={(e) => setProjectRole(e.target.value)} placeholder="e.g. Charlie" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Project Name <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={projectIn} onChange={(e) => setProjectIn(e.target.value)} placeholder="e.g. To Make Ends Meat" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Production Company <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={productionCompany} onChange={(e) => setProductionCompany(e.target.value)} placeholder="e.g. BBC" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Production Type</label>
                <select value={productionTypeId || ''} onChange={(e) => setProductionTypeId(e.target.value ? Number(e.target.value) : null)} style={inputStyle}>
                  <option value="">Select...</option>
                  {productionTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>One-line Summary <span style={{ color: '#c44' }}>*</span></label>
              <input type="text" value={shortSummary} onChange={(e) => setShortSummary(e.target.value)} placeholder="What's this role about in one sentence?" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>Payment <span style={{ color: '#c44' }}>*</span></label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {['Paid', 'Equity', 'Expenses Only', 'Profit Share'].map(opt => (
                  <button key={opt} type="button" onClick={() => setSalaryType(opt)} className="salary-pill" style={{
                    background: salaryType === opt ? '#e8efea' : 'white',
                    border: salaryType === opt ? '1.5px solid #0c2520' : '1px solid #e0ddd5',
                    color: '#0c2520',
                    fontWeight: salaryType === opt ? 500 : 400,
                  }}>{opt}</button>
                ))}
              </div>
              {salaryType === 'Paid' && (
                <input type="text" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="e.g. £500/day or £2000 total" style={inputStyle} />
              )}
            </div>

            <h2 style={sectionStyle}>When & Where</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London, Cardiff" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contract Dates</label>
                <input type="text" value={contractDates} onChange={(e) => setContractDates(e.target.value)} placeholder="e.g. June 15-25 2026" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Application Deadline</label>
              <input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} style={inputStyle} />
            </div>

            <h2 style={sectionStyle}>Talent Requirements</h2>

            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <label style={labelStyle}>Required Skills</label>
              <input type="text" value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Search skills..." style={inputStyle} />
              {filteredSkills.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'white', border: '1px solid #e0ddd5', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                  {filteredSkills.map(skill => (
                    <button key={skill.id} type="button" onClick={() => { toggleSkill(skill.id); setSkillSearch('') }} style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', color: '#0c2520', fontFamily: 'inherit', borderBottom: '1px solid #f0f0f0' }}>
                      {skill.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedSkills.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                  {selectedSkills.map(skillId => {
                    const skill = skills.find(s => s.id === skillId)
                    const cat = getCategoryForSkill(skillId)
                    if (!skill) return null
                    return (
                      <span key={skillId} style={{ background: cat?.color || '#e8efea', color: cat?.text_color || '#0c2520', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {skill.name}
                        <button onClick={() => toggleSkill(skillId)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: '14px', padding: 0, lineHeight: 1 }}>×</button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Playing Age Range</label>
                <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>{minAge} – {maxAge}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#888', marginBottom: '4px', display: 'block' }}>Min</label>
                  <input type="range" min="0" max="100" value={minAge} onChange={(e) => { const v = Number(e.target.value); if (v <= maxAge) setMinAge(v) }} className="range-slider" />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#888', marginBottom: '4px', display: 'block' }}>Max</label>
                  <input type="range" min="0" max="100" value={maxAge} onChange={(e) => { const v = Number(e.target.value); if (v >= minAge) setMaxAge(v) }} className="range-slider" />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Gender</label>
                <input type="text" value={genderRequirement} onChange={(e) => setGenderRequirement(e.target.value)} placeholder="e.g. Any, Male, Female" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Appearance</label>
                <input type="text" value={appearance} onChange={(e) => setAppearance(e.target.value)} placeholder="e.g. Any" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Height (optional)</label>
              <div style={{ position: 'relative' }}>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="170" style={{ ...inputStyle, paddingRight: '50px' }} />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '13px', pointerEvents: 'none' }}>cm</span>
              </div>
            </div>

            <h2 style={sectionStyle}>How to Apply</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Casting Email <span style={{ color: '#c44' }}>*</span></label>
                <input type="email" value={castingEmail} onChange={(e) => setCastingEmail(e.target.value)} placeholder="castings@hbcastings.co.uk" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Casting Director / Team</label>
                <input type="text" value={castingTeam} onChange={(e) => setCastingTeam(e.target.value)} placeholder="e.g. Heather Basten CDG" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Submission Link (optional)</label>
              <input type="text" value={submissionLink} onChange={(e) => setSubmissionLink(e.target.value)} placeholder="Dropbox, Google Drive, etc." style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Full Description <span style={{ color: '#c44' }}>*</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role, character, and what you're looking for..." rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Posting...' : (spotlightJob ? 'Continue to Payment' : 'Post Job')}
            </button>
          </div>
        )}

        {/* SIDE HUSTLE FORM */}
        {isSideHustle && (
          <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '28px' }}>

            <h2 style={{ ...sectionStyle, margin: '0 0 14px' }}>The Role</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Job Title <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Pilates Cover Teacher" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Frame Studios" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  <option value="Fitness">Fitness & Wellness</option>
                  <option value="Teaching">Teaching</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Creative Arts">Creative Arts</option>
                  <option value="Childcare">Childcare</option>
                  <option value="Admin">Admin / Office</option>
                  <option value="Retail">Retail</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Commitment Level</label>
                <select value={commitmentLevel} onChange={(e) => setCommitmentLevel(e.target.value)} style={inputStyle}>
                  <option value="">Select...</option>
                  <option value="One-off">One-off</option>
                  <option value="Casual">Casual</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Full-time">Full-time</option>
                </select>
              </div>
            </div>

            <h2 style={sectionStyle}>Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Experience Required</label>
                <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 2 years teaching" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Schedule</label>
                <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. Mon-Fri evenings" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Shoreditch, London" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Salary / Rate</label>
                <input type="text" value={salaryAmount} onChange={(e) => setSalaryAmount(e.target.value)} placeholder="e.g. £25/class" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditionFriendly} onChange={(e) => setAuditionFriendly(e.target.checked)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
                Audition Friendly
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
                <input type="checkbox" checked={dbsRequired} onChange={(e) => setDbsRequired(e.target.checked)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
                DBS Required
              </label>
            </div>

            <h2 style={sectionStyle}>How to Apply</h2>

            <div style={{ marginBottom: '12px' }}>
              <label style={labelStyle}>Apply Email <span style={{ color: '#c44' }}>*</span></label>
              <input type="email" value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} placeholder="hello@yourcompany.com" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Description <span style={{ color: '#c44' }}>*</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role, what you're looking for, perks..." rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Posting...' : (spotlightJob ? 'Continue to Payment' : 'Post Side Hustle')}
            </button>
          </div>
        )}

        {/* Fake Payment Modal */}
        {showPayment && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(12, 37, 32, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '32px', maxWidth: '420px', width: '100%' }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 500, color: '#0c2520', margin: '0 0 6px' }}>✨ Spotlight your job</h2>
              <p style={{ fontSize: '13px', color: '#666', margin: '0 0 24px' }}>£5 to feature your job at the top of the dashboard for 7 days.</p>

              <div style={{ marginBottom: '12px' }}>
                <label style={labelStyle}>Card Number</label>
                <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={labelStyle}>Expiry</label>
                  <input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="MM/YY" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>CVC</label>
                  <input type="text" value={cardCvc} onChange={(e) => setCardCvc(e.target.value)} placeholder="123" style={inputStyle} />
                </div>
              </div>

              <p style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginBottom: '20px' }}>🔒 Test mode — no real payment will be taken</p>

              <button
                onClick={handlePayment}
                disabled={processing || !cardNumber || !cardExpiry || !cardCvc}
                style={{ width: '100%', background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', opacity: (processing || !cardNumber || !cardExpiry || !cardCvc) ? 0.5 : 1, fontFamily: 'inherit', marginBottom: '8px' }}
              >
                {processing ? 'Processing...' : 'Pay £5 & Post Job'}
              </button>

              <button onClick={() => { setShowPayment(false); setSpotlightJob(false) }} style={{ width: '100%', background: 'transparent', color: '#666', border: 'none', padding: '8px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel & Post Without Spotlight
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
