'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Skill = { id: number; name: string }

export default function OnboardingStep3() {
  const router = useRouter()
  const [skills, setSkills] = useState<Skill[]>([])
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [agent, setAgent] = useState('')
  const [noAgent, setNoAgent] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const [{ data: s }, { data: profile }, { data: profileSkills }] = await Promise.all([
        supabase.from('skills').select('id, name').order('name'),
        supabase.from('profiles').select('what_i_do').eq('id', user.id).single(),
        supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
      ])

      setSkills(s || [])
      if (profile?.what_i_do) setAgent(profile.what_i_do)
      if (profileSkills) setSelectedSkills(profileSkills.map(ps => ps.skill_id))
      setLoading(false)
    }
    load()
  }, [router])

  const toggleSkill = (id: number) => {
    setSelectedSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const handleNext = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      what_i_do: noAgent ? null : agent,
    }).eq('id', user.id)

    await supabase.from('profile_skills').delete().eq('profile_id', user.id)
    if (selectedSkills.length > 0) {
      await supabase.from('profile_skills').insert(
        selectedSkills.map(skill_id => ({ profile_id: user.id, skill_id }))
      )
    }

    router.push('/onboarding/step-4')
  }

  const filteredSkills = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 40px' }}>Show off those skills</h1>

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

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>
            Skills <span style={{ color: '#888', fontWeight: 400 }}>({selectedSkills.length} selected)</span>
          </label>
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box', marginBottom: '12px' }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
            {filteredSkills.map(s => {
              const selected = selectedSkills.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSkill(s.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    background: selected ? '#0c2520' : 'white',
                    color: selected ? '#f1f0ee' : '#0c2520',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    border: selected ? '1px solid #0c2520' : '1px solid #e0ddd5',
                  }}
                >
                  {s.name} {selected && '×'}
                </button>
              )
            })}
            {filteredSkills.length === 0 && (
              <p style={{ fontSize: '13px', color: '#888' }}>No skills found</p>
            )}
          </div>
        </div>

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
