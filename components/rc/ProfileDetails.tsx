'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Card, Chip, Field, TextArea, Toggle, toast } from './ui'
import { supabase } from '@/lib/supabase'
import type { Access, FullProfile } from '@/lib/rc/profile'

// Customise profile → "About you", "Disability & access": the Spotlight/Mandy-level details, written to be
// inclusive — everything optional, pick as many as apply, or describe it in your own words.
// Saves itself a moment after each change (separate from the main editor's autosave).

const APPEARANCE = ['Black / African descent', 'East Asian', 'South Asian', 'Southeast Asian', 'Middle Eastern / North African', 'Latino / Hispanic', 'White / European descent', 'Indigenous', 'Pacific Islander', 'Mixed heritage', 'Ethnically ambiguous']
const PLAYS = ['Female', 'Male', 'Non-binary', 'Any gender']
const RIGHT_TO_WORK = ['UK', 'Ireland', 'EU', 'USA', 'Canada', 'Australia', 'New Zealand']
const HAIR_LENGTH = ['Shaved / bald', 'Short', 'Mid length', 'Long', 'Very long']
const HAIR_TYPE = ['Straight', 'Wavy', 'Curly', 'Coily', 'Locs', 'Braids']
const BIRTH = ['Twin', 'Identical twin', 'Triplet']
const DISABILITY = ['D/deaf or hard of hearing', 'Blind or partially sighted', 'Physical disability', 'Wheelchair user', 'Neurodivergent', 'Learning disability', 'Long-term health condition', 'Mental health condition']

type Details = Pick<FullProfile, 'extra_locations' | 'nationalities' | 'right_to_work' | 'appearance' | 'playing_genders' | 'multiple_birth' | 'hair_length' | 'hair_type'>

export default function ProfileDetails({ uid, profile, access }: { uid: string; profile: FullProfile; access: Access | null }) {
  const [d, setD] = useState<Details>({
    extra_locations: profile.extra_locations ?? [], nationalities: profile.nationalities ?? [], right_to_work: profile.right_to_work ?? [],
    appearance: profile.appearance ?? [], playing_genders: profile.playing_genders ?? [], multiple_birth: profile.multiple_birth ?? null,
    hair_length: profile.hair_length ?? null, hair_type: profile.hair_type ?? null,
  })
  const [a, setA] = useState<Access>(access ?? { disabilities: [], access_notes: '', visible: false })

  // Debounced saves
  const firstD = useRef(true), firstA = useRef(true)
  useEffect(() => {
    if (firstD.current) { firstD.current = false; return }
    const t = setTimeout(async () => {
      const clean = (x: string[] | null | undefined) => (x && x.length ? x : null)
      const { error } = await supabase.from('profiles').update({
        extra_locations: clean(d.extra_locations), nationalities: clean(d.nationalities), right_to_work: clean(d.right_to_work),
        appearance: clean(d.appearance), playing_genders: clean(d.playing_genders), multiple_birth: d.multiple_birth, hair_length: d.hair_length, hair_type: d.hair_type,
      }).eq('id', uid)
      if (error) toast('Couldn’t save — check your connection')
    }, 600)
    return () => clearTimeout(t)
  }, [d, uid])
  useEffect(() => {
    if (firstA.current) { firstA.current = false; return }
    const t = setTimeout(async () => {
      const { error } = await supabase.from('profile_access').upsert({
        profile_id: uid, disabilities: a.disabilities?.length ? a.disabilities : null, access_notes: a.access_notes?.trim() || null, visible: a.visible, updated_at: new Date().toISOString(),
      })
      if (error) toast('Couldn’t save — check your connection')
    }, 600)
    return () => clearTimeout(t)
  }, [a, uid])

  const set = <K extends keyof Details>(k: K, v: Details[K]) => setD(p => ({ ...p, [k]: v }))
  const toggleIn = (list: string[] | null | undefined, v: string) => { const l = list ?? []; return l.includes(v) ? l.filter(x => x !== v) : [...l, v] }

  return (
    <>
      <section id="about-you" className="scroll-mt-4">
        <h2 className="text-[18px]">About you</h2>
        <p className="mb-4 mt-1 text-[13px] text-muted">All optional. Pick as many as apply, or add your own words — casting can search by these.</p>
        <div className="space-y-5">
          <Tags label="Also based in" hint="Places you can work as a local" max={5} values={d.extra_locations ?? []} onChange={v => set('extra_locations', v)} placeholder="e.g. Manchester" />
          <Tags label="Nationality" values={d.nationalities ?? []} onChange={v => set('nationalities', v)} placeholder="e.g. British" />
          <Picks label="Right to work in" options={RIGHT_TO_WORK} values={d.right_to_work ?? []} onToggle={v => set('right_to_work', toggleIn(d.right_to_work, v))} custom={v => set('right_to_work', [...(d.right_to_work ?? []), v])} />
          <Picks label="Appearance" hint="How you describe yourself — pick any that apply, or write your own" options={APPEARANCE} values={d.appearance ?? []} onToggle={v => set('appearance', toggleIn(d.appearance, v))} custom={v => set('appearance', [...(d.appearance ?? []), v])} />
          <Picks label="Genders you can play" options={PLAYS} values={d.playing_genders ?? []} onToggle={v => set('playing_genders', toggleIn(d.playing_genders, v))} />
          <One label="Hair length" options={HAIR_LENGTH} value={d.hair_length} onChange={v => set('hair_length', v)} />
          <One label="Hair type" options={HAIR_TYPE} value={d.hair_type} onChange={v => set('hair_type', v)} />
          <One label="Twin or triplet" options={BIRTH} value={d.multiple_birth} onChange={v => set('multiple_birth', v)} />
        </div>
      </section>

      <section id="access" className="scroll-mt-4">
        <h2 className="text-[18px]">Disability & access</h2>
        <p className="mb-4 mt-1 text-[13px] text-muted">Only if you’d like to. Some castings specifically look for disabled performers, and access needs help productions get things right.</p>
        <div className="space-y-4">
          <Picks label="Disability or condition" options={DISABILITY} values={a.disabilities ?? []} onToggle={v => setA(p => ({ ...p, disabilities: toggleIn(p.disabilities, v) }))} custom={v => setA(p => ({ ...p, disabilities: [...(p.disabilities ?? []), v] }))} />
          <TextArea label="Access needs (optional)" value={a.access_notes || ''} onChange={e => setA(p => ({ ...p, access_notes: e.target.value.slice(0, 600) }))} placeholder="e.g. BSL interpreter for auditions, step-free access, scripts in advance" />
          <Card className="flex items-center gap-3 px-4 py-3.5">
            <Icon name={a.visible ? 'eye' : 'lock'} className="size-5 shrink-0 text-muted" />
            <div className="flex-1">
              <p className="text-[15px] font-medium">Show on my profile</p>
              <p className="text-[13px] text-muted">{a.visible ? 'Casting and anyone viewing your profile can see this.' : 'Private — only you can see this. Turn on to share it with casting.'}</p>
            </div>
            <Toggle checked={a.visible} onChange={v => setA(p => ({ ...p, visible: v }))} label="Show disability and access details on my profile" />
          </Card>
        </div>
      </section>
    </>
  )
}

function Label({ label, hint }: { label: string; hint?: string }) {
  return <p className="mb-2 text-[13px] font-medium">{label}{hint && <span className="font-normal text-faint"> · {hint}</span>}</p>
}

// Multi-select chips, plus "+ Add your own"
function Picks({ label, hint, options, values, onToggle, custom }: { label: string; hint?: string; options: string[]; values: string[]; onToggle: (v: string) => void; custom?: (v: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const all = [...options, ...values.filter(v => !options.includes(v))]
  const add = () => { const v = text.trim().slice(0, 60); if (v && !values.includes(v)) custom?.(v); setText(''); setAdding(false) }
  return (
    <div>
      <Label label={label} hint={hint} />
      <div className="flex flex-wrap gap-2">
        {all.map(o => <Chip key={o} selected={values.includes(o)} onClick={() => onToggle(o)}>{o}{values.includes(o) && ' ✓'}</Chip>)}
        {custom && !adding && <Chip onClick={() => setAdding(true)}>+ Add your own</Chip>}
      </div>
      {adding && (
        <div className="mt-2 flex gap-2">
          <Field className="flex-1" value={text} autoFocus maxLength={60} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }} placeholder="Type and press Enter" />
          <button type="button" onClick={add} className="h-12 rounded-full bg-forest px-5 text-[14px] font-semibold text-bg">Add</button>
        </div>
      )}
    </div>
  )
}

// Single choice; tap again to clear
function One({ label, options, value, onChange }: { label: string; options: string[]; value: string | null | undefined; onChange: (v: string | null) => void }) {
  return (
    <div>
      <Label label={label} />
      <div className="flex flex-wrap gap-2">{options.map(o => <Chip key={o} selected={value === o} onClick={() => onChange(value === o ? null : o)}>{o}{value === o && ' ✓'}</Chip>)}</div>
    </div>
  )
}

// Free-text tags (places, nationalities)
function Tags({ label, hint, values, onChange, placeholder, max = 6 }: { label: string; hint?: string; values: string[]; onChange: (v: string[]) => void; placeholder: string; max?: number }) {
  const [text, setText] = useState('')
  const add = () => { const v = text.trim().slice(0, 60); if (v && !values.some(x => x.toLowerCase() === v.toLowerCase()) && values.length < max) onChange([...values, v]); setText('') }
  return (
    <div>
      <Label label={label} hint={hint} />
      {values.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {values.map(v => (
            <span key={v} className="inline-flex items-center gap-1.5 rounded-full bg-dark py-1.5 pl-3.5 pr-2 text-[14px] text-white">{v}
              <button type="button" aria-label={'Remove ' + v} onClick={() => onChange(values.filter(x => x !== v))} className="rounded-full p-0.5 hover:bg-white/15"><Icon name="x" className="size-3.5" /></button>
            </span>
          ))}
        </div>
      )}
      {values.length < max && (
        <Field value={text} maxLength={60} onChange={e => setText(e.target.value)} onBlur={add} onKeyDown={e => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }} placeholder={placeholder + ' — press Enter to add'} />
      )}
    </div>
  )
}
