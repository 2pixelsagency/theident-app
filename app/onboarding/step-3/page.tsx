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
    if (!selectedSkillIds.includes(id)) setSelectedSkillIds([...selectedSkillIds, id])
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
    await supabase.from('profiles').update({ what_i_do: noAgent ? null : agent }).eq('id', user.id)
    await supabase.from('profile_skills').delete().eq('profile_id', user.id)
    if (selectedSkillIds.length > 0) {
      await supabase.from('profile_skills').insert(
        selectedSkillIds.map(skill_id => ({ profile_id: user.id, skill_id }))
      )
    }
    router.push('/onboarding/step-4')
  }

  const filteredSkills = search.length >= 1
    ? allSkills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) && !selectedSkillIds.includes(s.id)).slice(0, 20)
    : []

  const groupedSkills = filteredSkills.reduce((acc: Record<string, Skill[]>, skill) => {
    const cat = skill.category_name || 'Other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(skill)
    return acc
  }, {})

  const selectedSkills = allSkills.filter(s => selectedSkillIds.includes(s.id))

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '8px',
    fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        input:focus, textarea:focus { border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
      `}</style>

      <div className="fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 32px' }}>Show off those skills</h1>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Agent</label>
          <input type="text" value={agent} disabled={noAgent} onChange={(e) => setAgent(e.target.value)} placeholder="e.g. Hamilton Hodell" style={{ ...inputStyle, background: noAgent ? '#f5f3ee' : 'white', opacity: noAgent ? 0.5 : 1 }} />
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', fontSize: '12px', color: '#666', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={noAgent}
              onChange={(e) => setNoAgent(e.target.checked)}
              style={{ accentColor: '#0c2520', width: '14px', height: '14px', cursor: 'pointer' }}
            />
            I don&apos;t have an agent
          </label>
        </div>

        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>
            Skills <span style={{ color: '#888', fontWeight: 400 }}>({selectedSkills.length} selected)</span>
          </label>
          <input
            type="text"
            placeholder="Search skills (e.g. tap dance, French)..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true) }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            style={inputStyle}
          />

          {showDropdown && search.length >= 1 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'white', border: '1px solid #e0ddd5', borderRadius: '8px', maxHeight: '280px', overflowY: 'auto', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
              {Object.keys(groupedSkills).length === 0 ? (
                <div style={{ padding: '12px', fontSize: '13px', color: '#888' }}>No skills found</div>
              ) : (
                Object.entries(groupedSkills).map(([catName, skills]) => (
                  <div key={catName}>
                    <div style={{ padding: '6px 12px', fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500, background: '#fafaf8' }}>{catName}</div>
                    {skills.map(s => (
                      <button key={s.id} type="button" onMouseDown={(e) => { e.preventDefault(); addSkill(s.id) }} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'white', textAlign: 'left', cursor: 'pointer', fontSize: '13px', color: '#0c2520', fontFamily: 'inherit' }}>{s.name}</button>
                    ))}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {selectedSkills.length > 0 && (
          <div style={{ marginBottom: '32px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {selectedSkills.map(s => (
              <button key={s.id} type="button" onClick={() => removeSkill(s.id)} style={{ padding: '5px 10px 5px 12px', borderRadius: '20px', background: s.category_color, color: s.category_text_color, border: 'none', fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                {s.name}
                <span style={{ opacity: 0.6, fontSize: '13px' }}>×</span>
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button onClick={handleNext} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '12px 48px', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button onClick={() => router.push('/onboarding/step-1')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-2')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <div style={{ width: '20px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <button onClick={() => router.push('/onboarding/step-4')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-5')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-6')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
        </div>
      </div>
    </div>
  )
}
