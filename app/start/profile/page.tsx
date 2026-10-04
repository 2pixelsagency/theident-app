'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Chip, Field, Steps, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { emptyDraft, readDraft, shrinkImage, writeDraft, type OnboardingDraft } from '@/lib/rc/onboarding'

const CRAFTS = ['Actor', 'Dancer', 'Singer', 'Musical theatre', 'Presenter', 'Model', 'Voiceover']
const CASTER_FOCUS = ['Theatre', 'Musical theatre', 'TV & film', 'Commercial', 'Dance', 'Voiceover', 'Events']
const SUGGESTED_SKILLS = ['Contemporary Dance', 'Stage Combat', 'Singing', 'RP Accent', 'Car Licence', 'Screen Acting', 'Improvisation', 'Commercial Dance']

type Skill = { id: number; name: string }

export default function CreateProfile() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [d, setD] = useState<OnboardingDraft>(() => readDraft() ?? emptyDraft())
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillQuery, setSkillQuery] = useState('')
  const [showSkillSearch, setShowSkillSearch] = useState(false)
  const [showReel, setShowReel] = useState(() => !!d.reelUrl)

  useEffect(() => {
    if (!readDraft()) { router.replace('/start'); return }
    supabase.from('skills').select('id, name').order('name').then(({ data }) => setSkills(data || []))
  }, [router])

  const update = (patch: Partial<OnboardingDraft>) => setD(prev => {
    const next = { ...prev, ...patch }
    writeDraft(next)
    return next
  })

  const isCaster = d.role === 'caster'
  const fullName = [d.firstName, d.lastName].filter(Boolean).join(' ')
  const setName = (v: string) => {
    const [first, ...rest] = v.split(' ')
    update({ firstName: first ?? '', lastName: rest.join(' ') })
  }

  const toggleIn = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v])

  const suggested = useMemo(() => {
    const byName = new Map(skills.map(s => [s.name.toLowerCase(), s]))
    const picked = skills.filter(s => d.skillIds.includes(s.id))
    const base = SUGGESTED_SKILLS.map(n => byName.get(n.toLowerCase())).filter((s): s is Skill => !!s)
    return [...picked, ...base.filter(s => !d.skillIds.includes(s.id))]
  }, [skills, d.skillIds])

  const searchResults = useMemo(() => {
    const q = skillQuery.trim().toLowerCase()
    if (!q) return []
    return skills.filter(s => s.name.toLowerCase().includes(q) && !d.skillIds.includes(s.id)).slice(0, 8)
  }, [skills, skillQuery, d.skillIds])

  const pickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try { update({ photo: await shrinkImage(file) }) } catch { toast('Couldn’t read that photo') }
  }

  const canContinue = d.firstName.trim().length > 0 && (isCaster ? d.companyName.trim().length > 0 : d.crafts.length > 0)

  const next = () => {
    if (!canContinue) { toast(isCaster ? 'Add your name and company' : 'Add your name and what you do'); return }
    router.push('/start/account')
  }

  const soon = () => toast('Autofill is coming soon — add the basics below for now')

  return (
    <>
      <div className="flex items-center gap-3 py-2">
        <button type="button" aria-label="Back" onClick={() => router.push('/start')} className="-ml-1 inline-flex size-9 items-center justify-center rounded-full hover:bg-chip">
          <Icon name="chevron-left" className="size-6" />
        </button>
        <Steps step={2} total={3} />
        <button type="button" onClick={() => router.push('/start/account')} className="text-sm font-medium text-muted">Skip</button>
      </div>

      <h1 className="mt-4 text-[26px]">{isCaster ? 'Set up your casting profile' : 'Create your profile'}</h1>
      <p className="mt-1.5 text-[15px] text-muted">{isCaster ? 'Ready to post in under a minute.' : 'Casting-ready in under a minute. Edit anything later.'}</p>

      {!isCaster && (
        <div className="mt-5 rounded-[20px] bg-hero p-5 text-white">
          <p className="flex items-center gap-2 text-[17px] font-medium"><Icon name="sparkle" className="size-5 text-green" /> Autofill it for me</p>
          <p className="mt-1 text-[13px] text-white/70">Import once and we’ll fill your credits, skills and photos.</p>
          <div className="mt-4 space-y-2">
            {[['file', 'Upload your CV'], ['star', 'Import from Spotlight or Mandy'], ['link', 'Paste a profile link']].map(([icon, label]) => (
              <button key={label} type="button" onClick={soon} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-left text-[15px] transition hover:bg-white/10">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/10"><Icon name={icon} className="size-[18px]" /></span>
                <span className="flex-1">{label}</span>
                <Icon name="chevron-right" className="size-4 text-white/50" />
              </button>
            ))}
          </div>
        </div>
      )}

      {!isCaster && (
        <div className="my-5 flex items-center gap-3 text-xs text-faint">
          <span className="h-px flex-1 bg-line" />or add the basics<span className="h-px flex-1 bg-line" />
        </div>
      )}

      <div className={cx('flex items-end gap-4', isCaster && 'mt-6')}>
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add photo"
          className="upload flex size-[88px] shrink-0 flex-col items-center justify-center overflow-hidden !rounded-full text-muted">
          {d.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={d.photo} alt="" className="size-full object-cover" />
            : <><Icon name="camera" className="size-6" /><span className="mt-1 text-[11px]">Add photo</span></>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        <Field label="Your name" value={fullName} onChange={e => setName(e.target.value)} placeholder="First and last name" autoComplete="name" className="flex-1" />
      </div>

      {isCaster ? (
        <>
          <Field label="Company or production" className="mt-5" value={d.companyName} onChange={e => update({ companyName: e.target.value })} placeholder="e.g. Seaside Productions" autoComplete="organization" />
          <p className="mb-2 mt-5 text-[13px] font-medium">What do you cast? <span className="font-normal text-faint">pick any</span></p>
          <div className="flex flex-wrap gap-2">
            {CASTER_FOCUS.map(c => <Chip key={c} selected={d.crafts.includes(c)} onClick={() => update({ crafts: toggleIn(d.crafts, c) })}>{c}{d.crafts.includes(c) && ' ✓'}</Chip>)}
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 mt-5 text-[13px] font-medium">What do you do? <span className="font-normal text-faint">pick any</span></p>
          <div className="flex flex-wrap gap-2">
            {CRAFTS.map(c => <Chip key={c} selected={d.crafts.includes(c)} onClick={() => update({ crafts: toggleIn(d.crafts, c) })}>{c}{d.crafts.includes(c) && ' ✓'}</Chip>)}
          </div>
        </>
      )}

      <Field label="Based in" icon="pin" className="mt-5" value={d.location} onChange={e => update({ location: e.target.value })} placeholder="e.g. London, UK" autoComplete="address-level2" />

      {!isCaster && (
        <>
          <p className="mb-2 mt-5 text-[13px] font-medium">Skills <span className="font-normal text-faint">tap to add</span></p>
          <div className="flex flex-wrap gap-2">
            {suggested.map(s => {
              const on = d.skillIds.includes(s.id)
              return <Chip key={s.id} tone="green" selected={on} onClick={() => update({ skillIds: toggleIn(d.skillIds, s.id) })}>{on ? s.name + ' ✓' : '+ ' + s.name}</Chip>
            })}
            <Chip onClick={() => setShowSkillSearch(v => !v)}>{showSkillSearch ? 'Done' : '+ More'}</Chip>
          </div>
          {showSkillSearch && (
            <div className="mt-3">
              <Field icon="search" value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="Search skills, accents, instruments…" autoFocus />
              {searchResults.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {searchResults.map(s => <Chip key={s.id} onClick={() => { update({ skillIds: [...d.skillIds, s.id] }); setSkillQuery('') }}>+ {s.name}</Chip>)}
                </div>
              )}
            </div>
          )}

          <div className="upload mt-5 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-tint text-purple-ink"><Icon name="video" /></span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium">Add your showreel</span>
                <span className="block text-[13px] text-muted">Paste a Vimeo / YouTube link</span>
              </span>
              <button type="button" onClick={() => setShowReel(v => !v)} className="text-sm font-medium text-purple-ink">{showReel ? 'Hide' : 'Add'}</button>
            </div>
            {showReel && <Field className="mt-3" type="url" inputMode="url" value={d.reelUrl} onChange={e => update({ reelUrl: e.target.value })} placeholder="https://vimeo.com/…" />}
          </div>

          <div className="mt-4 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface shadow-card">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex-1">
                <p className="text-[15px] font-medium">Open to work</p>
                <p className="text-[13px] text-muted">Show the green badge to casting</p>
              </div>
              <Toggle checked={d.openToWork} onChange={v => update({ openToWork: v })} label="Open to work" />
            </div>
            <div className="px-4 py-3.5">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-[15px] font-medium">Recent graduate</p>
                  <p className="text-[13px] text-muted">Adds a graduate badge casters can filter by</p>
                </div>
                <Toggle checked={d.isGraduate} onChange={v => update({ isGraduate: v })} label="Recent graduate" />
              </div>
              {d.isGraduate && (
                <div className="mt-3 flex gap-3">
                  <Field className="flex-[2]" label="School" value={d.graduateSchool} onChange={e => update({ graduateSchool: e.target.value })} placeholder="Drama school" />
                  <Field className="flex-1" label="Year" inputMode="numeric" maxLength={4} value={d.graduateYear} onChange={e => update({ graduateYear: e.target.value.replace(/\D/g, '') })} placeholder="2026" />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <Button size="lg" full trailingIcon="arrow-right" onClick={next} disabled={!canContinue}>
          {isCaster ? 'Continue' : 'Create my profile'}
        </Button>
      </div>
    </>
  )
}
