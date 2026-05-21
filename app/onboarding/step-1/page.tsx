'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingStep1() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Load existing profile data on page load
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signup')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, date_of_birth, location')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
        setDateOfBirth(profile.date_of_birth || '')
        setLocation(profile.location || '')
      }
      setLoading(false)
    }
    loadProfile()
  }, [router])

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/signup')
      return
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dateOfBirth || null,
        location: location,
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
    } else {
      router.push('/onboarding/step-2')
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#0c2520', fontFamily: 'system-ui, sans-serif' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        <h1 style={{ fontFamily: 'Georgia, "IBM Plex Serif", serif', fontSize: '40px', fontWeight: 500, color: '#0c2520', margin: '0 0 48px', textAlign: 'center', letterSpacing: '-0.01em' }}>
          Let&apos;s get to know you!
        </h1>

        <form onSubmit={handleNext}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First Name"
                required
                style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last Name"
                required
                style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Date of Birth</label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box', color: '#0c2520' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Your Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where you are based"
                style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee', color: '#c33', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <button
              type="submit"
              disabled={saving}
              style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px 56px', borderRadius: '30px', fontSize: '16px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'Saving...' : 'Next'}
            </button>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <div style={{ width: '24px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
            <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
            <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
            <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
            <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
            <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          </div>
        </form>
      </div>
    </div>
  )
}
