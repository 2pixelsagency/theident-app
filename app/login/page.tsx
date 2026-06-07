'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const slides = [
  { bg: '#92d7af', text: 'Make your portfolio match your talent.', textColor: '#0c2520', btnBg: '#0c2520', btnText: '#f1f0ee', outlineBorder: '#0c2520', dotInactive: 'rgba(0,0,0,0.15)', img: '/slide-1.png' },
  { bg: '#061410', text: 'Collaborate with talent, producers, graduates.', textColor: '#f1f0ee', btnBg: '#f1f0ee', btnText: '#0c2520', outlineBorder: 'rgba(255,255,255,0.3)', dotInactive: 'rgba(255,255,255,0.2)', img: '/slide-2.png' },
  { bg: '#5B7CFA', text: 'Manage side hustles without missing opportunities.', textColor: '#ffffff', btnBg: '#ffffff', btnText: '#0c2520', outlineBorder: 'rgba(255,255,255,0.4)', dotInactive: 'rgba(255,255,255,0.3)', img: '/slide-3.png' },
]

export default function Login() {
  const router = useRouter()
  const [active, setActive] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'slider' | 'signin' | 'signup'>('slider')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const s = slides[active]

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setActive(i => (i + 1) % slides.length), 5000)
  }

  // Auto-redirect if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.push('/dashboard')
    })
  }, [])

  useEffect(() => {
    if (mode !== 'slider') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [mode])

  // Force background colors on EVERY render
  useEffect(() => {
    const color = mode === 'slider' ? s.bg : '#f1f0ee'
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', color)
    if (!meta) {
      const m = document.createElement('meta')
      m.name = 'theme-color'
      m.content = color
      document.head.appendChild(m)
    }
  })

  const goToSlide = (index: number) => { setActive(index); resetTimer() }
  const handleSwipe = (dir: 'left' | 'right') => {
    if (dir === 'left') setActive(i => (i + 1) % slides.length)
    else setActive(i => (i - 1 + slides.length) % slides.length)
    resetTimer()
  }

  useEffect(() => {
    slides.forEach(slide => {
      const img = new Image()
      img.src = slide.img
    })
  }, [])

  const handleAuth = async () => {
    setError(''); setLoading(true)
    if (mode === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      router.push('/dashboard')
    } else {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'welcome', email: email, name: '' }) })
      router.push('/onboarding/step-1')
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' }
    })
    if (error) setError(error.message)
  }

  if (mode !== 'slider') {
    return (
      <div style={{ position:'fixed',inset:0,background:'#f1f0ee',fontFamily:'system-ui, sans-serif',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'24px',boxSizing:'border-box' }}>
        <div style={{ width:'100%',maxWidth:'380px' }}>
          <div style={{ textAlign:'center',marginBottom:'48px' }}>
            <p style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'30px',fontWeight:700,color:'#0c2520',margin:'0 0 8px',lineHeight:1.2 }}>
              {mode === 'signin' ? 'Welcome back.' : 'Join The Ident.'}
            </p>
            <p style={{ fontSize:'15px',color:'#888',margin:0,lineHeight:1.5 }}>
              {mode === 'signin' ? 'Sign in to pick up where you left off.' : 'Create your profile and start getting booked.'}
            </p>
          </div>

          {/* Google Sign In */}
          <button onClick={handleGoogleSignIn} style={{ width:'100%',padding:'14px',background:'white',color:'#0c2520',border:'1px solid #e0ddd5',borderRadius:'14px',fontSize:'15px',fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginBottom:'16px',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px' }}>
            <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px' }}>
            <div style={{ flex:1,height:'1px',background:'#e0ddd5' }} />
            <span style={{ fontSize:'12px',color:'#aaa' }}>or</span>
            <div style={{ flex:1,height:'1px',background:'#e0ddd5' }} />
          </div>

          {error && <div style={{ background:'#fde8e8',color:'#c0392b',padding:'12px 16px',borderRadius:'12px',fontSize:'13px',marginBottom:'16px',textAlign:'center' }}>{error}</div>}
          <div style={{ marginBottom:'12px' }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={{ width:'100%',padding:'15px 16px',border:'1px solid #e0ddd5',borderRadius:'14px',fontSize:'15px',fontFamily:'inherit',boxSizing:'border-box',background:'white',color:'#0c2520' }} />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" onKeyDown={e => { if (e.key === 'Enter') handleAuth() }} style={{ width:'100%',padding:'15px 16px',border:'1px solid #e0ddd5',borderRadius:'14px',fontSize:'15px',fontFamily:'inherit',boxSizing:'border-box',background:'white',color:'#0c2520' }} />
          </div>
          <button onClick={handleAuth} disabled={loading || !email || !password} style={{ width:'100%',padding:'16px',background:'#0c2520',color:'#f1f0ee',border:'none',borderRadius:'30px',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:loading ? 0.6 : 1,marginBottom:'16px' }}>
            {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
          <p style={{ textAlign:'center',fontSize:'14px',color:'#888',margin:0 }}>
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError('') }} style={{ background:'none',border:'none',color:'#0c2520',fontWeight:600,cursor:'pointer',fontFamily:'inherit',fontSize:'14px',textDecoration:'underline' }}>
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
          <button onClick={() => setMode('slider')} style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',margin:'32px auto 0',background:'none',border:'none',fontSize:'13px',color:'#aaa',cursor:'pointer',fontFamily:'inherit' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
            Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position:'fixed',inset:'-50px 0 0 0',paddingTop:'50px',background:s.bg,fontFamily:'system-ui, sans-serif',display:'flex',flexDirection:'column',overflow:'hidden',boxSizing:'border-box' }}>
      <style>{`
        @keyframes phoneFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(10px); } to { opacity:1;transform:translateY(0); } }
        .phone-float { animation: phoneFloat 4s ease-in-out infinite; }
        .slide-text { animation: fadeSlide 0.5s ease-out; }
      `}</style>

      <div style={{ paddingTop:'max(env(safe-area-inset-top), 16px)',padding:'max(env(safe-area-inset-top), 16px) 32px 0' }}>
        <p key={active} className="slide-text" style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'22px',fontWeight:700,color:s.textColor,textAlign:'center',lineHeight:1.35,margin:'16px 0 0',maxWidth:'420px',marginLeft:'auto',marginRight:'auto' }}>{s.text}</p>
      </div>

      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 0',overflow:'hidden' }}
        onTouchStart={e => { (e.currentTarget as any)._startX = e.touches[0].clientX }}
        onTouchEnd={e => {
          const start = (e.currentTarget as any)._startX
          const end = e.changedTouches[0].clientX
          const diff = start - end
          if (diff > 50) handleSwipe('left')
          if (diff < -50) handleSwipe('right')
        }}>
        <img key={active} className="phone-float slide-text" src={s.img} alt="" style={{ height:'55vh',maxHeight:'100%',width:'auto',display:'block',objectFit:'contain' }} />
      </div>

      <div style={{ padding:'0 32px 0',paddingBottom:'max(env(safe-area-inset-bottom), 16px)',maxWidth:'420px',margin:'0 auto',width:'100%',boxSizing:'border-box' }}>
        <div style={{ display:'flex',justifyContent:'center',gap:'6px',marginBottom:'18px' }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goToSlide(i)} style={{ width:i === active ? '20px' : '6px',height:'6px',borderRadius:'3px',background:i === active ? s.textColor : s.dotInactive,border:'none',cursor:'pointer',transition:'all 0.3s ease',padding:0 }} />
          ))}
        </div>
        <button onClick={() => setMode('signin')} style={{ width:'100%',padding:'15px',background:s.btnBg,color:s.btnText,border:'none',borderRadius:'30px',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px' }}>
          I'm a performer
        </button>
        <button onClick={() => setMode('signin')} style={{ width:'100%',padding:'15px',background:'transparent',color:s.textColor,border:'1.5px solid ' + s.outlineBorder,borderRadius:'30px',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>
          I'm a casting director
        </button>
      </div>
    </div>
  )
}
