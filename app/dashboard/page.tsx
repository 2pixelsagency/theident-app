'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  available: string | null
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('jobs')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data: p } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, available').eq('id', user.id).single()
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signup')
  }

  if (loading || !profile) {
    return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />
  }

  const navItem = (key: string, label: string, icon: string) => (
    <button
      onClick={() => setActiveTab(key)}
      className="nav-item"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px',
        background: activeTab === key ? '#e8efea' : 'transparent', border: 'none', borderRadius: '8px',
        textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit',
        fontWeight: activeTab === key ? 500 : 400, transition: 'background 0.2s ease',
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', fontFamily: 'system-ui, sans-serif', display: 'flex' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .nav-item:hover { background: #e8efea !important; }
        .job-card { transition: all 0.2s ease; }
        .job-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(12, 37, 32, 0.1); }
        .filter-pill { transition: all 0.2s ease; }
        .filter-pill:hover { border-color: #0c2520 !important; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', minHeight: '100vh', borderRight: '1px solid #e8e6e0' }}>
        {/* Profile card */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '50%',
            background: profile.picture_url ? `url(${profile.picture_url}) center/cover` : '#e8e6e0',
            margin: '0 auto 12px', border: '1px solid #e0ddd5'
          }} />
          <p style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: '#0c2520' }}>{profile.first_name} {profile.last_name}</p>
          <button style={{
            background: 'white', border: '1px solid #e0ddd5', padding: '6px 16px',
            borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#0c2520',
            fontFamily: 'inherit', fontWeight: 500,
          }}>
            View Ident
          </button>
        </div>

        {/* Main nav */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItem('jobs', 'Jobs', '📋')}
          {navItem('saved', 'Saved Jobs', '🔖')}
          {navItem('post', 'Post a job', '➕')}
          {navItem('browse', 'Browse Talent', '👥')}
          {navItem('news', 'News', '📰')}
        </div>

        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e8e6e0' }}>
          <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 14px', fontWeight: 600 }}>Your Settings</p>
          {navItem('profile', 'Profile', '⚙️')}
          {navItem('wishlist', 'Wishlist', '❤️')}
          {navItem('billing', 'Billing', '💳')}
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px',
              background: 'transparent', border: 'none', borderRadius: '8px',
              textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '16px' }}>↪️</span>
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* In the Spotlight */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px' }}>In the Spotlight</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {/* Featured card 1 - Mint */}
              <div className="job-card" style={{ background: '#92d7af', borderRadius: '12px', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: '#0c2520', margin: '0 0 8px', lineHeight: 1.2 }}>FRIEND 3, 4 & 5 (NON SPEAKING)</h3>
                  <p style={{ fontSize: '13px', color: '#0c2520', margin: '0 0 12px' }}>In REEBOK ONLINE ADVERT (Online Commercial)</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.5)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#0c2520' }}>London</span>
                    <span style={{ background: 'rgba(255,255,255,0.5)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#0c2520' }}>Commercial</span>
                  </div>
                </div>
                <button style={{ background: 'white', color: '#0c2520', border: 'none', padding: '8px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'inherit' }}>Apply</button>
              </div>

              {/* Featured card 2 - Dark */}
              <div className="job-card" style={{ background: '#0c2520', borderRadius: '12px', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
                <div>
                  <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: '#f1f0ee', margin: '0 0 8px', lineHeight: 1.2 }}>ARAMIS / LOUIS XIII, KING OF FRANCE</h3>
                  <p style={{ fontSize: '13px', color: '#a8c4b4', margin: '0 0 12px' }}>In THE THREE MUSKETEERS By Alexandre Dumas</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#f1f0ee' }}>West Cornwall</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#f1f0ee' }}>Theatre</span>
                  </div>
                </div>
                <button style={{ background: 'white', color: '#0c2520', border: 'none', padding: '8px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'inherit' }}>Apply</button>
              </div>

              {/* Spotlight your job CTA */}
              <div className="job-card" style={{ background: '#e8e6e0', borderRadius: '12px', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px' }}>Spotlight your job</p>
                <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, textDecoration: 'underline', fontWeight: 500 }}>
                  Get your role booked in less<br />than one week
                </p>
              </div>
            </div>
          </section>

          {/* Job Opportunities */}
          <section style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Job Opportunities</h2>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              {['Production Type', 'Gender', 'Ethnicity', 'Age'].map(f => (
                <button key={f} className="filter-pill" style={{ background: 'white', border: '1px solid #e0ddd5', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {f} <span style={{ fontSize: '10px' }}>▼</span>
                </button>
              ))}
              <input type="text" placeholder="Location" style={{ flex: 1, minWidth: '120px', padding: '8px 14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
                <input type="checkbox" style={{ accentColor: '#0c2520' }} />
                Show Side Hustle
              </label>
            </div>

            {/* Search */}
            <input type="text" placeholder="Search by role, project or keyword" style={{ width: '100%', padding: '12px 16px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }} />

            {/* Result count + sort */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e8e6e0' }}>
              <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>0 results</p>
              <button style={{ background: 'transparent', border: 'none', fontSize: '13px', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Sort By <span style={{ fontSize: '10px' }}>▼</span>
              </button>
            </div>

            {/* Empty state */}
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#0c2520', margin: '0 0 8px' }}>No jobs posted yet</p>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>When jobs go live, you&apos;ll see them here.</p>
            </div>
          </section>

        </div>
      </main>
    </div>
  )
}
