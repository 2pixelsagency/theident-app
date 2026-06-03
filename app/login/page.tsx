'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const slides = [
  { bg: '#92d7af', text: 'Make your portfolio match your talent.', textColor: '#0c2520', btnBg: '#0c2520', btnText: '#f1f0ee', outlineBorder: '#0c2520' },
  { bg: '#061410', text: 'Collaborate with talent, producers, graduates.', textColor: '#f1f0ee', btnBg: '#f1f0ee', btnText: '#0c2520', outlineBorder: 'rgba(255,255,255,0.3)' },
  { bg: '#5B7CFA', text: 'Manage side hustles without missing opportunities.', textColor: '#ffffff', btnBg: '#ffffff', btnText: '#0c2520', outlineBorder: 'rgba(255,255,255,0.4)' },
]

export default function Login() {
  const router = useRouter()
  const [active, setActive] = useState(0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'slider' | 'signin' | 'signup'>('slider')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'slider') return
    const t = setInterval(() => setActive(i => (i + 1) % slides.length), 5000)
    return () => clearInterval(t)
  }, [mode])

  const s = slides[active]

  useEffect(() => {
    const color = mode === 'slider' ? s.bg : '#f1f0ee'
    document.body.style.background = color
    document.documentElement.style.background = color
    const existing = document.querySelector('meta[name="theme-color"]')
    if (existing) existing.remove()
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = color
    document.head.appendChild(meta)
    return () => {
      document.body.style.background = '#f1f0ee'
      document.documentElement.style.background = '#f1f0ee'
    }
  }, [active, s.bg, mode])

  const handleAuth = async () => {
    setError(''); setLoading(true)
    if (mode === 'signin') {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
    } else {
      const { error: e } = await supabase.auth.signUp({ email, password })
      if (e) { setError(e.message); setLoading(false); return }
    }
    setLoading(false)
    router.push('/dashboard')
  }

  if (mode !== 'slider') {
    return (
      <div style={{ position:'fixed',inset:0,background:'#f1f0ee',fontFamily:'system-ui, sans-serif',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px',boxSizing:'border-box' }}>
        <div style={{ width:'100%',maxWidth:'400px' }}>
          <div style={{ textAlign:'center',marginBottom:'40px' }}>
            <p style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'28px',fontWeight:700,color:'#0c2520',margin:'0 0 8px' }}>{mode === 'signin' ? 'Welcome back' : 'Create your Ident'}</p>
            <p style={{ fontSize:'14px',color:'#888',margin:0 }}>{mode === 'signin' ? 'Sign in to continue' : 'Join the performing arts platform'}</p>
          </div>

          {error && <div style={{ background:'#fde8e8',color:'#c0392b',padding:'12px 16px',borderRadius:'12px',fontSize:'13px',marginBottom:'16px',textAlign:'center' }}>{error}</div>}

          <div style={{ marginBottom:'14px' }}>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email address" style={{ width:'100%',padding:'14px 16px',border:'1px solid #e0ddd5',borderRadius:'12px',fontSize:'15px',fontFamily:'inherit',boxSizing:'border-box',background:'white',color:'#0c2520' }} />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" onKeyDown={e => { if (e.key === 'Enter') handleAuth() }} style={{ width:'100%',padding:'14px 16px',border:'1px solid #e0ddd5',borderRadius:'12px',fontSize:'15px',fontFamily:'inherit',boxSizing:'border-box',background:'white',color:'#0c2520' }} />
          </div>

          <button onClick={handleAuth} disabled={loading || !email || !password} style={{ width:'100%',padding:'16px',background:'#0c2520',color:'#f1f0ee',border:'none',borderRadius:'30px',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',opacity:loading ? 0.6 : 1,marginBottom:'12px' }}>
            {loading ? 'Please wait...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>

          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')} style={{ width:'100%',padding:'14px',background:'transparent',color:'#0c2520',border:'1px solid #e0ddd5',borderRadius:'30px',fontSize:'14px',fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>
            {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
          </button>

          <button onClick={() => setMode('slider')} style={{ display:'block',margin:'20px auto 0',background:'none',border:'none',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit' }}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes phoneFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        @keyframes fadeSlide { from { opacity:0;transform:translateY(10px); } to { opacity:1;transform:translateY(0); } }
        .phone-float { animation: phoneFloat 4s ease-in-out infinite; }
        .slide-text { animation: fadeSlide 0.5s ease-out; }
      `}</style>

      {/* Background layers — each slide has its own layer, opacity toggles */}
      {slides.map((slide, i) => (
        <div key={i} style={{ position:'fixed',inset:0,background:slide.bg,transition:'opacity 0.6s ease',opacity:i === active ? 1 : 0,zIndex:0 }} />
      ))}

      {/* Content on top */}
      <div style={{ position:'fixed',inset:0,zIndex:1,fontFamily:'system-ui, sans-serif',display:'flex',flexDirection:'column',overflow:'hidden' }}>

        {/* Text — near top */}
        <div style={{ paddingTop:'max(env(safe-area-inset-top), 16px)',padding:'max(env(safe-area-inset-top), 16px) 32px 0' }}>
          <p key={active} className="slide-text" style={{ fontFamily:"'ITC Symbol',Georgia,serif",letterSpacing:'-0.03em',fontSize:'22px',fontWeight:700,color:s.textColor,textAlign:'center',lineHeight:1.35,margin:'16px 0 0',maxWidth:'420px',marginLeft:'auto',marginRight:'auto',transition:'color 0.6s ease' }}>{s.text}</p>
        </div>

        {/* Phone — fills middle */}
        <div style={{ flex:1,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px 32px',maxWidth:'420px',margin:'0 auto',width:'100%',boxSizing:'border-box' }}
          onTouchStart={e => { (e.currentTarget as any)._startX = e.touches[0].clientX }}
          onTouchEnd={e => {
            const start = (e.currentTarget as any)._startX
            const end = e.changedTouches[0].clientX
            const diff = start - end
            if (diff > 50) setActive(i => (i + 1) % slides.length)
            if (diff < -50) setActive(i => (i - 1 + slides.length) % slides.length)
          }}>
          <div className="phone-float" style={{ width:'240px',height:'460px',borderRadius:'32px',background:'white',boxShadow:'0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',position:'relative',overflow:'hidden' }}>
            <div style={{ height:'40px',background:'#f8f8f6',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:'70px',height:'6px',borderRadius:'3px',background:'#e0ddd5' }} />
            </div>
            <div style={{ padding:'16px',display:'flex',flexDirection:'column',gap:'10px' }}>
              <div style={{ width:'55%',height:'9px',borderRadius:'5px',background:'#e8e4de' }} />
              <div style={{ width:'85%',height:'9px',borderRadius:'5px',background:'#e8e4de' }} />
              <div style={{ width:'70%',height:'9px',borderRadius:'5px',background:'#e8e4de' }} />
              <div style={{ height:'14px' }} />
              <div style={{ width:'100%',height:'90px',borderRadius:'12px',background:'#f1f0ee' }} />
              <div style={{ width:'100%',height:'90px',borderRadius:'12px',background:'#f1f0ee' }} />
              <div style={{ width:'100%',height:'60px',borderRadius:'12px',background:'#f1f0ee' }} />
            </div>
            <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'44px',background:'#f8f8f6',borderTop:'1px solid #eee',display:'flex',alignItems:'center',justifyContent:'space-around',padding:'0 24px' }}>
              <div style={{ width:'20px',height:'20px',borderRadius:'4px',background:'#e0ddd5' }} />
              <div style={{ width:'20px',height:'20px',borderRadius:'4px',background:'#e0ddd5' }} />
              <div style={{ width:'20px',height:'20px',borderRadius:'4px',background:'#e0ddd5' }} />
              <div style={{ width:'20px',height:'20px',borderRadius:'50%',background:'#e0ddd5' }} />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div style={{ padding:'0 32px 0',paddingBottom:'max(env(safe-area-inset-bottom), 16px)',maxWidth:'420px',margin:'0 auto',width:'100%',boxSizing:'border-box' }}>
          <div style={{ display:'flex',justifyContent:'center',gap:'6px',marginBottom:'16px' }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} style={{ width:i === active ? '20px' : '6px',height:'6px',borderRadius:'3px',background:i === active ? s.textColor : (s.bg === '#061410' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'),border:'none',cursor:'pointer',transition:'all 0.3s ease',padding:0 }} />
            ))}
          </div>

          <button onClick={() => setMode('signin')} style={{ width:'100%',padding:'15px',background:s.btnBg,color:s.btnText,border:'none',borderRadius:'30px',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',marginBottom:'10px',transition:'background 0.5s ease, color 0.5s ease' }}>
            Sign in
          </button>
          <button onClick={() => setMode('signup')} style={{ width:'100%',padding:'15px',background:'transparent',color:s.textColor,border:'1.5px solid ' + s.outlineBorder,borderRadius:'30px',fontSize:'15px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'color 0.5s ease, border-color 0.5s ease' }}>
            Sign up
          </button>
        </div>
      </div>
    </>
  )
}
