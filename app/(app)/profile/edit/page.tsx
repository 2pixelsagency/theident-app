'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string; first_name: string | null; last_name: string | null; picture_url: string | null
  location: string | null; bio: string | null; slug: string | null
  availability_status: string | null; production_until: string | null
  agent_name: string | null; agent_phone: string | null; agent_email: string | null
  section_settings: any
}
type Reel = { id?: string; label: string; url: string; sort_order: number }
type Brand = { id?: string; brand_name: string; logo_url: string | null; sort_order: number }
type Credit = { id?: string; title: string; role: string; year: number | null; director: string | null; production_company: string | null; is_featured: boolean; production_type_id: number | null }
type Testimonial = { id?: string; quote: string; author_name: string; author_title: string | null; sort_order: number }
type GalleryImage = { id?: string; url: string; sort_order: number }
type FAQ = { id?: string; question: string; answer: string; sort_order: number }
type Skill = { id: number; name: string }

function CropModal({ file, onSave, onClose }: { file: File; onSave: (blob: Blob) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const SIZE = 280
  useEffect(() => { const i = new Image(); i.onload = () => setImg(i); i.src = URL.createObjectURL(file); return () => URL.revokeObjectURL(i.src) }, [file])
  useEffect(() => { if (!img || !canvasRef.current) return; const ctx = canvasRef.current.getContext('2d'); if (!ctx) return; ctx.clearRect(0,0,SIZE,SIZE); const s = Math.max(SIZE/img.width,SIZE/img.height)*zoom; const w=img.width*s; const h=img.height*s; ctx.drawImage(img,(SIZE-w)/2+offset.x,(SIZE-h)/2+offset.y,w,h) }, [img,zoom,offset])
  return (
    <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',zIndex:600,display:'flex',alignItems:'center',justifyContent:'center',padding:'24px' }}>
      <div style={{ background:'#f1f0ee',borderRadius:'20px',padding:'24px',maxWidth:'340px',width:'100%' }}>
        <p style={{ fontFamily:'Georgia,serif',fontSize:'18px',fontWeight:500,color:'#0c2520',margin:'0 0 16px',textAlign:'center' }}>Crop photo</p>
        <div style={{ width:SIZE+'px',height:SIZE+'px',margin:'0 auto 16px',borderRadius:'50%',overflow:'hidden',border:'3px solid #e0ddd5',touchAction:'none' }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            onPointerDown={e=>{setDragging(true);setDragStart({x:e.clientX-offset.x,y:e.clientY-offset.y})}}
            onPointerMove={e=>{if(dragging)setOffset({x:e.clientX-dragStart.x,y:e.clientY-dragStart.y})}}
            onPointerUp={()=>setDragging(false)} onPointerLeave={()=>setDragging(false)}
            style={{ width:'100%',height:'100%',cursor:dragging?'grabbing':'grab' }} />
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:'12px',marginBottom:'20px',padding:'0 8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="3"/></svg>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} style={{ flex:1,accentColor:'#0c2520' }} />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="5"/></svg>
        </div>
        <div style={{ display:'flex',gap:'10px' }}>
          <button onClick={onClose} style={{ flex:1,padding:'14px',borderRadius:'30px',border:'1px solid #e0ddd5',background:'white',color:'#0c2520',fontSize:'14px',fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>Cancel</button>
          <button onClick={()=>{if(!canvasRef.current)return;canvasRef.current.toBlob(b=>{if(b)onSave(b)},'image/jpeg',0.9)}} style={{ flex:1,padding:'14px',borderRadius:'30px',border:'none',background:'#0c2520',color:'#f1f0ee',fontSize:'14px',fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function Pencil({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width:'32px',height:'32px',borderRadius:'50%',background:'white',border:'1px solid #e0ddd5',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',boxShadow:'0 2px 8px rgba(0,0,0,0.08)',WebkitTapHighlightColor:'transparent',flexShrink:0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
    </button>
  )
}

function Empty({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ border:'2px dashed #d4d2cc',borderRadius:'14px',padding:'32px 20px',textAlign:'center',cursor:'pointer',WebkitTapHighlightColor:'transparent' }}>
      <p style={{ fontSize:'13px',color:'#aaa',margin:'0 0 6px' }}>{text}</p>
      <p style={{ fontSize:'12px',color:'#0c2520',margin:0,fontWeight:500,textDecoration:'underline' }}>Add now</p>
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:500 }} />
      <div className="edit-sheet" style={{ position:'fixed',bottom:0,left:0,right:0,background:'#f1f0ee',borderRadius:'20px 20px 0 0',zIndex:501,maxHeight:'90vh',overflowY:'auto',paddingBottom:'env(safe-area-inset-bottom)' }}>
        <div style={{ display:'flex',justifyContent:'center',padding:'12px 0 4px' }}>
          <div style={{ width:'36px',height:'4px',borderRadius:'2px',background:'#d4d2cc' }} />
        </div>
        <div style={{ padding:'8px 20px 24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'18px',fontWeight:500,color:'#0c2520',margin:0 }}>{title}</p>
            <button onClick={onClose} style={{ background:'#0c2520',border:'none',borderRadius:'50%',width:'32px',height:'32px',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

const inputStyle: React.CSSProperties = { width:'100%',padding:'13px 14px',border:'1px solid #e0ddd5',borderRadius:'12px',fontSize:'14px',fontFamily:'inherit',boxSizing:'border-box',background:'white',color:'#0c2520' }
const labelStyle: React.CSSProperties = { fontSize:'11px',color:'#888',textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600,display:'block',marginBottom:'6px' }

export default function EditProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)

  const [reels, setReels] = useState<Reel[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [userSkillIds, setUserSkillIds] = useState<number[]>([])
  const [productionTypes, setProductionTypes] = useState<{id:number;name:string}[]>([])

  // Edit form state
  const [editBio, setEditBio] = useState('')
  const [editAgentName, setEditAgentName] = useState('')
  const [editAgentPhone, setEditAgentPhone] = useState('')
  const [editAgentEmail, setEditAgentEmail] = useState('')
  const [editAvailability, setEditAvailability] = useState('')
  const [editProductionUntil, setEditProductionUntil] = useState('')
  const [editReels, setEditReels] = useState<Reel[]>([])
  const [editBrands, setEditBrands] = useState<Brand[]>([])
  const [editCredits, setEditCredits] = useState<Credit[]>([])
  const [editTestimonials, setEditTestimonials] = useState<Testimonial[]>([])
  const [editFaqs, setEditFaqs] = useState<FAQ[]>([])
  const [editSkillIds, setEditSkillIds] = useState<number[]>([])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const [{ data: p }, { data: r }, { data: b }, { data: c }, { data: t }, { data: g }, { data: f }, { data: sk }, { data: usk }, { data: pt }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('reels').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('profile_brands').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('credits').select('*').eq('profile_id', user.id).order('year', { ascending: false }),
        supabase.from('testimonials').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('gallery_images').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('faqs').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('skills').select('id, name').order('name'),
        supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
        supabase.from('production_types').select('id, name').order('name'),
      ])
      setProfile(p); setReels(r||[]); setBrands(b||[]); setCredits(c||[]); setTestimonials(t||[]); setGallery(g||[]); setFaqs(f||[]); setAllSkills(sk||[]); setUserSkillIds((usk||[]).map(s=>s.skill_id)); setProductionTypes(pt||[])
      setLoading(false)
    }
    load()
  }, [])

  const openEdit = (section: string) => {
    if (section === 'bio') setEditBio(profile?.bio || '')
    if (section === 'agent') { setEditAgentName(profile?.agent_name||''); setEditAgentPhone(profile?.agent_phone||''); setEditAgentEmail(profile?.agent_email||'') }
    if (section === 'availability') { setEditAvailability(profile?.availability_status||'available'); setEditProductionUntil(profile?.production_until||'') }
    if (section === 'reels') setEditReels(reels.length > 0 ? [...reels] : [{ label:'', url:'', sort_order:1 }])
    if (section === 'brands') setEditBrands(brands.length > 0 ? [...brands] : [{ brand_name:'', logo_url:null, sort_order:1 }])
    if (section === 'credits') setEditCredits(credits.length > 0 ? [...credits] : [{ title:'', role:'', year:null, director:null, production_company:null, is_featured:false, production_type_id:null }])
    if (section === 'testimonials') setEditTestimonials(testimonials.length > 0 ? [...testimonials] : [{ quote:'', author_name:'', author_title:null, sort_order:1 }])
    if (section === 'faqs') setEditFaqs(faqs.length > 0 ? [...faqs] : [{ question:'', answer:'', sort_order:1 }])
    if (section === 'skills') setEditSkillIds([...userSkillIds])
    setEditing(section)
  }

  const save = async (section: string) => {
    if (!profile) return
    setSaving(true)
    if (section === 'bio') {
      await supabase.from('profiles').update({ bio: editBio }).eq('id', profile.id)
      setProfile({ ...profile, bio: editBio })
    }
    if (section === 'agent') {
      await supabase.from('profiles').update({ agent_name: editAgentName, agent_phone: editAgentPhone, agent_email: editAgentEmail }).eq('id', profile.id)
      setProfile({ ...profile, agent_name: editAgentName, agent_phone: editAgentPhone, agent_email: editAgentEmail })
    }
    if (section === 'availability') {
      await supabase.from('profiles').update({ availability_status: editAvailability, production_until: editProductionUntil || null }).eq('id', profile.id)
      setProfile({ ...profile, availability_status: editAvailability, production_until: editProductionUntil || null })
    }
    if (section === 'reels') {
      const valid = editReels.filter(r => r.label && r.url)
      await supabase.from('reels').delete().eq('profile_id', profile.id)
      if (valid.length > 0) await supabase.from('reels').insert(valid.map((r,i) => ({ profile_id: profile.id, label: r.label, url: r.url, sort_order: i+1 })))
      setReels(valid)
    }
    if (section === 'brands') {
      const valid = editBrands.filter(b => b.brand_name)
      await supabase.from('profile_brands').delete().eq('profile_id', profile.id)
      if (valid.length > 0) await supabase.from('profile_brands').insert(valid.map((b,i) => ({ profile_id: profile.id, brand_name: b.brand_name, logo_url: b.logo_url, sort_order: i+1 })))
      setBrands(valid)
    }
    if (section === 'credits') {
      const valid = editCredits.filter(c => c.title && c.role)
      await supabase.from('credits').delete().eq('profile_id', profile.id)
      if (valid.length > 0) await supabase.from('credits').insert(valid.map(c => ({ profile_id: profile.id, title: c.title, role: c.role, year: c.year, director: c.director, production_company: c.production_company, is_featured: c.is_featured, production_type_id: c.production_type_id })))
      setCredits(valid)
    }
    if (section === 'testimonials') {
      const valid = editTestimonials.filter(t => t.quote && t.author_name)
      await supabase.from('testimonials').delete().eq('profile_id', profile.id)
      if (valid.length > 0) await supabase.from('testimonials').insert(valid.map((t,i) => ({ profile_id: profile.id, quote: t.quote, author_name: t.author_name, author_title: t.author_title, sort_order: i+1 })))
      setTestimonials(valid)
    }
    if (section === 'faqs') {
      const valid = editFaqs.filter(f => f.question && f.answer)
      await supabase.from('faqs').delete().eq('profile_id', profile.id)
      if (valid.length > 0) await supabase.from('faqs').insert(valid.map((f,i) => ({ profile_id: profile.id, question: f.question, answer: f.answer, sort_order: i+1 })))
      setFaqs(valid)
    }
    if (section === 'skills') {
      await supabase.from('profile_skills').delete().eq('profile_id', profile.id)
      if (editSkillIds.length > 0) await supabase.from('profile_skills').insert(editSkillIds.map(sid => ({ profile_id: profile.id, skill_id: sid })))
      setUserSkillIds(editSkillIds)
    }
    setSaving(false); setEditing(null); showToast('Saved')
  }

  const handleCropSave = async (blob: Blob) => {
    if (!profile) return
    setCropFile(null); setSaving(true)
    const path = profile.id + '/headshot-' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('headshots').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
      await supabase.from('profiles').update({ picture_url: publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, picture_url: publicUrl })
    }
    setSaving(false); showToast('Photo updated')
  }

  const userSkillNames = allSkills.filter(s => userSkillIds.includes(s.id)).map(s => s.name)
  const featuredCredits = credits.filter(c => c.is_featured)

  if (loading || !profile) return <div style={{ minHeight:'100vh',background:'#f1f0ee' }} />

  const SaveBtn = ({ section }: { section: string }) => (
    <button onClick={() => save(section)} disabled={saving} style={{ width:'100%',padding:'16px',background:'#0c2520',color:'#f1f0ee',border:'none',borderRadius:'30px',fontSize:'15px',fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginTop:'16px',opacity:saving?0.6:1 }}>
      {saving ? 'Saving...' : 'Save'}
    </button>
  )

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', background:'#f1f0ee', minHeight:'100vh' }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity:0;transform:translateX(-50%) translateY(8px); } to { opacity:1;transform:translateX(-50%) translateY(0); } }
        .edit-sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .skill-chip { padding:8px 14px;border-radius:20px;font-size:13px;cursor:pointer;font-family:inherit;border:1px solid #e0ddd5;background:white;color:#0c2520;transition:all 0.15s ease;-webkit-tap-highlight-color:transparent; }
        .skill-chip.on { background:#0c2520;color:#f1f0ee;border-color:#0c2520; }
      `}</style>

      {cropFile && <CropModal file={cropFile} onSave={handleCropSave} onClose={() => setCropFile(null)} />}

      {toast && (
        <div className="toast-anim" style={{ position:'fixed',bottom:'100px',left:'50%',transform:'translateX(-50%)',background:'#0c2520',color:'#f1f0ee',padding:'12px 24px',borderRadius:'30px',fontSize:'13px',fontWeight:500,zIndex:700,whiteSpace:'nowrap' }}>{toast}</div>
      )}

      {/* Top bar */}
      <div style={{ padding:'16px 16px 8px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
        <button onClick={() => router.back()} style={{ background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px',fontSize:'14px',color:'#0c2520',fontFamily:'inherit' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
        {profile.slug && (
          <button onClick={() => window.open('/' + profile.slug + '?from=app', '_blank')} style={{ background:'#0c2520',color:'#f1f0ee',border:'none',padding:'8px 18px',borderRadius:'20px',fontSize:'12px',fontWeight:500,cursor:'pointer',fontFamily:'inherit' }}>
            View live
          </button>
        )}
      </div>

      {/* === HERO === */}
      <div style={{ padding:'16px',textAlign:'center' }}>
        <div style={{ position:'relative',display:'inline-block',marginBottom:'14px' }}>
          <label style={{ cursor:'pointer' }}>
            <div style={{ width:'100px',height:'100px',borderRadius:'50%',background:profile.picture_url?'url('+profile.picture_url+') center/cover':'#e8efea',backgroundSize:'cover',border:'3px solid #e0ddd5' }} />
            <div style={{ position:'absolute',bottom:'2px',right:'2px',width:'28px',height:'28px',borderRadius:'50%',background:'#0c2520',border:'2px solid #f1f0ee',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f)setCropFile(f); e.target.value='' }} />
          </label>
        </div>
        <p style={{ fontFamily:'Georgia,serif',fontSize:'24px',fontWeight:500,color:'#0c2520',margin:'0 0 4px' }}>{profile.first_name} {profile.last_name}</p>
        {profile.location && <p style={{ fontSize:'13px',color:'#888',margin:'0 0 10px' }}>{profile.location}</p>}

        {/* Skills */}
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:'6px',flexWrap:'wrap',marginBottom:'12px' }}>
          {userSkillNames.length > 0 ? userSkillNames.map(s => (
            <span key={s} style={{ background:'#e8efea',color:'#0c2520',padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:500 }}>{s}</span>
          )) : (
            <span style={{ color:'#ccc',fontSize:'13px' }}>No skills added</span>
          )}
          <Pencil onClick={() => openEdit('skills')} />
        </div>

        {/* Availability */}
        <div style={{ display:'flex',justifyContent:'center',alignItems:'center',gap:'8px' }}>
          {profile.availability_status === 'available' ? (
            <span style={{ background:'#4ade80',color:'#061410',padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600 }}>Available for work</span>
          ) : profile.availability_status === 'in_production' ? (
            <span style={{ background:'#fde6c2',color:'#8a5a2e',padding:'5px 14px',borderRadius:'20px',fontSize:'12px',fontWeight:600 }}>
              {'In production' + (profile.production_until ? ' until ' + new Date(profile.production_until).toLocaleDateString('en-GB',{month:'short',year:'numeric'}) : '')}
            </span>
          ) : (
            <span style={{ color:'#ccc',fontSize:'12px' }}>Set availability</span>
          )}
          <Pencil onClick={() => openEdit('availability')} />
        </div>
      </div>

      <div style={{ padding:'0 16px 120px' }}>

        {/* === BIO === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>About</p>
            <Pencil onClick={() => openEdit('bio')} />
          </div>
          {profile.bio ? (
            <p style={{ fontSize:'14px',color:'#444',lineHeight:1.6,margin:0 }}>{profile.bio}</p>
          ) : (
            <Empty text="Tell casting directors about yourself" onClick={() => openEdit('bio')} />
          )}
        </div>

        {/* === REELS === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>Showreels</p>
            <Pencil onClick={() => openEdit('reels')} />
          </div>
          {reels.length > 0 ? reels.map(r => (
            <div key={r.id || r.label} style={{ background:'white',borderRadius:'12px',padding:'14px',border:'1px solid #e8e4de',marginBottom:'8px' }}>
              <p style={{ fontSize:'14px',color:'#0c2520',margin:'0 0 2px',fontWeight:500 }}>{r.label}</p>
              <p style={{ fontSize:'12px',color:'#888',margin:0,wordBreak:'break-all' }}>{r.url}</p>
            </div>
          )) : (
            <Empty text="Add your showreels and demo videos" onClick={() => openEdit('reels')} />
          )}
        </div>

        {/* === CREDITS === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>Credits</p>
            <Pencil onClick={() => openEdit('credits')} />
          </div>
          {credits.length > 0 ? (
            <div>
              {featuredCredits.length > 0 && (
                <p style={{ fontSize:'10px',color:'#4ade80',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em',margin:'0 0 8px' }}>Featured</p>
              )}
              {credits.map(c => (
                <div key={c.id || c.title} style={{ background:'white',borderRadius:'12px',padding:'14px',border:c.is_featured?'1.5px solid #4ade80':'1px solid #e8e4de',marginBottom:'8px',display:'flex',justifyContent:'space-between',alignItems:'start' }}>
                  <div>
                    <p style={{ fontSize:'14px',color:'#0c2520',margin:'0 0 2px',fontWeight:500 }}>{c.title}</p>
                    <p style={{ fontSize:'12px',color:'#666',margin:'0 0 2px' }}>{c.role}{c.director ? ' · Dir. ' + c.director : ''}</p>
                    <p style={{ fontSize:'11px',color:'#aaa',margin:0 }}>{c.production_company}{c.year ? ' · ' + c.year : ''}</p>
                  </div>
                  {c.is_featured && <span style={{ background:'#4ade80',color:'#061410',padding:'2px 8px',borderRadius:'4px',fontSize:'9px',fontWeight:600,flexShrink:0 }}>FEATURED</span>}
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Add your stage and screen credits" onClick={() => openEdit('credits')} />
          )}
        </div>

        {/* === BRANDS === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>Brands & companies</p>
            <Pencil onClick={() => openEdit('brands')} />
          </div>
          {brands.length > 0 ? (
            <div style={{ display:'flex',gap:'12px',flexWrap:'wrap' }}>
              {brands.map(b => (
                <div key={b.id || b.brand_name} style={{ display:'flex',alignItems:'center',gap:'8px',background:'white',borderRadius:'10px',padding:'8px 14px',border:'1px solid #e8e4de' }}>
                  {b.logo_url && <img src={b.logo_url} alt="" style={{ height:'20px',width:'auto' }} onError={e=>(e.target as HTMLImageElement).style.display='none'} />}
                  <span style={{ fontSize:'13px',color:'#0c2520',fontWeight:500 }}>{b.brand_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty text="Add brands and companies you have worked with" onClick={() => openEdit('brands')} />
          )}
        </div>

        {/* === TESTIMONIALS === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>Testimonials</p>
            <Pencil onClick={() => openEdit('testimonials')} />
          </div>
          {testimonials.length > 0 ? testimonials.map(t => (
            <div key={t.id || t.author_name} style={{ background:'white',borderRadius:'12px',padding:'16px',border:'1px solid #e8e4de',marginBottom:'8px' }}>
              <p style={{ fontSize:'14px',color:'#444',margin:'0 0 10px',lineHeight:1.5,fontStyle:'italic' }}>"{t.quote}"</p>
              <p style={{ fontSize:'12px',color:'#0c2520',margin:'0 0 1px',fontWeight:500 }}>{t.author_name}</p>
              {t.author_title && <p style={{ fontSize:'11px',color:'#888',margin:0 }}>{t.author_title}</p>}
            </div>
          )) : (
            <Empty text="Add testimonials from directors and colleagues" onClick={() => openEdit('testimonials')} />
          )}
        </div>

        {/* === GALLERY === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>Gallery</p>
            <Pencil onClick={() => openEdit('gallery')} />
          </div>
          {gallery.length > 0 ? (
            <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px' }}>
              {gallery.map(g => (
                <div key={g.id || g.url} style={{ aspectRatio:'1',borderRadius:'10px',background:'url('+g.url+') center/cover',backgroundSize:'cover',border:'1px solid #e8e4de' }} />
              ))}
            </div>
          ) : (
            <Empty text="Add photos to your gallery" onClick={() => openEdit('gallery')} />
          )}
        </div>

        {/* === FAQs === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>FAQs</p>
            <Pencil onClick={() => openEdit('faqs')} />
          </div>
          {faqs.length > 0 ? faqs.map(f => (
            <div key={f.id || f.question} style={{ background:'white',borderRadius:'12px',padding:'14px',border:'1px solid #e8e4de',marginBottom:'8px' }}>
              <p style={{ fontSize:'14px',color:'#0c2520',margin:'0 0 4px',fontWeight:500 }}>{f.question}</p>
              <p style={{ fontSize:'13px',color:'#666',margin:0,lineHeight:1.5 }}>{f.answer}</p>
            </div>
          )) : (
            <Empty text="Add frequently asked questions" onClick={() => openEdit('faqs')} />
          )}
        </div>

        {/* === AGENT === */}
        <div style={{ marginBottom:'24px' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
            <p style={{ fontFamily:'Georgia,serif',fontSize:'17px',fontWeight:500,color:'#0c2520',margin:0 }}>Agent</p>
            <Pencil onClick={() => openEdit('agent')} />
          </div>
          {profile.agent_name ? (
            <div style={{ background:'white',borderRadius:'12px',padding:'14px',border:'1px solid #e8e4de' }}>
              <p style={{ fontSize:'14px',color:'#0c2520',margin:'0 0 2px',fontWeight:500 }}>{profile.agent_name}</p>
              {profile.agent_phone && <p style={{ fontSize:'12px',color:'#888',margin:'0 0 1px' }}>{profile.agent_phone}</p>}
              {profile.agent_email && <p style={{ fontSize:'12px',color:'#888',margin:0 }}>{profile.agent_email}</p>}
            </div>
          ) : (
            <Empty text="Add your agent details" onClick={() => openEdit('agent')} />
          )}
        </div>
      </div>

      {/* ============== EDIT SHEETS ============== */}

      {editing === 'bio' && (
        <Sheet title="Edit bio" onClose={() => setEditing(null)}>
          <textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={6} placeholder="Tell casting directors about yourself..." style={{ ...inputStyle, resize:'vertical',minHeight:'120px' }} />
          <SaveBtn section="bio" />
        </Sheet>
      )}

      {editing === 'skills' && (
        <Sheet title="Edit skills" onClose={() => setEditing(null)}>
          <div style={{ display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px' }}>
            {allSkills.map(s => (
              <button key={s.id} className={'skill-chip' + (editSkillIds.includes(s.id) ? ' on' : '')}
                onClick={() => setEditSkillIds(prev => prev.includes(s.id) ? prev.filter(x=>x!==s.id) : [...prev,s.id])}>{s.name}</button>
            ))}
          </div>
          <SaveBtn section="skills" />
        </Sheet>
      )}

      {editing === 'availability' && (
        <Sheet title="Availability" onClose={() => setEditing(null)}>
          <div style={{ display:'flex',gap:'8px',marginBottom:'20px' }}>
            <button onClick={() => setEditAvailability('available')} style={{ flex:1,padding:'12px',borderRadius:'12px',border:editAvailability==='available'?'2px solid #4ade80':'1px solid #e0ddd5',background:'white',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:500,color:'#0c2520' }}>Available now</button>
            <button onClick={() => setEditAvailability('in_production')} style={{ flex:1,padding:'12px',borderRadius:'12px',border:editAvailability==='in_production'?'2px solid #f59e0b':'1px solid #e0ddd5',background:'white',cursor:'pointer',fontFamily:'inherit',fontSize:'13px',fontWeight:500,color:'#0c2520' }}>In production</button>
          </div>
          {editAvailability === 'in_production' && (
            <div style={{ marginBottom:'16px' }}>
              <label style={labelStyle}>Until when?</label>
              <input type="date" value={editProductionUntil} onChange={e => setEditProductionUntil(e.target.value)} style={inputStyle} />
            </div>
          )}
          <SaveBtn section="availability" />
        </Sheet>
      )}

      {editing === 'agent' && (
        <Sheet title="Agent details" onClose={() => setEditing(null)}>
          <div style={{ marginBottom:'14px' }}><label style={labelStyle}>Agent name</label><input value={editAgentName} onChange={e=>setEditAgentName(e.target.value)} placeholder="e.g. Sarah Mitchell" style={inputStyle} /></div>
          <div style={{ marginBottom:'14px' }}><label style={labelStyle}>Phone</label><input value={editAgentPhone} onChange={e=>setEditAgentPhone(e.target.value)} placeholder="+44 7700 900123" style={inputStyle} /></div>
          <div style={{ marginBottom:'14px' }}><label style={labelStyle}>Email</label><input value={editAgentEmail} onChange={e=>setEditAgentEmail(e.target.value)} placeholder="agent@agency.com" style={inputStyle} /></div>
          <SaveBtn section="agent" />
        </Sheet>
      )}

      {editing === 'reels' && (
        <Sheet title="Edit showreels" onClose={() => setEditing(null)}>
          {editReels.map((r,i) => (
            <div key={i} style={{ background:'white',borderRadius:'12px',padding:'14px',border:'1px solid #e8e4de',marginBottom:'10px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                <span style={{ fontSize:'12px',color:'#888',fontWeight:600 }}>Reel {i+1}</span>
                {editReels.length > 1 && <button onClick={() => setEditReels(prev => prev.filter((_,j) => j!==i))} style={{ background:'none',border:'none',fontSize:'12px',color:'#c0392b',cursor:'pointer',fontFamily:'inherit' }}>Remove</button>}
              </div>
              <input value={r.label} onChange={e => { const n=[...editReels]; n[i]={...n[i],label:e.target.value}; setEditReels(n) }} placeholder="Label (e.g. Acting Showreel)" style={{ ...inputStyle,marginBottom:'8px' }} />
              <input value={r.url} onChange={e => { const n=[...editReels]; n[i]={...n[i],url:e.target.value}; setEditReels(n) }} placeholder="YouTube or Vimeo URL" style={inputStyle} />
            </div>
          ))}
          <button onClick={() => setEditReels(prev => [...prev,{label:'',url:'',sort_order:prev.length+1}])} style={{ width:'100%',padding:'12px',borderRadius:'12px',border:'2px dashed #d4d2cc',background:'transparent',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px' }}>+ Add reel</button>
          <SaveBtn section="reels" />
        </Sheet>
      )}

      {editing === 'brands' && (
        <Sheet title="Edit brands" onClose={() => setEditing(null)}>
          {editBrands.map((b,i) => (
            <div key={i} style={{ display:'flex',gap:'8px',alignItems:'center',marginBottom:'10px' }}>
              <input value={b.brand_name} onChange={e => { const n=[...editBrands]; n[i]={...n[i],brand_name:e.target.value}; setEditBrands(n) }} placeholder="Brand name" style={{ ...inputStyle,flex:1 }}
                onBlur={async () => { if(!b.brand_name) return; try { const r = await fetch('/api/brandfetch?name='+encodeURIComponent(b.brand_name)); const d = await r.json(); if(d.logo) { const n=[...editBrands]; n[i]={...n[i],logo_url:d.logo}; setEditBrands(n) } } catch {} }} />
              {editBrands.length > 1 && <button onClick={() => setEditBrands(prev => prev.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',fontSize:'18px',color:'#c0392b',cursor:'pointer' }}>x</button>}
            </div>
          ))}
          <button onClick={() => setEditBrands(prev => [...prev,{brand_name:'',logo_url:null,sort_order:prev.length+1}])} style={{ width:'100%',padding:'12px',borderRadius:'12px',border:'2px dashed #d4d2cc',background:'transparent',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px' }}>+ Add brand</button>
          <SaveBtn section="brands" />
        </Sheet>
      )}

      {editing === 'credits' && (
        <Sheet title="Edit credits" onClose={() => setEditing(null)}>
          {editCredits.map((c,i) => (
            <div key={i} style={{ background:'white',borderRadius:'12px',padding:'14px',border:c.is_featured?'1.5px solid #4ade80':'1px solid #e8e4de',marginBottom:'10px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                <span style={{ fontSize:'12px',color:'#888',fontWeight:600 }}>Credit {i+1}</span>
                <div style={{ display:'flex',gap:'10px',alignItems:'center' }}>
                  <label style={{ fontSize:'11px',color:c.is_featured?'#4ade80':'#aaa',cursor:'pointer',display:'flex',alignItems:'center',gap:'4px' }}>
                    <input type="checkbox" checked={c.is_featured} onChange={e => { const n=[...editCredits]; n[i]={...n[i],is_featured:e.target.checked}; setEditCredits(n) }} style={{ accentColor:'#4ade80' }} /> Featured
                  </label>
                  {editCredits.length > 1 && <button onClick={() => setEditCredits(prev => prev.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',fontSize:'12px',color:'#c0392b',cursor:'pointer',fontFamily:'inherit' }}>Remove</button>}
                </div>
              </div>
              <input value={c.title} onChange={e => { const n=[...editCredits]; n[i]={...n[i],title:e.target.value}; setEditCredits(n) }} placeholder="Production title" style={{ ...inputStyle,marginBottom:'8px' }} />
              <input value={c.role} onChange={e => { const n=[...editCredits]; n[i]={...n[i],role:e.target.value}; setEditCredits(n) }} placeholder="Your role" style={{ ...inputStyle,marginBottom:'8px' }} />
              <div style={{ display:'flex',gap:'8px',marginBottom:'8px' }}>
                <input value={c.director||''} onChange={e => { const n=[...editCredits]; n[i]={...n[i],director:e.target.value}; setEditCredits(n) }} placeholder="Director" style={{ ...inputStyle,flex:1 }} />
                <input value={c.year||''} onChange={e => { const n=[...editCredits]; n[i]={...n[i],year:parseInt(e.target.value)||null}; setEditCredits(n) }} placeholder="Year" style={{ ...inputStyle,width:'80px' }} />
              </div>
              <input value={c.production_company||''} onChange={e => { const n=[...editCredits]; n[i]={...n[i],production_company:e.target.value}; setEditCredits(n) }} placeholder="Production company" style={inputStyle} />
            </div>
          ))}
          <button onClick={() => setEditCredits(prev => [...prev,{title:'',role:'',year:null,director:null,production_company:null,is_featured:false,production_type_id:null}])} style={{ width:'100%',padding:'12px',borderRadius:'12px',border:'2px dashed #d4d2cc',background:'transparent',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px' }}>+ Add credit</button>
          <SaveBtn section="credits" />
        </Sheet>
      )}

      {editing === 'testimonials' && (
        <Sheet title="Edit testimonials" onClose={() => setEditing(null)}>
          {editTestimonials.map((t,i) => (
            <div key={i} style={{ background:'white',borderRadius:'12px',padding:'14px',border:'1px solid #e8e4de',marginBottom:'10px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                <span style={{ fontSize:'12px',color:'#888',fontWeight:600 }}>Testimonial {i+1}</span>
                {editTestimonials.length > 1 && <button onClick={() => setEditTestimonials(prev => prev.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',fontSize:'12px',color:'#c0392b',cursor:'pointer',fontFamily:'inherit' }}>Remove</button>}
              </div>
              <textarea value={t.quote} onChange={e => { const n=[...editTestimonials]; n[i]={...n[i],quote:e.target.value}; setEditTestimonials(n) }} placeholder="What did they say about you?" rows={3} style={{ ...inputStyle,resize:'vertical',marginBottom:'8px' }} />
              <input value={t.author_name} onChange={e => { const n=[...editTestimonials]; n[i]={...n[i],author_name:e.target.value}; setEditTestimonials(n) }} placeholder="Their name" style={{ ...inputStyle,marginBottom:'8px' }} />
              <input value={t.author_title||''} onChange={e => { const n=[...editTestimonials]; n[i]={...n[i],author_title:e.target.value}; setEditTestimonials(n) }} placeholder="Their title (e.g. Director)" style={inputStyle} />
            </div>
          ))}
          <button onClick={() => setEditTestimonials(prev => [...prev,{quote:'',author_name:'',author_title:null,sort_order:prev.length+1}])} style={{ width:'100%',padding:'12px',borderRadius:'12px',border:'2px dashed #d4d2cc',background:'transparent',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px' }}>+ Add testimonial</button>
          <SaveBtn section="testimonials" />
        </Sheet>
      )}

      {editing === 'faqs' && (
        <Sheet title="Edit FAQs" onClose={() => setEditing(null)}>
          {editFaqs.map((f,i) => (
            <div key={i} style={{ background:'white',borderRadius:'12px',padding:'14px',border:'1px solid #e8e4de',marginBottom:'10px' }}>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px' }}>
                <span style={{ fontSize:'12px',color:'#888',fontWeight:600 }}>FAQ {i+1}</span>
                {editFaqs.length > 1 && <button onClick={() => setEditFaqs(prev => prev.filter((_,j)=>j!==i))} style={{ background:'none',border:'none',fontSize:'12px',color:'#c0392b',cursor:'pointer',fontFamily:'inherit' }}>Remove</button>}
              </div>
              <input value={f.question} onChange={e => { const n=[...editFaqs]; n[i]={...n[i],question:e.target.value}; setEditFaqs(n) }} placeholder="Question" style={{ ...inputStyle,marginBottom:'8px' }} />
              <textarea value={f.answer} onChange={e => { const n=[...editFaqs]; n[i]={...n[i],answer:e.target.value}; setEditFaqs(n) }} placeholder="Answer" rows={3} style={{ ...inputStyle,resize:'vertical' }} />
            </div>
          ))}
          <button onClick={() => setEditFaqs(prev => [...prev,{question:'',answer:'',sort_order:prev.length+1}])} style={{ width:'100%',padding:'12px',borderRadius:'12px',border:'2px dashed #d4d2cc',background:'transparent',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px' }}>+ Add FAQ</button>
          <SaveBtn section="faqs" />
        </Sheet>
      )}

      {editing === 'gallery' && (
        <Sheet title="Edit gallery" onClose={() => setEditing(null)}>
          <p style={{ fontSize:'13px',color:'#888',margin:'0 0 12px' }}>Gallery images are managed through your gallery uploads. Tap photos to remove them.</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'16px' }}>
            {gallery.map(g => (
              <div key={g.id || g.url} style={{ aspectRatio:'1',borderRadius:'10px',background:'url('+g.url+') center/cover',backgroundSize:'cover',position:'relative',cursor:'pointer' }}
                onClick={async () => {
                  if (g.id && confirm('Remove this image?')) {
                    await supabase.from('gallery_images').delete().eq('id', g.id)
                    setGallery(prev => prev.filter(x => x.id !== g.id))
                  }
                }}>
                <div style={{ position:'absolute',top:'4px',right:'4px',width:'20px',height:'20px',borderRadius:'50%',background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </div>
              </div>
            ))}
          </div>
          <label style={{ display:'block',width:'100%',padding:'12px',borderRadius:'12px',border:'2px dashed #d4d2cc',background:'transparent',fontSize:'13px',color:'#888',cursor:'pointer',fontFamily:'inherit',textAlign:'center' }}>
            + Upload image
            <input type="file" accept="image/*" style={{ display:'none' }} onChange={async e => {
              const file = e.target.files?.[0]
              if (!file || !profile) return
              const path = profile.id + '/gallery-' + Date.now() + '.' + file.name.split('.').pop()
              const { error } = await supabase.storage.from('headshots').upload(path, file, { contentType: file.type })
              if (!error) {
                const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
                await supabase.from('gallery_images').insert({ profile_id: profile.id, url: publicUrl, sort_order: gallery.length + 1 })
                setGallery(prev => [...prev, { url: publicUrl, sort_order: prev.length + 1 }])
              }
              e.target.value = ''
            }} />
          </label>
        </Sheet>
      )}
    </div>
  )
}
