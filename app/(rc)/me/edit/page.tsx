'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { Avatar, Button, Card, Chip, Field, PageLoading, Sheet, TextArea, Toggle, cx, toast, useGoBack } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { heroRound } from '@/components/rc/ProfileView'
import { useMe } from '@/lib/rc/me'
import CompletenessCard from '@/components/rc/Completeness'
import CvImport from '@/components/rc/CvImport'
import { BrandsEditor, GalleryEditor, TestimonialsEditor } from '@/components/rc/ProfileExtras'
import { completeness } from '@/lib/rc/completeness'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { loadFullProfile, type Credit, type FullProfile, type Reel } from '@/lib/rc/profile'
import { compressImage, fileExt } from '@/lib/rc/media'
import VideoEditor, { type SavedVideo } from '@/components/rc/VideoEditor'
import ProfileDetails from '@/components/rc/ProfileDetails'
import Verification from '@/components/rc/Verification'
import CvDetails from '@/components/rc/CvDetails'
import { moveItem, saveOrder } from '@/components/rc/ProfileExtras'

// ids from the genders table (same labels as sign-up)
const GENDER_OPTIONS = [{ id: 7, name: 'Female' }, { id: 6, name: 'Male' }, { id: 2, name: 'Non-binary' }, { id: 3, name: 'Trans woman' }, { id: 4, name: 'Trans man' }, { id: 5, name: 'Gender non-conforming' }, { id: 1, name: 'Prefer not to say' }]
const stamp = () => Date.now().toString(36)
type Draft = Pick<FullProfile, 'first_name' | 'last_name' | 'what_i_do' | 'location' | 'bio' | 'height' | 'agent_name' | 'agent_email' | 'agent_phone' | 'company_name' | 'graduate_school'> & {
  minAge: string; maxAge: string; hair: number | null; eyes: number | null; isPublic: boolean; openToWork: boolean; isGraduate: boolean; gradYear: string; showContact: boolean; website: string; specialisms: string[]; pronouns: string; gender: number | null; vocal: string; agency: string; agentAddress: string
}

export default function EditProfilePage() {
  const { id, role, refresh } = useMe()
  const { data, loading, mutate } = useAsync(async () => {
    const [full, { data: allSkills }, { data: types }] = await Promise.all([
      loadFullProfile(id),
      supabase.from('skills').select('id, name').order('name'),
      supabase.from('production_types').select('id, name').order('name'),
    ])
    return { ...full, allSkills: allSkills || [], types: types || [] }
  }, [id])

  if (loading || !data?.profile) return <PageLoading />
  return <Editor key={data.profile.id} data={data} uid={id} caster={role === 'caster'} onRefresh={refresh} mutate={mutate} />
}

type Data = Awaited<ReturnType<typeof loadFullProfile>> & { allSkills: { id: number; name: string }[]; types: { id: number; name: string }[] }

function Editor({ data, uid, caster, onRefresh, mutate }: { data: Data; uid: string; caster: boolean; onRefresh: () => Promise<void>; mutate: (u: (d: Data | undefined) => Data | undefined) => void }) {
  // Done returns to where you came from (usually your profile) instead of opening it again — no back/forward loop
  const goBack = useGoBack('/me')
  const p = data.profile!
  const [d, setD] = useState<Draft>({
    first_name: p.first_name, last_name: p.last_name, what_i_do: p.what_i_do, location: p.location, bio: p.bio || p.summary, height: p.height,
    agent_name: p.agent_name, agent_email: p.agent_email, agent_phone: p.agent_phone, company_name: p.company_name, graduate_school: p.graduate_school,
    minAge: p.minimum_age ? String(p.minimum_age) : '', maxAge: p.maximum_age ? String(p.maximum_age) : '', hair: p.hair_colour_id, eyes: p.eye_colour_id,
    isPublic: p.show_talent !== false, openToWork: p.availability_status === 'available', isGraduate: p.is_graduate, gradYear: p.graduate_year ? String(p.graduate_year) : '', showContact: p.show_agent_contact,
    website: p.website || '', specialisms: p.specialisms || [], pronouns: p.pronouns || '', gender: p.gender_id ?? null, vocal: p.vocal_range || '', agency: p.agency_name || '', agentAddress: p.agent_address || '',
  })
  const [skillIds, setSkillIds] = useState<number[]>(data.skills.map(s => s.id))
  const [skillQuery, setSkillQuery] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [reelSheet, setReelSheet] = useState(false)
  const [reelMenu, setReelMenu] = useState<Reel | null>(null)
  const [coverFor, setCoverFor] = useState<Reel | null>(null)
  const [credit, setCredit] = useState<Partial<Credit> | null>(null)
  const [busyImage, setBusyImage] = useState<'avatar' | 'banner' | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState([p.first_name, p.last_name].filter(Boolean).join(' '))
  const hero = p.banner_url || p.picture_url
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }))
  const skillName = useMemo(() => new Map(data.allSkills.map(s => [s.id, s.name])), [data.allSkills])
  const skillResults = skillQuery.trim() ? data.allSkills.filter(s => s.name.toLowerCase().includes(skillQuery.toLowerCase()) && !skillIds.includes(s.id)).slice(0, 8) : []

  const uploadImage = async (kind: 'avatar' | 'banner', e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.files?.[0]
    e.target.value = ''
    if (!raw) return
    setBusyImage(kind)
    const f = await compressImage(raw, { maxDim: kind === 'banner' ? 2400 : 1600 })
    const path = uid + '/' + kind + '-' + stamp() + '.' + fileExt(f)
    const { error } = await supabase.storage.from('headshots').upload(path, f, { contentType: f.type })
    if (error) { setBusyImage(null); toast('Upload failed'); return }
    const url = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update(kind === 'avatar' ? { picture_url: url } : { banner_url: url }).eq('id', uid)
    mutate(x => x && { ...x, profile: { ...x.profile!, ...(kind === 'avatar' ? { picture_url: url } : { banner_url: url }) } })
    setBusyImage(null)
    onRefresh()
  }

  // ---- Autosave: every change is written a moment after you stop typing (optimistic, debounced) ----
  const row = useMemo(() => {
    const year = parseInt(d.gradYear, 10)
    const [first, ...rest] = name.trim().split(/\s+/) // one Name field: first word = first name
    return {
      ...(first ? { first_name: first, last_name: rest.join(' ') || null } : {}), // never blank out a name mid-edit
      what_i_do: d.what_i_do?.trim() || null, location: d.location?.trim() || null,
      bio: d.bio?.trim() || null, height: d.height?.trim() || null, minimum_age: parseInt(d.minAge, 10) || null, maximum_age: parseInt(d.maxAge, 10) || null,
      hair_colour_id: d.hair, eye_colour_id: d.eyes, show_talent: d.isPublic, availability_status: d.openToWork ? 'available' : null,
      is_graduate: d.isGraduate, graduate_school: d.isGraduate ? d.graduate_school?.trim() || null : null, graduate_year: d.isGraduate && year ? year : null,
      agent_name: d.agent_name?.trim() || null, agent_email: d.agent_email?.trim() || null, agent_phone: d.agent_phone?.trim() || null,
      show_agent_contact: d.showContact, company_name: d.company_name?.trim() || null,
      ...(caster ? {} : { pronouns: d.pronouns.trim().slice(0, 40) || null, gender_id: d.gender, vocal_range: d.vocal.trim().slice(0, 60) || null, agency_name: d.agency.trim().slice(0, 120) || null, agent_address: d.agentAddress.trim().slice(0, 300) || null }),
      ...(caster ? {
        // only save a website that looks like one; add https:// if they typed a bare domain
        website: d.website.trim() ? (/^https?:\/\//i.test(d.website.trim()) ? d.website.trim() : 'https://' + d.website.trim()) : null,
        specialisms: d.specialisms.length ? d.specialisms : null,
      } : {}),
    }
  }, [d, name, caster])
  const live = completeness({
    role: caster ? 'caster' : 'performer', picture_url: p.picture_url, first_name: name.trim() || null, what_i_do: d.what_i_do, location: d.location,
    bio: d.bio, summary: null, minimum_age: parseInt(d.minAge, 10) || null, maximum_age: parseInt(d.maxAge, 10) || null, height: d.height,
    hair_colour_id: d.hair, eye_colour_id: d.eyes, company_name: d.company_name, skills: skillIds.length, reels: data.reels.length, credits: data.credits.length,
  })
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const lastSaved = useRef(JSON.stringify(row))
  const latest = useRef(row)
  useEffect(() => { latest.current = row }, [row])
  const inFlight = useRef<Promise<boolean> | null>(null)

  const flush = useCallback(async (): Promise<boolean> => {
    if (inFlight.current) await inFlight.current
    const json = JSON.stringify(latest.current)
    if (json === lastSaved.current) return true
    setStatus('saving')
    inFlight.current = (async () => {
      const { error } = await supabase.from('profiles').update(latest.current).eq('id', uid)
      if (error) { setStatus('error'); return false }
      lastSaved.current = json
      setStatus(JSON.stringify(latest.current) === json ? 'saved' : 'saving')
      return true
    })()
    const ok = await inFlight.current
    inFlight.current = null
    return ok
  }, [uid])

  useEffect(() => {
    if (JSON.stringify(row) === lastSaved.current) return
    const t = setTimeout(() => { flush() }, 800)
    return () => clearTimeout(t)
  }, [row, flush])

  // Completeness nudges link to /me/edit#section — scroll there once the editor has rendered
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id) return
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    return () => clearTimeout(t)
  }, [])

  // Leaving the screen saves anything still pending
  useEffect(() => () => {
    if (JSON.stringify(latest.current) !== lastSaved.current) supabase.from('profiles').update(latest.current).eq('id', uid).then(() => {}, () => {})
  }, [uid])

  const done = async () => {
    if (!(await flush())) { toast('Couldn’t save — check your connection'); return }
    await onRefresh() // update the name/photo shown around the app once, not on every keystroke
    goBack()
  }

  // Skills save immediately (add / remove), reverting if the write fails
  const addSkill = async (sid: number) => {
    setSkillIds(l => [...l, sid])
    const sk = data.allSkills.find(x => x.id === sid)
    if (sk && !data.skills.some(x => x.id === sid)) mutate(x => x && { ...x, skills: [...x.skills, { id: sid, name: sk.name, level: null, category: null }] })
    const { error } = await supabase.from('profile_skills').insert({ profile_id: uid, skill_id: sid })
    if (error) { setSkillIds(l => l.filter(x => x !== sid)); toast('Couldn’t add that skill') }
  }
  const removeSkill = async (sid: number) => {
    setSkillIds(l => l.filter(x => x !== sid))
    const { error } = await supabase.from('profile_skills').delete().eq('profile_id', uid).eq('skill_id', sid)
    if (error) { setSkillIds(l => [...l, sid]); toast('Couldn’t remove that skill') }
  }

  const removeReel = async (r: Reel) => {
    if (!confirm('Remove “' + (r.label || 'this clip') + '”?')) return
    setReelMenu(null)
    await supabase.from('reels').delete().eq('id', r.id)
    mutate(x => x && { ...x, reels: x.reels.filter(y => y.id !== r.id) })
  }
  const moveReel = async (r: Reel, to: number) => {
    setReelMenu(null)
    const next = moveItem(data?.reels || [], r.id, to)
    mutate(x => x && { ...x, reels: next })
    if (!(await saveOrder('reels', next))) toast('Couldn’t save the new order')
  }
  const saveCover = async (r: Reel, v: SavedVideo) => {
    setCoverFor(null)
    const { error } = await supabase.from('reels').update({ poster_url: v.poster_url, duration_s: v.duration_s }).eq('id', r.id)
    if (error) { toast('Couldn’t save the cover'); return }
    mutate(x => x && { ...x, reels: x.reels.map(y => y.id === r.id ? { ...y, poster_url: v.poster_url } : y) })
  }

  const removeCredit = async (c: Partial<Credit>) => {
    if (!c.id || !confirm('Delete this credit?')) return
    await supabase.from('credits').delete().eq('id', c.id)
    mutate(x => x && { ...x, credits: x.credits.filter(y => y.id !== c.id) })
    setCredit(null)
  }

  const label = 'mb-1.5 text-[13px] font-medium text-muted'

  return (
    <>
      {/* Immersive hero, same as the public profile: cover (or headshot) bleeds to the top, controls float over it */}
      <section id="photo" className="relative h-[44dvh] min-h-[330px] max-h-[460px] overflow-hidden bg-dark text-white lg:rounded-b-[28px]">
        {hero
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={hero} alt="" className="absolute inset-0 size-full object-cover" />
          : <div className="absolute inset-0 bg-hero" />}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-dark/50 to-transparent" />
        <div className="absolute inset-0 bg-scrim" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
          <button type="button" aria-label="Back to my profile" onClick={done} className={heroRound}><Icon name="chevron-left" className="size-5" /></button>
          <button type="button" onClick={done} disabled={status === 'saving'} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-cta px-4 text-[15px] font-semibold text-ink shadow-cta transition active:scale-95 disabled:opacity-70">
            <Icon name="check" className="size-4" strokeWidth={2.2} />Done
          </button>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-5">
          <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-white/80">
            Customise profile
            <span aria-live="polite" className={cx('normal-case tracking-normal', status === 'error' ? 'text-blossom' : 'text-white/70')}>
              · {status === 'saving' ? 'Saving…' : status === 'error' ? <button type="button" onClick={() => flush()} className="underline">Not saved — retry</button> : 'All changes saved'}
            </span>
          </p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => avatarRef.current?.click()} aria-label="Replace headshot" className="relative shrink-0 rounded-full ring-2 ring-white">
              <Avatar src={p.picture_url} name={fullName(p)} size={60} />
              <span className="absolute -bottom-0.5 -right-0.5 flex size-6 items-center justify-center rounded-full bg-cta text-ink ring-2 ring-dark">
                <Icon name={busyImage === 'avatar' ? 'clock' : 'camera'} className="size-3.5" />
              </span>
            </button>
            <button type="button" onClick={() => avatarRef.current?.click()} className="min-w-0 flex-1 text-left">
              <span className="block text-[16px] font-medium">{caster ? 'Your logo' : 'Your headshot'}</span>
              <span className="block text-[13px] leading-snug text-white/75">{caster ? 'Your company logo or a photo of you' : 'Tap to replace your main casting photo'}</span>
            </button>
            <button type="button" onClick={() => bannerRef.current?.click()} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 text-[13px] font-medium backdrop-blur-md">
              <Icon name={busyImage === 'banner' ? 'clock' : 'image'} className="size-4" /> Cover
            </button>
          </div>
        </div>
        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => uploadImage('banner', e)} />
        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => uploadImage('avatar', e)} />
      </section>

      <div className="space-y-5 px-4 pb-12 pt-5">
        {!caster && <CvImport uid={uid} types={data.types} allSkills={data.allSkills} mySkillIds={skillIds}
          existingCredits={data.credits.map(c => ({ title: c.title, role: c.role }))}
          current={{ first_name: p.first_name, last_name: p.last_name, what_i_do: p.what_i_do, location: p.location, bio: p.bio || p.summary, height: p.height,
            minimum_age: p.minimum_age, maximum_age: p.maximum_age, agent_name: p.agent_name, agent_email: p.agent_email, agent_phone: p.agent_phone,
            website: p.website ?? null, graduate_school: p.graduate_school ?? null, vocal_range: p.vocal_range ?? null,
            agency_name: p.agency_name ?? null, weight: p.weight ?? null, headshot_credit: p.headshot_credit ?? null, agent_address: p.agent_address ?? null }} />}
        {live && <CompletenessCard result={live} compact />}
        <div id="basics" className="scroll-mt-4 space-y-5">
        <Field label="Name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" />
        {caster
          ? <>
              <Field label="Company" value={d.company_name || ''} onChange={e => set('company_name', e.target.value)} placeholder="e.g. Hughes Casting" />
              <Field label="Your role" value={d.what_i_do || ''} onChange={e => set('what_i_do', e.target.value)} placeholder="Casting director" />
            </>
          : <Field label="Headline" value={d.what_i_do || ''} onChange={e => set('what_i_do', e.target.value)} placeholder="Actor & Dancer · London" />}
        <Field label="Location" value={d.location || ''} onChange={e => set('location', e.target.value)} placeholder="London, UK" />
        {caster && <>
          <Field label="Website" type="url" inputMode="url" value={d.website} onChange={e => set('website', e.target.value)} placeholder="yourcompany.com" />
          <div>
            <p className="mb-1.5 text-[13px] font-medium">What you cast</p>
            <div className="flex flex-wrap gap-2">
              {['Theatre', 'Musicals', 'TV', 'Film', 'Commercials', 'Dance', 'Music video', 'Voice', 'Tours', 'Brand'].map(t => {
                const on = d.specialisms.includes(t)
                return <button key={t} type="button" aria-pressed={on} onClick={() => set('specialisms', on ? d.specialisms.filter(x => x !== t) : [...d.specialisms, t])}
                  className={cx('h-9 rounded-full border px-3.5 text-[13px] font-medium', on ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>{t}</button>
              })}
            </div>
          </div>
        </>}
        </div>

        <Card className="divide-y divide-line">
          <Row title="Public profile" sub="Anyone can view & share your page" checked={d.isPublic} onChange={v => set('isPublic', v)} />
          {!caster && <Row title="Open to work" sub="Show the green badge to casters" checked={d.openToWork} onChange={v => set('openToWork', v)} />}
        </Card>

        <TextArea id="about" className="scroll-mt-4" label="About" value={d.bio || ''} onChange={e => set('bio', e.target.value)} placeholder="Training, what you’re known for, what you’re looking for next…" />

        {!caster && (
          <>
            <section id="playing" className="scroll-mt-4">
              <h2 className="mb-3 text-[18px]">Playing details</h2>
              <Card className="divide-y divide-line">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-[15px] text-muted">Playing age</span>
                  <input aria-label="Playing age from" inputMode="numeric" value={d.minAge} onChange={e => set('minAge', e.target.value.replace(/\D/g, ''))} placeholder="20" className="w-12 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
                  <span className="text-muted">–</span>
                  <input aria-label="Playing age to" inputMode="numeric" value={d.maxAge} onChange={e => set('maxAge', e.target.value.replace(/\D/g, ''))} placeholder="28" className="w-12 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-[15px] text-muted">Height</span>
                  <input aria-label="Height" value={d.height || ''} onChange={e => set('height', e.target.value)} placeholder={'5\'11"'} className="w-24 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
                </div>
                <SelectRow label="Gender" value={d.gender} options={GENDER_OPTIONS} onChange={v => set('gender', v)} />
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-[15px] text-muted">Pronouns</span>
                  <input aria-label="Pronouns" maxLength={40} value={d.pronouns} onChange={e => set('pronouns', e.target.value)} placeholder="they/them" className="w-32 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-[15px] text-muted">Vocal range</span>
                  <input aria-label="Vocal range" maxLength={60} value={d.vocal} onChange={e => set('vocal', e.target.value)} placeholder="e.g. G2 to A4" className="w-40 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
                </div>
                <SelectRow label="Hair" value={d.hair} options={data.hair} onChange={v => set('hair', v)} />
                <SelectRow label="Eyes" value={d.eyes} options={data.eyes} onChange={v => set('eyes', v)} />
              </Card>
            </section>

            <ProfileDetails uid={uid} profile={p} access={data.access} />

            <CvDetails uid={uid} profile={p} training={data.training} agents={data.agents}
              skills={data.skills.filter(s => skillIds.includes(s.id))} onSkills={list => mutate(x => x && { ...x, skills: x.skills.map(s => list.find(l => l.id === s.id) ?? s) })} />

            <Verification uid={uid} profile={p} />

            <section>
              <h2 className="mb-3 text-[18px]">Graduate</h2>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-accent text-ink"><Icon name="graduation-cap" /></span>
                  <div className="flex-1"><p className="text-[15px] font-medium">Recent graduate</p><p className="text-[13px] text-muted">Shows a graduate badge; casters can filter by it</p></div>
                  <Toggle checked={d.isGraduate} onChange={v => set('isGraduate', v)} label="Recent graduate" />
                </div>
                {d.isGraduate && (
                  <div className="mt-3 flex gap-3">
                    <Field className="flex-[2]" label="School" value={d.graduate_school || ''} onChange={e => set('graduate_school', e.target.value)} placeholder="Drama school" />
                    <Field className="flex-1" label="Year" inputMode="numeric" maxLength={4} value={d.gradYear} onChange={e => set('gradYear', e.target.value.replace(/\D/g, ''))} placeholder="2026" />
                  </div>
                )}
              </Card>
            </section>

            <section id="skills" className="scroll-mt-4">
              <h2 className="mb-3 text-[18px]">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skillIds.map(sid => (
                  <button key={sid} type="button" aria-label={'Remove ' + skillName.get(sid)} onClick={() => removeSkill(sid)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-green-tint px-3 text-[13px] text-green-ink">
                    {skillName.get(sid)} <Icon name="x" className="size-3.5" />
                  </button>
                ))}
                <button type="button" onClick={() => setAddingSkill(v => !v)} className="upload inline-flex h-9 items-center !rounded-full px-3 text-[13px] font-medium">+ Add skill</button>
              </div>
              {addingSkill && (
                <div className="mt-3">
                  <Field icon="search" value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="Search skills, accents, instruments…" autoFocus />
                  {skillResults.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{skillResults.map(s => <Chip key={s.id} onClick={() => { addSkill(s.id); setSkillQuery('') }}>+ {s.name}</Chip>)}</div>}
                </div>
              )}
            </section>

            <section id="media" className="scroll-mt-4">
              <h2 className="mb-3 text-[18px]">Showreel &amp; photos</h2>
              <div className="grid grid-cols-2 gap-3">
                {data.reels.map((r, i) => (
                  <button key={r.id} type="button" onClick={() => setReelMenu(r)} aria-label={'Edit ' + (r.label || 'clip')} className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius)] bg-dark bg-cover bg-center text-left" style={r.poster_url || p.picture_url ? { backgroundImage: `url(${r.poster_url || p.picture_url})` } : undefined}>
                    <span className="absolute inset-0 bg-gradient-to-t from-dark/70 to-dark/10" />
                    {i === 0 && data.reels.length > 1 && <span className="absolute left-2 top-2 rounded-full bg-lime px-2 py-0.5 text-[11px] font-semibold text-ink">Main</span>}
                    <span className="absolute bottom-2 left-2.5 right-8 truncate text-xs font-medium text-white">{r.label || 'Showreel'}</span>
                    <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name="more" className="size-3.5" /></span>
                  </button>
                ))}
                <button type="button" onClick={() => setReelSheet(true)} className="upload flex aspect-[16/10] flex-col items-center justify-center gap-1 text-sm text-muted"><Icon name="plus" className="size-6" />Add</button>
              </div>
            </section>

            <GalleryEditor uid={uid} photos={data.gallery} onChange={gallery => mutate(x => x && { ...x, gallery })}
              onCover={url => { mutate(x => x && { ...x, profile: { ...x.profile!, banner_url: url } }); onRefresh() }} />

            <CvUpload uid={uid} path={p.cv_path} onChange={cv_path => mutate(x => x && { ...x, profile: { ...x.profile!, cv_path } })} />

          </>
        )}
            <section id="credits" className="scroll-mt-4">
              <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px]">{caster ? 'Productions you’ve cast' : 'Credits'}</h2><button type="button" onClick={() => setCredit({})} className="text-sm font-medium text-green-ink">+ Add credit</button></div>
              {data.credits.length === 0 ? <p className="text-sm text-muted">No credits yet.</p> : (
                <Card className="divide-y divide-line overflow-hidden">
                  {data.credits.map(c => (
                    <button key={c.id} type="button" onClick={() => setCredit(c)} className="flex w-full items-center justify-between px-4 py-3.5 text-left">
                      <span className="text-[15px] font-medium">{[c.title, c.role].filter(Boolean).join(' — ')}</span>
                      <Icon name="pen" className="size-4 text-faint" />
                    </button>
                  ))}
                </Card>
              )}
            </section>

            <BrandsEditor uid={uid} brands={data.brands} onChange={brands => mutate(x => x && { ...x, brands })} />
            <TestimonialsEditor uid={uid} testimonials={data.testimonials} onChange={testimonials => mutate(x => x && { ...x, testimonials })} />
        {!caster && (
          <>

            <section id="representation" className="scroll-mt-4">
              <h2 className="mb-3 text-[18px]">Representation</h2>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Field className="flex-1" label="Agency" value={d.agency} onChange={e => set('agency', e.target.value)} placeholder="Agency name" />
                  <Field className="flex-1" label="Your agent" value={d.agent_name || ''} onChange={e => set('agent_name', e.target.value)} placeholder="Agent’s name" />
                </div>
                <Field label="Agency address" value={d.agentAddress} onChange={e => set('agentAddress', e.target.value)} placeholder="Street, town, postcode" />
                <div className="flex gap-3">
                  <Field className="flex-1" label="Agent email" type="email" value={d.agent_email || ''} onChange={e => set('agent_email', e.target.value)} />
                  <Field className="flex-1" label="Agent phone" type="tel" value={d.agent_phone || ''} onChange={e => set('agent_phone', e.target.value)} />
                </div>
                <Card className="divide-y divide-line">
                  <Row title="Show agent contact publicly" sub={d.showContact ? 'Anyone viewing your profile sees the email and phone' : 'Private — only the agency name shows. Casting can still message you.'} checked={d.showContact} onChange={v => set('showContact', v)} />
                </Card>
              </div>
            </section>
          </>
        )}

        <p className={cx(label, 'pt-2 text-center')} aria-live="polite">{status === 'saving' ? 'Saving…' : status === 'error' ? 'Some changes aren’t saved yet — check your connection.' : 'Changes save automatically.'}</p>
        <Button full size="lg" onClick={done} disabled={status === 'saving'}>Done</Button>
      </div>

      <Sheet open={!!reelMenu} onClose={() => setReelMenu(null)} title={reelMenu?.label || 'Clip'}>
        {reelMenu && (() => {
          const i = data.reels.findIndex(x => x.id === reelMenu.id)
          const own = reelMenu.url.includes('/storage/v1/object/public/reels/')
          return (
            <Card className="divide-y divide-line overflow-hidden">
              {i > 0 && <MenuRow icon="star" label="Make main reel" sub="Shown first on your profile" onClick={() => moveReel(reelMenu, 0)} />}
              {i > 0 && <MenuRow icon="chevron-left" label="Move earlier" onClick={() => moveReel(reelMenu, i - 1)} />}
              {i < data.reels.length - 1 && <MenuRow icon="chevron-right" label="Move later" onClick={() => moveReel(reelMenu, i + 1)} />}
              {own && <MenuRow icon="image" label="Change cover frame" onClick={() => { setCoverFor(reelMenu); setReelMenu(null) }} />}
              <MenuRow icon="play" label="Watch" onClick={() => window.open(reelMenu.url, '_blank', 'noopener')} />
              <MenuRow icon="x" label="Remove" danger onClick={() => removeReel(reelMenu)} />
            </Card>
          )
        })()}
      </Sheet>
      <Sheet open={!!coverFor} onClose={() => setCoverFor(null)} title="Cover frame">
        {coverFor && <VideoEditor key={coverFor.id} uid={uid} source={coverFor.url} onCancel={() => setCoverFor(null)} onDone={v => saveCover(coverFor, v)} />}
      </Sheet>
      <ReelSheet open={reelSheet} onClose={() => setReelSheet(false)} uid={uid} count={data.reels.length} onAdded={r => mutate(x => x && { ...x, reels: [...x.reels, r] })} />
      <CreditSheet key={credit?.id || (credit ? 'new' : 'closed')} credit={credit} uid={uid} types={data.types} onClose={() => setCredit(null)} onDelete={removeCredit}
        onSaved={c => mutate(x => x && { ...x, credits: x.credits.some(y => y.id === c.id) ? x.credits.map(y => y.id === c.id ? c : y) : [c, ...x.credits] })} />
    </>
  )
}

function Row({ title, sub, checked, onChange }: { title: string; sub: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1"><p className="text-[15px] font-medium">{title}</p><p className="text-[13px] text-muted">{sub}</p></div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

function SelectRow({ label, value, options, onChange }: { label: string; value: number | null; options: { id: number; name: string }[]; onChange: (v: number | null) => void }) {
  return (
    <label className="flex items-center gap-3 px-4 py-2.5">
      <span className="flex-1 text-[15px] text-muted">{label}</span>
      <select value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} className="rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field">
        <option value="">—</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}

function MenuRow({ icon, label, sub, onClick, danger }: { icon: string; label: string; sub?: string; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={cx('flex w-full items-center gap-3 px-4 py-3.5 text-left', danger && 'text-red')}>
      <Icon name={icon} className={cx('size-5', !danger && 'text-muted')} />
      <span className="flex-1"><span className="block text-[15px] font-medium">{label}</span>{sub && <span className="block text-xs text-muted">{sub}</span>}</span>
    </button>
  )
}

function ReelSheet({ open, onClose, uid, count, onAdded }: { open: boolean; onClose: () => void; uid: string; count: number; onAdded: (r: Reel) => void }) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const add = async (row: { url: string; poster_url?: string | null; duration_s?: number | null }, name: string) => {
    const { data, error } = await supabase.from('reels').insert({ profile_id: uid, label: name || 'Showreel', sort_order: count, ...row }).select('id, label, url, sort_order, poster_url, duration_s').single()
    setBusy(false)
    if (error || !data) { toast('Couldn’t add that clip'); return }
    onAdded(data as Reel)
    setUrl(''); setLabel(''); setFile(null)
    onClose()
  }

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 2 * 1024 * 1024 * 1024) { toast('That file is over 2GB — export a shorter clip'); return }
    if (!label) setLabel(f.name.replace(/\.[^.]+$/, ''))
    setFile(f)
  }

  const close = () => { setFile(null); onClose() }
  return (
    <Sheet open={open} onClose={close} title={file ? 'Trim & cover' : 'Add a clip'}>
      {file ? (
        <div className="space-y-4">
          <Field label="Title" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Showreel 2026" />
          <VideoEditor key={file.name + file.size} uid={uid} source={file} onCancel={() => setFile(null)} onDone={v => { setBusy(true); add({ url: v.url!, poster_url: v.poster_url, duration_s: v.duration_s }, label) }} />
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Title" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Showreel 2026, Dance reel" />
          <Field label="Vimeo or YouTube link" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://vimeo.com/…" />
          <Button full onClick={() => { if (/^https?:\/\//.test(url)) { setBusy(true); add({ url }, label) } else toast('Paste a full link starting https://') }} disabled={busy || !url}>Add link</Button>
          <div className="flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="upload flex h-12 w-full items-center justify-center gap-2 text-sm font-medium"><Icon name="upload" className="size-4" />Upload a video</button>
          <p className="-mt-2 text-center text-xs text-muted">You can trim it and pick a cover. Long clips are compressed for you.</p>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={pick} />
        </div>
      )}
    </Sheet>
  )
}

function CreditSheet({ credit, uid, types, onClose, onSaved, onDelete }: { credit: Partial<Credit> | null; uid: string; types: { id: number; name: string }[]; onClose: () => void; onSaved: (c: Credit) => void; onDelete: (c: Partial<Credit>) => void }) {
  const [c, setC] = useState<Partial<Credit>>(credit || {})
  const [saving, setSaving] = useState(false)
  const save = async () => {
    if (!c.title?.trim()) { toast('Add the production'); return }
    setSaving(true)
    const row = { profile_id: uid, title: c.title.trim(), role: c.role?.trim() || null, year: c.year || null, production_company: c.production_company?.trim() || null, director: c.director?.trim() || null, production_type_id: c.production_type_id || null }
    const q = c.id ? supabase.from('credits').update(row).eq('id', c.id) : supabase.from('credits').insert(row)
    const { data, error } = await q.select('id, title, role, year, production_company, director, production_type_id, production_types(name)').single()
    setSaving(false)
    if (error || !data) { toast('Couldn’t save the credit'); return }
    onSaved(data as unknown as Credit)
    onClose()
  }
  return (
    <Sheet open={!!credit} onClose={onClose} title={c.id ? 'Edit credit' : 'Add credit'}>
      <div className="space-y-4">
        <Field label="Production" value={c.title || ''} onChange={e => setC({ ...c, title: e.target.value })} placeholder="e.g. National tour" />
        <Field label="Role" value={c.role || ''} onChange={e => setC({ ...c, role: e.target.value })} placeholder="e.g. Lead, Ensemble" />
        <div className="flex gap-3">
          <Field className="flex-1" label="Year" inputMode="numeric" value={c.year ? String(c.year) : ''} onChange={e => setC({ ...c, year: parseInt(e.target.value.replace(/\D/g, ''), 10) || null })} placeholder="2025" />
          <Field className="flex-[2]" label="Company / director" value={c.production_company || ''} onChange={e => setC({ ...c, production_company: e.target.value })} />
        </div>
        <div className="flex flex-wrap gap-2">{types.map(t => <Chip key={t.id} selected={c.production_type_id === t.id} onClick={() => setC({ ...c, production_type_id: t.id })}>{t.name}</Chip>)}</div>
        <Button full size="lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save credit'}</Button>
        {c.id && <button type="button" onClick={() => onDelete(c)} className="w-full text-center text-sm text-red">Delete credit</button>}
      </div>
    </Sheet>
  )
}

// Optional CV file (PDF/Word) that signed-in casting teams can download from the profile
function CvUpload({ uid, path, onChange }: { uid: string; path: string | null; onChange: (path: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const name = path?.split('/').pop()?.replace(/^cv-[a-z0-9]+-/, '')

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast('CVs can be up to 10MB'); return }
    setBusy(true)
    const next = uid + '/cv-' + stamp() + '-' + f.name.replace(/[^\w.\-]+/g, '_')
    const { error } = await supabase.storage.from('cvs').upload(next, f, { contentType: f.type })
    if (error) { setBusy(false); toast(error.message.includes('mime') ? 'Upload a PDF or Word file' : 'Upload failed'); return }
    const { error: err } = await supabase.from('profiles').update({ cv_path: next }).eq('id', uid)
    if (err) { setBusy(false); toast('Couldn’t save your CV'); return }
    if (path) supabase.storage.from('cvs').remove([path]).then(() => {}, () => {})
    onChange(next)
    setBusy(false)
    toast('CV uploaded')
  }

  const remove = async () => {
    if (!path) return
    setBusy(true)
    await supabase.from('profiles').update({ cv_path: null }).eq('id', uid)
    await supabase.storage.from('cvs').remove([path])
    onChange(null)
    setBusy(false)
    toast('CV removed')
  }

  return (
    <section>
      <h2 className="mb-1 text-[18px]">CV file</h2>
      <p className="mb-3 text-[13px] text-muted">Optional. Casting teams can download it from your profile. We also create a branded CV from your profile automatically.</p>
      {path ? (
        <Card className="flex items-center gap-3 p-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-green-tint text-green-ink"><Icon name="file" className="size-5" /></span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{name || 'CV'}</span>
          <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="text-sm font-medium text-green-ink">Replace</button>
          <button type="button" onClick={remove} disabled={busy} className="text-sm font-medium text-red">Remove</button>
        </Card>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="upload flex h-12 w-full items-center justify-center gap-2 text-sm font-medium"><Icon name="upload" className="size-4" />{busy ? 'Uploading…' : 'Upload CV · PDF or Word, up to 10MB'}</button>
      )}
      <input ref={ref} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={upload} />
    </section>
  )
}
