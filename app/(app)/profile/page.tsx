'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  location: string | null
  bio: string | null
}

export default function AccountPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: p } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, location, bio').eq('id', user.id).single()
      setProfile(p)
      setLoading(false)
    }
    load()
  }, [])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${profile.id}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('profiles').update({ picture_url: publicUrl }).eq('id', profile.id)
    setProfile({ ...profile, picture_url: publicUrl })
    setUploading(false)
    showToast('Profile photo updated')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  if (loading) return <div />

  const menuItems = [
    {
      section: 'Your profile',
      items: [
        { label: 'View public profile', sub: 'See what casting directors see', href: '#', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        )},
        { label: 'Edit profile', sub: 'Name, bio, skills, appearance', href: '/profile/edit', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        )},
        { label: 'My reels & credits', sub: 'Manage your showreel and credits', href: '/profile/credits', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
        )},
      ]
    },
    {
      section: 'Activity',
      items: [
        { label: 'Calendar', sub: 'Auditions, bookings, availability', href: '/calendar', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        )},
        { label: 'My applications', sub: 'Track what you have applied for', href: '/applications', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
        )},
      ]
    },
    {
      section: 'Account',
      items: [
        { label: 'Billing & subscription', sub: 'Manage your plan and payments', href: '/billing', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        )},
        { label: 'Notifications', sub: 'Email alerts and preferences', href: '/notifications', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        )},
        { label: 'Password & security', sub: 'Change your password', href: '/security', icon: (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        )},
      ]
    },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', paddingBottom: '100px' }}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .menu-row:active { background: #e8e4de !important; }
      `}</style>

      {toast && (
        <div className="toast-anim" style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Profile header */}
      <div style={{ padding: '32px 20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <label style={{ position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: profile?.picture_url ? `url(${profile.picture_url}) center/cover` : '#e8efea', border: '2px solid #e0ddd5', overflow: 'hidden' }} />
          <div style={{ position: 'absolute', bottom: 0, right: 0, width: '24px', height: '24px', borderRadius: '50%', background: '#0c2520', border: '2px solid #f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {uploading ? (
              <div style={{ width: '10px', height: '10px', border: '1.5px solid #f1f0ee', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
              </svg>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        </label>
        <div>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>
            {profile?.first_name} {profile?.last_name}
          </p>
          {profile?.location && <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>{profile.location}</p>}
          <span style={{ fontSize: '11px', background: '#e8efea', color: '#0c2520', padding: '3px 10px', borderRadius: '20px', fontWeight: 500 }}>
            Free plan
          </span>
        </div>
      </div>

      {/* Menu sections */}
      {menuItems.map(section => (
        <div key={section.section} style={{ marginBottom: '8px' }}>
          <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 4px', padding: '0 20px' }}>
            {section.section}
          </p>
          <div style={{ background: 'white', borderRadius: '14px', margin: '0 16px', overflow: 'hidden', border: '1px solid #e8e4de' }}>
            {section.items.map((item, i) => (
              <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}>
                <div className="menu-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: i < section.items.length - 1 ? '1px solid #f0ede5' : 'none', background: 'white', transition: 'background 0.15s ease', cursor: 'pointer' }}>
                  <div style={{ color: '#0c2520', flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 1px', fontWeight: 500 }}>{item.label}</p>
                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{item.sub}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Logout */}
      <div style={{ margin: '16px 16px 0' }}>
        <button
          onClick={handleLogout}
          style={{ width: '100%', padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #e8e4de', borderRadius: '14px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Log out
        </button>
      </div>

      <p style={{ textAlign: 'center', fontSize: '11px', color: '#ccc', margin: '16px 0 0' }}>The Ident · Version 1.0</p>
    </div>
  )
}
