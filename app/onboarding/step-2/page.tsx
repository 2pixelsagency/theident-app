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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
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
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { setSaving(false); return }
    await supabase.from('profiles').update({
      gender_id: selectedGender,
      ethnicity_id: selectedEthnicity,
    }).eq('id', user.id)
    router.push('/onboarding/step-3')
  }

  const pillStyle = (selected: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    border: selected ? '1.5px solid #0c2520' : '1px solid #e0ddd5',
    borderRadius: '8px',
    background: selected ? '#e8efea' : 'white',
    cursor: 'pointer',
    fontSize: '13px',
    color: '#0c2520',
    fontFamily: 'inherit',
    fontWeight: selected ? 500 : 400,
  })

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        input:focus, textarea:focus { border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
      `}</style>

      <div className="fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 32px' }}>Your Appearance</h1>

        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '13px', color: '#0c2520', marginBottom: '10px', fontWeight: 500 }}>Gender</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {genders.map(g => (
              <button key={g.id} type="button" onClick={() => setSelectedGender(g.id)} style={pillStyle(selectedGender === g.id)}>{g.name}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '13px', color: '#0c2520', marginBottom: '10px', fontWeight: 500 }}>Ethnicity</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ethnicities.map(e => (
              <button key={e.id} type="button" onClick={() => setSelectedEthnicity(e.id)} style={pillStyle(selectedEthnicity === e.id)}>{e.name}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button onClick={handleNext} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '12px 48px', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button onClick={() => router.push('/onboarding/step-1')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <div style={{ width: '20px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <button onClick={() => router.push('/onboarding/step-3')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-4')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-5')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-6')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
        </div>
      </div>
    </div>
  )
}
