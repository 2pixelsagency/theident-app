'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Reel = { id?: string; label: string; url: string; sort_order: number }
type Credit = { id?: string; title: string; role: string; year: string; thumbnail_url: string; director: string; production_company: string; is_featured: boolean }
type Brand = { id?: string; brand_name: string; logo_url: string | null; loading?: boolean }
type Testimonial = { id?: string; quote: string; author_name: string; author_title: string }
type GalleryImage = { id?: string; url: string }
type FAQ = { id?: string; question: string; answer: string }

export default function EditProfile() {
  const router = useRouter()
  const [profileId, setProfileId] = useState<string | null>(null)
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [availabilityStatus, setAvailabilityStatus] = useState<'available' | 'in_production' | ''>('')
  const [productionUntil, setProductionUntil] = useState('')
  const [agentName, setAgentName] = useState('')
  const [agentPhone, setAgentPhone] = useState('')
  const [agentEmail, setAgentEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState('basics')

  const [reels, setReels] = useState<Reel[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [uploadingReel, setUploadingReel] = useState(false)
  const [uploadingGallery, setUploadingGallery] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setProfileId(user.id)

      const [
        { data: prof },
        { data: reelData },
        { data: creditData },
        { data: brandData },
        { data: testimonialData },
        { data: galleryData },
        { data: faqData },
      ] = await Promise.all([
        supabase.from('profiles').select('slug, bio, availability_status, production_until, agent_name, agent_phone, agent_email').eq('id', user.id).single(),
        supabase.from('reels').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('credits').select('*').eq('profile_id', user.id).order('year', { ascending: false }),
        supabase.from('profile_brands').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('testimonials').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('gallery_images').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('faqs').select('*').eq('profile_id', user.id).order('sort_order'),
      ])

      if (prof) {
        setSlug(prof.slug || '')
        setBio(prof.bio || '')
        setAvailabilityStatus(prof.availability_status || '')
        setProductionUntil(prof.production_until || '')
        setAgentName(prof.agent_name || '')
        setAgentPhone(prof.agent_phone || '')
        setAgentEmail(prof.agent_email || '')
      }
      setReels(reelData?.map(r => ({ id: r.id, label: r.label, url: r.url, sort_order: r.sort_order })) || [])
      setCredits(creditData?.map(c => ({ id: c.id, title: c.title || '', role: c.role || '', year: c.year?.toString() || '', thumbnail_url: c.thumbnail_url || '', director: c.director || '', production_company: c.production_company || '', is_featured: c.is_featured || false })) || [])
      setBrands(brandData?.map(b => ({ id: b.id, brand_name: b.brand_name, logo_url: b.logo_url })) || [])
      setTestimonials(testimonialData?.map(t => ({ id: t.id, quote: t.quote, author_name: t.author_name, author_title: t.author_title || '' })) || [])
      setGallery(galleryData?.map(g => ({ id: g.id, url: g.url })) || [])
      setFaqs(faqData?.map(f => ({ id: f.id, question: f.question, answer: f.answer })) || [])
    }
    load()
  }, [router])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const saveBasics = async () => {
    if (!profileId) return
    setSaving(true)
    await supabase.from('profiles').update({
      bio,
      availability_status: availabilityStatus || null,
      production_until: productionUntil || null,
      agent_name: agentName || null,
      agent_phone: agentPhone || null,
      agent_email: agentEmail || null,
    }).eq('id', profileId)
    setSaving(false)
    showToast('Saved')
  }

  const uploadReel = async (file: File) => {
    if (!profileId) return
    setUploadingReel(true)
    const path = `${profileId}/reels/${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('reels').upload(path, file)
    if (error) { setUploadingReel(false); showToast('Upload failed'); return }
    const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(path)
    const label = file.name.replace(/\.[^.]+$/, '')
    const { data: newReel } = await supabase.from('reels').insert({ profile_id: profileId, label, url: publicUrl, sort_order: reels.length }).select().single()
    if (newReel) setReels(prev => [...prev, { id: newReel.id, label: newReel.label, url: newReel.url, sort_order: newReel.sort_order }])
    setUploadingReel(false)
    showToast('Reel uploaded')
  }

  const deleteReel = async (id?: string, index?: number) => {
    if (id) await supabase.from('reels').delete().eq('id', id)
    setReels(prev => prev.filter((_, i) => i !== index))
  }

  const updateReelLabel = async (index: number, label: string) => {
    const r = reels[index]
    setReels(prev => prev.map((item, i) => i === index ? { ...item, label } : item))
    if (r.id) await supabase.from('reels').update({ label }).eq('id', r.id)
  }

  const lookupBrandLogo = async (index: number, brandName: string) => {
    setBrands(prev => prev.map((b, i) => i === index ? { ...b, loading: true } : b))
    try {
      const res = await fetch(`/api/brandfetch?brand=${encodeURIComponent(brandName)}`)
      const { logo } = await res.json()
      setBrands(prev => prev.map((b, i) => i === index ? { ...b, logo_url: logo, loading: false } : b))
    } catch {
      setBrands(prev => prev.map((b, i) => i === index ? { ...b, loading: false } : b))
    }
  }

  const saveBrands = async () => {
    if (!profileId) return
    setSaving(true)
    await supabase.from('profile_brands').delete().eq('profile_id', profileId)
    if (brands.length > 0) {
      await supabase.from('profile_brands').insert(brands.map((b, i) => ({ profile_id: profileId, brand_name: b.brand_name, logo_url: b.logo_url, sort_order: i })))
    }
    setSaving(false)
    showToast('Brands saved')
  }

  const saveCredits = async () => {
    if (!profileId) return
    setSaving(true)
    for (const c of credits) {
      const payload = {
        title: c.title,
        role: c.role || null,
        year: c.year ? parseInt(c.year) : null,
        thumbnail_url: c.thumbnail_url || null,
        director: c.director || null,
        production_company: c.production_company || null,
        is_featured: c.is_featured,
      }
      if (c.id) {
        await supabase.from('credits').update(payload).eq('id', c.id)
      } else {
        await supabase.from('credits').insert({ profile_id: profileId, ...payload })
      }
    }
    setSaving(false)
    showToast('Credits saved')
  }

  const saveTestimonials = async () => {
    if (!profileId) return
    setSaving(true)
    await supabase.from('testimonials').delete().eq('profile_id', profileId)
    if (testimonials.length > 0) {
      await supabase.from('testimonials').insert(testimonials.map((t, i) => ({ profile_id: profileId, quote: t.quote, author_name: t.author_name, author_title: t.author_title, sort_order: i })))
    }
    setSaving(false)
    showToast('Testimonials saved')
  }

  const uploadGalleryImages = async (files: FileList) => {
    if (!profileId) return
    setUploadingGallery(true)
    for (const file of Array.from(files)) {
      const path = `${profileId}/gallery/${Date.now()}-${file.name}`
      const { error } = await supabase.storage.from('gallery').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
        const { data: img } = await supabase.from('gallery_images').insert({ profile_id: profileId, url: publicUrl, sort_order: gallery.length }).select().single()
        if (img) setGallery(prev => [...prev, { id: img.id, url: img.url }])
      }
    }
    setUploadingGallery(false)
    showToast('Images uploaded')
  }

  const deleteGalleryImage = async (id?: string, index?: number) => {
    if (id) await supabase.from('gallery_images').delete().eq('id', id)
    setGallery(prev => prev.filter((_, i) => i !== index))
  }

  const saveFaqs = async () => {
    if (!profileId) return
    setSaving(true)
    await supabase.from('faqs').delete().eq('profile_id', profileId)
    if (faqs.length > 0) {
      await supabase.from('faqs').insert(faqs.map((f, i) => ({ profile_id: profileId, question: f.question, answer: f.answer, sort_order: i })))
    }
    setSaving(false)
    showToast('FAQs saved')
  }

  const uploadThumbnail = async (file: File, index: number) => {
    if (!profileId) return
    const path = `${profileId}/credits/${Date.now()}-${file.name}`
    await supabase.storage.from('gallery').upload(path, file, { upsert: true })
    const { data: { publicUrl } } = supabase.storage.from('gallery').getPublicUrl(path)
    setCredits(prev => prev.map((item, idx) => idx === index ? { ...item, thumbnail_url: publicUrl } : item))
  }

  const sections = ['basics', 'reels', 'brands', 'credits', 'testimonials', 'gallery', 'faqs']
  const sectionLabels: Record<string, string> = { basics: 'Basics', reels: 'Reels', brands: 'Brands', credits: 'Credits', testimonials: 'Testimonials', gallery: 'Gallery', faqs: 'FAQs' }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: '1px solid #e0ddd5', borderRadius: '10px', fontSize: '14px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box', color: '#0c2520' }
  const labelStyle: React.CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#0c2520', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }
  const sectionTitle: React.CSSProperties = { fontFamily: 'Georgia, serif', fontSize: '20px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }
  const addBtn: React.CSSProperties = { background: 'transparent', border: '1px dashed #d4d2cc', borderRadius: '10px', padding: '12px', width: '100%', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }
  const saveBtn: React.CSSProperties = { background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', padding: '13px 28px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }
  const deleteBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', padding: '4px', flexShrink: 0 }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: '680px', margin: '0 auto', padding: '0 0 80px' }}>
      <style>{`
        input:focus, textarea:focus, select:focus { border-color: #0c2520 !important; outline: none; box-shadow: 0 0 0 1px #0c2520; }
        textarea { resize: vertical; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .toggle-track { width: 40px; height: 22px; border-radius: 11px; background: #e0ddd5; position: relative; cursor: pointer; transition: background 0.2s ease; flex-shrink: 0; }
        .toggle-track.on { background: #0c2520; }
        .toggle-thumb { width: 18px; height: 18px; border-radius: 50%; background: white; position: absolute; top: 2px; left: 2px; transition: transform 0.2s ease; }
        .toggle-track.on .toggle-thumb { transform: translateX(18px); }
      `}</style>

      {toast && (
        <div style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap' }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '24px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px' }}>Your public profile</p>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500 }}>Edit profile</p>
        </div>
        {slug && (
          <a href={`/${slug}?from=app`} target="_blank" style={{ fontSize: '12px', color: '#0c2520', textDecoration: 'none', background: 'white', border: '1px solid #e0ddd5', padding: '8px 14px', borderRadius: '20px' }}>
            View live
          </a>
        )}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '0 20px 16px', scrollbarWidth: 'none' }}>
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)} style={{ padding: '8px 14px', borderRadius: '20px', border: 'none', background: activeSection === s ? '#0c2520' : 'white', color: activeSection === s ? '#f1f0ee' : '#0c2520', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeSection === s ? 500 : 400, whiteSpace: 'nowrap', WebkitTapHighlightColor: 'transparent' }}>
            {sectionLabels[s]}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>

        {/* BASICS */}
        {activeSection === 'basics' && (
          <div>
            <p style={sectionTitle}>Basics</p>

          

            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Bio — one line, make it count</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="Identical twins who love to have a laugh..." rows={3} style={{ ...inputStyle, lineHeight: 1.5 }} />
            </div>

            {/* Availability */}
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Availability</label>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {(['available', 'in_production'] as const).map(s => (
                  <button key={s} onClick={() => setAvailabilityStatus(prev => prev === s ? '' : s)}
                    style={{ padding: '9px 16px', borderRadius: '20px', border: availabilityStatus === s ? 'none' : '1px solid #e0ddd5', background: availabilityStatus === s ? (s === 'available' ? '#4ade80' : '#fde6c2') : 'white', color: availabilityStatus === s ? (s === 'available' ? '#061410' : '#8a5a2e') : '#0c2520', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: availabilityStatus === s ? 600 : 400 }}>
                    {s === 'available' ? 'Available now' : 'In production'}
                  </button>
                ))}
              </div>
              {availabilityStatus === 'in_production' && (
                <div>
                  <label style={{ ...labelStyle, marginTop: '8px' }}>In production until</label>
                  <input type="date" value={productionUntil} onChange={e => setProductionUntil(e.target.value)} style={inputStyle} />
                </div>
              )}
            </div>

            {/* Agent info */}
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Agent details</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <input value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Agent name" style={inputStyle} />
                <input value={agentPhone} onChange={e => setAgentPhone(e.target.value)} placeholder="Phone number" style={inputStyle} />
                <input value={agentEmail} onChange={e => setAgentEmail(e.target.value)} placeholder="Agent email" style={inputStyle} />
              </div>
            </div>

            <button onClick={saveBasics} style={saveBtn} disabled={saving}>Save basics</button>
          </div>
        )}

        {/* REELS */}
        {activeSection === 'reels' && (
          <div>
            <p style={sectionTitle}>Reels</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {reels.map((r, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #e8e4de', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92d7af" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  <input value={r.label} onChange={e => updateReelLabel(i, e.target.value)} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => deleteReel(r.id, i)} style={deleteBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <label style={{ ...addBtn, display: 'block', cursor: 'pointer' }}>
              {uploadingReel ? 'Uploading...' : '+ Upload reel (MP4, MOV)'}
              <input type="file" accept="video/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadReel(f) }} />
            </label>
          </div>
        )}

        {/* BRANDS */}
        {activeSection === 'brands' && (
          <div>
            <p style={sectionTitle}>Brands</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>Type a brand name and we will find the logo automatically.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
              {brands.map((b, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '14px', border: '1px solid #e8e4de', display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {b.logo_url ? (
                    <img src={b.logo_url} alt={b.brand_name} style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#f1f0ee', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {b.loading ? <div style={{ width: '12px', height: '12px', border: '1.5px solid #0c2520', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <span style={{ fontSize: '10px', color: '#ccc' }}>?</span>}
                    </div>
                  )}
                  <input value={b.brand_name} onChange={e => setBrands(prev => prev.map((item, idx) => idx === i ? { ...item, brand_name: e.target.value, logo_url: null } : item))} onBlur={() => { if (b.brand_name) lookupBrandLogo(i, b.brand_name) }} placeholder="e.g. Casamigos" style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => setBrands(prev => prev.filter((_, idx) => idx !== i))} style={deleteBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setBrands(prev => [...prev, { brand_name: '', logo_url: null }])} style={addBtn}>+ Add brand</button>
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveBrands} style={saveBtn} disabled={saving}>Save brands</button>
            </div>
          </div>
        )}

        {/* CREDITS */}
        {activeSection === 'credits' && (
          <div>
            <p style={sectionTitle}>Credits</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>Toggle featured to show a credit in the highlighted work slider on your profile.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {credits.map((c, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: c.is_featured ? '1.5px solid #4ade80' : '1px solid #e8e4de' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: 0 }}>Credit {i + 1}</p>
                      {c.is_featured && <span style={{ fontSize: '10px', background: '#4ade80', color: '#061410', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Featured</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: '#888' }}>Feature</span>
                        <div className={`toggle-track${c.is_featured ? ' on' : ''}`} onClick={() => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, is_featured: !item.is_featured } : item))}>
                          <div className="toggle-thumb" />
                        </div>
                      </div>
                      <button onClick={() => setCredits(prev => prev.filter((_, idx) => idx !== i))} style={deleteBtn}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: '14px' }}>
                    <label style={labelStyle}>Thumbnail</label>
                    {c.thumbnail_url ? (
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img src={c.thumbnail_url} alt="" style={{ width: '120px', height: '80px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                        <button onClick={() => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, thumbnail_url: '' } : item))} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ) : (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#f9f8f6', border: '1px dashed #d4d2cc', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', color: '#888' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        Upload image
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f, i) }} />
                      </label>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div><label style={labelStyle}>Title</label><input value={c.title} onChange={e => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, title: e.target.value } : item))} placeholder="Casamigos" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Role</label><input value={c.role} onChange={e => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, role: e.target.value } : item))} placeholder="Featured twin" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Director</label><input value={c.director} onChange={e => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, director: e.target.value } : item))} placeholder="Jane Smith" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Production company</label><input value={c.production_company} onChange={e => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, production_company: e.target.value } : item))} placeholder="RSC / BBC" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Year</label><input value={c.year} onChange={e => setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, year: e.target.value } : item))} placeholder="2024" style={inputStyle} /></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setCredits(prev => [...prev, { title: '', role: '', year: '', thumbnail_url: '', director: '', production_company: '', is_featured: false }])} style={addBtn}>+ Add credit</button>
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveCredits} style={saveBtn} disabled={saving}>Save credits</button>
            </div>
          </div>
        )}

        {/* TESTIMONIALS */}
        {activeSection === 'testimonials' && (
          <div>
            <p style={sectionTitle}>Testimonials</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {testimonials.map((t, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e8e4de' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: 0 }}>Testimonial {i + 1}</p>
                    <button onClick={() => setTestimonials(prev => prev.filter((_, idx) => idx !== i))} style={deleteBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div><label style={labelStyle}>Quote</label><textarea value={t.quote} onChange={e => setTestimonials(prev => prev.map((item, idx) => idx === i ? { ...item, quote: e.target.value } : item))} rows={3} placeholder="Working with them is always a highlight..." style={{ ...inputStyle, lineHeight: 1.5 }} /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div><label style={labelStyle}>Name</label><input value={t.author_name} onChange={e => setTestimonials(prev => prev.map((item, idx) => idx === i ? { ...item, author_name: e.target.value } : item))} placeholder="David Leighton" style={inputStyle} /></div>
                      <div><label style={labelStyle}>Title</label><input value={t.author_title} onChange={e => setTestimonials(prev => prev.map((item, idx) => idx === i ? { ...item, author_title: e.target.value } : item))} placeholder="Choreographer" style={inputStyle} /></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setTestimonials(prev => [...prev, { quote: '', author_name: '', author_title: '' }])} style={addBtn}>+ Add testimonial</button>
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveTestimonials} style={saveBtn} disabled={saving}>Save testimonials</button>
            </div>
          </div>
        )}

        {/* GALLERY */}
        {activeSection === 'gallery' && (
          <div>
            <p style={sectionTitle}>Gallery</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {gallery.map((img, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: '8px', overflow: 'hidden', background: `url(${img.url}) center/cover` }}>
                  <button onClick={() => deleteGalleryImage(img.id, i)} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
            <label style={{ ...addBtn, display: 'block', cursor: 'pointer' }}>
              {uploadingGallery ? 'Uploading...' : '+ Upload photos'}
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files) uploadGalleryImages(e.target.files) }} />
            </label>
          </div>
        )}

        {/* FAQS */}
        {activeSection === 'faqs' && (
          <div>
            <p style={sectionTitle}>FAQs</p>
            <p style={{ fontSize: '13px', color: '#888', margin: '0 0 16px' }}>Add fun, personal questions that show who you are.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {faqs.map((f, i) => (
                <div key={i} style={{ background: 'white', borderRadius: '10px', padding: '16px', border: '1px solid #e8e4de' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: 0 }}>FAQ {i + 1}</p>
                    <button onClick={() => setFaqs(prev => prev.filter((_, idx) => idx !== i))} style={deleteBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div><label style={labelStyle}>Question</label><input value={f.question} onChange={e => setFaqs(prev => prev.map((item, idx) => idx === i ? { ...item, question: e.target.value } : item))} placeholder="What do you do in your free time?" style={inputStyle} /></div>
                    <div><label style={labelStyle}>Answer</label><textarea value={f.answer} onChange={e => setFaqs(prev => prev.map((item, idx) => idx === i ? { ...item, answer: e.target.value } : item))} rows={2} placeholder="I love..." style={{ ...inputStyle, lineHeight: 1.5 }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])} style={addBtn}>+ Add FAQ</button>
            <div style={{ marginTop: '20px' }}>
              <button onClick={saveFaqs} style={saveBtn} disabled={saving}>Save FAQs</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
