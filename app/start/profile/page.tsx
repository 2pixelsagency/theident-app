'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Chip, Field, Steps, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { SIGNUP_QUESTIONS, emptyDraft, readDraft, shrinkImage, writeDraft, type OnboardingDraft } from '@/lib/rc/onboarding'

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
    if (!readDraft()) { router.replace('/welcome'); return }
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

  // One question per screen, starting at the first. ?q= lets Back from the account step return to the last one.
  const [q, setQ] = useState(() => Math.max(0, parseInt(new URLSearchParams(window.location.search).get('q') || '0', 10) || 0))
  const total = SIGNUP_QUESTIONS + 1 // + the account step
  const last = total - 2
  const step = Math.min(q, last)

  const valid = isCaster
    ? [d.firstName.trim().length > 0, d.companyName.trim().length > 0, true, true][step]
    : [d.firstName.trim().length > 0, d.crafts.length > 0, true, true][step]

  const go = (to: number) => { setQ(to); window.scrollTo(0, 0) }
  const next = () => {
    if (!valid) { toast(step === 0 ? 'Add your name' : isCaster ? 'Add your company or production' : 'Pick at least one'); return }
    if (step < last) go(step + 1)
    else router.push('/start/account')
  }
  const back = () => (step > 0 ? go(step - 1) : router.push('/welcome?side=' + (isCaster ? 'cast' : 'perform')))
  const optional = step >= 2 // later questions can be filled in from Edit profile

  const soon = () => toast('Autofill is coming soon — add the basics below for now')

  const title = (t: string, sub: string) => (
    <>
      <h1 className="mt-6 text-[26px]">{t}</h1>
      <p className="mt-1.5 text-[15px] text-muted">{sub}</p>
    </>
  )

  const nameQuestion = (
    <>
      {title(isCaster ? 'Let’s set up your casting profile' : 'What’s your name?', isCaster ? 'Ready to post in under a minute. First, who are you?' : 'Casting-ready in under a minute. Add a headshot if you have one to hand.')}
      <div className="mt-6 flex items-end gap-4">
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add photo"
          className="upload flex size-[88px] shrink-0 flex-col items-center justify-center overflow-hidden !rounded-full text-muted">
          {d.photo
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={d.photo} alt="" className="size-full object-cover" />
            : <><Icon name="camera" className="size-6" /><span className="mt-1 text-[11px]">Add photo</span></>}
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
        <Field label="Your name" value={fullName} onChange={e => setName(e.target.value)} placeholder="First and last name" autoComplete="name" className="flex-1" autoFocus />
      </div>
    </>
  )

  const locationField = <Field label="Based in" icon="pin" className="mt-6" value={d.location} onChange={e => update({ location: e.target.value })} placeholder="e.g. London, UK" autoComplete="address-level2" />

  const performer = [
    nameQuestion,
    <>
      {title('What do you do?', 'Pick all that apply — casting directors filter by these.')}
      <div className="mt-6 flex flex-wrap gap-2">
        {CRAFTS.map(c => <Chip key={c} selected={d.crafts.includes(c)} onClick={() => update({ crafts: toggleIn(d.crafts, c) })}>{c}{d.crafts.includes(c) && ' ✓'}</Chip>)}
      </div>
    </>,
    <>
      {title('Where are you based, and what are your skills?', 'Helps us match you with roles nearby. Add as many skills as you like.')}
      {locationField}
      <p className="mb-2 mt-6 text-[13px] font-medium">Skills <span className="font-normal text-faint">tap to add</span></p>
      <div className="flex flex-wrap gap-2">
        {suggested.map(sk => {
          const on = d.skillIds.includes(sk.id)
          return <Chip key={sk.id} tone="green" selected={on} onClick={() => update({ skillIds: toggleIn(d.skillIds, sk.id) })}>{on ? sk.name + ' ✓' : '+ ' + sk.name}</Chip>
        })}
        <Chip onClick={() => setShowSkillSearch(v => !v)}>{showSkillSearch ? 'Done' : '+ More'}</Chip>
      </div>
      {showSkillSearch && (
        <div className="mt-3">
          <Field icon="search" value={skillQuery} onChange={e => setSkillQuery(e.target.value)} placeholder="Search skills, accents, instruments…" autoFocus />
          {searchResults.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {searchResults.map(sk => <Chip key={sk.id} onClick={() => { update({ skillIds: [...d.skillIds, sk.id] }); setSkillQuery('') }}>+ {sk.name}</Chip>)}
            </div>
          )}
        </div>
      )}
    </>,
    <>
      {title('Show your work', 'Add a reel and let casting know you’re available. You can do all of this later too.')}
      <div className="upload mt-6 px-4 py-3.5">
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

      <div className="mt-5 rounded-[20px] bg-hero p-5 text-white">
        <p className="flex items-center gap-2 text-[17px] font-medium"><Icon name="sparkle" className="size-5 text-green" /> Autofill the rest</p>
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
    </>,
  ]

  const caster = [
    nameQuestion,
    <>
      {title('What company or production?', 'Shown on your postings so talent knows who’s casting.')}
      <Field label="Company or production" className="mt-6" value={d.companyName} onChange={e => update({ companyName: e.target.value })} placeholder="e.g. Seaside Productions" autoComplete="organization" autoFocus />
    </>,
    <>
      {title('What do you cast?', 'Pick any — we’ll tailor your talent search.')}
      <div className="mt-6 flex flex-wrap gap-2">
        {CASTER_FOCUS.map(c => <Chip key={c} selected={d.crafts.includes(c)} onClick={() => update({ crafts: toggleIn(d.crafts, c) })}>{c}{d.crafts.includes(c) && ' ✓'}</Chip>)}
      </div>
    </>,
    <>
      {title('Where are you based?', 'So talent nearby can find your roles.')}
      {locationField}
    </>,
  ]

  return (
    <>
      <div className="flex items-center gap-3 py-2">
        <button type="button" aria-label="Back" onClick={back} className="-ml-1.5 inline-flex h-10 w-8 items-center justify-start text-ink active:opacity-50">
          <Icon name="chevron-left" className="size-6" />
        </button>
        <Steps step={step + 1} total={total} />
        <span className="w-12 text-right text-[13px] tabular-nums text-muted">{step + 1} of {total}</span>
      </div>

      <div key={step} className="animate-[rc-step-in_240ms_ease-out]">
        {(isCaster ? caster : performer)[step]}
      </div>

      <div className="mt-auto space-y-3 pt-10">
        <Button size="lg" full trailingIcon="arrow-right" onClick={next} disabled={!valid}>Continue</Button>
        {optional && <button type="button" onClick={next} className="w-full text-center text-sm font-medium text-muted">Skip for now</button>}
      </div>
    </>
  )
}
