'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingStep5() {
  const router = useRouter()
  const [height, setHeight] = useState('')
  const [minAge, setMinAge] = useState(18)
  const [maxAge, setMaxAge] = useState(35)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('height, minimum_age, maximum_age')
        .eq('id', user.id)
        .single()

      if (profile) {
        if (profile.height) setHeight(profile.height)
        if (profile.minimum_age) setMinAge(profile.minimum_age)
        if (profile.maximum_age) setMaxAge(profile.maximum_age)
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
      height: height,
      minimum_age: minAge,
      maximum_age: maxAge,
    }).eq('id', user.id)
    router.push('/onboarding/step-6')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 12px' }}>How you&apos;ll look on camera</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', margin: '0 0 40px' }}>This is your playing age — how old you can be cast as.</p>

        {/* Height */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Height</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              style={{ flex: 1, padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box' }}
            />
            <span style={{ color: '#0c2520', fontSize: '14px', fontWeight: 500 }}>cm</span>
          </div>
        </div>

        {/* Min Playing Age */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: '#0c2520', fontWeight: 500 }}>Playing age (minimum)</label>
            <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '4px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 500 }}>{minAge}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={minAge}
            onChange={(e) => {
              const val = Number(e.target.value)
              setMinAge(val)
              if (val > maxAge) setMaxAge(val)
            }}
            style={{ width: '100%', accentColor: '#0c2520' }}
          />
        </div>

        {/* Max Playing Age */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '14px', color: '#0c2520', fontWeight: 500 }}>Playing age (maximum)</label>
            <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '4px 12px', borderRadius: '6px', fontSize: '14px', fontWeight: 500 }}>{maxAge}</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={maxAge}
            onChange={(e) => {
              const val = Number(e.target.value)
              setMaxAge(val)
              if (val < minAge) setMinAge(val)
            }}
            style={{ width: '100%', accentColor: '#0c2520' }}
          />
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
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '24px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
        </div>
      </div>
    </div>
  )
}
