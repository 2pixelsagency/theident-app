'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function VerifyEmailBanner() {
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      // Only nudge email/password users who haven't confirmed yet.
      // Google sign-ins arrive already confirmed, so they never see this.
      if (user && user.email && !user.email_confirmed_at) {
        setEmail(user.email)
        setShow(true)
      }
    })
  }, [])

  const resend = async () => {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setBusy(false)
    if (error) { alert('Could not resend: ' + error.message); return }
    setSent(true)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', left: '12px', right: '12px', bottom: 'calc(env(safe-area-inset-bottom) + 164px)', zIndex: 300, background: 'white', border: '1px solid #e8e4de', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 6px 24px rgba(12,37,32,0.16)' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#0c2520', margin: 0, lineHeight: 1.35 }}>Verify your email to secure your account</p>
      </div>
      {sent ? (
        <span style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, flexShrink: 0 }}>Sent ✓</span>
      ) : (
        <button onClick={resend} disabled={busy} style={{ background: '#0c2520', border: 'none', color: '#f1f0ee', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: '20px', padding: '9px 14px', flexShrink: 0, opacity: busy ? 0.6 : 1 }}>{busy ? '…' : 'Resend'}</button>
      )}
      <button onClick={() => setShow(false)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: '4px', flexShrink: 0, display: 'flex' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </button>
    </div>
  )
}
