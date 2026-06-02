'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string; first_name: string | null; last_name: string | null; picture_url: string | null
  bio: string | null; location: string | null; slug: string | null
  availability_status: string | null; production_until: string | null
  agent_name: string | null; agent_phone: string | null; agent_email: string | null
  vid_1: string | null; vid_2: string | null; vid_3: string | null; vid_4: string | null
}
type Skill = { id: number; name: string; color: string; text_color: string }
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
    const params = new URLSearchParams(window.location.search)
    setFromApp(params.get('from') === 'app')
    supabase.auth.getUser().then(({ data: { user } }) => setIsLoggedIn(!!user))
  }, [])
  if (isLoggedIn || fromApp) return <a href="/dashboard" style={{ fontSize:'13px',color:'#0c2520',textDecoration:'none',background:'white',border:'1px solid #e0ddd5',padding:'8px 16px',borderRadius:'20px' }}>Back to app</a>
  return <a href="/login" style={{ fontSize:'13px',color:'#0c2520',textDecoration:'none',background:'white',border:'1px solid #e0ddd5',padding:'8px 16px',borderRadius:'20px' }}>Sign in</a>
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
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [showContact, setShowContact] = useState(false)
  const [connectStatus, setConnectStatus] = useState<'none' | 'pending' | 'connected'>('none')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [connectionCount, setConnectionCount] = useState(0)
  const contactRef = useRef<HTMLDivElement>(null)

  // Tab state: credits or reels
  const [mainTab, setMainTab] = useState<'credits' | 'reels'>('credits')
  // Credit category filter
  const [creditFilter, setCreditFilter] = useState<number | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data: prof } = await supabase.from('profiles').select('id, first_name, last_name, picture_url, bio, location, slug, availability_status, production_until, agent_name, agent_phone, agent_email, vid_1, vid_2, vid_3, vid_4').eq('slug', slug).single()
      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)

      const [{ data: skillData }, { data: creditData }, { data: brandData }, { data: testimonialData }, { data: galleryData }, { data: faqData }, { data: ptData }, { data: conns }] = await Promise.all([
        supabase.from('profile_skills').select('skills(id, name, skills_categories(color, text_color))').eq('profile_id', prof.id),
        supabase.from('credits').select('*').eq('profile_id', prof.id).order('year', { ascending: false }),
        supabase.from('profile_brands').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('testimonials').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('gallery_images').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('faqs').select('*').eq('profile_id', prof.id).order('sort_order'),
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('connections').select('id, status, requester_id, receiver_id').or('requester_id.eq.' + prof.id + ',receiver_id.eq.' + prof.id),
      ])

      setSkills((skillData || []).map((s: any) => ({ id: s.skills?.id, name: s.skills?.name, color: s.skills?.skills_categories?.color || '#e8efea', text_color: s.skills?.skills_categories?.text_color || '#0c2520' })).filter((s: any) => s.name))
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

  // Credits filtered by category
  const filteredCredits = creditFilter ? credits.filter(c => c.production_type_id === creditFilter) : credits
  const creditCategories = productionTypes.filter(pt => credits.some(c => c.production_type_id === pt.id))

  const isOwnProfile = currentUserId === profile?.id
  const fullName = ((profile?.first_name || '') + ' ' + (profile?.last_name || '')).trim()

  if (loading) return <div style={{ minHeight:'100vh',background:'#f1f0ee',display:'flex',alignItems:'center',justifyContent:'center' }}><div style={{ width:'24px',height:'24px',border:'2px solid #0c2520',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>
  if (notFound) return <div style={{ minHeight:'100vh',background:'#f1f0ee',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'system-ui' }}><div style={{ textAlign:'center' }}><p style={{ fontFamily:'Georgia,serif',fontSize:'24px',color:'#0c2520',margin:'0 0 8px' }}>Profile not found</p><a href="/" style={{ fontSize:'14px',color:'#0c2520' }}>Go to The Ident</a></div></div>

  return (
    <div style={{ fontFamily:'system-ui, sans-serif',background:'#f1f0ee',minHeight:'100vh' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes popIn { from { opacity:0;transform:scale(0.95) translateY(-4px); } to { opacity:1;transform:scale(1) translateY(0); } }
        .marquee-track { display:flex;animation:marquee 30s linear infinite; }
        .marquee-wrap:hover .marquee-track { animation-play-state:paused; }
        .gallery-img { cursor:pointer;transition:transform 0.2s ease;flex-shrink:0; }
        .gallery-img:hover { transform:scale(1.03); }
        .faq-row { cursor:pointer;transition:background 0.15s ease; }
        .faq-row:hover { background:#f5f3ee; }
        .lightbox-overlay { position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:1000;display:flex;align-items:center;justify-content:center;cursor:zoom-out; }
        .contact-popup { animation:popIn 0.2s ease-out; }
        .feat-scroll { display:flex;gap:14px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;-webkit-overflow-scrolling:touch; }
        .feat-scroll::-webkit-scrollbar { display:none; }
        .cat-tab { padding:6px 14px;border-radius:20px;font-size:12px;cursor:pointer;font-family:inherit;border:1px solid #e0ddd5;background:white;color:#888;transition:all 0.15s ease;white-space:nowrap;-webkit-tap-highlight-color:transparent; }
        .cat-tab.on { background:#0c2520;color:#f1f0ee;border-color:#0c2520; }
      `}</style>

      {lightbox && <div className="lightbox-overlay" onClick={() => setLightbox(null)}><img src={lightbox} alt="" style={{ maxWidth:'90vw',maxHeight:'90vh',borderRadius:'8px',objectFit:'contain' }} /></div>}

      {/* Contact info — fixed right side */}
      {(profile?.agent_name || profile?.agent_email) && (
        <div ref={contactRef}>
          <button onClick={() => setShowContact(!showContact)} style={{ position:'fixed',right:0,top:'50%',transform:'translateY(-50%)',background:'#0c2520',color:'#f1f0ee',border:'none',padding:'12px 6px',borderRadius:'8px 0 0 8px',cursor:'pointer',writingMode:'vertical-rl',fontSize:'11px',fontWeight:600,letterSpacing:'0.05em',zIndex:400,fontFamily:'inherit' }}>Contact Info</button>
          {showContact && (
            <div className="contact-popup" style={{ position:'fixed',right:'16px',top:'50%',transform:'translateY(-50%)',background:'white',borderRadius:'16px',padding:'20px',boxShadow:'0 8px 32px rgba(0,0,0,0.15)',zIndex:460,width:'260px',border:'1px solid #e8e4de' }}>
              <p style={{ fontSize:'11px',color:'#888',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,margin:'0 0 12px' }}>Agent details</p>
              {profile?.agent_name && <p style={{ fontSize:'15px',fontWeight:600,color:'#0c2520',margin:'0 0 10px' }}>{profile.agent_name}</p>}
              {profile?.agent_phone && <a href={'tel:' + profile.agent_phone} style={{ display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'#0c2520',textDecoration:'none',marginBottom:'8px' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.9a16 16 0 0 0 5.35 5.35l1.53-1.53a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>{profile.agent_phone}</a>}
              {profile?.agent_email && <a href={'mailto:' + profile.agent_email} style={{ display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',color:'#0c2520',textDecoration:'none' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>{profile.agent_email}</a>}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <div style={{ padding:'16px 24px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <a href="/" style={{ fontFamily:'Georgia,serif',fontSize:'18px',color:'#0c2520',textDecoration:'none',fontWeight:500 }}>theident</a>
        <NavButton />
      </div>

      {/* Availability */}
      {profile?.availability_status && (
        <div style={{ background:profile.availability_status === 'available' ? '#4ade80' : '#fde6c2',padding:'10px 24px',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px' }}>
          <div style={{ width:'7px',height:'7px',borderRadius:'50%',background:profile.availability_status === 'available' ? '#061410' : '#8a5a2e' }} />
          <p style={{ fontSize:'13px',fontWeight:600,color:profile.availability_status === 'available' ? '#061410' : '#8a5a2e',margin:0 }}>
            {profile.availability_status === 'available' ? 'Available for work' : 'In production' + (profile.production_until ? ' until ' + new Date(profile.production_until).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'}) : '')}
          </p>
        </div>
      )}

      <div style={{ maxWidth:'680px',margin:'0 auto',padding:'0 0 80px' }}>

        {/* Hero with background video */}
        <div style={{ position:'relative',textAlign:'center',padding:'48px 24px 24px',overflow:'hidden' }}>
          {profile?.vid_1 && (
            <video autoPlay muted loop playsInline style={{ position:'absolute',top:0,left:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.15,zIndex:0 }}>
              <source src={profile.vid_1} />
            </video>
          )}
          <div style={{ position:'relative',zIndex:1 }}>
            {profile?.picture_url && (
              <div style={{ width:'100px',height:'100px',borderRadius:'50%',background:'url(' + profile.picture_url + ') center/cover',backgroundSize:'cover',margin:'0 auto 20px',border:'3px solid white',boxShadow:'0 4px 20px rgba(12,37,32,0.12)' }} />
            )}
            <h1 style={{ fontFamily:'Georgia,serif',fontSize:'36px',fontWeight:500,color:'#0c2520',margin:'0 0 8px',lineHeight:1.1 }}>{fullName}</h1>
            {skills.length > 0 && (
              <div style={{ display:'flex',gap:'6px',flexWrap:'wrap',justifyContent:'center',marginBottom:'8px' }}>
                {skills.map(s => <span key={s.id} style={{ padding:'5px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:500,background:s.color,color:s.text_color }}>{s.name}</span>)}
              </div>
            )}
            {profile?.location && <p style={{ fontSize:'13px',color:'#888',margin:'0 0 4px' }}>{profile.location}</p>}
            <p style={{ fontSize:'12px',color:'#aaa',margin:'0 0 20px' }}>{connectionCount} connection{connectionCount !== 1 ? 's' : ''}</p>

            {!isOwnProfile && (
              <div style={{ display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap' }}>
                {currentUserId && (
                  <button onClick={handleConnect} disabled={connectStatus !== 'none'} style={{ padding:'10px 24px',borderRadius:'30px',border:'none',cursor:connectStatus === 'none' ? 'pointer' : 'default',background:connectStatus === 'connected' ? '#4ade80' : connectStatus === 'pending' ? '#e8e4de' : '#0c2520',color:connectStatus === 'connected' ? '#061410' : connectStatus === 'pending' ? '#888' : '#f1f0ee',fontSize:'14px',fontWeight:500,fontFamily:'inherit' }}>
                    {connectStatus === 'connected' ? 'Connected' : connectStatus === 'pending' ? 'Request sent' : 'Connect'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bio — bigger */}
        {profile?.bio && (
          <div style={{ padding:'0 24px 40px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'26px',color:'#0c2520',lineHeight:1.5,margin:0,fontWeight:400,fontStyle:'italic' }}>{profile.bio}</p>
          </div>
        )}

        {/* Featured work — matching design */}
        {featuredCredits.length > 0 && (
          <div style={{ marginBottom:'40px' }}>
            <div className="feat-scroll" style={{ paddingLeft:'24px',paddingRight:'24px' }}>
              {featuredCredits.map(c => (
                <div key={c.id} style={{ flexShrink:0,width:'280px',height:'360px',borderRadius:'14px',overflow:'hidden',position:'relative' }}>
                  {c.thumbnail_url ? (
                    <div style={{ width:'100%',height:'100%',background:'url(' + c.thumbnail_url + ') center/cover',backgroundSize:'cover' }} />
                  ) : (
                    <div style={{ width:'100%',height:'100%',background:'#1a3a30',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <span style={{ fontFamily:'Georgia,serif',fontSize:'48px',color:'#2a5040' }}>{c.title?.[0]}</span>
                    </div>
                  )}
                  {/* Year badge */}
                  {c.year && <div style={{ position:'absolute',top:'14px',right:'14px',background:'white',padding:'4px 12px',borderRadius:'6px' }}><span style={{ fontSize:'13px',fontWeight:600,color:'#0c2520' }}>{c.year}</span></div>}
                  {/* Bottom overlay */}
                  <div style={{ position:'absolute',bottom:0,left:0,right:0,background:'linear-gradient(transparent, rgba(0,0,0,0.7))',padding:'40px 18px 18px' }}>
                    <p style={{ fontFamily:'Georgia,serif',fontSize:'22px',color:'white',margin:'0 0 4px',fontWeight:500,lineHeight:1.2 }}>{c.title}</p>
                    {c.role && <p style={{ fontSize:'14px',color:'rgba(255,255,255,0.8)',margin:0,fontStyle:'italic' }}>{c.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Credits / Reels tab switcher */}
        {(credits.length > 0 || hasReels) && (
          <div style={{ padding:'0 24px' }}>
            <div style={{ display:'flex',background:'#e8e4de',borderRadius:'12px',padding:'4px',gap:'4px',marginBottom:'20px' }}>
              <button onClick={() => setMainTab('credits')} style={{ flex:1,padding:'12px',borderRadius:'9px',border:'none',background:mainTab === 'credits' ? '#0c2520' : 'transparent',color:mainTab === 'credits' ? '#f1f0ee' : '#888',fontSize:'15px',fontWeight:mainTab === 'credits' ? 600 : 400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s ease' }}>Credits</button>
              <button onClick={() => setMainTab('reels')} style={{ flex:1,padding:'12px',borderRadius:'9px',border:'none',background:mainTab === 'reels' ? '#0c2520' : 'transparent',color:mainTab === 'reels' ? '#f1f0ee' : '#888',fontSize:'15px',fontWeight:mainTab === 'reels' ? 600 : 400,cursor:'pointer',fontFamily:'inherit',transition:'all 0.2s ease' }}>Reels</button>
            </div>
          </div>
        )}

        {/* Credits tab */}
        {mainTab === 'credits' && credits.length > 0 && (
          <div style={{ padding:'0 24px 40px' }}>
            {/* Category filter tabs */}
            {creditCategories.length > 1 && (
              <div style={{ display:'flex',gap:'6px',overflowX:'auto',marginBottom:'16px',paddingBottom:'4px' }}>
                <button className={'cat-tab' + (creditFilter === null ? ' on' : '')} onClick={() => setCreditFilter(null)}>All</button>
                {creditCategories.map(pt => (
                  <button key={pt.id} className={'cat-tab' + (creditFilter === pt.id ? ' on' : '')} onClick={() => setCreditFilter(pt.id)}>{pt.name}</button>
                ))}
              </div>
            )}

            {filteredCredits.map((c, i) => (
              <div key={c.id} style={{ display:'flex',alignItems:'center',gap:'14px',padding:'14px 0',borderBottom:i < filteredCredits.length - 1 ? '1px solid #e8e4de' : 'none' }}>
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
                  <p style={{ fontSize:'12px',color:'#888',margin:'2px 0 0' }}>
                    {c.role}{c.director ? ' · ' + c.director : ''}{c.production_company ? ' · ' + c.production_company : ''}
                  </p>
                </div>
                {c.year && <span style={{ fontSize:'12px',color:'#aaa',flexShrink:0 }}>{c.year}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Reels tab */}
        {mainTab === 'reels' && hasReels && (
          <div style={{ padding:'0 24px 40px' }}>
            <div style={{ display:'flex',flexDirection:'column',gap:'16px' }}>
              {reelsList.map(r => (
                <div key={r.label}>
                  <p style={{ fontSize:'13px',fontWeight:600,color:'#0c2520',margin:'0 0 8px' }}>{r.label}</p>
                  <video controls playsInline style={{ width:'100%',borderRadius:'12px',background:'#061410' }}>
                    <source src={r.url || ''} />
                  </video>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Brand carousel */}
        {brands.length > 0 && (
          <div style={{ marginBottom:'40px' }}>
            <div className="marquee-wrap" style={{ overflow:'hidden' }}>
              <div className="marquee-track">
                {[...brands,...brands].map((b, i) => (
                  <div key={b.id + '-' + i} style={{ flexShrink:0,margin:'0 32px',display:'flex',alignItems:'center',justifyContent:'center',height:'60px' }}>
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
          <div style={{ padding:'0 24px 40px' }}>
            <div style={{ fontSize:'48px',color:'#e8e4de',fontFamily:'Georgia,serif',lineHeight:1,marginBottom:'8px' }}>"</div>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'18px',color:'#0c2520',lineHeight:1.6,margin:'0 0 20px',fontStyle:'italic' }}>{testimonials[activeTestimonial]?.quote}</p>
            <p style={{ fontSize:'13px',fontWeight:600,color:'#0c2520',margin:'0 0 2px',textTransform:'uppercase',letterSpacing:'0.06em' }}>{testimonials[activeTestimonial]?.author_name}</p>
            {testimonials[activeTestimonial]?.author_title && <p style={{ fontSize:'12px',color:'#888',margin:0 }}>{testimonials[activeTestimonial]?.author_title}</p>}
            {testimonials.length > 1 && (
              <div style={{ display:'flex',gap:'6px',marginTop:'20px' }}>
                {testimonials.map((_, i) => <button key={i} onClick={() => setActiveTestimonial(i)} style={{ width:i === activeTestimonial ? '20px' : '6px',height:'6px',borderRadius:'3px',background:i === activeTestimonial ? '#0c2520' : '#e0ddd5',border:'none',cursor:'pointer',transition:'all 0.3s ease',padding:0 }} />)}
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        {gallery.length > 0 && (
          <div style={{ marginBottom:'40px' }}>
            <div className="marquee-wrap" style={{ overflow:'hidden' }}>
              <div className="marquee-track" style={{ gap:'10px' }}>
                {[...gallery,...gallery].map((img, i) => <div key={img.id + '-' + i} className="gallery-img" onClick={() => setLightbox(img.url)} style={{ width:'200px',height:'150px',flexShrink:0,borderRadius:'10px',background:'url(' + img.url + ') center/cover',backgroundSize:'cover' }} />)}
              </div>
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div style={{ padding:'0 24px 40px' }}>
            <h2 style={{ fontFamily:'Georgia,serif',fontSize:'28px',fontWeight:500,color:'#0c2520',margin:'0 0 16px' }}>Questions</h2>
            {faqs.map(faq => (
              <div key={faq.id} style={{ borderBottom:'1px solid #e8e4de' }}>
                <div className="faq-row" onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} style={{ padding:'16px 0',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px' }}>
                  <p style={{ fontSize:'15px',fontWeight:500,color:'#0c2520',margin:0 }}>{faq.question}</p>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0,transform:openFaq === faq.id ? 'rotate(180deg)' : 'none',transition:'transform 0.2s ease' }}><path d="M6 9l6 6 6-6"/></svg>
                </div>
                {openFaq === faq.id && <p style={{ fontSize:'14px',color:'#666',margin:'0 0 16px',lineHeight:1.6 }}>{faq.answer}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center',padding:'0 24px' }}>
          <a href="/" style={{ fontFamily:'Georgia,serif',fontSize:'15px',color:'#0c2520',textDecoration:'none' }}>theident</a>
          <p style={{ fontSize:'11px',color:'#aaa',margin:'6px 0 0' }}>The performing arts platform</p>
        </div>
      </div>
    </div>
  )
}
