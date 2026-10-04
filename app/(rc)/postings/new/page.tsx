'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { FairPayBadge } from '@/components/rc/JobCard'
import { BackHeader, Button, Chip, ClientOnly, Field, Segmented, TextArea, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { ENFORCE_MIN_WAGE_FOR_SIDE_HUSTLES, MIN_HOURLY_WAGE, PAY_UNITS, belowMinWage, payLabel, type PayUnit } from '@/lib/rc/pay'

type Kind = 'role' | 'side'
const SIDE_CATEGORIES = ['Teaching', 'Promo / events', 'Modelling', 'Hospitality', 'Other']
const GENDERS = ['All genders', 'Women', 'Men', 'Non-binary']
const MATERIALS = [{ key: 'showreel', label: 'Showreel' }, { key: 'self_tape', label: 'Self-tape' }, { key: 'headshots', label: 'Headshots' }, { key: 'cv', label: 'CV' }]
const DRAFT_KEY = 'rc:post-draft'

type Draft = {
  project: string; role: string; typeId: number | null; paid: boolean; amount: string; unit: PayUnit
  location: string; start: string; end: string; deadline: string; brief: string; minAge: string; maxAge: string
  gender: string; skillIds: number[]; materials: string[]; nda: boolean; ndaText: string
  sideTitle: string; sideCategory: string; when: string
}

const EMPTY: Draft = {
  project: '', role: '', typeId: null, paid: true, amount: '', unit: 'week', location: '', start: '', end: '', deadline: '',
  brief: '', minAge: '', maxAge: '', gender: 'All genders', skillIds: [], materials: ['showreel', 'self_tape'], nda: false, ndaText: '',
  sideTitle: '', sideCategory: 'Teaching', when: '',
}

function loadDraft(): Draft {
  try { return { ...EMPTY, ...JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}') } } catch { return EMPTY }
}

export default function PostJobPage() {
  return <ClientOnly><PostJobForm /></ClientOnly>
}

function PostJobForm() {
  const router = useRouter()
  const params = useSearchParams()
  const me = useMe()
  const kind: Kind = params.get('type') === 'side' ? 'side' : 'role'
  const [d, setD] = useState<Draft>(() => {
    const draft = loadDraft()
    // Side hustles are usually hourly; roles weekly
    return draft.amount ? draft : { ...draft, unit: kind === 'side' ? 'hour' : 'week' }
  })
  const [skillQuery, setSkillQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Keep a draft on the device so nothing is lost if they leave mid-way
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)) } catch { /* ignore */ }
  }, [d])

  const { data: lookups } = useAsync(async () => {
    const [{ data: types }, { data: skills }] = await Promise.all([
      supabase.from('production_types').select('id, name').order('name'),
      supabase.from('skills').select('id, name').order('name'),
    ])
    return { types: types || [], skills: skills || [] }
  }, [])

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(prev => ({ ...prev, [k]: v }))
  const setKind = (k: Kind) => { setError(null); set('unit', k === 'side' ? 'hour' : 'week'); router.replace(k === 'side' ? '/postings/new?type=side' : '/postings/new') }

  const pickedSkills = (lookups?.skills || []).filter(s => d.skillIds.includes(s.id))
  const skillResults = useMemo(() => {
    const q = skillQuery.trim().toLowerCase()
    return q ? (lookups?.skills || []).filter(s => s.name.toLowerCase().includes(q) && !d.skillIds.includes(s.id)).slice(0, 6) : []
  }, [lookups, skillQuery, d.skillIds])

  const amount = parseFloat(d.amount)
  const typeName = lookups?.types.find(t => t.id === d.typeId)?.name
  const previewJob = { is_side_hustle: kind === 'side', is_paid: d.paid, pay_amount: isNaN(amount) ? null : amount, pay_unit: d.unit, production_types: typeName ? { name: typeName } : null }
  const minWageProblem = kind === 'side' && !isNaN(amount) && belowMinWage(true, amount, d.unit)

  const validate = (): string | null => {
    if (kind === 'role') {
      if (!d.project.trim() || !d.role.trim()) return 'Add the production and the role.'
      if (!d.typeId) return 'Pick a category.'
    } else if (!d.sideTitle.trim()) return 'Say what you need.'
    if ((kind === 'side' || d.paid) && (isNaN(amount) || amount <= 0)) return 'Pay is required — show the amount so everyone knows what’s on offer.'
    if (minWageProblem && ENFORCE_MIN_WAGE_FOR_SIDE_HUSTLES) return `That’s below the minimum wage (£${MIN_HOURLY_WAGE.toFixed(2)}/hour). Raise the rate to post.`
    if (d.start && d.end && d.end < d.start) return 'The end date is before the start date.'
    return null
  }

  const publish = async () => {
    const problem = validate()
    if (problem) { setError(problem); return }
    setError(null)
    setSaving(true)
    const paid = kind === 'side' || d.paid
    const pay = { is_paid: paid, pay_amount: paid ? amount : null, pay_unit: paid ? d.unit : null }
    const common = {
      created_by: me.id, is_published: true, location: d.location.trim() || null, description: d.brief.trim() || null,
      ...pay, salary: payLabel({ is_side_hustle: kind === 'side', ...pay }) ?? 'Unpaid',
    }
    const row: Record<string, unknown> = kind === 'side'
      ? { ...common, is_side_hustle: true, job_title: d.sideTitle.trim(), job_category: d.sideCategory, schedule: d.when.trim() || null, submit_materials: [] as string[] }
      : {
          ...common, is_side_hustle: false, project_in: d.project.trim(), project_role: d.role.trim(), production_type_id: d.typeId,
          production_company: me.profile?.company_name || null, start_date: d.start || null, end_date: d.end || null,
          application_deadline: d.deadline || null, age_range: d.minAge && d.maxAge ? d.minAge + '-' + d.maxAge : null,
          gender_requirement: d.gender === 'All genders' ? null : d.gender, submit_materials: d.materials,
          requires_nda: d.nda, nda_text: d.nda ? d.ndaText.trim() || null : null,
        }
    const { data: job, error: err } = await supabase.from('jobs').insert(row).select('id').single()
    if (err || !job) { setSaving(false); setError('Couldn’t post that — ' + (err?.message || 'please try again')); return }
    if (kind === 'role' && d.skillIds.length) await supabase.from('job_skills').insert(d.skillIds.map(skill_id => ({ job_id: job.id, skill_id })))
    try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ }
    toast(kind === 'side' ? 'Side hustle posted' : 'Role posted')
    router.replace('/postings/' + job.id)
  }

  const section = 'rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card space-y-4'
  const label = 'text-xs font-medium uppercase tracking-[0.08em] text-muted'

  return (
    <>
      <BackHeader title="Post a job" right={(d.project || d.sideTitle) ? <span className="text-xs font-medium text-muted">Draft saved</span> : undefined} />
      <div className="space-y-4 px-4 pb-10">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'role', label: 'Casting role' }, { value: 'side', label: 'Side hustle' }]} />

        {kind === 'side' && (
          <div className="flex items-center gap-3 rounded-[var(--radius)] bg-accent p-4 text-[14px] text-ink">
            <Icon name="plus" className="size-6 shrink-0 rounded-full border-2 border-ink p-0.5" /> Free to post. Seen by performers near you — great for teaching, promo, events &amp; more.
          </div>
        )}

        {kind === 'role' ? (
          <>
            <section className={section}>
              <p className={label}>The role</p>
              <Field label="Production / project" value={d.project} onChange={e => set('project', e.target.value)} placeholder="e.g. Coastlines — UK Tour" />
              <Field label="Role" value={d.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Ensemble / Swing" />
              <div>
                <p className="mb-2 text-[13px] font-medium">Category</p>
                <div className="flex flex-wrap gap-2">{(lookups?.types || []).map(t => <Chip key={t.id} selected={d.typeId === t.id} onClick={() => set('typeId', t.id)}>{t.name}</Chip>)}</div>
              </div>
            </section>

            <section className={section}>
              <p className={label}>Pay &amp; dates</p>
              <div className="flex items-center justify-between"><span className="text-[15px] font-medium">Paid role</span><Toggle checked={d.paid} onChange={v => set('paid', v)} label="Paid role" /></div>
              {d.paid && <PayFields d={d} set={set} units={PAY_UNITS.filter(u => u.value !== 'hour')} />}
              {d.paid && <FairPayBadge job={previewJob} />}
              <Field label="Location" icon="pin" value={d.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Leeds + tour" />
              <div className="flex gap-3">
                <Field className="flex-1" label="Starts" type="date" value={d.start} onChange={e => set('start', e.target.value)} />
                <Field className="flex-1" label="Ends" type="date" value={d.end} onChange={e => set('end', e.target.value)} />
              </div>
              <Field label="Applications close" type="date" value={d.deadline} onChange={e => set('deadline', e.target.value)} />
            </section>

            <section className={section}>
              <p className={label}>The brief</p>
              <TextArea value={d.brief} onChange={e => set('brief', e.target.value)} placeholder="Describe the show, the role, rehearsal & performance schedule, and anything performers should know before applying…" aria-label="The brief" />
            </section>

            <section className={section}>
              <p className={label}>Who you’re looking for</p>
              <div className="flex gap-3">
                <Field className="flex-1" label="Playing age from" inputMode="numeric" value={d.minAge} onChange={e => set('minAge', e.target.value.replace(/\D/g, ''))} placeholder="20" />
                <Field className="flex-1" label="to" inputMode="numeric" value={d.maxAge} onChange={e => set('maxAge', e.target.value.replace(/\D/g, ''))} placeholder="30" />
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Open to</p>
                <div className="flex flex-wrap gap-2">{GENDERS.map(g => <Chip key={g} selected={d.gender === g} onClick={() => set('gender', g)}>{g}</Chip>)}</div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Must-have skills</p>
                <div className="flex flex-wrap gap-2">
                  {pickedSkills.map(s => <Chip key={s.id} tone="green" selected onClick={() => set('skillIds', d.skillIds.filter(x => x !== s.id))}>{s.name} ✓</Chip>)}
                </div>
                <Field className="mt-2" icon="search" value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="+ Add skill" />
                {skillResults.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{skillResults.map(s => <Chip key={s.id} onClick={() => { set('skillIds', [...d.skillIds, s.id]); setSkillQuery('') }}>+ {s.name}</Chip>)}</div>}
              </div>
            </section>

            <section className={section}>
              <p className={label}>What applicants submit</p>
              {MATERIALS.map(m => (
                <div key={m.key} className="flex items-center justify-between">
                  <span className="text-[15px]">{m.label}</span>
                  <Toggle checked={d.materials.includes(m.key)} onChange={v => set('materials', v ? [...d.materials, m.key] : d.materials.filter(x => x !== m.key))} label={m.label} />
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-4"><span className="text-[15px]">Requires an NDA</span><Toggle checked={d.nda} onChange={v => set('nda', v)} label="Requires an NDA" /></div>
              {d.nda && <TextArea value={d.ndaText} onChange={e => set('ndaText', e.target.value)} placeholder="Paste the NDA text applicants will sign" aria-label="NDA text" />}
            </section>

            <div className={cx('flex items-center gap-3 rounded-[var(--radius)] p-4', me.profile?.is_verified ? 'bg-green-tint text-green-ink' : 'bg-chip text-muted')}>
              <Icon name="shield-check" className="size-5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">{me.profile?.is_verified ? 'Posting as a verified employer' : 'Not verified yet'}</p>
                <p>{me.profile?.is_verified ? 'Your job gets the green verified badge.' : 'Verified employers get a green badge. Ask us via Help & support.'}</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <section className={section}>
              <Field label="What do you need?" value={d.sideTitle} onChange={e => set('sideTitle', e.target.value)} placeholder="e.g. Dance teacher for a weekly class" />
              <div>
                <p className="mb-2 text-[13px] font-medium">Category</p>
                <div className="flex flex-wrap gap-2">{SIDE_CATEGORIES.map(c => <Chip key={c} tone="purple" selected={d.sideCategory === c} onClick={() => set('sideCategory', c)}>{c}</Chip>)}</div>
              </div>
            </section>
            <section className={section}>
              <PayFields d={d} set={set} units={PAY_UNITS} />
              {minWageProblem
                ? <p className="flex items-start gap-2 text-sm text-red"><Icon name="alert" className="mt-0.5 size-4 shrink-0" /> Below the £{MIN_HOURLY_WAGE.toFixed(2)}/hour minimum wage.</p>
                : <FairPayBadge job={previewJob} />}
              <div className="flex gap-3">
                <Field className="flex-1" label="Location" value={d.location} onChange={e => set('location', e.target.value)} placeholder="Hackney" />
                <Field className="flex-1" label="When" value={d.when} onChange={e => set('when', e.target.value)} placeholder="Ongoing" />
              </div>
            </section>
            <section className={section}>
              <TextArea label="Details" value={d.brief} onChange={e => set('brief', e.target.value)} placeholder="A few lines on the gig — who it suits, what’s involved, and how to get in touch…" />
            </section>
            <p className="flex items-start gap-2 rounded-[var(--radius)] bg-amber-tint px-4 py-3 text-[13px] text-amber"><Icon name="alert" className="mt-0.5 size-4 shrink-0" /> Community post — not a verified employer. We’ll remind applicants to stay safe.</p>
          </>
        )}

        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <Button size="lg" full variant={kind === 'side' ? 'accent' : 'dark'} trailingIcon="arrow-right" onClick={publish} disabled={saving}>
          {saving ? 'Posting…' : kind === 'side' ? 'Post side hustle' : 'Post role'}
        </Button>
        <p className="text-center text-xs text-muted">{kind === 'side' ? 'Live instantly · edit or close it any time.' : 'Goes live straight away · close it any time from Postings.'}</p>
      </div>
    </>
  )
}

function PayFields({ d, set, units }: { d: Draft; set: <K extends keyof Draft>(k: K, v: Draft[K]) => void; units: typeof PAY_UNITS }) {
  return (
    <div className="flex gap-3">
      <Field className="flex-1" label="Pay (£)" inputMode="decimal" value={d.amount} onChange={e => set('amount', e.target.value.replace(/[^\d.]/g, ''))} placeholder="650" />
      <label className="block flex-1">
        <span className="mb-1.5 block text-[13px] font-medium">Per</span>
        <select value={d.unit} onChange={e => set('unit', e.target.value as PayUnit)} className="h-12 w-full rounded-xl border border-line bg-field px-3 text-[15px] outline-none focus:border-green">
          {units.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </label>
    </div>
  )
}
