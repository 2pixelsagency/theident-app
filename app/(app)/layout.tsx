'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('id, first_name, last_name, picture_url').eq('id', user.id).single()
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')
  const isJobDetail = pathname.startsWith('/jobs/')

  const navItem = (href: string, label: string) => (
    <Link href={href} style={{ display: 'block', width: '100%', padding: '12px 14px', background: isActive(href) ? '#e8efea' : 'transparent', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', color: '#0c2520', fontWeight: isActive(href) ? 500 : 400, transition: 'background 0.2s ease' }}>
      {label}
    </Link>
  )

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .desk-nav-item:hover { background: #e8efea !important; }
        .desktop-sidebar { display: flex; }
        .mobile-nav { display: none; }
        .main-content { margin-left: 260px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-bottom: 90px !important; }
          .main-content.no-nav { padding-bottom: 0 !important; }
        }
        .mob-nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex: 1;
          padding: 12px 8px 6px;
          text-decoration: none;
          min-height: 64px;
          -webkit-tap-highlight-color: transparent;
          position: relative;
        }
        .mob-nav-btn span {
          font-size: 10px;
          font-weight: 400;
          color: #aaa;
        }
        .mob-nav-btn.active span {
          font-weight: 600;
          color: #0c2520;
        }
        .mob-nav-btn svg {
          color: #aaa;
        }
        .mob-nav-btn.active svg {
          color: #0c2520;
        }
        .mob-nav-dot {
          position: absolute;
          top: 8px;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #0c2520;
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{ position: 'fixed', top: 0, left: 0, width: '260px', height: '100vh', background: 'white', padding: '24px 16px', flexDirection: 'column', borderRight: '1px solid #e8e6e0', overflowY: 'auto', zIndex: 10 }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: profile.picture_url ? `url(${profile.picture_url}) center/cover` : '#e8e6e0', margin: '0 auto 12px', border: '1px solid #e0ddd5' }} />
          <p style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: '#0c2520' }}>{profile.first_name} {profile.last_name}</p>
          <button style={{ background: 'white', border: '1px solid #e0ddd5', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#0c2520', fontFamily: 'inherit', fontWeight: 500 }}>View Ident</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItem('/dashboard', 'Jobs')}
          {navItem('/saved', 'Saved Jobs')}
          {navItem('/post-job', 'Post a job')}
          {navItem('/browse', 'Browse Talent')}
          {navItem('/news', 'News')}
        </div>
        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e8e6e0' }}>
          <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 14px', fontWeight: 600 }}>Your settings</p>
          {navItem('/profile', 'Profile')}
          {navItem('/billing', 'Billing')}
          <button onClick={handleLogout} className="desk-nav-item" style={{ display: 'block', width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit' }}>Logout</button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      {!isJobDetail && (
        <nav className="mobile-nav" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(241,240,238,0.96)',
          borderTop: '1px solid #e0ddd5',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          alignItems: 'stretch',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>

            <Link href="/dashboard" className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`}>
              {isActive('/dashboard') && <div className="mob-nav-dot" />}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
              </svg>
              <span>Jobs</span>
            </Link>

            <Link href="/saved" className={`mob-nav-btn${isActive('/saved') ? ' active' : ''}`}>
              {isActive('/saved') && <div className="mob-nav-dot" />}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Saved</span>
            </Link>

            {/* FAB */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '8px' }}>
              <Link href="/post-job" style={{ textDecoration: 'none' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '50%',
                  background: '#0c2520',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'translateY(-8px)',
                  border: '4px solid #f1f0ee',
                  boxShadow: '0 4px 16px rgba(12,37,32,0.25)',
                }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              </Link>
            </div>

            <Link href="/browse" className={`mob-nav-btn${isActive('/browse') ? ' active' : ''}`}>
              {isActive('/browse') && <div className="mob-nav-dot" />}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
              </svg>
              <span>Talent</span>
            </Link>

            <Link href="/profile" className={`mob-nav-btn${isActive('/profile') ? ' active' : ''}`}>
              {isActive('/profile') && <div className="mob-nav-dot" />}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <span>Me</span>
            </Link>

          </div>
        </nav>
      )}

      <main className={`main-content${isJobDetail ? ' no-nav' : ''}`} style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
