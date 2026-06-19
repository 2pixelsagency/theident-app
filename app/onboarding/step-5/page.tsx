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
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/signup'); return }
      const { data: profile } = await supabase.from('profiles').select('height, minimum_age, maximum_age').eq('id', user.id).single()
      if (profile) {
        if (profile.height) setHeight(profile.height)
        if (typeof profile.minimum_age === 'number') setMinAge(profile.minimum_age)
        if (typeof profile.maximum_age === 'number') setMaxAge(profile.maximum_age)
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
      height, minimum_age: minAge, maximum_age: maxAge,
    }).eq('id', user.id)
    router.push('/onboarding/step-6')
  }

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (val <= maxAge) {
      setMinAge(val)
    }
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    if (val >= minAge) {
      setMaxAge(val)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
          border-color: #0c2520 !important;
          box-shadow: 0 0 0 1px #0c2520 !important;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] { -moz-appearance: textfield; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }

        .range-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: #d4d2cc;
          border-radius: 2px;
          outline: none;
        }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #0c2520;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
        .range-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #0c2520;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>

      <div className="fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 8px' }}>How you&apos;ll look on camera</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', margin: '0 0 32px' }}>This is your playing age — how old you can be cast as.</p>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Height</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="170"
              style={{
                width: '100%', padding: '12px 50px 12px 12px', border: '1px solid #e0ddd5', borderRadius: '8px',
                fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
              }}
            />
            <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#999', fontSize: '13px', pointerEvents: 'none' }}>cm</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="min-age" style={{ fontSize: '13px', color: '#0c2520', fontWeight: 500 }}>Playing age (minimum)</label>
            <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '3px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, minWidth: '36px', textAlign: 'center' }}>{minAge}</span>
          </div>
          <input
            id="min-age"
            type="range"
            min="0"
            max="100"
            value={minAge}
            onChange={handleMinChange}
            className="range-slider"
          />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <label htmlFor="max-age" style={{ fontSize: '13px', color: '#0c2520', fontWeight: 500 }}>Playing age (maximum)</label>
            <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '3px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, minWidth: '36px', textAlign: 'center' }}>{maxAge}</span>
          </div>
          <input
            id="max-age"
            type="range"
            min="0"
            max="100"
            value={maxAge}
            onChange={handleMaxChange}
            className="range-slider"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button onClick={handleNext} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '12px 48px', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button onClick={() => router.push('/onboarding/step-1')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-2')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-3')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-4')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <div style={{ width: '20px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <button onClick={() => router.push('/onboarding/step-6')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
        </div>
      </div>
    </div>
  )
}
