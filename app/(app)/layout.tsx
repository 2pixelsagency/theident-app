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
        .desktop-sidebar { display: flex; }
        .mobile-nav { display: none; }
        .main-content { margin-left: 260px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-bottom: 100px !important; }
          .main-content.no-nav { padding-bottom: 0 !important; }
        }
        .mob-nav-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          flex: 1;
          padding: 10px 0 24px;
          text-decoration: none;
          min-height: 72px;
          -webkit-tap-highlight-color: transparent;
          transition: opacity 0.15s ease;
        }
        .mob-nav-btn:active { opacity: 0.5; }
        .mob-nav-btn span {
          font-size: 10px;
          font-weight: 400;
          color: #aaa;
          font-family: system-ui, sans-serif;
          line-height: 1;
        }
        .mob-nav-btn.active span { font-weight: 600; color: #0c2520; }
        .desk-nav-item:hover { background: #e8efea !important; }
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

      {/* Mobile bottom nav — single source of truth */}
      {!isJobDetail && (
        <nav className="mobile-nav" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#f1f0ee',
          borderTop: '1px solid #e0ddd5',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          <div style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}>

            {/* Jobs */}
            <Link href="/dashboard" className={`mob-nav-btn${isActive('/dashboard') ? ' active' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/dashboard') ? '#0c2520' : '#aaa'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <span>Jobs</span>
            </Link>

            {/* Saved */}
            <Link href="/saved" className={`mob-nav-btn${isActive('/saved') ? ' active' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/saved') ? '#0c2520' : '#aaa'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
              <span>Saved</span>
            </Link>

            {/* FAB */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', paddingBottom: '12px' }}>
              <Link href="/post-job" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{
                  width: '50px', height: '50px', borderRadius: '50%',
                  background: '#0c2520',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transform: 'translateY(-8px)',
                  border: '4px solid #f1f0ee',
                  boxShadow: '0 4px 14px rgba(12,37,32,0.25)',
                  WebkitTapHighlightColor: 'transparent',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.4" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </div>
              </Link>
            </div>

            {/* Talent */}
            <Link href="/browse" className={`mob-nav-btn${isActive('/browse') ? ' active' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/browse') ? '#0c2520' : '#aaa'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <span>Talent</span>
            </Link>

            {/* Ident */}
            <Link href="/profile" className={`mob-nav-btn${isActive('/profile') ? ' active' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isActive('/profile') ? '#0c2520' : '#aaa'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Ident</span>
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
