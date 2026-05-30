'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  bio: string | null
  location: string | null
  slug: string | null
  availability_status: string | null
  production_until: string | null
  agent_name: string | null
  agent_phone: string | null
  agent_email: string | null
}

type Skill = { id: number; name: string; color: string; text_color: string }
type Reel = { id: string; label: string; url: string; sort_order: number }
type Credit = { id: string; title: string; role: string | null; year: number | null; thumbnail_url: string | null; director: string | null; production_company: string | null; is_featured: boolean }
type Brand = { id: string; brand_name: string; logo_url: string | null }
type Testimonial = { id: string; quote: string; author_name: string; author_title: string | null }
type GalleryImage = { id: string; url: string }
type FAQ = { id: string; question: string; answer: string }

function NavButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [fromApp, setFromApp] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setFromApp(params.get('from') === 'app')
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [])

  if (isLoggedIn || fromApp) {
    return (
      <a href="/dashboard" style={{ fontSize: '13px', color: '#0c2520', textDecoration: 'none', background: 'white', border: '1px solid #e0ddd5', padding: '8px 16px', borderRadius: '20px' }}>
        Back to app
      </a>
    )
  }
  return (
    <a href="/login" style={{ fontSize: '13px', color: '#0c2520', textDecoration: 'none', background: 'white', border: '1px solid #e0ddd5', padding: '8px 16px', borderRadius: '20px' }}>
      Sign in
    </a>
  )
}

export default function PublicProfile() {
  const params = useParams()
  const slug = params.slug as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [reels, setReels] = useState<Reel[]>([])
  const [activeReel, setActiveReel] = useState(0)
  const [credits, setCredits] = useState<Credit[]>([])
  const [featuredCredits, setFeaturedCredits] = useState<Credit[]>([])
  const [activeFeatured, setActiveFeatured] = useState(0)
  const [brands, setBrands] = useState<Brand[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [connectStatus, setConnectStatus] = useState<'none' | 'pending' | 'connected'>('none')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const contactRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data: prof } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, picture_url, bio, location, slug, availability_status, production_until, agent_name, agent_phone, agent_email')
        .eq('slug', slug)
        .single()

      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)

      const [
        { data: skillData },
        { data: reelData },
        { data: creditData },
        { data: brandData },
        { data: testimonialData },
        { data: galleryData },
        { data: faqData },
      ] = await Promise.all([
        supabase.from('profile_skills').select('skills(id, name, skills_categories(color, text_color))').eq('profile_id', prof.id),
        supabase.from('reels').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('credits').select('*').eq('profile_id', prof.id).order('year', { ascending: false }),
        supabase.from('profile_brands').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('testimonials').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('gallery_images').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('faqs').select('*').eq('profile_id', prof.id).order('sort_order'),
      ])

      const flatSkills = (skillData || []).map((s: any) => ({
        id: s.skills?.id, name: s.skills?.name,
        color: s.skills?.skills_categories?.color || '#e8efea',
        text_color: s.skills?.skills_categories?.text_color || '#0c2520',
      })).filter((s: any) => s.name)

      setSkills(flatSkills)
      setReels(reelData || [])
      const allCredits = creditData || []
      setCredits(allCredits)
      setFeaturedCredits(allCredits.filter((c: Credit) => c.is_featured))
      setBrands(brandData || [])
      setTestimonials(testimonialData || [])
      setGallery(galleryData || [])
      setFaqs(faqData || [])

      if (user && prof.id !== user.id) {
        const { data: conn } = await supabase
          .from('connections')
          .select('status')
          .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .or(`requester_id.eq.${prof.id},receiver_id.eq.${prof.id}`)
          .maybeSingle()
        if (conn) setConnectStatus(conn.status === 'accepted' ? 'connected' : 'pending')
      }

      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    if (testimonials.length <= 1) return
    const t = setInterval(() => setActiveTestimonial(i => (i + 1) % testimonials.length), 5000)
    return () => clearInterval(t)
  }, [testimonials.length])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contactRef.current && !contactRef.current.contains(e.target as Node)) setShowContact(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleConnect = async () => {
    if (!currentUserId || !profile) return
    if (connectStatus === 'none') {
      await supabase.from('connections').insert({ requester_id: currentUserId, receiver_id: profile.id })
      setConnectStatus('pending')
    }
  }

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '24px', height: '24px', border: '2px solid #0c2520', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#0c2520', margin: '0 0 8px' }}>Profile not found</p>
        <a href="/" style={{ fontSize: '14px', color: '#0c2520' }}>Go to The Ident</a>
      </div>
    </div>
  )

  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
  const doubledGallery = [...gallery, ...gallery]
  const isOwnProfile = currentUserId === profile?.id

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .marquee-track { display: flex; animation: marquee 30s linear infinite; }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        .faq-row { cursor: pointer; transition: background 0.15s ease; }
        .faq-row:hover { background: #f5f3ee; }
        .skill-tag { display: inline-block; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .gallery-img { cursor: pointer; transition: transform 0.2s ease, filter 0.2s ease; flex-shrink: 0; }
        .gallery-img:hover { transform: scale(1.03); filter: brightness(0.9); }
        .credit-row { transition: background 0.15s ease; }
        .credit-row:hover { background: #f5f3ee; }
        .reel-tab { cursor: pointer; padding: 8px 16px; font-size: 13px; border: none; background: transparent; font-family: inherit; transition: all 0.15s ease; white-space: nowrap; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1000; display: flex; align-items: center; justify-content: center; cursor: zoom-out; }
        .contact-popup { animation: popIn 0.2s ease-out; }
        .feat-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .feat-scroll::-webkit-scrollbar { display: none; }
        .feat-card { flex-shrink: 0; width: 200px; background: #061410; border-radius: 14px; overflow: hidden; cursor: pointer; transition: transform 0.2s ease; }
        .feat-card:hover { transform: translateY(-2px); }
      `}</style>

      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '8px', objectFit: 'contain' }} />
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Nav */}
      <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e0ddd5', background: '#f1f0ee' }}>
        <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#0c2520', textDecoration: 'none', fontWeight: 500 }}>✦ theident</a>
        <NavButton />
      </div>

      {/* Availability banner */}
      {profile?.availability_status && (
        <div style={{
          background: profile.availability_status === 'available' ? '#4ade80' : '#fde6c2',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
        }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: profile.availability_status === 'available' ? '#061410' : '#8a5a2e' }} />
          <p style={{ fontSize: '13px', fontWeight: 600, color: profile.availability_status === 'available' ? '#061410' : '#8a5a2e', margin: 0 }}>
            {profile.availability_status === 'available'
              ? 'Available for work'
              : `In production${profile.production_until ? ` until ${formatDate(profile.production_until)}` : ''}`
            }
          </p>
        </div>
      )}

      <div className="fade-in" style={{ maxWidth: '680px', margin: '0 auto', padding: '0 0 80px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '48px 24px 24px' }}>
          {profile?.picture_url && (
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: `url(${profile.picture_url}) center/cover`, margin: '0 auto 20px', border: '3px solid white', boxShadow: '0 4px 20px rgba(12,37,32,0.12)' }} />
          )}
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', margin: '0 0 12px', lineHeight: 1.1 }}>{fullName}</h1>
          {skills.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '12px' }}>
              {skills.map(s => <span key={s.id} className="skill-tag" style={{ background: s.color, color: s.text_color }}>{s.name}</span>)}
            </div>
          )}
          {profile?.location && <p style={{ fontSize: '13px', color: '#888', margin: '0 0 20px' }}>{profile.location}</p>}

          {/* Action buttons */}
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              {/* Connect button */}
              {currentUserId && (
                <button
                  onClick={handleConnect}
                  disabled={connectStatus !== 'none'}
                  style={{
                    padding: '10px 24px', borderRadius: '30px', border: 'none', cursor: connectStatus === 'none' ? 'pointer' : 'default',
                    background: connectStatus === 'connected' ? '#4ade80' : connectStatus === 'pending' ? '#e8e4de' : '#0c2520',
                    color: connectStatus === 'connected' ? '#061410' : connectStatus === 'pending' ? '#888' : '#f1f0ee',
                    fontSize: '14px', fontWeight: 500, fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  {connectStatus === 'connected' ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Connected</>
                  ) : connectStatus === 'pending' ? 'Request sent' : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Connect</>
                  )}
                </button>
              )}

              {/* Contact agent button */}
              {(profile?.agent_name || profile?.agent_email) && (
                <div ref={contactRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowContact(!showContact)}
                    style={{ padding: '10px 24px', borderRadius: '30px', border: '1px solid #e0ddd5', background: 'white', color: '#0c2520', fontSize: '14px', fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 5.35 5.35l1.53-1.53a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    Contact agent
                  </button>

                  {showContact && (
                    <div className="contact-popup" style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: '16px', border: '1px solid #e8e4de', boxShadow: '0 8px 32px rgba(12,37,32,0.12)', padding: '20px', minWidth: '240px', zIndex: 100 }}>
                      <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 12px' }}>Agent details</p>
                      {profile.agent_name && (
                        <p style={{ fontSize: '15px', fontWeight: 600, color: '#0c2520', margin: '0 0 10px' }}>{profile.agent_name}</p>
                      )}
                      {profile.agent_phone && (
                        <a href={`tel:${profile.agent_phone}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', textDecoration: 'none', marginBottom: '8px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 5.35 5.35l1.53-1.53a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                          {profile.agent_phone}
                        </a>
                      )}
                      {profile.agent_email && (
                        <a href={`mailto:${profile.agent_email}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', textDecoration: 'none' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          {profile.agent_email}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Reels */}
        {reels.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div style={{ background: '#061410', aspectRatio: '16/9', overflow: 'hidden' }}>
              <video key={reels[activeReel]?.url} src={reels[activeReel]?.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {reels.length > 1 && (
              <div style={{ display: 'flex', borderBottom: '1px solid #e0ddd5', overflowX: 'auto', background: 'white' }}>
                {reels.map((r, i) => (
                  <button key={r.id} className="reel-tab" onClick={() => setActiveReel(i)} style={{ color: i === activeReel ? '#0c2520' : '#888', fontWeight: i === activeReel ? 600 : 400, borderBottom: i === activeReel ? '2px solid #0c2520' : '2px solid transparent' }}>
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bio */}
        {profile?.bio && (
          <div style={{ padding: '0 24px 48px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#0c2520', lineHeight: 1.5, margin: 0, fontWeight: 400 }}>{profile.bio}</p>
          </div>
        )}

        {/* Featured work slider */}
        {featuredCredits.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 14px', paddingLeft: '24px' }}>Featured work</p>
            <div className="feat-scroll" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
              {featuredCredits.map((c, i) => (
                <div key={c.id} className="feat-card">
                  {c.thumbnail_url ? (
                    <div style={{ width: '100%', height: '120px', background: `url(${c.thumbnail_url}) center/cover` }} />
                  ) : (
                    <div style={{ width: '100%', height: '120px', background: '#1a3a30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontFamily: 'Georgia, serif', fontSize: '32px', color: '#2a5040' }}>{c.title?.[0]}</span>
                    </div>
                  )}
                  <div style={{ padding: '12px 14px 14px' }}>
                    <p style={{ fontSize: '10px', color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>Featured</p>
                    <p style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#f1f0ee', margin: '0 0 3px', fontWeight: 500 }}>{c.title}</p>
                    {c.role && <p style={{ fontSize: '11px', color: '#6b9e8a', margin: 0 }}>{c.role}</p>}
                    {c.year && <p style={{ fontSize: '11px', color: '#3a6a58', margin: '4px 0 0' }}>{c.year}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand carousel */}
        {brands.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div className="marquee-wrap" style={{ overflow: 'hidden' }}>
              <div className="marquee-track">
                {[...brands, ...brands].map((b, i) => (
                  <div key={`${b.id}-${i}`} style={{ flexShrink: 0, margin: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px' }}>
                    {b.logo_url ? (
                      <>
                        <img src={b.logo_url} alt={b.brand_name} style={{ height: '44px', maxWidth: '140px', objectFit: 'contain', display: 'block' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; const n = e.currentTarget.nextElementSibling as HTMLElement; if (n) n.style.display = 'block' }} />
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Georgia, serif', display: 'none' }}>{b.brand_name}</span>
                      </>
                    ) : (
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>{b.brand_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All credits */}
        {credits.length > 0 && (
          <div style={{ padding: '0 24px 48px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Credits</h2>
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
              {credits.map((c, i) => (
                <div key={c.id} className="credit-row" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderBottom: i < credits.length - 1 ? '1px solid #f0ede5' : 'none' }}>
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt={c.title} style={{ width: '60px', height: '42px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '60px', height: '42px', borderRadius: '6px', background: '#f1f0ee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '18px', fontWeight: 700, color: '#ddd' }}>{c.title?.[0]}</span>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c2520', margin: '0 0 3px' }}>{c.title}</p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {c.role && <span style={{ fontSize: '12px', color: '#888' }}>{c.role}</span>}
                      {c.director && <span style={{ fontSize: '12px', color: '#bbb' }}>· {c.director}</span>}
                      {c.production_company && <span style={{ fontSize: '12px', color: '#bbb' }}>· {c.production_company}</span>}
                    </div>
                  </div>
                  {c.year && <span style={{ fontSize: '12px', color: '#aaa', flexShrink: 0 }}>{c.year}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div style={{ padding: '0 24px 48px' }}>
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '32px' }}>
              <div style={{ fontSize: '48px', color: '#e8e4de', fontFamily: 'Georgia, serif', lineHeight: 1, marginBottom: '8px' }}>"</div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0c2520', lineHeight: 1.6, margin: '0 0 20px', fontStyle: 'italic' }}>
                {testimonials[activeTestimonial]?.quote}
              </p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {testimonials[activeTestimonial]?.author_name}
              </p>
              {testimonials[activeTestimonial]?.author_title && (
                <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{testimonials[activeTestimonial]?.author_title}</p>
              )}
              {testimonials.length > 1 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '20px' }}>
                  {testimonials.map((_, i) => (
                    <button key={i} onClick={() => setActiveTestimonial(i)} style={{ width: i === activeTestimonial ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === activeTestimonial ? '#0c2520' : '#e0ddd5', border: 'none', cursor: 'pointer', transition: 'all 0.3s ease', padding: 0 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ marginBottom: '48px' }}>
            <div className="marquee-wrap" style={{ overflow: 'hidden' }}>
              <div className="marquee-track" style={{ gap: '10px' }}>
                {doubledGallery.map((img, i) => (
                  <div key={`${img.id}-${i}`} className="gallery-img" onClick={() => setLightbox(img.url)} style={{ width: '200px', height: '150px', flexShrink: 0, borderRadius: '10px', background: `url(${img.url}) center/cover` }} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div style={{ padding: '0 24px 48px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Questions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {faqs.map(faq => (
                <div key={faq.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
                  <div className="faq-row" onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{faq.question}</p>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, transform: openFaq === faq.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                      <path d="M6 9l6 6 6-6"/>
                    </svg>
                  </div>
                  {openFaq === faq.id && (
                    <div style={{ padding: '0 20px 16px', borderTop: '1px solid #f0ede5' }}>
                      <p style={{ fontSize: '14px', color: '#666', margin: '12px 0 0', lineHeight: 1.6 }}>{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '0 24px' }}>
          <a href="/" style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: '#0c2520', textDecoration: 'none' }}>✦ theident</a>
          <p style={{ fontSize: '11px', color: '#aaa', margin: '6px 0 0' }}>The performing arts platform</p>
        </div>
      </div>
    </div>
  )
}
