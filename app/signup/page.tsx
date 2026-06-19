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

    const { data, error } = await supabase.auth.signUp({
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
      // Fire our custom verification email (don't block navigation)
      const token = data.session?.access_token
      if (token) {
        fetch('/api/send-verification', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {})
      }
      router.push('/onboarding/step-1')
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/onboarding/step-1' },
    })
    if (error) setError(error.message)
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

          {/* Google sign up */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            style={{ width: '100%', padding: '13px', background: 'white', color: '#0c2520', border: '1px solid #d4d2cc', borderRadius: '6px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div style={{ flex: 1, height: '1px', background: '#e8e6e0' }} />
            <span style={{ fontSize: '12px', color: '#aaa' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e8e6e0' }} />
          </div>

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
