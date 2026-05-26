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

  const navItem = (href: string, label: string) => (
    <Link
      href={href}
      className="nav-item"
      style={{
        display: 'block', width: '100%', padding: '12px 14px',
        background: isActive(href) ? '#e8efea' : 'transparent', borderRadius: '8px',
        textDecoration: 'none', fontSize: '14px', color: '#0c2520',
        fontWeight: isActive(href) ? 500 : 400, transition: 'background 0.2s ease',
      }}
    >
      {label}
    </Link>
  )

  const mobileNavItem = (href: string, label: string) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '3px',
          textDecoration: 'none', color: active ? '#0c2520' : '#aaa',
          fontSize: '10px', fontWeight: active ? 500 : 400,
          flex: 1, padding: '10px 0 8px',
        }}
      >
        <span style={{
          display: 'block', width: '4px', height: '4px', borderRadius: '50%',
          background: active ? '#0c2520' : 'transparent', marginBottom: '2px',
        }} />
        {label}
      </Link>
    )
  }

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        .nav-item:hover { background: #e8efea !important; }
        .desktop-sidebar { display: flex; }
        .mobile-nav { display: none; }
        .main-content { margin-left: 260px; }
        @media (max-width: 768px) {
          .desktop-sidebar { display: none !important; }
          .mobile-nav { display: flex !important; }
          .main-content { margin-left: 0 !important; padding-bottom: 90px !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="desktop-sidebar" style={{
        position: 'fixed', top: 0, left: 0, width: '260px', height: '100vh',
        background: 'white', padding: '24px 16px', flexDirection: 'column',
        borderRight: '1px solid #e8e6e0', overflowY: 'auto', zIndex: 10,
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '50%',
            background: profile.picture_url ? `url(${profile.picture_url}) center/cover` : '#e8e6e0',
            margin: '0 auto 12px', border: '1px solid #e0ddd5',
          }} />
          <p style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: '#0c2520' }}>
            {profile.first_name} {profile.last_name}
          </p>
          <button style={{ background: 'white', border: '1px solid #e0ddd5', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#0c2520', fontFamily: 'inherit', fontWeight: 500 }}>
            View Ident
          </button>
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
          <button onClick={handleLogout} className="nav-item" style={{ display: 'block', width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="mobile-nav" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'white', borderTop: '1px solid #e8e6e0',
        zIndex: 100, alignItems: 'flex-end',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <div style={{ display: 'flex', width: '100%', alignItems: 'flex-end' }}>
          {mobileNavItem('/dashboard', 'Jobs')}
          {mobileNavItem('/saved', 'Saved')}

          {/* FAB */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: '8px' }}>
            <Link href="/post-job" style={{ textDecoration: 'none' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#0c2520',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: 'translateY(-16px)',
                border: '4px solid #f1f0ee',
                boxShadow: '0 4px 16px rgba(12,37,32,0.25)',
              }}>
                <span style={{ color: '#f1f0ee', fontSize: '28px', lineHeight: 1, marginTop: '-1px' }}>+</span>
              </div>
            </Link>
          </div>

          {mobileNavItem('/browse', 'Talent')}
          {mobileNavItem('/profile', 'Me')}
        </div>
      </nav>

      <main className="main-content" style={{ minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  )
}
