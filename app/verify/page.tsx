'use client'

import { useEffect, useState } from 'react'

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (status === 'ok') {
      const t = setTimeout(() => { window.location.href = '/dashboard' }, 1800)
      return () => clearTimeout(t)
    }
  }, [status])

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token')
    if (!token) { setStatus('error'); setMsg('This link is missing its verification code.'); return }

    fetch('/api/verify-confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}))
        if (r.ok) {
          setStatus('ok')
        } else {
          setStatus('error')
          setMsg(d.error === 'expired'
            ? 'This link has expired. Open the app and tap "Resend" to get a fresh one.'
            : 'We couldn’t verify this link. It may have already been used.')
        }
      })
      .catch(() => { setStatus('error'); setMsg('Something went wrong. Please try again.') })
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div style={{ width: '28px', height: '28px', border: '2px solid #0c2520', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: '15px', color: '#888', margin: 0 }}>Verifying your email…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {status === 'ok' && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h1 style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '26px', fontWeight: 500, color: '#0c2520', margin: '0 0 8px' }}>Email verified</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 24px' }}>You&apos;re all set — taking you into the app…</p>
            <a href="/dashboard" style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '12px 28px', borderRadius: '28px', fontSize: '15px', fontWeight: 500 }}>Open The Ident</span></a>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fbeae8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#c0392b" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </div>
            <h1 style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 8px' }}>Couldn&apos;t verify</h1>
            <p style={{ fontSize: '14px', color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>{msg}</p>
            <a href="/dashboard" style={{ textDecoration: 'none' }}><span style={{ background: '#0c2520', color: '#f1f0ee', padding: '12px 28px', borderRadius: '28px', fontSize: '15px', fontWeight: 500 }}>Open The Ident</span></a>
          </>
        )}
      </div>
    </div>
  )
}
