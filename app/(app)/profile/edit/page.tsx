'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const GENDERS = [{ id: 1, name: 'Unspecified' }, { id: 2, name: 'Non-Binary' }, { id: 3, name: 'Trans Female' }, { id: 4, name: 'Trans Male' }, { id: 5, name: 'Gender Nonconforming' }, { id: 6, name: 'Male' }, { id: 7, name: 'Female' }]
const ETHNICITIES = [{ id: 1, name: 'White / European Descent' }, { id: 2, name: 'Southeast Asian / Pacific Islander' }, { id: 3, name: 'South Asian / Indian' }, { id: 4, name: 'Middle Eastern' }, { id: 5, name: 'Latino / Hispanic' }, { id: 6, name: 'Ethnically Ambiguous / Multiracial' }, { id: 7, name: 'Black / African Descent' }, { id: 8, name: 'Asian' }]
const HAIR = [{ id: 1, name: 'Red' }, { id: 2, name: 'White' }, { id: 3, name: 'Multicoloured / Dyed' }, { id: 4, name: 'Bald' }, { id: 5, name: 'Strawberry Blonde' }, { id: 6, name: 'Grey' }, { id: 7, name: 'Blonde' }, { id: 8, name: 'Green' }, { id: 9, name: 'Auburn' }, { id: 10, name: 'Chestnut' }, { id: 11, name: 'Black' }, { id: 12, name: 'Blue' }, { id: 13, name: 'Brown' }]
const EYES = [{ id: 1, name: 'Violet' }, { id: 2, name: 'Grey' }, { id: 3, name: 'Red' }, { id: 4, name: 'Hazel' }, { id: 5, name: 'Green' }, { id: 6, name: 'Brown' }, { id: 7, name: 'Black' }, { id: 8, name: 'Blue' }, { id: 9, name: 'Amber' }]
const nameOf = (list: { id: number; name: string }[], id: any) => { const f = list.find(x => x.id === Number(id)); return f ? f.name : null }

const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 14px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', color: '#0c2520', outline: 'none' }
const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '6px' }

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
        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px', textAlign: 'center' }}>Crop photo</p>
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

function Pencil({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'white', border: '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
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
      <div className="edit-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 501, maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)', maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} /></div>
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{title}</p>
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
const SectionHead = ({ title, onEdit }: { title: string; onEdit: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
    <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{title}</p>
    <Pencil onClick={onEdit} />
  </div>
)

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

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500) }
  const setD = (k: string, v: any) => setDraft((d: any) => ({ ...d, [k]: v }))

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data); setLoading(false)
    }
    load()
  }, [])

  const openEdit = (section: string) => {
    const p = profile || {}
    const keys: Record<string, string[]> = {
      details: ['first_name', 'last_name', 'what_i_do', 'location'],
      about: ['summary', 'bio'],
      casting: ['gender_id', 'ethnicity_id', 'hair_colour_id', 'eye_colour_id', 'minimum_age', 'maximum_age', 'height', 'date_of_birth'],
      reels: ['vid_1', 'vid_2', 'vid_3', 'vid_4'],
      testimonials: ['testimonial_1', 'testimonial_2', 'testimonial_3'],
      availability: ['availability_status', 'production_until'],
      agent: ['agent_name', 'agent_phone', 'agent_email'],
    }
    const d: any = {}
    ;(keys[section] || []).forEach(k => { d[k] = p[k] === null || p[k] === undefined ? '' : String(p[k]) })
    setDraft(d); setEditing(section)
  }

  const save = async (section: string) => {
    if (!profile) return
    if (section === 'casting' && draft.minimum_age && draft.maximum_age && Number(draft.minimum_age) > Number(draft.maximum_age)) {
      showToast('Playing age: min can’t exceed max'); return
    }
    setSaving(true)
    const numOrNull = (v: any) => (v === '' || v === undefined ? null : Number(v))
    const txtOrNull = (v: any) => (!v || String(v).trim() === '' ? null : String(v).trim())
    const update: any = {}
    if (section === 'details') { update.first_name = txtOrNull(draft.first_name); update.last_name = txtOrNull(draft.last_name); update.what_i_do = txtOrNull(draft.what_i_do); update.location = txtOrNull(draft.location) }
    if (section === 'about') { update.summary = txtOrNull(draft.summary); update.bio = txtOrNull(draft.bio) }
    if (section === 'casting') {
      update.gender_id = numOrNull(draft.gender_id); update.ethnicity_id = numOrNull(draft.ethnicity_id)
      update.hair_colour_id = numOrNull(draft.hair_colour_id); update.eye_colour_id = numOrNull(draft.eye_colour_id)
      update.minimum_age = numOrNull(draft.minimum_age); update.maximum_age = numOrNull(draft.maximum_age)
      update.height = txtOrNull(draft.height); update.date_of_birth = txtOrNull(draft.date_of_birth)
    }
    if (section === 'reels') { ['vid_1', 'vid_2', 'vid_3', 'vid_4'].forEach(k => update[k] = txtOrNull(draft[k])) }
    if (section === 'testimonials') { ['testimonial_1', 'testimonial_2', 'testimonial_3'].forEach(k => update[k] = txtOrNull(draft[k])) }
    if (section === 'availability') { update.availability_status = txtOrNull(draft.availability_status); update.production_until = txtOrNull(draft.production_until) }
    if (section === 'agent') { update.agent_name = txtOrNull(draft.agent_name); update.agent_phone = txtOrNull(draft.agent_phone); update.agent_email = txtOrNull(draft.agent_email) }
    update.updated_at = new Date().toISOString()
    const { error } = await supabase.from('profiles').update(update).eq('id', profile.id)
    setSaving(false)
    if (error) { showToast('Couldn’t save — try again'); return }
    setProfile({ ...profile, ...update }); setEditing(null); showToast('Saved')
  }

  const handleCropSave = async (blob: Blob) => {
    if (!profile) return
    setCropFile(null); setSaving(true)
    const path = profile.id + '/headshot-' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('headshots').upload(path, blob, { upsert: true, contentType: 'image/jpeg' })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
      await supabase.from('profiles').update({ picture_url: publicUrl }).eq('id', profile.id)
      setProfile({ ...profile, picture_url: publicUrl }); showToast('Photo updated')
    }
    setSaving(false)
  }

  if (loading || !profile) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const fullName = ((profile.first_name || '') + ' ' + (profile.last_name || '')).trim()
  const reels = ['vid_1', 'vid_2', 'vid_3', 'vid_4'].map(k => profile[k]).filter(Boolean)
  const testimonials = ['testimonial_1', 'testimonial_2', 'testimonial_3'].map(k => profile[k]).filter(Boolean)
  const castingChips = [
    profile.minimum_age && profile.maximum_age ? 'Playing age ' + profile.minimum_age + '–' + profile.maximum_age : null,
    nameOf(GENDERS, profile.gender_id), nameOf(ETHNICITIES, profile.ethnicity_id),
    nameOf(HAIR, profile.hair_colour_id) ? nameOf(HAIR, profile.hair_colour_id) + ' hair' : null,
    nameOf(EYES, profile.eye_colour_id) ? nameOf(EYES, profile.eye_colour_id) + ' eyes' : null,
    profile.height,
  ].filter(Boolean)

  const SaveBtn = ({ section }: { section: string }) => (
    <button onClick={() => save(section)} disabled={saving} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: '16px', opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save'}</button>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh' }}
      onTouchStart={e => { swipeStart.current = e.touches[0].clientX < 30 ? e.touches[0].clientX : null }}
      onTouchEnd={e => { if (swipeStart.current !== null && e.changedTouches[0].clientX - swipeStart.current > 80) router.back(); swipeStart.current = null }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(8px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }
        .edit-sheet { animation: slideUp 0.3s cubic-bezier(0.32,0.72,0,1); }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .fld:focus { border-color: #92d7af !important; }
      `}</style>

      {cropFile && <CropModal file={cropFile} onSave={handleCropSave} onClose={() => setCropFile(null)} />}
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Top bar */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
          Back
        </button>
        {profile.slug && <button onClick={() => window.open('/' + profile.slug + '?from=app', '_blank')} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '8px 18px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>View live</button>}
      </div>

      {/* HERO */}
      <div style={{ padding: '16px', textAlign: 'center' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '14px' }}>
          <label style={{ cursor: 'pointer' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: profile.picture_url ? 'url(' + profile.picture_url + ') center/cover' : '#e8efea', backgroundSize: 'cover', border: '3px solid #e0ddd5' }} />
            <div style={{ position: 'absolute', bottom: '2px', right: '2px', width: '28px', height: '28px', borderRadius: '50%', background: '#0c2520', border: '2px solid #f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
            </div>
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setCropFile(f); e.target.value = '' }} />
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{fullName || 'Your name'}</p>
          <Pencil onClick={() => openEdit('details')} />
        </div>
        {profile.what_i_do && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 4px', fontWeight: 500 }}>{profile.what_i_do}</p>}
        {profile.location && <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{profile.location}</p>}
      </div>

      <div style={{ padding: '0 16px 120px' }}>
        {/* CASTING DETAILS */}
        <div style={{ marginBottom: '24px' }}>
          <SectionHead title="Casting details" onEdit={() => openEdit('casting')} />
          {castingChips.length > 0 ? (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {castingChips.map((c, i) => <span key={i} style={{ background: '#e8efea', color: '#0c2520', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>{c}</span>)}
            </div>
          ) : <Empty text="Add your playing age, gender, appearance" onClick={() => openEdit('casting')} />}
        </div>

        {/* ABOUT */}
        <div style={{ marginBottom: '24px' }}>
          <SectionHead title="About" onEdit={() => openEdit('about')} />
          {profile.summary || profile.bio ? (
            <div>
              {profile.summary && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 8px', fontWeight: 500 }}>{profile.summary}</p>}
              {profile.bio && <p style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, margin: 0 }}>{profile.bio}</p>}
            </div>
          ) : <Empty text="Tell casting directors about yourself" onClick={() => openEdit('about')} />}
        </div>

        {/* SHOWREELS */}
        <div style={{ marginBottom: '24px' }}>
          <SectionHead title="Showreels" onEdit={() => openEdit('reels')} />
          {reels.length > 0 ? reels.map((url: string, i: number) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e8e4de', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92d7af" strokeWidth="2" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
              <p style={{ fontSize: '13px', color: '#888', margin: 0, wordBreak: 'break-all' }}>{url}</p>
            </div>
          )) : <Empty text="Add your showreels (YouTube or Vimeo links)" onClick={() => openEdit('reels')} />}
        </div>

        {/* TESTIMONIALS */}
        <div style={{ marginBottom: '24px' }}>
          <SectionHead title="Testimonials" onEdit={() => openEdit('testimonials')} />
          {testimonials.length > 0 ? testimonials.map((t: string, i: number) => (
            <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e8e4de', marginBottom: '8px' }}>
              <p style={{ fontSize: '14px', color: '#444', margin: 0, lineHeight: 1.5, fontStyle: 'italic' }}>“{t}”</p>
            </div>
          )) : <Empty text="Add quotes from directors or collaborators" onClick={() => openEdit('testimonials')} />}
        </div>

        {/* AVAILABILITY */}
        <div style={{ marginBottom: '24px' }}>
          <SectionHead title="Availability" onEdit={() => openEdit('availability')} />
          {profile.availability_status === 'available' ? (
            <span style={{ background: '#4ade80', color: '#061410', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Available for work</span>
          ) : profile.availability_status === 'in_production' ? (
            <span style={{ background: '#fde6c2', color: '#8a5a2e', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{'In production' + (profile.production_until ? ' until ' + new Date(profile.production_until).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : '')}</span>
          ) : <Empty text="Let casting know if you're available" onClick={() => openEdit('availability')} />}
        </div>

        {/* AGENT */}
        <div style={{ marginBottom: '24px' }}>
          <SectionHead title="Agent" onEdit={() => openEdit('agent')} />
          {profile.agent_name ? (
            <div style={{ background: 'white', borderRadius: '12px', padding: '14px', border: '1px solid #e8e4de' }}>
              <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 2px', fontWeight: 500 }}>{profile.agent_name}</p>
              {profile.agent_phone && <p style={{ fontSize: '12px', color: '#888', margin: '0 0 1px' }}>{profile.agent_phone}</p>}
              {profile.agent_email && <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{profile.agent_email}</p>}
            </div>
          ) : <Empty text="Add your agent details" onClick={() => openEdit('agent')} />}
        </div>
      </div>

      {/* ===== EDIT SHEETS ===== */}
      {editing === 'details' && (
        <Sheet title="Edit details" onClose={() => setEditing(null)}>
          <Field label="First name"><input className="fld" style={inputStyle} value={draft.first_name || ''} onChange={e => setD('first_name', e.target.value)} /></Field>
          <Field label="Last name"><input className="fld" style={inputStyle} value={draft.last_name || ''} onChange={e => setD('last_name', e.target.value)} /></Field>
          <Field label="What I do"><input className="fld" style={inputStyle} value={draft.what_i_do || ''} onChange={e => setD('what_i_do', e.target.value)} placeholder="Actor · Musical theatre · Dancer" /></Field>
          <Field label="Location"><input className="fld" style={inputStyle} value={draft.location || ''} onChange={e => setD('location', e.target.value)} placeholder="London, UK" /></Field>
          <SaveBtn section="details" />
        </Sheet>
      )}

      {editing === 'about' && (
        <Sheet title="Edit about" onClose={() => setEditing(null)}>
          <Field label="Summary"><input className="fld" style={inputStyle} value={draft.summary || ''} onChange={e => setD('summary', e.target.value)} placeholder="One line that sums you up" /></Field>
          <Field label="Bio"><textarea className="fld" style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', lineHeight: 1.5 }} value={draft.bio || ''} onChange={e => setD('bio', e.target.value)} placeholder="Your training, experience, and what you're looking for…" /></Field>
          <SaveBtn section="about" />
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
          <SaveBtn section="casting" />
        </Sheet>
      )}

      {editing === 'reels' && (
        <Sheet title="Edit showreels" onClose={() => setEditing(null)}>
          {['vid_1', 'vid_2', 'vid_3', 'vid_4'].map((k, i) => (
            <Field key={k} label={'Showreel ' + (i + 1)}><input className="fld" style={inputStyle} value={draft[k] || ''} onChange={e => setD(k, e.target.value)} placeholder="YouTube or Vimeo URL" /></Field>
          ))}
          <SaveBtn section="reels" />
        </Sheet>
      )}

      {editing === 'testimonials' && (
        <Sheet title="Edit testimonials" onClose={() => setEditing(null)}>
          {['testimonial_1', 'testimonial_2', 'testimonial_3'].map((k, i) => (
            <Field key={k} label={'Testimonial ' + (i + 1)}><textarea className="fld" style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', lineHeight: 1.5 }} value={draft[k] || ''} onChange={e => setD(k, e.target.value)} placeholder="A quote from a director or collaborator" /></Field>
          ))}
          <SaveBtn section="testimonials" />
        </Sheet>
      )}

      {editing === 'availability' && (
        <Sheet title="Availability" onClose={() => setEditing(null)}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button onClick={() => setD('availability_status', draft.availability_status === 'available' ? '' : 'available')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: draft.availability_status === 'available' ? '2px solid #4ade80' : '1px solid #e0ddd5', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, color: '#0c2520' }}>Available now</button>
            <button onClick={() => setD('availability_status', draft.availability_status === 'in_production' ? '' : 'in_production')} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: draft.availability_status === 'in_production' ? '2px solid #f59e0b' : '1px solid #e0ddd5', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 500, color: '#0c2520' }}>In production</button>
          </div>
          {draft.availability_status === 'in_production' && (
            <Field label="In production until"><input className="fld" type="date" style={inputStyle} value={draft.production_until || ''} onChange={e => setD('production_until', e.target.value)} /></Field>
          )}
          <SaveBtn section="availability" />
        </Sheet>
      )}

      {editing === 'agent' && (
        <Sheet title="Agent details" onClose={() => setEditing(null)}>
          <Field label="Agent name"><input className="fld" style={inputStyle} value={draft.agent_name || ''} onChange={e => setD('agent_name', e.target.value)} /></Field>
          <Field label="Phone"><input className="fld" type="tel" style={inputStyle} value={draft.agent_phone || ''} onChange={e => setD('agent_phone', e.target.value)} /></Field>
          <Field label="Email"><input className="fld" type="email" style={inputStyle} value={draft.agent_email || ''} onChange={e => setD('agent_email', e.target.value)} placeholder="agent@agency.com" /></Field>
          <SaveBtn section="agent" />
        </Sheet>
      )}
    </div>
  )
}
