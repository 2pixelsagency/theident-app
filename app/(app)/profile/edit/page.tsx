'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GENDERS = [{ id: 1, name: 'Unspecified' }, { id: 2, name: 'Non-Binary' }, { id: 3, name: 'Trans Female' }, { id: 4, name: 'Trans Male' }, { id: 5, name: 'Gender Nonconforming' }, { id: 6, name: 'Male' }, { id: 7, name: 'Female' }]
const ETHNICITIES = [{ id: 1, name: 'White / European Descent' }, { id: 2, name: 'Southeast Asian / Pacific Islander' }, { id: 3, name: 'South Asian / Indian' }, { id: 4, name: 'Middle Eastern' }, { id: 5, name: 'Latino / Hispanic' }, { id: 6, name: 'Ethnically Ambiguous / Multiracial' }, { id: 7, name: 'Black / African Descent' }, { id: 8, name: 'Asian' }]
const HAIR = [{ id: 1, name: 'Red' }, { id: 2, name: 'White' }, { id: 3, name: 'Multicoloured / Dyed' }, { id: 4, name: 'Bald' }, { id: 5, name: 'Strawberry Blonde' }, { id: 6, name: 'Grey' }, { id: 7, name: 'Blonde' }, { id: 8, name: 'Green' }, { id: 9, name: 'Auburn' }, { id: 10, name: 'Chestnut' }, { id: 11, name: 'Black' }, { id: 12, name: 'Blue' }, { id: 13, name: 'Brown' }]
const EYES = [{ id: 1, name: 'Violet' }, { id: 2, name: 'Grey' }, { id: 3, name: 'Red' }, { id: 4, name: 'Hazel' }, { id: 5, name: 'Green' }, { id: 6, name: 'Brown' }, { id: 7, name: 'Black' }, { id: 8, name: 'Blue' }, { id: 9, name: 'Amber' }]
const nameOf = (list: { id: number; name: string }[], id: any) => { const f = list.find(x => x.id === Number(id)); return f ? f.name : null }
const SERIF = "'ITC Symbol',Georgia,serif"

type Credit = { id?: string; title: string; role: string; year: number | null; thumbnail_url: string | null; director: string | null; production_company: string | null; is_featured: boolean; production_type_id: number | null }
type Brand = { id?: string; brand_name: string; logo_url: string | null }
type Testimonial = { id?: string; quote: string; author_name: string; author_title: string | null }
type GalleryImage = { id?: string; url: string }
type FAQ = { id?: string; question: string; answer: string }
type Skill = { id: number; name: string }
type Reel = { label: string; url: string }

const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 14px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', color: '#0c2520', outline: 'none' }
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '6px' }
const addBtnStyle: React.CSSProperties = { width: '100%', padding: '12px', borderRadius: '12px', border: '2px dashed #d4d2cc', background: 'transparent', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '8px' }

function CropModal({ file, onSave, onClose }: { file: File; onSave: (b: Blob) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1); const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false); const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const SIZE = 280
  useEffect(() => { const i = new Image(); i.onload = () => setImg(i); i.src = URL.createObjectURL(file); return () => URL.revokeObjectURL(i.src) }, [file])
  useEffect(() => { if (!img || !canvasRef.current) return; const ctx = canvasRef.current.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, SIZE, SIZE); const s = Math.max(SIZE / img.width, SIZE / img.height) * zoom; const w = img.width * s, h = img.height * s; ctx.drawImage(img, (SIZE - w) / 2 + offset.x, (SIZE - h) / 2 + offset.y, w, h) }, [img, zoom, offset])
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#f1f0ee', borderRadius: '20px', padding: '24px', maxWidth: '340px', width: '100%' }}>
        <p style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px', textAlign: 'center' }}>Crop photo</p>
        <div style={{ width: SIZE + 'px', height: SIZE + 'px', margin: '0 auto 16px', borderRadius: '50%', overflow: 'hidden', border: '3px solid #e0ddd5', touchAction: 'none' }}>
          <canvas ref={canvasRef} width={SIZE} height={SIZE}
            onPointerDown={e => { setDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }) }}
            onPointerMove={e => { if (dragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }) }}
            onPointerUp={() => setDragging(false)} onPointerLeave={() => setDragging(false)}
            style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'grab' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '0 8px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="3" /></svg>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#0c2520' }} />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2"><circle cx="12" cy="12" r="5" /></svg>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: '30px', border: '1px solid #e0ddd5', background: 'white', color: '#0c2520', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => { if (!canvasRef.current) return; canvasRef.current.toBlob(b => { if (b) onSave(b) }, 'image/jpeg', 0.9) }} style={{ flex: 1, padding: '14px', borderRadius: '30px', border: 'none', background: '#0c2520', color: '#f1f0ee', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
        </div>
      </div>
    </div>
  )
}

function Pencil({ onClick, light }: { onClick: () => void; light?: boolean }) {
  return (
    <button onClick={onClick} style={{ width: '30px', height: '30px', borderRadius: '50%', background: light ? 'rgba(255,255,255,0.15)' : 'white', border: light ? '1px solid rgba(255,255,255,0.25)' : '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: light ? 'none' : '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={light ? '#f1f0ee' : '#0c2520'} strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
    </button>
  )
}

function Empty({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ border: '2px dashed #d4d2cc', borderRadius: '14px', padding: '28px 20px', textAlign: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
      <p style={{ fontSize: '13px', color: '#aaa', margin: '0 0 6px' }}>{text}</p>
      <p style={{ fontSize: '12px', color: '#0c2520', margin: 0, fontWeight: 500, textDecoration: 'underline' }}>Add now</p>
    </div>
  )
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500 }} />
      <div className="edit-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 501, maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxWidth: '520px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} /></div>
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{title}</p>
            <button onClick={onClose} style={{ background: '#0c2520', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  )
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '14px' }}><label style={labelStyle}>{label}</label>{children}</div>
)
const SectionHead = ({ title, onEdit, light }: { title: string; onEdit: () => void; light?: boolean }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 32px' }}>
    <p style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '17px', fontWeight: 500, color: light ? '#f1f0ee' : '#0c2520', margin: 0 }}>{title}</p>
    <Pencil onClick={onEdit} light={light} />
  </div>
)

function ReelsViewer({ reels }: { reels: Reel[] }) {
  const [active, setActive] = useState(0)
  const current = reels[active]
  if (!current) return null
  return (
    <div style={{ padding: '0 32px' }}>
      <div style={{ background: '#061410', borderRadius: '14px', overflow: 'hidden', position: 'relative', marginBottom: '10px', aspectRatio: '16/9' }}>
        <video key={current.url} src={current.url + '#t=0.5'} controls playsInline preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#061410' }} />
      </div>
      <p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 12px' }}>{current.label}</p>
      {reels.length > 1 && (
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {reels.map((r, i) => (
            <button key={r.label} onClick={() => setActive(i)} style={{ flexShrink: 0, width: '110px', aspectRatio: '16/9', background: '#061410', border: active === i ? '2px solid #0c2520' : '2px solid transparent', borderRadius: '8px', cursor: 'pointer', padding: 0, position: 'relative', overflow: 'hidden' }}>
              <video src={r.url + '#t=0.5'} preload="metadata" playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '4px 6px', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                <p style={{ fontSize: '9px', color: 'white', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const REEL_LABELS = ['Ident', 'Dance Reel', 'Acting Reel', 'Singing Reel']

export default function EditProfile() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const swipeStart = useRef<number | null>(null)

  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [skillIds, setSkillIds] = useState<number[]>([])
  const [credits, setCredits] = useState<Credit[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [prodTypes, setProdTypes] = useState<{ id: number; name: string }[]>([])

  // list-edit drafts
  const [eSkills, setESkills] = useState<number[]>([])
  const [eCredits, setECredits] = useState<Credit[]>([])
  const [eBrands, setEBrands] = useState<Brand[]>([])
  const [eTest, setETest] = useState<Testimonial[]>([])
  const [eFaqs, setEFaqs] = useState<FAQ[]>([])
  const [mainTab, setMainTab] = useState<'credits' | 'reels'>('credits')

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500) }
  const setD = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }))

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      const [{ data: p }, { data: sk }, { data: usk }, { data: cr }, { data: br }, { data: te }, { data: ga }, { data: fa }, { data: pt }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('skills').select('id, name').order('name'),
        supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
        supabase.from('credits').select('*').eq('profile_id', user.id).order('year', { ascending: false }),
        supabase.from('profile_brands').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('testimonials').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('gallery_images').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('faqs').select('*').eq('profile_id', user.id).order('sort_order'),
        supabase.from('production_types').select('id, name').order('name'),
      ])
      setProfile(p)
      setAllSkills(sk || [])
      setSkillIds((usk || []).map((s: any) => s.skill_id))
      setCredits(cr || []); setBrands(br || []); setTestimonials(te || []); setGallery(ga || []); setFaqs(fa || []); setProdTypes(pt || [])
      setLoading(false)
    }
    load()
  }, [])

  const openEdit = (section: string) => {
    const p = profile || {}
    const keys: Record<string, string[]> = {
      details: ['first_name', 'last_name', 'location'],
      casting: ['gender_id', 'ethnicity_id', 'hair_colour_id', 'eye_colour_id', 'minimum_age', 'maximum_age', 'height', 'date_of_birth'],
      about: ['summary', 'bio'],
      reels: ['vid_1', 'vid_2', 'vid_3', 'vid_4'],
      availability: ['availability_status', 'production_until'],
      agent: ['agent_name', 'agent_phone', 'agent_email'],
    }
    if (keys[section]) {
      const d: any = {}
      keys[section].forEach(k => { d[k] = p[k] === null || p[k] === undefined ? '' : String(p[k]) })
      setDraft(d)
    }
    if (section === 'skills') setESkills([...skillIds])
    if (section === 'credits') setECredits(credits.length ? credits.map(c => ({ ...c })) : [{ title: '', role: '', year: null, thumbnail_url: null, director: null, production_company: null, is_featured: false, production_type_id: null }])
    if (section === 'brands') setEBrands(brands.length ? brands.map(b => ({ ...b })) : [{ brand_name: '', logo_url: null }])
    if (section === 'testimonials') setETest(testimonials.length ? testimonials.map(t => ({ ...t })) : [{ quote: '', author_name: '', author_title: '' }])
    if (section === 'faqs') setEFaqs(faqs.length ? faqs.map(f => ({ ...f })) : [{ question: '', answer: '' }])
    setEditing(section)
  }

  const saveProfileFields = async (section: string) => {
    if (!profile) return
    if (section === 'casting' && draft.minimum_age && draft.maximum_age && Number(draft.minimum_age) > Number(draft.maximum_age)) { showToast('Playing age: min can’t exceed max'); return }
    setSaving(true)
    const num = (v: any) => (v === '' || v === undefined ? null : Number(v))
    const txt = (v: any) => (!v || String(v).trim() === '' ? null : String(v).trim())
    const u: any = { updated_at: new Date().toISOString() }
    if (section === 'details') { u.first_name = txt(draft.first_name); u.last_name = txt(draft.last_name); u.location = txt(draft.location) }
    if (section === 'casting') { u.gender_id = num(draft.gender_id); u.ethnicity_id = num(draft.ethnicity_id); u.hair_colour_id = num(draft.hair_colour_id); u.eye_colour_id = num(draft.eye_colour_id); u.minimum_age = num(draft.minimum_age); u.maximum_age = num(draft.maximum_age); u.height = txt(draft.height); u.date_of_birth = txt(draft.date_of_birth) }
    if (section === 'about') { u.summary = txt(draft.summary); u.bio = txt(draft.bio) }
    if (section === 'reels') { ['vid_1', 'vid_2', 'vid_3', 'vid_4'].forEach(k => u[k] = txt(draft[k])) }
    if (section === 'availability') { u.availability_status = txt(draft.availability_status); u.production_until = txt(draft.production_until) }
    if (section === 'agent') { u.agent_name = txt(draft.agent_name); u.agent_phone = txt(draft.agent_phone); u.agent_email = txt(draft.agent_email) }
    const { error } = await supabase.from('profiles').update(u).eq('id', profile.id)
    setSaving(false)
    if (error) { showToast('Couldn’t save'); return }
    setProfile({ ...profile, ...u }); setEditing(null); showToast('Saved')
  }

  const saveSkills = async () => {
    if (!profile) return; setSaving(true)
    await supabase.from('profile_skills').delete().eq('profile_id', profile.id)
    if (eSkills.length) await supabase.from('profile_skills').insert(eSkills.map(id => ({ profile_id: profile.id, skill_id: id })))
    setSkillIds(eSkills); setSaving(false); setEditing(null); showToast('Saved')
  }
  const saveCredits = async () => {
    if (!profile) return; setSaving(true)
    const valid = eCredits.filter(c => c.title)
    await supabase.from('credits').delete().eq('profile_id', profile.id)
    if (valid.length) await supabase.from('credits').insert(valid.map(c => ({ profile_id: profile.id, title: c.title, role: c.role || null, year: c.year, thumbnail_url: c.thumbnail_url, director: c.director, production_company: c.production_company, is_featured: c.is_featured, production_type_id: c.production_type_id })))
    const { data } = await supabase.from('credits').select('*').eq('profile_id', profile.id).order('year', { ascending: false })
    setCredits(data || []); setSaving(false); setEditing(null); showToast('Saved')
  }
  const saveBrands = async () => {
    if (!profile) return; setSaving(true)
    const valid = eBrands.filter(b => b.brand_name)
    await supabase.from('profile_brands').delete().eq('profile_id', profile.id)
    if (valid.length) await supabase.from('profile_brands').insert(valid.map((b, i) => ({ profile_id: profile.id, brand_name: b.brand_name, logo_url: b.logo_url, sort_order: i })))
    setBrands(valid); setSaving(false); setEditing(null); showToast('Saved')
  }
  const saveTest = async () => {
    if (!profile) return; setSaving(true)
    const valid = eTest.filter(t => t.quote && t.author_name)
    await supabase.from('testimonials').delete().eq('profile_id', profile.id)
    if (valid.length) await supabase.from('testimonials').insert(valid.map((t, i) => ({ profile_id: profile.id, quote: t.quote, author_name: t.author_name, author_title: t.author_title || null, sort_order: i })))
    setTestimonials(valid); setSaving(false); setEditing(null); showToast('Saved')
  }
  const saveFaqs = async () => {
    if (!profile) return; setSaving(true)
    const valid = eFaqs.filter(f => f.question && f.answer)
    await supabase.from('faqs').delete().eq('profile_id', profile.id)
    if (valid.length) await supabase.from('faqs').insert(valid.map((f, i) => ({ profile_id: profile.id, question: f.question, answer: f.answer, sort_order: i })))
    setFaqs(valid); setSaving(false); setEditing(null); showToast('Saved')
  }

const handleCropSave = async (blob: Blob) => {
    if (!profile) return
    setCropFile(null); setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); showToast('Not signed in — refresh and try again'); return }
    const path = profile.id + '/headshot-' + Date.now() + '.jpg'
    const { error: upErr } = await supabase.storage.from('headshots').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (upErr) { setSaving(false); showToast('Upload: ' + upErr.message); console.error('upload error', upErr); return }
    const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
    const { error: dbErr } = await supabase.from('profiles').update({ picture_url: publicUrl }).eq('id', profile.id)
    if (dbErr) { setSaving(false); showToast('Save: ' + dbErr.message); console.error('db error', dbErr); return }
    setProfile({ ...profile, picture_url: publicUrl }); showToast('Photo updated')
    setSaving(false)
  }
  const uploadThumb = async (file: File, i: number) => {
    if (!profile) return
    const path = profile.id + '/credit-' + Date.now() + '.' + (file.name.split('.').pop() || 'jpg')
    const { error } = await supabase.storage.from('headshots').upload(path, file, { contentType: file.type })
    if (!error) { const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path); setECredits(prev => prev.map((c, j) => j === i ? { ...c, thumbnail_url: publicUrl } : c)) }
  }
  const uploadGallery = async (file: File) => {
    if (!profile) return
    const path = profile.id + '/gallery-' + Date.now() + '.' + (file.name.split('.').pop() || 'jpg')
    const { error } = await supabase.storage.from('headshots').upload(path, file, { contentType: file.type })
    if (!error) { const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path); const { data: img } = await supabase.from('gallery_images').insert({ profile_id: profile.id, url: publicUrl, sort_order: gallery.length }).select().single(); if (img) setGallery(prev => [...prev, { id: img.id, url: img.url }]) }
  }
  const deleteGallery = async (g: GalleryImage) => { if (g.id) await supabase.from('gallery_images').delete().eq('id', g.id); setGallery(prev => prev.filter(x => x.id !== g.id)) }

  const lookupBrand = async (i: number, name: string) => {
    if (!name) return
    try { const r = await fetch('/api/brandfetch?brand=' + encodeURIComponent(name)); const d = await r.json(); if (d.logo) setEBrands(prev => prev.map((b, j) => j === i ? { ...b, logo_url: d.logo } : b)) } catch {}
  }

  if (loading || !profile) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const fullName = ((profile.first_name || '') + ' ' + (profile.last_name || '')).trim()
  const reels: Reel[] = [profile.vid_1, profile.vid_2, profile.vid_3, profile.vid_4].map((url, i) => ({ label: REEL_LABELS[i], url: url || '' })).filter(r => r.url)
  const featured = credits.filter(c => c.is_featured)
  const skillNames = allSkills.filter(s => skillIds.includes(s.id)).map(s => s.name)
  const castingChips = [
    profile.minimum_age && profile.maximum_age ? 'Playing age ' + profile.minimum_age + '–' + profile.maximum_age : null,
    nameOf(GENDERS, profile.gender_id), nameOf(ETHNICITIES, profile.ethnicity_id),
    nameOf(HAIR, profile.hair_colour_id) ? nameOf(HAIR, profile.hair_colour_id) + ' hair' : null,
    nameOf(EYES, profile.eye_colour_id) ? nameOf(EYES, profile.eye_colour_id) + ' eyes' : null,
    profile.height,
  ].filter(Boolean)

  const SaveBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} disabled={saving} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', position: 'relative' }}
      onTouchStart={e => { swipeStart.current = e.touches[0].clientX < 30 ? e.touches[0].clientX : null }}
      onTouchEnd={e => { if (swipeStart.current !== null && e.changedTouches[0].clientX - swipeStart.current > 80) router.back(); swipeStart.current = null }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        .edit-sheet { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .marquee-track { display:flex; animation: marquee 15s linear infinite; }
        .feat-scroll { display:flex; gap:14px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none; }
        .feat-scroll::-webkit-scrollbar { display:none; }
        .cat-tab { padding:6px 14px; border-radius:20px; font-size:12px; cursor:pointer; font-family:inherit; border:1px solid #e0ddd5; background:white; color:#888; white-space:nowrap; }
        .cat-tab.on { background:#0c2520; color:#f1f0ee; border-color:#0c2520; }
        .skill-chip { padding:8px 14px; border-radius:20px; font-size:13px; cursor:pointer; font-family:inherit; border:1px solid #e0ddd5; background:white; color:#0c2520; }
        .skill-chip.on { background:#0c2520; color:#f1f0ee; border-color:#0c2520; }
        .fld:focus { border-color:#92d7af !important; }
        .tab-slide { transition: transform 0.35s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      {cropFile && <CropModal file={cropFile} onSave={handleCropSave} onClose={() => setCropFile(null)} />}
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 20 }}>
        <button onClick={() => router.back()} style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
        </button>
        {profile.slug && <button onClick={() => window.open('/' + profile.slug + '?from=app', '_blank')} style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: 'white', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>View live</button>}
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 0 120px' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', background: '#f1f0ee' }}>
          {profile.vid_1 ? (
            <div style={{ width: '100%', height: '240px', overflow: 'hidden' }}><video autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }}><source src={profile.vid_1} /></video></div>
          ) : <div style={{ height: '80px' }} />}

          <div style={{ marginTop: profile.vid_1 ? '-55px' : '0', position: 'relative', zIndex: 2, paddingBottom: '8px' }}>
            <label style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}>
              <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: profile.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#e8efea', backgroundSize: 'cover', margin: '0 auto 24px', border: '4px solid #f1f0ee', boxShadow: '0 4px 24px rgba(12,37,32,0.15)' }} />
              <div style={{ position: 'absolute', bottom: '20px', right: 'calc(50% - 55px)', width: '30px', height: '30px', borderRadius: '50%', background: '#0c2520', border: '2px solid #f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }} />
            </label>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', margin: '0 0 10px', padding: '0 32px' }}>
              <h1 style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '34px', fontWeight: 500, color: '#0c2520', margin: 0, lineHeight: 1.1 }}>{fullName || 'Your name'}</h1>
              <Pencil onClick={() => openEdit('details')} />
            </div>
            {profile.location && <p style={{ fontSize: '13px', color: '#888', margin: '0 0 14px' }}>{profile.location}</p>}

            {/* Casting chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: '14px', padding: '0 32px' }}>
              {castingChips.length > 0 ? castingChips.map((c, i) => <span key={i} style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: '#e8efea', color: '#0c2520' }}>{c}</span>) : <span style={{ fontSize: '13px', color: '#ccc' }}>Add casting details</span>}
              <Pencil onClick={() => openEdit('casting')} />
            </div>

            {/* Skills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginBottom: '14px', padding: '0 32px' }}>
              {skillNames.length > 0 ? skillNames.map(s => <span key={s} style={{ padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: '#e8e4de', color: '#0c2520' }}>{s}</span>) : <span style={{ fontSize: '13px', color: '#ccc' }}>Add skills</span>}
              <Pencil onClick={() => openEdit('skills')} />
            </div>

            {/* Availability */}
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
              {profile.availability_status === 'available' ? <span style={{ background: '#4ade80', color: '#061410', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Available for work</span>
                : profile.availability_status === 'in_production' ? <span style={{ background: '#fde6c2', color: '#8a5a2e', padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{'In production' + (profile.production_until ? ' until ' + new Date(profile.production_until).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '')}</span>
                  : <span style={{ fontSize: '12px', color: '#ccc' }}>Set availability</span>}
              <Pencil onClick={() => openEdit('availability')} />
            </div>
          </div>
        </div>

        {/* BIO */}
        <div style={{ marginTop: '36px', marginBottom: '40px' }}>
          <SectionHead title="About" onEdit={() => openEdit('about')} />
          <div style={{ padding: '0 32px' }}>
            {profile.bio || profile.summary ? (
              <>
                {profile.bio && <p style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '24px', color: '#0c2520', lineHeight: 1.45, margin: 0, fontWeight: 500 }}>{profile.bio}</p>}
                {profile.summary && <p style={{ fontSize: '15px', color: '#666', lineHeight: 1.7, margin: '18px 0 0' }}>{profile.summary}</p>}
              </>
            ) : <Empty text="Tell casting directors about yourself" onClick={() => openEdit('about')} />}
          </div>
        </div>

        {/* HIGHLIGHTS */}
        <div style={{ marginBottom: '40px' }}>
          <SectionHead title="Highlights" onEdit={() => openEdit('credits')} />
          {featured.length > 0 ? (
            <div className="feat-scroll" style={{ paddingLeft: '32px', paddingRight: '32px' }}>
              {featured.map(c => (
                <div key={c.id} style={{ flexShrink: 0, width: '280px', height: '360px', borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
                  {c.thumbnail_url ? <div style={{ width: '100%', height: '100%', background: 'url(' + c.thumbnail_url + ') center/cover', backgroundSize: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: '#1a3a30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontFamily: SERIF, fontSize: '48px', color: '#2a5040' }}>{c.title?.[0]}</span></div>}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.75))', padding: '48px 18px 20px' }}>
                    <p style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '22px', color: 'white', margin: '0 0 4px', fontWeight: 500, lineHeight: 1.2 }}>{c.title}</p>
                    {c.role && <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{c.role}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ padding: '0 32px' }}><Empty text="Mark a credit as Featured to highlight it here" onClick={() => openEdit('credits')} /></div>}
        </div>

        {/* CREDITS / REELS */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 32px' }}>
            <div style={{ display: 'flex', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px', flex: 1, marginRight: '12px' }}>
              <button onClick={() => setMainTab('credits')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: mainTab === 'credits' ? '#0c2520' : 'transparent', color: mainTab === 'credits' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Credits</button>
              <button onClick={() => setMainTab('reels')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: mainTab === 'reels' ? '#0c2520' : 'transparent', color: mainTab === 'reels' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Reels</button>
            </div>
            <Pencil onClick={() => openEdit(mainTab === 'credits' ? 'credits' : 'reels')} />
          </div>
          {mainTab === 'credits' ? (
            <div style={{ padding: '0 32px' }}>
              {credits.length > 0 ? credits.map((c, i) => (
                <div key={c.id || i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 0', borderBottom: i < credits.length - 1 ? '1px solid #e8e4de' : 'none' }}>
                  {c.thumbnail_url ? <img src={c.thumbnail_url} alt={c.title} style={{ width: '56px', height: '40px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} /> : <div style={{ width: '56px', height: '40px', borderRadius: '6px', background: '#e8e4de', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: '16px', fontWeight: 500, color: '#ccc' }}>{c.title?.[0]}</span></div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{c.title}</p>{c.is_featured && <span style={{ fontSize: '9px', fontWeight: 600, color: '#4ade80' }}>FEATURED</span>}</div>
                    <p style={{ fontSize: '12px', color: '#888', margin: '3px 0 0' }}>{c.role}{c.director ? ' · ' + c.director : ''}{c.production_company ? ' · ' + c.production_company : ''}</p>
                  </div>
                  {c.year && <span style={{ fontSize: '12px', color: '#aaa', flexShrink: 0 }}>{c.year}</span>}
                </div>
              )) : <Empty text="Add your stage and screen credits" onClick={() => openEdit('credits')} />}
            </div>
          ) : (reels.length > 0 ? <ReelsViewer reels={reels} /> : <div style={{ padding: '0 32px' }}><Empty text="Add your showreels (video URLs)" onClick={() => openEdit('reels')} /></div>)}
        </div>

        {/* TESTIMONIALS */}
        {testimonials.length > 0 ? (
          <div style={{ background: '#0c2520', borderRadius: '20px', margin: '0 20px 40px', padding: '20px 0 36px' }}>
            <SectionHead title="Testimonials" onEdit={() => openEdit('testimonials')} light />
            <div style={{ padding: '0 32px' }}>
              {testimonials.map((t, i) => (
                <div key={t.id || i} style={{ marginBottom: i < testimonials.length - 1 ? '20px' : 0, paddingBottom: i < testimonials.length - 1 ? '20px' : 0, borderBottom: i < testimonials.length - 1 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                  <p style={{ fontFamily: SERIF, letterSpacing: '-0.03em', fontSize: '18px', color: '#f1f0ee', lineHeight: 1.6, margin: '0 0 12px', fontStyle: 'italic' }}>“{t.quote}”</p>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: '#92d7af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.author_name}{t.author_title ? ' · ' + t.author_title : ''}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: '40px' }}><SectionHead title="Testimonials" onEdit={() => openEdit('testimonials')} /><div style={{ padding: '0 32px' }}><Empty text="Add quotes from directors or collaborators" onClick={() => openEdit('testimonials')} /></div></div>
        )}

        {/* BRANDS */}
        <div style={{ marginBottom: '40px' }}>
          <SectionHead title="Brands" onEdit={() => openEdit('brands')} />
          {brands.length > 0 ? (
            <div style={{ margin: '0 32px', paddingTop: '8px', paddingBottom: '8px', borderTop: '1px solid #e8e4de', borderBottom: '1px solid #e8e4de', overflow: 'hidden' }}>
              <div className="marquee-track">
                {[...brands, ...brands, ...brands].map((b, i) => (
                  <div key={(b.id || b.brand_name) + '-' + i} style={{ flexShrink: 0, margin: '0 30px', display: 'flex', alignItems: 'center', height: '50px' }}>
                    {b.logo_url ? <img src={b.logo_url} alt={b.brand_name} style={{ height: '38px', maxWidth: '120px', objectFit: 'contain' }} /> : <span style={{ fontSize: '13px', fontWeight: 600, color: '#bbb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{b.brand_name}</span>}
                  </div>
                ))}
              </div>
            </div>
          ) : <div style={{ padding: '0 32px' }}><Empty text="Add brands and companies you've worked with" onClick={() => openEdit('brands')} /></div>}
        </div>

        {/* GALLERY */}
        <div style={{ marginBottom: '40px' }}>
          <SectionHead title="Gallery" onEdit={() => openEdit('gallery')} />
          {gallery.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', padding: '0 32px' }}>
              {gallery.map(g => <div key={g.id || g.url} style={{ aspectRatio: '3/4', borderRadius: '10px', background: 'url(' + g.url + ') center/cover', backgroundSize: 'cover' }} />)}
            </div>
          ) : <div style={{ padding: '0 32px' }}><Empty text="Add photos to your gallery" onClick={() => openEdit('gallery')} /></div>}
        </div>

        {/* FAQs */}
        <div style={{ marginBottom: '40px' }}>
          <SectionHead title="Questions" onEdit={() => openEdit('faqs')} />
          {faqs.length > 0 ? (
            <div style={{ padding: '0 32px' }}>
              {faqs.map(f => (
                <div key={f.id || f.question} style={{ borderBottom: '1px solid #e8e4de', padding: '14px 0' }}>
                  <p style={{ fontSize: '15px', fontWeight: 500, color: '#0c2520', margin: '0 0 4px' }}>{f.question}</p>
                  <p style={{ fontSize: '13px', color: '#666', margin: 0, lineHeight: 1.6 }}>{f.answer}</p>
                </div>
              ))}
            </div>
          ) : <div style={{ padding: '0 32px' }}><Empty text="Add fun questions that show who you are" onClick={() => openEdit('faqs')} /></div>}
        </div>

        {/* AGENT */}
        <div style={{ marginBottom: '40px' }}>
          <SectionHead title="Agent" onEdit={() => openEdit('agent')} />
          <div style={{ padding: '0 32px' }}>
            {profile.agent_name ? (
              <div style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e8e4de' }}>
                <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 2px', fontWeight: 500 }}>{profile.agent_name}</p>
                {profile.agent_phone && <p style={{ fontSize: '12px', color: '#888', margin: '0 0 1px' }}>{profile.agent_phone}</p>}
                {profile.agent_email && <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{profile.agent_email}</p>}
              </div>
            ) : <Empty text="Add your agent details" onClick={() => openEdit('agent')} />}
          </div>
        </div>
      </div>

      {/* ===== SHEETS ===== */}
      {editing === 'details' && (
        <Sheet title="Edit details" onClose={() => setEditing(null)}>
          <Field label="First name"><input className="fld" style={inputStyle} value={draft.first_name || ''} onChange={e => setD('first_name', e.target.value)} /></Field>
          <Field label="Last name"><input className="fld" style={inputStyle} value={draft.last_name || ''} onChange={e => setD('last_name', e.target.value)} /></Field>
          <Field label="Location"><input className="fld" style={inputStyle} value={draft.location || ''} onChange={e => setD('location', e.target.value)} placeholder="London, UK" /></Field>
          <SaveBtn onClick={() => saveProfileFields('details')} />
        </Sheet>
      )}

      {editing === 'casting' && (
        <Sheet title="Casting details" onClose={() => setEditing(null)}>
          <Field label="Playing age">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input className="fld" type="number" inputMode="numeric" style={inputStyle} value={draft.minimum_age || ''} onChange={e => setD('minimum_age', e.target.value)} placeholder="Min" />
              <span style={{ color: '#aaa', fontSize: '13px' }}>to</span>
              <input className="fld" type="number" inputMode="numeric" style={inputStyle} value={draft.maximum_age || ''} onChange={e => setD('maximum_age', e.target.value)} placeholder="Max" />
            </div>
          </Field>
          <Field label="Gender"><select className="fld" style={inputStyle} value={draft.gender_id || ''} onChange={e => setD('gender_id', e.target.value)}><option value="">Select…</option>{GENDERS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Ethnicity"><select className="fld" style={inputStyle} value={draft.ethnicity_id || ''} onChange={e => setD('ethnicity_id', e.target.value)}><option value="">Select…</option>{ETHNICITIES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Hair colour"><select className="fld" style={inputStyle} value={draft.hair_colour_id || ''} onChange={e => setD('hair_colour_id', e.target.value)}><option value="">Select…</option>{HAIR.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Eye colour"><select className="fld" style={inputStyle} value={draft.eye_colour_id || ''} onChange={e => setD('eye_colour_id', e.target.value)}><option value="">Select…</option>{EYES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></Field>
          <Field label="Height"><input className="fld" style={inputStyle} value={draft.height || ''} onChange={e => setD('height', e.target.value)} placeholder="5 ft 10 / 178cm" /></Field>
          <Field label="Date of birth (private)"><input className="fld" type="date" style={inputStyle} value={draft.date_of_birth || ''} onChange={e => setD('date_of_birth', e.target.value)} /></Field>
          <SaveBtn onClick={() => saveProfileFields('casting')} />
        </Sheet>
      )}

      {editing === 'skills' && (
        <Sheet title="Edit skills" onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {allSkills.map(s => <button key={s.id} className={'skill-chip' + (eSkills.includes(s.id) ? ' on' : '')} onClick={() => setESkills(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}>{s.name}</button>)}
          </div>
          <SaveBtn onClick={saveSkills} />
        </Sheet>
      )}

      {editing === 'availability' && (
        <Sheet title="Availability" onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => setD('availability_status', draft.availability_status === 'available' ? '' : 'available')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: draft.availability_status === 'available' ? '2px solid #4ade80' : '1px solid #e0ddd5', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, color: '#0c2520' }}>Available now</button>
            <button onClick={() => setD('availability_status', draft.availability_status === 'in_production' ? '' : 'in_production')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: draft.availability_status === 'in_production' ? '2px solid #f59e0b' : '1px solid #e0ddd5', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, color: '#0c2520' }}>In production</button>
          </div>
          {draft.availability_status === 'in_production' && <Field label="In production until"><input className="fld" type="date" style={inputStyle} value={draft.production_until || ''} onChange={e => setD('production_until', e.target.value)} /></Field>}
          <SaveBtn onClick={() => saveProfileFields('availability')} />
        </Sheet>
      )}

      {editing === 'about' && (
        <Sheet title="Edit about" onClose={() => setEditing(null)}>
          <Field label="Bio (the big serif line)"><textarea className="fld" style={{ ...inputStyle, minHeight: '90px', resize: 'vertical', lineHeight: 1.5 }} value={draft.bio || ''} onChange={e => setD('bio', e.target.value)} placeholder="A punchy line that captures you" /></Field>
          <Field label="Summary"><textarea className="fld" style={{ ...inputStyle, minHeight: '110px', resize: 'vertical', lineHeight: 1.5 }} value={draft.summary || ''} onChange={e => setD('summary', e.target.value)} placeholder="Your training, experience, and what you're looking for…" /></Field>
          <SaveBtn onClick={() => saveProfileFields('about')} />
        </Sheet>
      )}

      {editing === 'reels' && (
        <Sheet title="Edit showreels" onClose={() => setEditing(null)}>
          {['vid_1', 'vid_2', 'vid_3', 'vid_4'].map((k, i) => <Field key={k} label={REEL_LABELS[i]}><input className="fld" style={inputStyle} value={draft[k] || ''} onChange={e => setD(k, e.target.value)} placeholder="Video URL (mp4 / hosted)" /></Field>)}
          <SaveBtn onClick={() => saveProfileFields('reels')} />
        </Sheet>
      )}

      {editing === 'credits' && (
        <Sheet title="Edit credits" onClose={() => setEditing(null)}>
          {eCredits.map((c, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: c.is_featured ? '1.5px solid #4ade80' : '1px solid #e8e4de', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Credit {i + 1}</span>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <label style={{ fontSize: '11px', color: c.is_featured ? '#4ade80' : '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><input type="checkbox" checked={c.is_featured} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, is_featured: e.target.checked } : x))} style={{ accentColor: '#4ade80' }} /> Featured</label>
                  {eCredits.length > 1 && <button onClick={() => setECredits(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                {c.thumbnail_url ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img src={c.thumbnail_url} alt="" style={{ width: '100px', height: '68px', objectFit: 'cover', borderRadius: '8px', display: 'block' }} />
                    <button onClick={() => setECredits(prev => prev.map((x, j) => j === i ? { ...x, thumbnail_url: null } : x))} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                  </div>
                ) : <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 14px', background: '#f9f8f6', border: '1px dashed #d4d2cc', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', color: '#888' }}>Upload thumbnail<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumb(f, i) }} /></label>}
              </div>
              <input className="fld" style={{ ...inputStyle, marginBottom: '8px' }} value={c.title} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Production title" />
              <input className="fld" style={{ ...inputStyle, marginBottom: '8px' }} value={c.role || ''} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="Your role" />
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input className="fld" style={{ ...inputStyle, flex: 1 }} value={c.director || ''} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, director: e.target.value } : x))} placeholder="Director" />
                <input className="fld" type="number" style={{ ...inputStyle, width: '90px' }} value={c.year || ''} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, year: e.target.value ? parseInt(e.target.value) : null } : x))} placeholder="Year" />
              </div>
              <input className="fld" style={{ ...inputStyle, marginBottom: '8px' }} value={c.production_company || ''} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, production_company: e.target.value } : x))} placeholder="Production company" />
              {prodTypes.length > 0 && <select className="fld" style={inputStyle} value={c.production_type_id || ''} onChange={e => setECredits(prev => prev.map((x, j) => j === i ? { ...x, production_type_id: e.target.value ? parseInt(e.target.value) : null } : x))}><option value="">Category…</option>{prodTypes.map(pt => <option key={pt.id} value={pt.id}>{pt.name}</option>)}</select>}
            </div>
          ))}
          <button onClick={() => setECredits(prev => [...prev, { title: '', role: '', year: null, thumbnail_url: null, director: null, production_company: null, is_featured: false, production_type_id: null }])} style={addBtnStyle}>+ Add credit</button>
          <SaveBtn onClick={saveCredits} />
        </Sheet>
      )}

      {editing === 'brands' && (
        <Sheet title="Edit brands" onClose={() => setEditing(null)}>
          {eBrands.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              {b.logo_url && <img src={b.logo_url} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain', flexShrink: 0 }} />}
              <input className="fld" style={{ ...inputStyle, flex: 1 }} value={b.brand_name} onChange={e => setEBrands(prev => prev.map((x, j) => j === i ? { ...x, brand_name: e.target.value, logo_url: null } : x))} onBlur={() => lookupBrand(i, b.brand_name)} placeholder="e.g. Casamigos" />
              {eBrands.length > 1 && <button onClick={() => setEBrands(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', fontSize: '18px', color: '#c0392b', cursor: 'pointer' }}>×</button>}
            </div>
          ))}
          <button onClick={() => setEBrands(prev => [...prev, { brand_name: '', logo_url: null }])} style={addBtnStyle}>+ Add brand</button>
          <SaveBtn onClick={saveBrands} />
        </Sheet>
      )}

      {editing === 'testimonials' && (
        <Sheet title="Edit testimonials" onClose={() => setEditing(null)}>
          {eTest.map((t, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e8e4de', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Testimonial {i + 1}</span>
                {eTest.length > 1 && <button onClick={() => setETest(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}
              </div>
              <textarea className="fld" style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', marginBottom: '8px' }} value={t.quote} onChange={e => setETest(prev => prev.map((x, j) => j === i ? { ...x, quote: e.target.value } : x))} placeholder="What did they say about you?" />
              <input className="fld" style={{ ...inputStyle, marginBottom: '8px' }} value={t.author_name} onChange={e => setETest(prev => prev.map((x, j) => j === i ? { ...x, author_name: e.target.value } : x))} placeholder="Their name" />
              <input className="fld" style={inputStyle} value={t.author_title || ''} onChange={e => setETest(prev => prev.map((x, j) => j === i ? { ...x, author_title: e.target.value } : x))} placeholder="Their title (e.g. Director)" />
            </div>
          ))}
          <button onClick={() => setETest(prev => [...prev, { quote: '', author_name: '', author_title: '' }])} style={addBtnStyle}>+ Add testimonial</button>
          <SaveBtn onClick={saveTest} />
        </Sheet>
      )}

      {editing === 'gallery' && (
        <Sheet title="Edit gallery" onClose={() => setEditing(null)}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '16px' }}>
            {gallery.map(g => (
              <div key={g.id || g.url} style={{ aspectRatio: '3/4', borderRadius: '10px', background: 'url(' + g.url + ') center/cover', backgroundSize: 'cover', position: 'relative' }}>
                <button onClick={() => deleteGallery(g)} style={{ position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
              </div>
            ))}
          </div>
          <label style={{ display: 'block', ...addBtnStyle, textAlign: 'center' }}>+ Upload photo<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) uploadGallery(f); e.target.value = '' }} /></label>
        </Sheet>
      )}

      {editing === 'faqs' && (
        <Sheet title="Edit questions" onClose={() => setEditing(null)}>
          {eFaqs.map((f, i) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e8e4de', marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>Question {i + 1}</span>
                {eFaqs.length > 1 && <button onClick={() => setEFaqs(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}
              </div>
              <input className="fld" style={{ ...inputStyle, marginBottom: '8px' }} value={f.question} onChange={e => setEFaqs(prev => prev.map((x, j) => j === i ? { ...x, question: e.target.value } : x))} placeholder="Question" />
              <textarea className="fld" style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={f.answer} onChange={e => setEFaqs(prev => prev.map((x, j) => j === i ? { ...x, answer: e.target.value } : x))} placeholder="Answer" />
            </div>
          ))}
          <button onClick={() => setEFaqs(prev => [...prev, { question: '', answer: '' }])} style={addBtnStyle}>+ Add question</button>
          <SaveBtn onClick={saveFaqs} />
        </Sheet>
      )}

      {editing === 'agent' && (
        <Sheet title="Agent details" onClose={() => setEditing(null)}>
          <Field label="Agent name"><input className="fld" style={inputStyle} value={draft.agent_name || ''} onChange={e => setD('agent_name', e.target.value)} /></Field>
          <Field label="Phone"><input className="fld" type="tel" style={inputStyle} value={draft.agent_phone || ''} onChange={e => setD('agent_phone', e.target.value)} /></Field>
          <Field label="Email"><input className="fld" type="email" style={inputStyle} value={draft.agent_email || ''} onChange={e => setD('agent_email', e.target.value)} placeholder="agent@agency.com" /></Field>
          <SaveBtn onClick={() => saveProfileFields('agent')} />
        </Sheet>
      )}
    </div>
  )
}
