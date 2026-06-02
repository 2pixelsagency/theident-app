'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string; first_name: string | null; last_name: string | null; picture_url: string | null
  bio: string | null; summary: string | null; location: string | null; slug: string | null
  availability_status: string | null; production_until: string | null
  agent_name: string | null; agent_phone: string | null; agent_email: string | null
  vid_1: string | null; vid_2: string | null; vid_3: string | null; vid_4: string | null
}
type Skill = { id: number; name: string }
type Credit = { id: string; title: string; role: string | null; year: number | null; thumbnail_url: string | null; director: string | null; production_company: string | null; is_featured: boolean; production_type_id: number | null; description: string | null }
type Brand = { id: string; brand_name: string; logo_url: string | null }
type Testimonial = { id: string; quote: string; author_name: string; author_title: string | null }
type GalleryImage = { id: string; url: string }
type FAQ = { id: string; question: string; answer: string }
type ProdType = { id: number; name: string }

function NavButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [fromApp, setFromApp] = useState(false)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setFromApp(p.get('from') === 'app')
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [])
  if (isLoggedIn || fromApp) return <a href="/dashboard" style={{ fontSize:'13px',color:'white',textDecoration:'none',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',padding:'8px 18px',borderRadius:'20px' }}>Back to app</a>
  return <a href="/login" style={{ fontSize:'13px',color:'white',textDecoration:'none',background:'rgba(0,0,0,0.35)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'1px solid rgba(255,255,255,0.15)',padding:'8px 18px',borderRadius:'20px' }}>Sign in</a>
}

function ReelCard({ label, url }: { label: string; url: string }) {
  const [playing, setPlaying] = useState(false)
  const vidRef = useRef<HTMLVideoElement>(null)
  return (
    <div style={{ borderRadius:'14px',overflow:'hidden',background:'#061410' }}>
      <div style={{ position:'relative',aspectRatio:'9/14' }}>
        <video ref={vidRef} playsInline preload="metadata"
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
          style={{ width:'100%',height:'100%',objectFit:'cover' }}>
          <source src={url + '#t=0.5'} />
        </video>
        {!playing && (
          <div onClick={() => { if (vidRef.current) { vidRef.current.controls = true; vidRef.current.play() } }}
            style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.25)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
            <div style={{ width:'48px',height:'48px',borderRadius:'50%',background:'rgba(255,255,255,0.9)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#0c2520" stroke="none"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            </div>
          </div>
        )}
      </div>
      <div style={{ padding:'10px 12px' }}>
        <p style={{ fontSize:'13px',fontWeight:600,color:'#f1f0ee',margin:0 }}>{label}</p>
      </div>
    </div>
  )
}

export default function PublicProfile() {
  const params = useParams()
  const slug = params.slug as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [skills, setSkills] = useState<Skill[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [featuredCredits, setFeaturedCredits] = useState<Credit[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [productionTypes, setProductionTypes] = useState<ProdType[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [openFaq, setOpenFaq] = useState<string | null>(null)
  const [activeGallery, setActiveGallery] = useState(0)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [connectStatus, setConnectStatus] = useState<'none' | 'pending' | 'connected'>('none')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [connectionCount, setConnectionCount] = useState(0)
  const contactRef = useRef<HTMLDivElement>(null)

  const [mainTab, setMainTab] = useState<'credits' | 'reels'>('credits')
  const [creditFilter, setCreditFilter] = useState<number | null>(null)
  const [creditYearFilter, setCreditYearFilter] = useState<number | null>(null)
  const [creditSearch, setCreditSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, bio, summary, location, slug, availability_status, production_until, agent_name, agent_phone, agent_email, vid_1, vid_2, vid_3, vid_4').eq('slug', slug).single()
      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)
      const [{ data: skillData }, { data: creditData }, { data: brandData }, { data: testimonialData }, { data: galleryData }, { data: faqData }, { data: ptData }, { data: conns }] = await Promise.all([
        supabase.from('profile_skills').select('skills(id, name)').eq('profile_id', prof.id),
        supabase.from('credits').select('*').eq('profile_id', prof.id).order('year', { ascending: false }),
        supabase.from('profile_brands').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('testimonials').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('gallery_images').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('faqs').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('connections').select('id, status, requester_id, receiver_id').or('requester_id.eq.' + prof.id + ',receiver_id.eq.' + prof.id),
      ])
      setSkills((skillData || []).map((s: any) => ({ id: s.skills?.id, name: s.skills?.name })).filter((s: any) => s.name))
      const allCredits = creditData || []
      setCredits(allCredits)
      setFeaturedCredits(allCredits.filter((c: Credit) => c.is_featured))
      setBrands(brandData || [])
      setTestimonials(testimonialData || [])
      setGallery(galleryData || [])
      setFaqs(faqData || [])
      setProductionTypes(ptData || [])
      setConnectionCount((conns || []).filter((c: any) => c.status === 'accepted').length)
      if (user && prof.id !== user.id) {
        const match = (conns || []).find((c: any) => (c.requester_id === user.id || c.receiver_id === user.id) && (c.requester_id === prof.id || c.receiver_id === prof.id))
        if (match) setConnectStatus(match.status === 'accepted' ? 'connected' : 'pending')
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
    const handleClick = (e: MouseEvent) => { if (contactRef.current && !contactRef.current.contains(e.target as Node)) setShowContact(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleConnect = async () => {
    if (!currentUserId || !profile || connectStatus !== 'none') return
    await supabase.from('connections').insert({ requester_id: currentUserId, receiver_id: profile.id })
    setConnectStatus('pending')
  }

  const hasReels = profile && (profile.vid_1 || profile.vid_2 || profile.vid_3 || profile.vid_4)
  const reelsList = profile ? [
    { label: 'Ident', url: profile.vid_1 },
    { label: 'Dance Reel', url: profile.vid_2 },
    { label: 'Acting Reel', url: profile.vid_3 },
    { label: 'Singing Reel', url: profile.vid_4 },
  ].filter(r => r.url) : []

  let filteredCredits = [...credits]
  if (creditFilter) filteredCredits = filteredCredits.filter(c => c.production_type_id === creditFilter)
  if (creditYearFilter) filteredCredits = filteredCredits.filter(c => c.year === creditYearFilter)
  if (creditSearch) {
    const q = creditSearch.toLowerCase()
    filteredCredits = filteredCredits.filter(c => (c.title || '').toLowerCase().includes(q) || (c.role || '').toLowerCase().includes(q) || (c.director || '').toLowerCase().includes(q) || (c.production_company || '').toLowerCase().includes(q))
  }
  const creditCategories = productionTypes.filter(pt => credits.some(c => c.production_type_id === pt.id))
  const creditYears = [...new Set(credits.map(c => c.year).filter(Boolean))].sort((a, b) => (b || 0) - (a || 0)) as number[]
  const hasActiveCredFilter = creditFilter !== null || creditYearFilter !== null || creditSearch !== ''
  const isOwnProfile = currentUserId === profile?.id
  const fullName = ((profile?.first_name || '') + ' ' + (profile?.last_name || '')).trim()

  if (loading) return <div style={{ minHeight:'100vh',background:'#f1f0ee',display:'flex',alignItems:'center',justifyContent:'center' }}><div style={{ width:'24px',height:'24px',border:'2px solid #0c2520',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>
  if (notFound) return <div style={{ minHeight:'100vh',background:'#f1f0ee',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui' }}><div style={{ textAlign:'center' }}><p style={{ fontFamily:'Georgia,serif',fontSize:'24px',color:'#0c2520',margin:'0 0 8px' }}>Profile not found</p><a href="/" style={{ fontSize:'14px',color:'#0c2520' }}>Go to The Ident</a></div></div>

  return (
    <div style={{ fontFamily:'system-ui, sans-serif',background:'#f1f0ee',minHeight:'100vh',position:'relative' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        @keyframes popIn { from { opacity:0;transform:scale(0.95) translateY(-4px); } to { opacity:1;transform:scale(1) translateY(0); } }
        .marquee-track { display:flex;animation:marquee 15s linear infinite; }
        .marquee-wrap:hover .marquee-track { animation-play-state:paused; }
        .faq-row { cursor:pointer;transition:background 0.15s ease; }
        .faq-row:hover { background:#eae8e3; }
        .lightbox-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:1000;display:flex;align-items:center;justify-content:center;cursor:zoom-out; }
        .contact-popup { animation:popIn 0.2s ease-out; }
        .feat-scroll { display:flex;gap:14px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch; }
        .feat-scroll::-webkit-scrollbar { display:none; }
        .cat-tab { padding:6px 14px;border-radius:20px;font-size:12px;cursor:pointer;font-family:inherit;border:1px solid #e0ddd5;background:white;color:#888;transition:all 0.15s ease;white-space:nowrap;-webkit-tap-highlight-color:transparent; }
        .cat-tab.on { background:#0c2520;color:#f1f0ee;border-color:#0c2520; }
        input[type=search]:focus { border-color:#0c2520 !important;outline:none;box-shadow:0 0 0 1px #0c2520; }
        .tab-slide { transition:transform 0.35s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {lightbox && <div className="lightbox-overlay" onClick={() => setLightbox(null)}><img src={lightbox} alt="" style={{ maxWidth:'90vw',maxHeight:'90vh',borderRadius:'8px',objectFit:'contain' }} /></div>}

      {/* Contact info */}
      {(profile?.agent_name || profile?.agent_email) && (
        <div ref={contactRef}>
          <button onClick={() => setShowContact(!showContact)} style={{ position:'fixed',right:0,top:'50%',transform:'translateY(-50%)',background:'#0c2520',color:'#f1f0ee',border:'none',padding:'16px 10px',borderRadius:'10px 0 0 10px',cursor:'pointer',writingMode:'vertical-rl',fontSize:'12px',fontWeight:600,letterSpacing:'0.05em',zIndex:400,fontFamily:'inherit' }}>Contact Info</button>
          {showContact && (
            <div className="contact-popup" style={{ position:'fixed',right:'16px',top:'50%',transform:'translateY(-50%)',background:'white',borderRadius:'16px',padding:'24px',boxShadow:'0 8px 32px rgba(0,0,0,0.15)',zIndex:460,width:'280px',border:'1px solid #e8e4de' }}>
              <p style={{ fontSize:'11px',color:'#888',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,margin:'0 0 14px' }}>Agent details</p>
              {profile?.agent_name && <p style={{ fontSize:'16px',fontWeight:600,color:'#0c2520',margin:'0 0 12px' }}>{profile.agent_name}</p>}
              {profile?.agent_phone && <a href={'tel:' + profile.agent_phone} style={{ display:'flex',alignItems:'center',gap:'10px',fontSize:'14px',color:'#0c2520',textDecoration:'none',marginBottom:'10px' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 5.35 5.35l1.53-1.53a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{profile.agent_phone}</a>}
              {profile?.agent_email && <a href={'mailto:' + profile.agent_email} style={{ display:'flex',alignItems:'center',gap:'10px',fontSize:'14px',color:'#0c2520',textDecoration:'none' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{profile.agent_email}</a>}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div style={{ position:'absolute',top:0,left:0,right:0,padding:'16px 32px',display:'flex',justifyContent:'flex-end',alignItems:'center',zIndex:10 }}>
        <NavButton />
      </div>

      <div style={{ maxWidth:'680px',margin:'0 auto',padding:'0 0 100px' }}>

        {/* Hero */}
        <div style={{ textAlign:'center',background:'#f1f0ee' }}>
          {profile?.vid_1 && (
            <div style={{ width:'100%',height:'300px',overflow:'hidden' }}>
              <video autoPlay muted loop playsInline style={{ width:'100%',height:'100%',objectFit:'cover' }}>
                <source src={profile.vid_1} />
              </video>
            </div>
          )}
          {!profile?.vid_1 && <div style={{ height:'80px' }} />}

          <div style={{ marginTop:profile?.vid_1 ? '-55px' : '0',position:'relative',zIndex:2,paddingBottom:'8px' }}>
            {profile?.picture_url && (
              <div style={{ width:'110px',height:'110px',borderRadius:'50%',background:'url(' + profile.picture_url + ') center/cover',backgroundSize:'cover',margin:'0 auto 24px',border:'4px solid #f1f0ee',boxShadow:'0 4px 24px rgba(12,37,32,0.15)' }} />
            )}

            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',margin:'0 0 10px',padding:'0 32px' }}>
              <h1 style={{ fontFamily:'Georgia,serif',fontSize:'36px',fontWeight:500,color:'#0c2520',margin:0,lineHeight:1.1 }}>{fullName}</h1>
              {profile?.availability_status === 'available' && (
                <div title="Available for work" style={{ width:'12px',height:'12px',borderRadius:'50%',background:'#4ade80',border:'2px solid #f1f0ee',flexShrink:0 }} />
              )}
            </div>

            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',marginBottom:'16px',flexWrap:'wrap' }}>
              {profile?.location && <span style={{ fontSize:'13px',color:'#888' }}>{profile.location}</span>}
              {profile?.location && connectionCount > 0 && <span style={{ fontSize:'13px',color:'#d4d2cc' }}>·</span>}
              {connectionCount > 0 && <span style={{ fontSize:'13px',color:'#888' }}>{connectionCount} connection{connectionCount !== 1 ? 's' : ''}</span>}
              {profile?.availability_status === 'in_production' && (
                <>
                  <span style={{ fontSize:'13px',color:'#d4d2cc' }}>·</span>
                  <span style={{ fontSize:'13px',color:'#c8913a',fontWeight:500 }}>
                    {'In production' + (profile.production_until ? ' until ' + new Date(profile.production_until).toLocaleDateString('en-GB',{month:'short',year:'numeric'}) : '')}
                  </span>
                </>
              )}
            </div>

            {skills.length > 0 && (
              <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center',marginBottom:'24px',padding:'0 32px' }}>
                {skills.map(s => <span key={s.id} style={{ padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:500,background:'#e8e4de',color:'#0c2520' }}>{s.name}</span>)}
              </div>
            )}

            {!isOwnProfile && currentUserId && (
              <div style={{ marginBottom:'8px' }}>
                <button onClick={handleConnect} disabled={connectStatus !== 'none'} style={{ padding:'11px 28px',borderRadius:'30px',border:'none',cursor:connectStatus === 'none' ? 'pointer' : 'default',background:connectStatus === 'connected' ? '#4ade80' : connectStatus === 'pending' ? '#e8e4de' : '#0c2520',color:connectStatus === 'connected' ? '#061410' : connectStatus === 'pending' ? '#888' : '#f1f0ee',fontSize:'14px',fontWeight:500,fontFamily:'inherit' }}>
                  {connectStatus === 'connected' ? 'Connected' : connectStatus === 'pending' ? 'Request sent' : 'Connect'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bio + Summary */}
        {(profile?.bio || profile?.summary) && (
          <div style={{ padding:'36px 32px 0' }}>
            {profile?.bio && (
              <p style={{ fontFamily:'Georgia,serif',fontSize:'26px',color:'#0c2520',lineHeight:1.45,margin:0,fontWeight:400 }}>{profile.bio}</p>
            )}
            {profile?.summary && (
              <p style={{ fontSize:'15px',color:'#666',lineHeight:1.7,margin:'18px 0 0' }}>{profile.summary}</p>
            )}
          </div>
        )}

        <div style={{ height:'52px' }} />

        {/* Featured work */}
        {featuredCredits.length > 0 && (
          <div style={{ marginBottom:'56px' }}>
            <div className="feat-scroll" style={{ paddingLeft:'32px',paddingRight:'32px' }}>
              {featuredCredits.map(c => (
                <div key={c.id} style={{ flexShrink:0,width:'280px',height:'360px',borderRadius:'14px',overflow:'hidden',position:'relative' }}>
                  {c.thumbnail_url ? (
                    <div style={{ width:'100%',height:'100%',background:'url(' + c.thumbnail_url + ') center/cover',backgroundSize:'cover' }} />
                  ) : (
                    <div style={{ width:'100%',height:'100%',background:'#1a3a30',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <span style={{ fontFamily:'Georgia,serif',fontSize:'48px',color:'#2a5040' }}>{c.title?.[0]}</span>
                    </div>
                  )}
                  {c.year && <div style={{ position:'absolute',top:'14px',right:'14px',background:'white',padding:'4px 12px',borderRadius:'6px' }}><span style={{ fontSize:'13px',fontWeight:600,color:'#0c2520' }}>{c.year}</span></div>}
                  <div style={{ position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent, rgba(0,0,0,0.75))',padding:'48px 18px 20px' }}>
                    <p style={{ fontFamily:'Georgia,serif',fontSize:'22px',color:'white',margin:'0 0 4px',fontWeight:500,lineHeight:1.2 }}>{c.title}</p>
                    {c.role && <p style={{ fontSize:'14px',color:'rgba(255,255,255,0.8)',margin:0 }}>{c.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credits / Reels tabs */}
        {(credits.length > 0 || hasReels) && (
          <>
            <div style={{ padding:'0 32px' }}>
              <div style={{ display:'flex',background:'#e8e4de',borderRadius:'12px',padding:'4px',gap:'4px',marginBottom:'24px' }}>
                <button onClick={() => setMainTab('credits')} style={{ flex:1,padding:'12px',borderRadius:'9px',border:'none',background:mainTab === 'credits' ? '#0c2520' : 'transparent',color:mainTab === 'credits' ? '#f1f0ee' : '#888',fontSize:'15px',fontWeight:mainTab === 'credits' ? 600 : 400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s ease' }}>Credits</button>
                <button onClick={() => setMainTab('reels')} style={{ flex:1,padding:'12px',borderRadius:'9px',border:'none',background:mainTab === 'reels' ? '#0c2520' : 'transparent',color:mainTab === 'reels' ? '#f1f0ee' : '#888',fontSize:'15px',fontWeight:mainTab === 'reels' ? 600 : 400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s ease' }}>Reels</button>
              </div>
            </div>

            <div style={{ overflow:'hidden' }}>
              <div className="tab-slide" style={{ display:'flex',width:'200%',transform:mainTab === 'credits' ? 'translateX(0)' : 'translateX(-50%)' }}>

                {/* Credits panel */}
                <div style={{ width:'50%',padding:'0 32px 48px',boxSizing:'border-box' }}>
                  {credits.length > 0 && (
                    <>
                      <div style={{ position:'relative',marginBottom:'14px' }}>
                        <svg style={{ position:'absolute',left:'14px',top:'50%',transform:'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="search" placeholder="Search credits..." value={creditSearch} onChange={e => setCreditSearch(e.target.value)} style={{ width:'100%',padding:'11px 14px 11px 38px',border:'1px solid #e0ddd5',borderRadius:'12px',fontSize:'13px',fontFamily:'inherit',background:'white',boxSizing:'border-box',color:'#0c2520' }} />
                      </div>
                      <div style={{ display:'flex',gap:'8px',alignItems:'center',overflowX:'auto',marginBottom:'18px',paddingBottom:'4px' }}>
                        <button className={'cat-tab' + (creditFilter === null ? ' on' : '')} onClick={() => setCreditFilter(null)}>All</button>
                        {creditCategories.map(pt => (
                          <button key={pt.id} className={'cat-tab' + (creditFilter === pt.id ? ' on' : '')} onClick={() => setCreditFilter(creditFilter === pt.id ? null : pt.id)}>{pt.name}</button>
                        ))}
                        {creditYears.length > 1 && (
                          <select value={creditYearFilter || ''} onChange={e => setCreditYearFilter(e.target.value ? parseInt(e.target.value) : null)} style={{ padding:'6px 10px',borderRadius:'20px',fontSize:'12px',fontFamily:'inherit',border:'1px solid #e0ddd5',background:'white',color:creditYearFilter ? '#0c2520' : '#888',cursor:'pointer',appearance:'none' as any,paddingRight:'24px',backgroundImage:'url("data:image/svg+xml,%3Csvg width=\'8\' height=\'5\' viewBox=\'0 0 8 5\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1l3 3 3-3\' stroke=\'%23888\' stroke-width=\'1.5\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',backgroundRepeat:'no-repeat',backgroundPosition:'right 8px center' }}>
                            <option value="">Year</option>
                            {creditYears.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        )}
                        {hasActiveCredFilter && <button onClick={() => { setCreditFilter(null); setCreditYearFilter(null); setCreditSearch('') }} style={{ padding:'6px 12px',borderRadius:'20px',fontSize:'11px',fontFamily:'inherit',border:'none',background:'#c0392b',color:'white',cursor:'pointer',whiteSpace:'nowrap' }}>Clear</button>}
                      </div>
                      {hasActiveCredFilter && <p style={{ fontSize:'12px',color:'#aaa',margin:'0 0 14px' }}>{filteredCredits.length} credit{filteredCredits.length !== 1 ? 's' : ''}</p>}
                      {filteredCredits.length === 0 ? (
                        <p style={{ fontSize:'13px',color:'#aaa',textAlign:'center',padding:'32px 0' }}>No credits match your filters</p>
                      ) : (
                        filteredCredits.map((c, i) => (
                          <div key={c.id} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'16px 0',borderBottom:i < filteredCredits.length - 1 ? '1px solid #e8e4de' : 'none' }}>
                            {c.thumbnail_url ? (
                              <img src={c.thumbnail_url} alt={c.title} style={{ width:'56px',height:'40px',objectFit:'cover',borderRadius:'6px',flexShrink:0 }} />
                            ) : (
                              <div style={{ width:'56px',height:'40px',borderRadius:'6px',background:'#e8e4de',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center' }}>
                                <span style={{ fontSize:'16px',fontWeight:700,color:'#ccc' }}>{c.title?.[0]}</span>
                              </div>
                            )}
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex',alignItems:'center',gap:'8px' }}>
                                <p style={{ fontSize:'14px',fontWeight:600,color:'#0c2520',margin:0 }}>{c.title}</p>
                                {c.is_featured && <span style={{ fontSize:'9px',fontWeight:600,color:'#4ade80' }}>FEATURED</span>}
                              </div>
                              <p style={{ fontSize:'12px',color:'#888',margin:'3px 0 0' }}>
                                {c.role}{c.director ? ' · ' + c.director : ''}{c.production_company ? ' · ' + c.production_company : ''}
                              </p>
                            </div>
                            {c.year && <span style={{ fontSize:'12px',color:'#aaa',flexShrink:0 }}>{c.year}</span>}
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>

                {/* Reels panel */}
                <div style={{ width:'50%',padding:'0 32px 48px',boxSizing:'border-box' }}>
                  {hasReels && (
                    <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px' }}>
                      {reelsList.map(r => (
                        <ReelCard key={r.label} label={r.label} url={r.url || ''} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Brand marquee */}
        {brands.length > 0 && (
          <div style={{ marginBottom:'56px' }}>
            <div className="marquee-wrap" style={{ overflow:'hidden' }}>
              <div className="marquee-track">
                {[...brands,...brands,...brands].map((b, i) => (
                  <div key={b.id + '-' + i} style={{ flexShrink:0,margin:'0 36px',display:'flex',alignItems:'center',justifyContent:'center',height:'60px' }}>
                    {b.logo_url ? (
                      <img src={b.logo_url} alt={b.brand_name} style={{ height:'44px',maxWidth:'140px',objectFit:'contain' }} onError={e => { (e.target as HTMLImageElement).style.display='none'; const n = (e.target as HTMLImageElement).nextElementSibling as HTMLElement; if(n) n.style.display='block' }} />
                    ) : null}
                    <span style={{ fontSize:'14px',fontWeight:700,color:'#bbb',letterSpacing:'0.08em',textTransform:'uppercase',fontFamily:'Georgia,serif',display:b.logo_url?'none':'block' }}>{b.brand_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div style={{ padding:'0 32px 56px' }}>
            <div style={{ fontSize:'56px',color:'#e0ddd5',fontFamily:'Georgia,serif',lineHeight:1,marginBottom:'8px' }}>"</div>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'19px',color:'#0c2520',lineHeight:1.65,margin:'0 0 24px',fontStyle:'italic' }}>{testimonials[activeTestimonial]?.quote}</p>
            <p style={{ fontSize:'13px',fontWeight:700,color:'#0c2520',margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.06em' }}>{testimonials[activeTestimonial]?.author_name}</p>
            {testimonials[activeTestimonial]?.author_title && <p style={{ fontSize:'12px',color:'#888',margin:0 }}>{testimonials[activeTestimonial]?.author_title}</p>}
            {testimonials.length > 1 && (
              <div style={{ display:'flex',gap:'6px',marginTop:'24px' }}>
                {testimonials.map((_, i) => <button key={i} onClick={() => setActiveTestimonial(i)} style={{ width:i === activeTestimonial ? '20px' : '6px',height:'6px',borderRadius:'3px',background:i === activeTestimonial ? '#0c2520' : '#e0ddd5',border:'none',cursor:'pointer',transition:'all 0.3s ease',padding:0 }} />)}
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ padding:'0 32px 56px' }}>
            <div style={{ position:'relative',borderRadius:'14px',overflow:'hidden',aspectRatio:'4/3' }}>
              <div style={{ display:'flex',width:gallery.length * 100 + '%',transform:'translateX(-' + (activeGallery * (100 / gallery.length)) + '%)',transition:'transform 0.4s cubic-bezier(0.4,0,0.2,1)',height:'100%' }}
                onTouchStart={e => { (e.currentTarget as any)._startX = e.touches[0].clientX }}
                onTouchEnd={e => {
                  const start = (e.currentTarget as any)._startX
                  const end = e.changedTouches[0].clientX
                  const diff = start - end
                  if (diff > 50 && activeGallery < gallery.length - 1) setActiveGallery(activeGallery + 1)
                  if (diff < -50 && activeGallery > 0) setActiveGallery(activeGallery - 1)
                }}>
                {gallery.map(img => (
                  <div key={img.id} onClick={() => setLightbox(img.url)} style={{ width:100 / gallery.length + '%',height:'100%',flexShrink:0,background:'url(' + img.url + ') center/cover',backgroundSize:'cover',cursor:'pointer' }} />
                ))}
              </div>
              {gallery.length > 1 && (
                <div style={{ position:'absolute',bottom:'14px',left:'50%',transform:'translateX(-50%)',display:'flex',gap:'6px' }}>
                  {gallery.map((_, i) => (
                    <button key={i} onClick={() => setActiveGallery(i)} style={{ width:i === activeGallery ? '20px' : '6px',height:'6px',borderRadius:'3px',background:i === activeGallery ? 'white' : 'rgba(255,255,255,0.5)',border:'none',cursor:'pointer',transition:'all 0.3s ease',padding:0 }} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div style={{ padding:'0 32px 56px' }}>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'28px',fontWeight:500,color:'#0c2520',margin:'0 0 20px' }}>Questions</h2>
            {faqs.map(faq => (
              <div key={faq.id} style={{ borderBottom:'1px solid #e8e4de' }}>
                <div className="faq-row" onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} style={{ padding:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'16px' }}>
                  <p style={{ fontSize:'15px',fontWeight:500,color:'#0c2520',margin:0 }}>{faq.question}</p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0,transform:openFaq === faq.id ? 'rotate(180deg)' : 'none',transition:'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {openFaq === faq.id && <p style={{ fontSize:'14px',color:'#666',margin:'0 0 18px',lineHeight:1.65 }}>{faq.answer}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center',padding:'0 32px' }}>
          <a href="/" style={{ fontFamily:'Georgia,serif',fontSize:'15px',color:'#0c2520',textDecoration:'none' }}>theident</a>
          <p style={{ fontSize:'11px',color:'#aaa',margin:'6px 0 0' }}>The performing arts platform</p>
        </div>
      </div>
    </div>
  )
}
