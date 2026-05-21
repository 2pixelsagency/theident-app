'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/onboarding/step-1')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontFamily: 'Georgia, "IBM Plex Serif", serif', fontSize: '40px', fontWeight: 500, color: '#0c2520', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
            ✦ theident
          </h1>
          <p style={{ fontSize: '15px', color: '#444', margin: 0 }}>
            Create your account
          </p>
        </div>

        <form onSubmit={handleSignup} style={{ background: 'white', padding: '32px', borderRadius: '12px', border: '0.5px solid #e8e6e0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>First name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #d4d2cc', borderRadius: '6px', fontSize: '15px', background: '#fafaf8', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Last name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', border: '1px solid #d4d2cc', borderRadius: '6px', fontSize: '15px', background: '#fafaf8', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', border: '1px solid #d4d2cc', borderRadius: '6px', fontSize: '15px', background: '#fafaf8', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '12px', border: '1px solid #d4d2cc', borderRadius: '6px', fontSize: '15px', background: '#fafaf8', boxSizing: 'border-box' }}
            />
            <p style={{ fontSize: '12px', color: '#777', margin: '6px 0 0' }}>At least 6 characters</p>
          </div>

          {error && (
            <div style={{ background: '#fee', color: '#c33', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px', borderRadius: '6px', fontSize: '15px', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating account...' : 'Get Started'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '14px', color: '#666', margin: '20px 0 0' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#0c2520', fontWeight: 500, textDecoration: 'underline' }}>Log in</a>
          </p>
        </form>
      </div>
    </div>
  )
}
