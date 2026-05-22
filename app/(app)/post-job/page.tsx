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
  const [saving, setSaving] = useState(false)

  // Lookups
  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [genders, setGenders] = useState<Lookup[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillCategories, setSkillCategories] = useState<SkillCategory[]>([])

  // Industry job fields
  const [projectRole, setProjectRole] = useState('')
  const [projectIn, setProjectIn] = useState('')
  const [productionCompany, setProductionCompany] = useState('')
  const [shortSummary, setShortSummary] = useState('')
  const [salary, setSalary] = useState('')
  const [productionTypeId, setProductionTypeId] = useState<number | null>(null)
  const [location, setLocation] = useState('')
  const [contractDates, setContractDates] = useState('')
  const [applicationDeadline, setApplicationDeadline] = useState('')
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [ageRange, setAgeRange] = useState('')
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

  // Skill search
  const [skillSearch, setSkillSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const [{ data: pt }, { data: g }, { data: s }, { data: sc }] = await Promise.all([
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('genders').select('id, name').order('id'),
        supabase.from('skills').select('id, name, category_id').order('name'),
        supabase.from('skills_categories').select('id, name, color, text_color'),
      ])
      setProductionTypes(pt || [])
      setGenders(g || [])
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

  const handleSubmit = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

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
          project_role: projectRole,
          project_in: projectIn,
          production_company: productionCompany,
          short_summary: shortSummary,
          production_type_id: productionTypeId,
          contract_dates: contractDates,
          application_deadline: applicationDeadline || null,
          age_range: ageRange,
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

    // Link skills (only for industry jobs)
    if (!isSideHustle && newJob && selectedSkills.length > 0) {
      await supabase.from('job_skills').insert(selectedSkills.map(skillId => ({ job_id: newJob.id, skill_id: skillId })))
    }

    router.push('/dashboard')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '8px',
    fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500,
  }

  const sectionTitleStyle: React.CSSProperties = {
    fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 500, color: '#0c2520',
    margin: '0 0 16px', paddingBottom: '12px', borderBottom: '1px solid #e8e6e0',
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
      `}</style>

      <div className="fade-in" style={{ maxWidth: '900px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', margin: '0 0 8px' }}>Post a Job</h1>
          <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Please try to give at least 7 days&apos; notice so talent has time to put in their best work — quick 1-day turnarounds don&apos;t always give a fair chance to creators.</p>
        </div>

        {/* Side Hustle Toggle */}
        <div style={{ background: '#f5f3ee', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div>
            <p style={{ fontWeight: 500, fontSize: '14px', color: '#0c2520', margin: '0 0 4px' }}>Side Hustle Jobs</p>
            <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>Toggle if this is a side hustle opportunity rather than an industry job</p>
          </div>
          <div className={`toggle-switch ${isSideHustle ? 'on' : ''}`} onClick={() => setIsSideHustle(!isSideHustle)}>
            <div className="toggle-knob" />
          </div>
        </div>

        {/* INDUSTRY JOB FORM */}
        {!isSideHustle && (
          <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '32px' }}>

            <h2 style={sectionTitleStyle}>Project Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Project Role <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={projectRole} onChange={(e) => setProjectRole(e.target.value)} placeholder="e.g. Charlie" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Project In <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={projectIn} onChange={(e) => setProjectIn(e.target.value)} placeholder="e.g. To Make Ends Meat" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Production Company <span style={{ color: '#c44' }}>*</span></label>
              <input type="text" value={productionCompany} onChange={(e) => setProductionCompany(e.target.value)} placeholder="e.g. BBC" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Short Summary <span style={{ color: '#c44' }}>*</span></label>
              <input type="text" value={shortSummary} onChange={(e) => setShortSummary(e.target.value)} placeholder="One line summary" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Salary <span style={{ color: '#c44' }}>*</span></label>
              <input type="text" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Equity Minimum" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Production Type</label>
                <select value={productionTypeId || ''} onChange={(e) => setProductionTypeId(e.target.value ? Number(e.target.value) : null)} style={inputStyle}>
                  <option value="">Select a category</option>
                  {productionTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. London, Cardiff" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Contract Dates</label>
                <input type="text" value={contractDates} onChange={(e) => setContractDates(e.target.value)} placeholder="e.g. June 15-25 2025" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Application Deadline</label>
                <input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <h2 style={sectionTitleStyle}>Talent Requirements</h2>

            <div style={{ marginBottom: '16px', position: 'relative' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Age Range</label>
                <input type="text" value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g. 25-35" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Gender</label>
                <input type="text" value={genderRequirement} onChange={(e) => setGenderRequirement(e.target.value)} placeholder="e.g. Male, Non-Binary" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={labelStyle}>Appearance</label>
                <input type="text" value={appearance} onChange={(e) => setAppearance(e.target.value)} placeholder="e.g. Any Appearance" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Height</label>
                <input type="text" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="e.g. 5ft 10" style={inputStyle} />
              </div>
            </div>

            <h2 style={sectionTitleStyle}>How to Apply</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Casting Email <span style={{ color: '#c44' }}>*</span></label>
                <input type="email" value={castingEmail} onChange={(e) => setCastingEmail(e.target.value)} placeholder="e.g. castings@HBcastings.co.uk" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Casting Team</label>
                <input type="text" value={castingTeam} onChange={(e) => setCastingTeam(e.target.value)} placeholder="e.g. Heather Basten CDG" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Submission Link (Dropbox, Drive, Cloud)</label>
              <input type="text" value={submissionLink} onChange={(e) => setSubmissionLink(e.target.value)} placeholder="Dropbox" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Description <span style={{ color: '#c44' }}>*</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="You can start typing here..." rows={8} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Posting...' : 'Post Job'}
            </button>
          </div>
        )}

        {/* SIDE HUSTLE FORM */}
        {isSideHustle && (
          <div style={{ background: 'white', border: '1px solid #e8e6e0', borderRadius: '12px', padding: '32px' }}>

            <h2 style={sectionTitleStyle}>Job Details</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Job Title <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Pilates Cover Teacher" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Company <span style={{ color: '#c44' }}>*</span></label>
                <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Frame Studios" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={jobCategory} onChange={(e) => setJobCategory(e.target.value)} style={inputStyle}>
                  <option value="">Select a category</option>
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
                  <option value="">Select</option>
                  <option value="One-off">One-off</option>
                  <option value="Casual">Casual</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Full-time">Full-time</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Experience Required</label>
                <input type="text" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 2 years teaching" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Schedule</label>
                <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. Mon-Fri evenings" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={labelStyle}>Location</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Shoreditch, London" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Salary / Rate</label>
                <input type="text" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. £25/class" style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
                <input type="checkbox" checked={auditionFriendly} onChange={(e) => setAuditionFriendly(e.target.checked)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
                Audition Friendly
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
                <input type="checkbox" checked={dbsRequired} onChange={(e) => setDbsRequired(e.target.checked)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
                DBS Required
              </label>
            </div>

            <h2 style={sectionTitleStyle}>How to Apply</h2>

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Apply Email <span style={{ color: '#c44' }}>*</span></label>
              <input type="email" value={applyEmail} onChange={(e) => setApplyEmail(e.target.value)} placeholder="hello@yourcompany.com" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Description <span style={{ color: '#c44' }}>*</span></label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the role, what you're looking for, perks..." rows={6} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
              {saving ? 'Posting...' : 'Post Side Hustle'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
