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

  useEffect(() => {
    if (mode !== 'slider') {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }
    resetTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [mode])

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

  if (typeof document !== 'undefined') {
    const color = mode === 'slider' ? s.bg : '#f1f0ee'
    document.documentElement.style.backgroundColor = color
    document.body.style.backgroundColor = color
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    metas.forEach(m => m.setAttribute('content', color))
  }

  const handleAuth = async () => {
    setError(''); setLoading(true)
    if (mode === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      router.push('/dashboard')
    } else {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
      router.push('/onboarding/step-1')
    }
    setLoading(false)
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

      {/* Text near top */}
      <div style={{ paddingTop:'max(env(safe-area-inset-top), 16px)',padding:'max(env(safe-area-inset-top), 16px) 32px 0' }}>
        <p key={active} className="slide-text" style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'22px',fontWeight:700,color:s.textColor,textAlign:'center',lineHeight:1.35,margin:'16px 0 0',maxWidth:'420px',marginLeft:'auto',marginRight:'auto' }}>{s.text}</p>
      </div>

      {/* Phone screenshot — swipeable */}
      <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 32px',maxWidth:'420px',margin:'0 auto',width:'100%',boxSizing:'border-box' }}
        onTouchStart={e => { (e.currentTarget as any)._startX = e.touches[0].clientX }}
        onTouchEnd={e => {
          const start = (e.currentTarget as any)._startX
          const end = e.changedTouches[0].clientX
          const diff = start - end
          if (diff > 50) handleSwipe('left')
          if (diff < -50) handleSwipe('right')
        }}>
      <img key={active} className="phone-float" src={s.img} alt="" style={{ width:'380px',display:'block' }} />
      </div>

      {/* Bottom */}
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
