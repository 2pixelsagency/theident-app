'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Avatar, Button, Card, Chip, Field, PageLoading, Sheet, TextArea, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { loadFullProfile, type Credit, type FullProfile, type Reel } from '@/lib/rc/profile'

const stamp = () => Date.now().toString(36)
type Draft = Pick<FullProfile, 'first_name' | 'last_name' | 'what_i_do' | 'location' | 'bio' | 'height' | 'agent_name' | 'agent_email' | 'agent_phone' | 'company_name' | 'graduate_school'> & {
  minAge: string; maxAge: string; hair: number | null; eyes: number | null; isPublic: boolean; openToWork: boolean; isGraduate: boolean; gradYear: string
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
  const router = useRouter()
  const p = data.profile!
  const [d, setD] = useState<Draft>({
    first_name: p.first_name, last_name: p.last_name, what_i_do: p.what_i_do, location: p.location, bio: p.bio || p.summary, height: p.height,
    agent_name: p.agent_name, agent_email: p.agent_email, agent_phone: p.agent_phone, company_name: p.company_name, graduate_school: p.graduate_school,
    minAge: p.minimum_age ? String(p.minimum_age) : '', maxAge: p.maximum_age ? String(p.maximum_age) : '', hair: p.hair_colour_id, eyes: p.eye_colour_id,
    isPublic: p.show_talent !== false, openToWork: p.availability_status === 'available', isGraduate: p.is_graduate, gradYear: p.graduate_year ? String(p.graduate_year) : '',
  })
  const [skillIds, setSkillIds] = useState<number[]>(data.skills.map(s => s.id))
  const [skillQuery, setSkillQuery] = useState('')
  const [addingSkill, setAddingSkill] = useState(false)
  const [reelSheet, setReelSheet] = useState(false)
  const [credit, setCredit] = useState<Partial<Credit> | null>(null)
  const [saving, setSaving] = useState(false)
  const [busyImage, setBusyImage] = useState<'avatar' | 'banner' | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }))
  const skillName = useMemo(() => new Map(data.allSkills.map(s => [s.id, s.name])), [data.allSkills])
  const skillResults = skillQuery.trim() ? data.allSkills.filter(s => s.name.toLowerCase().includes(skillQuery.toLowerCase()) && !skillIds.includes(s.id)).slice(0, 8) : []

  const uploadImage = async (kind: 'avatar' | 'banner', e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setBusyImage(kind)
    const path = uid + '/' + kind + '-' + stamp() + '.' + (f.name.split('.').pop() || 'jpg')
    const { error } = await supabase.storage.from('headshots').upload(path, f, { contentType: f.type })
    if (error) { setBusyImage(null); toast('Upload failed'); return }
    const url = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
    await supabase.from('profiles').update(kind === 'avatar' ? { picture_url: url } : { banner_url: url }).eq('id', uid)
    mutate(x => x && { ...x, profile: { ...x.profile!, ...(kind === 'avatar' ? { picture_url: url } : { banner_url: url }) } })
    setBusyImage(null)
    onRefresh()
  }

  const save = async () => {
    setSaving(true)
    const year = parseInt(d.gradYear, 10)
    const { error } = await supabase.from('profiles').update({
      first_name: d.first_name?.trim() || null, last_name: d.last_name?.trim() || null, what_i_do: d.what_i_do?.trim() || null, location: d.location?.trim() || null,
      bio: d.bio?.trim() || null, height: d.height?.trim() || null, minimum_age: parseInt(d.minAge, 10) || null, maximum_age: parseInt(d.maxAge, 10) || null,
      hair_colour_id: d.hair, eye_colour_id: d.eyes, show_talent: d.isPublic, availability_status: d.openToWork ? 'available' : null,
      is_graduate: d.isGraduate, graduate_school: d.isGraduate ? d.graduate_school?.trim() || null : null, graduate_year: d.isGraduate && year ? year : null,
      agent_name: d.agent_name?.trim() || null, agent_email: d.agent_email?.trim() || null, agent_phone: d.agent_phone?.trim() || null,
      company_name: d.company_name?.trim() || null,
    }).eq('id', uid)
    if (error) { setSaving(false); toast('Couldn’t save: ' + error.message); return }
    const before = new Set(data.skills.map(s => s.id))
    const added = skillIds.filter(s => !before.has(s))
    const removed = [...before].filter(s => !skillIds.includes(s))
    if (added.length) await supabase.from('profile_skills').insert(added.map(skill_id => ({ profile_id: uid, skill_id })))
    if (removed.length) await supabase.from('profile_skills').delete().eq('profile_id', uid).in('skill_id', removed)
    await onRefresh()
    setSaving(false)
    toast('Profile saved')
    router.push('/me')
  }

  const removeReel = async (r: Reel) => {
    if (!confirm('Remove “' + (r.label || 'this clip') + '”?')) return
    await supabase.from('reels').delete().eq('id', r.id)
    mutate(x => x && { ...x, reels: x.reels.filter(y => y.id !== r.id) })
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
      <BackHeader title="Customise profile" back="/me" right={<button type="button" onClick={save} disabled={saving} className="text-[15px] font-medium text-green-ink">{saving ? 'Saving…' : 'Save'}</button>} />

      <div className="space-y-5 px-4 pb-12 pt-4">
        {/* Banner + avatar */}
        <div className="relative">
          <button type="button" onClick={() => bannerRef.current?.click()} aria-label="Change banner" className="block h-28 w-full overflow-hidden rounded-[var(--radius)] bg-hero bg-cover bg-center" style={p.banner_url ? { backgroundImage: `url(${p.banner_url})` } : undefined}>
            <span className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name={busyImage === 'banner' ? 'clock' : 'camera'} className="size-5" /></span>
          </button>
          <button type="button" onClick={() => avatarRef.current?.click()} aria-label="Change photo" className="absolute -bottom-8 left-4 rounded-full ring-4 ring-bg">
            <Avatar src={p.picture_url} name={fullName(p)} size={76} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-dark/30 text-white"><Icon name={busyImage === 'avatar' ? 'clock' : 'camera'} className="size-6" /></span>
          </button>
          <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={e => uploadImage('banner', e)} />
          <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={e => uploadImage('avatar', e)} />
        </div>

        <div className="flex gap-3 pt-8">
          <Field className="flex-1" label="First name" value={d.first_name || ''} onChange={e => set('first_name', e.target.value)} />
          <Field className="flex-1" label="Last name" value={d.last_name || ''} onChange={e => set('last_name', e.target.value)} />
        </div>
        {caster
          ? <Field label="Company" value={d.company_name || ''} onChange={e => set('company_name', e.target.value)} />
          : <Field label="Headline" value={d.what_i_do || ''} onChange={e => set('what_i_do', e.target.value)} placeholder="Actor, Dancer" />}
        <Field label="Location" icon="pin" value={d.location || ''} onChange={e => set('location', e.target.value)} placeholder="London, UK" />

        <Card className="divide-y divide-line">
          <Row title="Public profile" sub="Anyone can view & share your page" checked={d.isPublic} onChange={v => set('isPublic', v)} />
          {!caster && <Row title="Open to work" sub="Show the green badge to casters" checked={d.openToWork} onChange={v => set('openToWork', v)} />}
        </Card>

        <TextArea label="About" value={d.bio || ''} onChange={e => set('bio', e.target.value)} placeholder="Training, what you’re known for, what you’re looking for next…" />

        {!caster && (
          <>
            <section>
              <h2 className="mb-3 text-[18px]">Playing details</h2>
              <Card className="divide-y divide-line">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-[15px] text-muted">Playing age</span>
                  <input aria-label="Playing age from" inputMode="numeric" value={d.minAge} onChange={e => set('minAge', e.target.value.replace(/\D/g, ''))} placeholder="20" className="w-12 rounded-lg bg-field px-2 py-1.5 text-right text-[15px] font-medium outline-none" />
                  <span className="text-muted">–</span>
                  <input aria-label="Playing age to" inputMode="numeric" value={d.maxAge} onChange={e => set('maxAge', e.target.value.replace(/\D/g, ''))} placeholder="28" className="w-12 rounded-lg bg-field px-2 py-1.5 text-right text-[15px] font-medium outline-none" />
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 text-[15px] text-muted">Height</span>
                  <input aria-label="Height" value={d.height || ''} onChange={e => set('height', e.target.value)} placeholder={'5\'11"'} className="w-24 rounded-lg bg-field px-2 py-1.5 text-right text-[15px] font-medium outline-none" />
                </div>
                <SelectRow label="Hair" value={d.hair} options={data.hair} onChange={v => set('hair', v)} />
                <SelectRow label="Eyes" value={d.eyes} options={data.eyes} onChange={v => set('eyes', v)} />
              </Card>
            </section>

            <section>
              <h2 className="mb-3 text-[18px]">Graduate</h2>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-ink"><Icon name="graduation-cap" /></span>
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

            <section>
              <h2 className="mb-3 text-[18px]">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {skillIds.map(sid => (
                  <button key={sid} type="button" onClick={() => setSkillIds(l => l.filter(x => x !== sid))} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-green-tint px-3 text-[13px] text-green-ink">
                    {skillName.get(sid)} <Icon name="x" className="size-3.5" />
                  </button>
                ))}
                <button type="button" onClick={() => setAddingSkill(v => !v)} className="upload inline-flex h-9 items-center !rounded-full px-3 text-[13px] font-medium">+ Add skill</button>
              </div>
              {addingSkill && (
                <div className="mt-3">
                  <Field icon="search" value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="Search skills, accents, instruments…" autoFocus />
                  {skillResults.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{skillResults.map(s => <Chip key={s.id} onClick={() => { setSkillIds(l => [...l, s.id]); setSkillQuery('') }}>+ {s.name}</Chip>)}</div>}
                </div>
              )}
            </section>

            <section id="media">
              <h2 className="mb-3 text-[18px]">Showreel &amp; clips</h2>
              <div className="grid grid-cols-2 gap-3">
                {data.reels.map(r => (
                  <div key={r.id} className="relative aspect-[16/10] overflow-hidden rounded-[var(--radius)] bg-dark bg-cover bg-center" style={p.picture_url ? { backgroundImage: `url(${p.picture_url})` } : undefined}>
                    <span className="absolute inset-0 bg-dark/40" />
                    <span className="absolute bottom-2 left-2.5 right-8 truncate text-xs font-medium text-white">{r.label || 'Showreel'}</span>
                    <button type="button" aria-label="Remove clip" onClick={() => removeReel(r)} className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-surface/90"><Icon name="x" className="size-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setReelSheet(true)} className="upload flex aspect-[16/10] flex-col items-center justify-center gap-1 text-sm text-muted"><Icon name="plus" className="size-6" />Add</button>
              </div>
            </section>

            <CvUpload uid={uid} path={p.cv_path} onChange={cv_path => mutate(x => x && { ...x, profile: { ...x.profile!, cv_path } })} />

            <section>
              <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px]">Credits</h2><button type="button" onClick={() => setCredit({})} className="text-sm font-medium text-green-ink">+ Add credit</button></div>
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

            <section>
              <h2 className="mb-3 text-[18px]">Representation</h2>
              <div className="space-y-3">
                <Field label="Agent" value={d.agent_name || ''} onChange={e => set('agent_name', e.target.value)} placeholder="Agency name" />
                <div className="flex gap-3">
                  <Field className="flex-1" label="Agent email" type="email" value={d.agent_email || ''} onChange={e => set('agent_email', e.target.value)} />
                  <Field className="flex-1" label="Agent phone" type="tel" value={d.agent_phone || ''} onChange={e => set('agent_phone', e.target.value)} />
                </div>
              </div>
            </section>
          </>
        )}

        <p className={cx(label, 'pt-2 text-center')}>Changes go live when you tap Save.</p>
        <Button full size="lg" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button>
      </div>

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
      <select value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)} className="rounded-lg bg-field px-2 py-1.5 text-right text-[15px] font-medium outline-none">
        <option value="">—</option>
        {options.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </label>
  )
}

function ReelSheet({ open, onClose, uid, count, onAdded }: { open: boolean; onClose: () => void; uid: string; count: number; onAdded: (r: Reel) => void }) {
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const add = async (link: string, name: string) => {
    const { data, error } = await supabase.from('reels').insert({ profile_id: uid, label: name || 'Showreel', url: link, sort_order: count }).select('id, label, url, sort_order').single()
    setBusy(false)
    if (error || !data) { toast('Couldn’t add that clip'); return }
    onAdded(data as Reel)
    setUrl(''); setLabel('')
    onClose()
  }

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 500 * 1024 * 1024) { toast('Max 500MB'); return }
    setBusy(true)
    const path = uid + '/reel-' + stamp() + '.' + (f.name.split('.').pop() || 'mp4')
    const { error } = await supabase.storage.from('reels').upload(path, f, { contentType: f.type })
    if (error) { setBusy(false); toast('Upload failed'); return }
    add(supabase.storage.from('reels').getPublicUrl(path).data.publicUrl, label || f.name.replace(/\.[^.]+$/, ''))
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add a clip">
      <div className="space-y-4">
        <Field label="Title" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Showreel 2026, Dance reel" />
        <Field label="Vimeo or YouTube link" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://vimeo.com/…" />
        <Button full onClick={() => { if (/^https?:\/\//.test(url)) { setBusy(true); add(url, label) } else toast('Paste a full link starting https://') }} disabled={busy || !url}>Add link</Button>
        <div className="flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="upload flex h-12 w-full items-center justify-center gap-2 text-sm font-medium"><Icon name="upload" className="size-4" />{busy ? 'Uploading…' : 'Upload a video · up to 500MB'}</button>
        <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={upload} />
      </div>
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
          <span className="flex size-10 items-center justify-center rounded-xl bg-green-tint text-green-ink"><Icon name="file" className="size-5" /></span>
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
