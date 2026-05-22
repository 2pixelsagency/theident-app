'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Skill = {
  id: number
  name: string
  category_id: number | null
  category_name?: string
  category_color?: string
  category_text_color?: string
}

export default function OnboardingStep3() {
  const router = useRouter()
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([])
  const [agent, setAgent] = useState('')
  const [noAgent, setNoAgent] = useState(false)
  const [search, setSearch] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const [{ data: skillsData }, { data: profile }, { data: profileSkills }] = await Promise.all([
        supabase.from('skills').select('id, name, category_id, skills_categories(name, color, text_color)').order('name'),
        supabase.from('profiles').select('what_i_do').eq('id', user.id).single(),
        supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
      ])

      const formatted: Skill[] = (skillsData || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category_id: s.category_id,
        category_name: s.skills_categories?.name,
        category_color: s.skills_categories?.color || '#e4e4e4',
        category_text_color: s.skills_categories?.text_color || '#4a4a4a',
      }))

      setAllSkills(formatted)
      if (profile?.what_i_do) setAgent(profile.what_i_do)
      if (profileSkills) setSelectedSkillIds(profileSkills.map(ps => ps.skill_id))
      setLoading(false)
    }
    load()
  }, [router])

  const addSkill = (id: number) => {
    if (!selectedSkillIds.includes(id)) {
      setSelectedSkillIds([...selectedSkillIds, id])
    }
    setSearch('')
    setShowDropdown(false)
  }

  const removeSkill = (id: number) => {
    setSelectedSkillIds(selectedSkillIds.filter(s => s !== id))
  }

  const handleNext = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      what_i_do: noAgent ? null : agent,
    }).eq('id', user.id)

    await supabase.from('profile_skills').delete().eq('profile_id', user.id)
    if (selectedSkillIds.length > 0) {
      await supabase.from('profile_skills').insert(
        selectedSkillIds.map(skill_id => ({ profile_id: user.id, skill_id }))
      )
    }

    router.push('/onboarding/step-4')
  }

  // Filter for dropdown (only show when search has 2+ chars)
  const filteredSkills = search.length >= 1
    ? allSkills
        .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
        .filter(s => !selectedSkillIds.includes(s.id))
        .slice(0, 20)
    : []

  // Group filtered by category
  const groupedSkills = filteredSkills.reduce((acc: Record<string, Skill[]>, skill) => {
    const cat = skill.category_name || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  const selectedSkills = allSkills.filter(s => selectedSkillIds.includes(s.id))

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 40px' }}>Show off those skills</h1>

        {/* Agent */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Agent</label>
          <input
            type="text"
            value={agent}
            disabled={noAgent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="e.g. Hamilton Hodell"
            style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: noAgent ? '#f5f3ee' : 'white', boxSizing: 'border-box', opacity: noAgent ? 0.5 : 1 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', fontSize: '13px', color: '#666', cursor: 'pointer' }}>
            <input type="checkbox" checked={noAgent} onChange={(e) => setNoAgent(e.target.checked)} />
            I don&apos;t have an agent
          </label>
        </div>

        {/* Skills search */}
        <div style={{ marginBottom: '24px', position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>
            Skills <span style={{ color: '#888', fontWeight: 400 }}>({selectedSkills.length} selected)</span>
          </label>
          <input
            type="text"
            placeholder="Search skills (e.g. tap dance, French, juggling)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box' }}
          />

          {/* Dropdown */}
          {showDropdown && search.length >= 1 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #e0ddd5', borderRadius: '8px', maxHeight: '320px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              {Object.keys(groupedSkills).length === 0 ? (
                <div style={{ padding: '14px', fontSize: '13px', color: '#888' }}>No skills found</div>
              ) : (
                Object.entries(groupedSkills).map(([catName, skills]) => (
                  <div key={catName}>
                    <div style={{ padding: '8px 14px', fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, background: '#fafaf8' }}>{catName}</div>
                    {skills.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); addSkill(s.id) }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f3ee')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Selected skill tags */}
        {selectedSkills.length > 0 && (
          <div style={{ marginBottom: '40px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedSkills.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => removeSkill(s.id)}
                style={{
                  padding: '6px 12px 6px 14px',
                  borderRadius: '20px',
                  background: s.category_color,
                  color: s.category_text_color,
                  border: 'none',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 500,
                }}
              >
                {s.name}
                <span style={{ opacity: 0.6, fontSize: '14px' }}>×</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <button onClick={handleNext} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px 56px', borderRadius: '30px', fontSize: '16px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '24px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  )
}
