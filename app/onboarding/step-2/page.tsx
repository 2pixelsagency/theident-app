'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Option = { id: number; name: string }

export default function OnboardingStep2() {
  const router = useRouter()
  const [genders, setGenders] = useState<Option[]>([])
  const [ethnicities, setEthnicities] = useState<Option[]>([])
  const [selectedGender, setSelectedGender] = useState<number | null>(null)
  const [selectedEthnicity, setSelectedEthnicity] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const [{ data: g }, { data: e }, { data: profile }] = await Promise.all([
        supabase.from('genders').select('id, name').order('id'),
        supabase.from('ethnicities').select('id, name').order('id'),
        supabase.from('profiles').select('gender_id, ethnicity_id').eq('id', user.id).single(),
      ])

      setGenders(g || [])
      setEthnicities(e || [])
      if (profile) {
        setSelectedGender(profile.gender_id)
        setSelectedEthnicity(profile.ethnicity_id)
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleNext = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      gender_id: selectedGender,
      ethnicity_id: selectedEthnicity,
    }).eq('id', user.id)
    router.push('/onboarding/step-3')
  }

  const pillStyle = (selected: boolean): React.CSSProperties => ({
    padding: '12px 20px',
    border: selected ? '2px solid #0c2520' : '1px solid #e0ddd5',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#0c2520',
    fontFamily: 'inherit',
  })

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 40px' }}>Your Appearance</h1>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '14px', color: '#0c2520', marginBottom: '12px', fontWeight: 500 }}>Gender</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {genders.map(g => (
              <button key={g.id} type="button" onClick={() => setSelectedGender(g.id)} style={pillStyle(selectedGender === g.id)}>{g.name}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '14px', color: '#0c2520', marginBottom: '12px', fontWeight: 500 }}>Ethnicity</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {ethnicities.map(e => (
              <button key={e.id} type="button" onClick={() => setSelectedEthnicity(e.id)} style={pillStyle(selectedEthnicity === e.id)}>{e.name}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <button onClick={handleNext} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px 56px', borderRadius: '30px', fontSize: '16px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '24px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  )
}
