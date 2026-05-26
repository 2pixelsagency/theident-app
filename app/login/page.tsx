'use client'

import { useState } from 'react'
import { useRouter } = from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Incorrect email or password. Please try again.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f0ee',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: 'system-ui, sans-serif',
    }}>
      <style>{`
        input:focus { outline: none; border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520; }
        .login-btn:hover { background: #0a1e1a !important; }
        .link-btn:hover { opacity: 0.7; }
      `}</style>

      <div style={{ width: '100%', maxWidth: '400px' }}>

        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <p style={{
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
            fontWeight: 500,
            color: '#0c2520',
            margin: '0 0 8px',
            letterSpacing: '-0.01em',
          }}>✦ theident</p>
          <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>Sign in to your account</p>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #e0ddd5',
        }}>
          {error && (
            <div style={{
              background: '#fdf2f2',
              border: '1px solid #f5c6c6',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#c0392b',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#0c2520',
                marginBottom: '6px',
              }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #e0ddd5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: 'white',
                  color: '#0c2520',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            <div style={{ marginBottom: '8px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#0c2520',
                marginBottom: '6px',
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid #e0ddd5',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  background: 'white',
                  color: '#0c2520',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>

            <div style={{ textAlign: 'right', marginBottom: '24px' }}>
              <Link href="/forgot-password" style={{
                fontSize: '12px',
                color: '#0c2520',
                textDecoration: 'underline',
                fontFamily: 'inherit',
              }}>
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-btn"
              style={{
                width: '100%',
                padding: '14px',
                background: '#0c2520',
                color: '#f1f0ee',
                border: 'none',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: '24px 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: '#e0ddd5' }} />
            <span style={{ fontSize: '12px', color: '#999' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: '#e0ddd5' }} />
          </div>

          <Link href="/signup" style={{ textDecoration: 'none' }}>
            <button
              className="link-btn"
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: '#0c2520',
                border: '1px solid #0c2520',
                borderRadius: '30px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'opacity 0.2s ease',
              }}
            >
              Create an account
            </button>
          </Link>
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: '#999',
          marginTop: '24px',
        }}>
          By signing in you agree to our{' '}
          <Link href="/terms" style={{ color: '#0c2520', textDecoration: 'underline' }}>terms</Link>
          {' '}and{' '}
          <Link href="/privacy" style={{ color: '#0c2520', textDecoration: 'underline' }}>privacy policy</Link>
        </p>

      </div>
    </div>
  )
}
