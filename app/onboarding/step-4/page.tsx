'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Option = { id: number; name: string }

export default function OnboardingStep4() {
  const router = useRouter()
  const [hairColours, setHairColours] = useState<Option[]>([])
  const [eyeColours, setEyeColours] = useState<Option[]>([])
  const [selectedHair, setSelectedHair] = useState<number | null>(null)
  const [selectedEye, setSelectedEye] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const [{ data: h }, { data: e }, { data: profile }] = await Promise.all([
        supabase.from('hair_colours').select('id, name').order('id'),
        supabase.from('eye_colours').select('id, name').order('id'),
        supabase.from('profiles').select('hair_colour_id, eye_colour_id').eq('id', user.id).single(),
      ])

      setHairColours(h || [])
      setEyeColours(e || [])
      if (profile) {
        setSelectedHair(profile.hair_colour_id)
        setSelectedEye(profile.eye_colour_id)
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
      hair_colour_id: selectedHair,
      eye_colour_id: selectedEye,
    }).eq('id', user.id)
    router.push('/onboarding/step-5')
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
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 40px' }}>Nearly There</h1>

        <div style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '14px', color: '#0c2520', marginBottom: '12px', fontWeight: 500 }}>Hair Colour</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {hairColours.map(h => (
              <button key={h.id} type="button" onClick={() => setSelectedHair(h.id)} style={pillStyle(selectedHair === h.id)}>{h.name}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '14px', color: '#0c2520', marginBottom: '12px', fontWeight: 500 }}>Eye Colour</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {eyeColours.map(e => (
              <button key={e.id} type="button" onClick={() => setSelectedEye(e.id)} style={pillStyle(selectedEye === e.id)}>{e.name}</button>
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
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '24px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  )
}
