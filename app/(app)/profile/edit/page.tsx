'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ---- Lookup options (stable, hardcoded — no extra query) ----
const GENDERS = [
  { id: 1, name: 'Unspecified' }, { id: 2, name: 'Non-Binary' }, { id: 3, name: 'Trans Female' },
  { id: 4, name: 'Trans Male' }, { id: 5, name: 'Gender Nonconforming' }, { id: 6, name: 'Male' }, { id: 7, name: 'Female' },
]
const ETHNICITIES = [
  { id: 1, name: 'White / European Descent' }, { id: 2, name: 'Southeast Asian / Pacific Islander' },
  { id: 3, name: 'South Asian / Indian' }, { id: 4, name: 'Middle Eastern' }, { id: 5, name: 'Latino / Hispanic' },
  { id: 6, name: 'Ethnically Ambiguous / Multiracial' }, { id: 7, name: 'Black / African Descent' }, { id: 8, name: 'Asian' },
]
const HAIR = [
  { id: 1, name: 'Red' }, { id: 2, name: 'White' }, { id: 3, name: 'Multicoloured / Dyed' }, { id: 4, name: 'Bald' },
  { id: 5, name: 'Strawberry Blonde' }, { id: 6, name: 'Grey' }, { id: 7, name: 'Blonde' }, { id: 8, name: 'Green' },
  { id: 9, name: 'Auburn' }, { id: 10, name: 'Chestnut' }, { id: 11, name: 'Black' }, { id: 12, name: 'Blue' }, { id: 13, name: 'Brown' },
]
const EYES = [
  { id: 1, name: 'Violet' }, { id: 2, name: 'Grey' }, { id: 3, name: 'Red' }, { id: 4, name: 'Hazel' }, { id: 5, name: 'Green' },
  { id: 6, name: 'Brown' }, { id: 7, name: 'Black' }, { id: 8, name: 'Blue' }, { id: 9, name: 'Amber' },
]
const AVAILABILITY = ['Available now', 'Available from a date', 'Currently working', 'Not available']

type Form = {
  first_name: string; last_name: string; location: string; what_i_do: string; height: string
  gender_id: string; ethnicity_id: string; hair_colour_id: string; eye_colour_id: string
  minimum_age: string; maximum_age: string; date_of_birth: string
  bio: string; summary: string; testimonial_1: string; testimonial_2: string; testimonial_3: string
  availability_status: string; available_from: string; production_until: string
  agent_name: string; agent_phone: string; agent_email: string
}
const EMPTY: Form = {
  first_name: '', last_name: '', location: '', what_i_do: '', height: '',
  gender_id: '', ethnicity_id: '', hair_colour_id: '', eye_colour_id: '',
  minimum_age: '', maximum_age: '', date_of_birth: '',
  bio: '', summary: '', testimonial_1: '', testimonial_2: '', testimonial_3: '',
  availability_status: '', available_from: '', production_until: '',
  agent_name: '', agent_phone: '', agent_email: '',
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px',
  border: '1px solid #ebe8e1', background: 'white', fontFamily: 'inherit', fontSize: '14px', color: '#0c2520', outline: 'none',
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{ display: 'block', fontSize: '13px', color: '#888', fontWeight: 500, marginBottom: '6px' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: '11px', color: '#aaa', margin: '5px 2px 0' }}>{hint}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '28px' }}>
      <p style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 14px' }}>{title}</p>
      <div style={{ background: 'white', border: '1px solid #ebe8e1', borderRadius: '16px', padding: '16px 16px 2px' }}>{children}</div>
    </div>
  )
}

export default function EditProfile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const userId = useRef<string | null>(null)
  const swipeStart = useRef<number | null>(null)

  const set = (k: keyof Form, v: string) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      userId.current = user.id
      const { data } = await supabase.from('profiles')
        .select('first_name,last_name,location,what_i_do,height,gender_id,ethnicity_id,hair_colour_id,eye_colour_id,minimum_age,maximum_age,date_of_birth,bio,summary,testimonial_1,testimonial_2,testimonial_3,availability_status,available_from,production_until,agent_name,agent_phone,agent_email')
        .eq('id', user.id).single()
      if (data) {
        const next: any = { ...EMPTY }
        Object.keys(EMPTY).forEach(k => { next[k] = data[k] === null || data[k] === undefined ? '' : String(data[k]) })
        setForm(next)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!userId.current) return
    const minA = form.minimum_age === '' ? null : parseInt(form.minimum_age, 10)
    const maxA = form.maximum_age === '' ? null : parseInt(form.maximum_age, 10)
    if (minA !== null && maxA !== null && minA > maxA) {
      setToast('Playing age: min can’t be higher than max'); setTimeout(() => setToast(null), 3000); return
    }
    setSaving(true)
    const numOrNull = (v: string) => (v === '' ? null : Number(v))
    const txtOrNull = (v: string) => (v.trim() === '' ? null : v.trim())
    const update = {
      first_name: txtOrNull(form.first_name), last_name: txtOrNull(form.last_name),
      location: txtOrNull(form.location), what_i_do: txtOrNull(form.what_i_do), height: txtOrNull(form.height),
      gender_id: numOrNull(form.gender_id), ethnicity_id: numOrNull(form.ethnicity_id),
      hair_colour_id: numOrNull(form.hair_colour_id), eye_colour_id: numOrNull(form.eye_colour_id),
      minimum_age: minA, maximum_age: maxA, date_of_birth: txtOrNull(form.date_of_birth),
      bio: txtOrNull(form.bio), summary: txtOrNull(form.summary),
      testimonial_1: txtOrNull(form.testimonial_1), testimonial_2: txtOrNull(form.testimonial_2), testimonial_3: txtOrNull(form.testimonial_3),
      availability_status: txtOrNull(form.availability_status),
      available_from: txtOrNull(form.available_from), production_until: txtOrNull(form.production_until),
      agent_name: txtOrNull(form.agent_name), agent_phone: txtOrNull(form.agent_phone), agent_email: txtOrNull(form.agent_email),
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('profiles').update(update).eq('id', userId.current)
    setSaving(false)
    if (error) { setToast('Couldn’t save — try again'); setTimeout(() => setToast(null), 3000); return }
    setToast('Changes saved'); setTimeout(() => { setToast(null); router.push('/profile') }, 900)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div
      style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}
      onTouchStart={e => { swipeStart.current = e.touches[0].clientX < 30 ? e.touches[0].clientX : null }}
      onTouchEnd={e => { if (swipeStart.current !== null && e.changedTouches[0].clientX - swipeStart.current > 80) router.back(); swipeStart.current = null }}
    >
      <style>{`
        .fld:focus { border-color: #92d7af !important; }
        .tap { -webkit-tap-highlight-color: transparent; transition: transform 0.12s ease; cursor: pointer; }
        .tap:active { transform: scale(0.98); }
        @keyframes toastIn { from {opacity:0; transform:translateX(-50%) translateY(8px);} to {opacity:1; transform:translateX(-50%) translateY(0);} }
        .toast-anim { animation: toastIn 0.25s ease-out; }
      `}</style>

      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 300, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div style={{ padding: '24px 16px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => router.back()} className="tap" style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'white', border: '1px solid #e6e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div>
          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 2px' }}>Your Ident</p>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500 }}>Edit profile</p>
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* BASICS */}
        <Section title="Basics">
          <Field label="First name"><input className="fld" style={inputStyle} value={form.first_name} onChange={e => set('first_name', e.target.value)} /></Field>
          <Field label="Last name"><input className="fld" style={inputStyle} value={form.last_name} onChange={e => set('last_name', e.target.value)} /></Field>
          <Field label="What I do" hint="e.g. Actor · Musical theatre · Dancer"><input className="fld" style={inputStyle} value={form.what_i_do} onChange={e => set('what_i_do', e.target.value)} placeholder="Actor" /></Field>
          <Field label="Location" hint="City or region casting can search by"><input className="fld" style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="London, UK" /></Field>
          <Field label="Height" hint={"However you list it, e.g. 5'10\" / 178cm"}><input className="fld" style={inputStyle} value={form.height} onChange={e => set('height', e.target.value)} placeholder="5 ft 10 / 178cm" /></Field>
        </Section>

        {/* CASTING DETAILS */}
        <Section title="Casting details">
          <Field label="Gender">
            <select className="fld" style={inputStyle} value={form.gender_id} onChange={e => set('gender_id', e.target.value)}>
              <option value="">Select…</option>
              {GENDERS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </Field>
          <Field label="Ethnicity">
            <select className="fld" style={inputStyle} value={form.ethnicity_id} onChange={e => set('ethnicity_id', e.target.value)}>
              <option value="">Select…</option>
              {ETHNICITIES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Hair colour">
            <select className="fld" style={inputStyle} value={form.hair_colour_id} onChange={e => set('hair_colour_id', e.target.value)}>
              <option value="">Select…</option>
              {HAIR.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Eye colour">
            <select className="fld" style={inputStyle} value={form.eye_colour_id} onChange={e => set('eye_colour_id', e.target.value)}>
              <option value="">Select…</option>
              {EYES.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </Field>
          <Field label="Playing age" hint="The age range you can convincingly play — what casting filters on">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input className="fld" style={inputStyle} type="number" inputMode="numeric" min={0} max={120} value={form.minimum_age} onChange={e => set('minimum_age', e.target.value)} placeholder="Min" />
              <span style={{ color: '#aaa', fontSize: '13px' }}>to</span>
              <input className="fld" style={inputStyle} type="number" inputMode="numeric" min={0} max={120} value={form.maximum_age} onChange={e => set('maximum_age', e.target.value)} placeholder="Max" />
            </div>
          </Field>
          <Field label="Date of birth" hint="Private — used for admin, never shown publicly">
            <input className="fld" style={inputStyle} type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
          </Field>
        </Section>

        {/* ABOUT */}
        <Section title="About">
          <Field label="Summary" hint="One line that sums you up">
            <input className="fld" style={inputStyle} value={form.summary} onChange={e => set('summary', e.target.value)} placeholder="RADA-trained actor with a knack for comedy" />
          </Field>
          <Field label="Bio">
            <textarea className="fld" style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', lineHeight: 1.5 }} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell casting who you are, your training, and what you're looking for…" />
          </Field>
          <Field label="Testimonial 1"><textarea className="fld" style={{ ...inputStyle, minHeight: '64px', resize: 'vertical', lineHeight: 1.5 }} value={form.testimonial_1} onChange={e => set('testimonial_1', e.target.value)} placeholder="A quote from a director or collaborator" /></Field>
          <Field label="Testimonial 2"><textarea className="fld" style={{ ...inputStyle, minHeight: '64px', resize: 'vertical', lineHeight: 1.5 }} value={form.testimonial_2} onChange={e => set('testimonial_2', e.target.value)} /></Field>
          <Field label="Testimonial 3"><textarea className="fld" style={{ ...inputStyle, minHeight: '64px', resize: 'vertical', lineHeight: 1.5 }} value={form.testimonial_3} onChange={e => set('testimonial_3', e.target.value)} /></Field>
        </Section>

        {/* AVAILABILITY */}
        <Section title="Availability">
          <Field label="Status">
            <select className="fld" style={inputStyle} value={form.availability_status} onChange={e => set('availability_status', e.target.value)}>
              <option value="">Select…</option>
              {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Available from"><input className="fld" style={inputStyle} type="date" value={form.available_from} onChange={e => set('available_from', e.target.value)} /></Field>
          <Field label="In production until"><input className="fld" style={inputStyle} type="date" value={form.production_until} onChange={e => set('production_until', e.target.value)} /></Field>
        </Section>

        {/* AGENT */}
        <Section title="Agent">
          <Field label="Agent name"><input className="fld" style={inputStyle} value={form.agent_name} onChange={e => set('agent_name', e.target.value)} /></Field>
          <Field label="Agent phone"><input className="fld" style={inputStyle} type="tel" value={form.agent_phone} onChange={e => set('agent_phone', e.target.value)} /></Field>
          <Field label="Agent email"><input className="fld" style={inputStyle} type="email" value={form.agent_email} onChange={e => set('agent_email', e.target.value)} placeholder="agent@agency.com" /></Field>
        </Section>

        <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center', margin: '0 0 8px' }}>Your photo, showreels and gallery are managed from your Greenroom and Customise pages.</p>
      </div>

      {/* Sticky Save */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '12px 16px calc(env(safe-area-inset-bottom) + 12px)', background: 'linear-gradient(to top, #f1f0ee 70%, rgba(241,240,238,0))', maxWidth: '430px', margin: '0 auto' }}>
        <button onClick={handleSave} disabled={saving} className="tap" style={{ width: '100%', padding: '15px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
