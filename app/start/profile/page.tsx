'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Chip, Field, Steps, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import VideoEditor from '@/components/rc/VideoEditor'
import { PERFORMER_QUESTIONS, SIGNUP_QUESTIONS, applyDraft, emptyDraft, readDraft, shrinkImage, writeDraft, type OnboardingDraft } from '@/lib/rc/onboarding'

const CRAFTS = ['Actor', 'Dancer', 'Singer', 'Musical theatre', 'Presenter', 'Model', 'Voiceover']
const CASTER_FOCUS = ['Theatre', 'Musical theatre', 'TV & film', 'Commercial', 'Dance', 'Voiceover', 'Events']
const SUGGESTED_SKILLS = ['Contemporary Dance', 'Stage Combat', 'Singing', 'RP Accent', 'Car Licence', 'Screen Acting', 'Improvisation', 'Commercial Dance']

type Skill = { id: number; name: string }
// ids from the genders table; casting filters by these
const GENDERS: [number, string][] = [[7, 'Female'], [6, 'Male'], [2, 'Non-binary']]
const MORE_GENDERS: [number, string][] = [[3, 'Trans woman'], [4, 'Trans man'], [5, 'Gender non-conforming'], [1, 'Prefer not to say']]
const PRONOUNS = ['she/her', 'he/him', 'they/them', 'she/they', 'he/they']


export default function CreateProfile() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [d, setD] = useState<OnboardingDraft>(() => readDraft() ?? emptyDraft())
  const [skills, setSkills] = useState<Skill[]>([])
  const [skillQuery, setSkillQuery] = useState('')
  const [showSkillSearch, setShowSkillSearch] = useState(false)
  const [showReel, setShowReel] = useState(() => !!d.reelUrl && !d.reelPoster)
  const [uid, setUid] = useState<string | null>(null)
  const [video, setVideo] = useState<File | null>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const [moreGenders, setMoreGenders] = useState(() => MORE_GENDERS.some(([id]) => id === d.genderId))
  const [customPronouns, setCustomPronouns] = useState(() => !!d.pronouns && !PRONOUNS.includes(d.pronouns))

  useEffect(() => {
    if (!readDraft()) { router.replace('/welcome'); return }
    // The account comes first; the answers are saved to it when the last question is done
    supabase.auth.getSession().then(({ data: { session } }) => { if (!session) router.replace('/start/account'); else setUid(session.user.id) })
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

  // One question per screen, always starting at the first (index 0 → "1 of 4")
  const [q, setQ] = useState(0)
  const total = isCaster ? SIGNUP_QUESTIONS : PERFORMER_QUESTIONS
  const last = total - 1
  const [saving, setSaving] = useState(false)
  const step = Math.min(q, last)

  const minN = parseInt(d.minAge, 10), maxN = parseInt(d.maxAge, 10)
  const ageOk = !(minN && maxN && minN > maxN) && !(d.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(d.dateOfBirth))
  const valid = isCaster
    ? [d.firstName.trim().length > 0, d.companyName.trim().length > 0, true, true][step]
    : [d.firstName.trim().length > 0, d.crafts.length > 0, ageOk, true, true][step]

  const go = (to: number) => { setQ(to); window.scrollTo(0, 0) }
  const next = () => {
    if (!valid) { toast(step === 0 ? 'Add your name' : isCaster ? 'Add your company or production' : step === 2 ? 'Check your playing age — the first number should be the lower one' : 'Pick at least one'); return }
    if (step < last) go(step + 1)
    else finish()
  }
  const back = () => go(step - 1)

  // Last question → save everything to the account, then the plan step for this side
  const finish = async () => {
    setSaving(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace('/start/account'); return }
    const role = d.role
    const res = await applyDraft(session.user.id)
    if (!res.ok) { setSaving(false); toast('Couldn’t save your profile — check your connection and try again'); return }
    router.push('/start/plan?role=' + role)
  }
  const optional = step >= 2 // later questions can be filled in from Edit profile

  const pickVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 2 * 1024 * 1024 * 1024) { toast('That file is over 2GB — export a shorter clip'); return }
    if (!uid) { toast('One moment — still signing you in'); return }
    setShowReel(false)
    setVideo(f)
  }

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
      {title('A bit about you', 'Casting directors search by these. Your date of birth stays private.')}
      <p className="mb-2 mt-6 text-[13px] font-medium">Gender</p>
      <div className="flex flex-wrap gap-2">
        {[...GENDERS, ...(moreGenders ? MORE_GENDERS : [])].map(([id, label]) => (
          <Chip key={id} selected={d.genderId === id} onClick={() => update({ genderId: d.genderId === id ? null : id })}>{label}{d.genderId === id && ' ✓'}</Chip>
        ))}
        {!moreGenders && <Chip onClick={() => setMoreGenders(true)}>+ More</Chip>}
      </div>

      <p className="mb-2 mt-6 text-[13px] font-medium">Pronouns <span className="font-normal text-faint">shown next to your name</span></p>
      <div className="flex flex-wrap gap-2">
        {PRONOUNS.map(p => <Chip key={p} selected={!customPronouns && d.pronouns === p} onClick={() => { setCustomPronouns(false); update({ pronouns: d.pronouns === p ? '' : p }) }}>{p}</Chip>)}
        <Chip selected={customPronouns} onClick={() => { setCustomPronouns(v => !v); update({ pronouns: '' }) }}>Other</Chip>
      </div>
      {customPronouns && <Field className="mt-3" value={d.pronouns} maxLength={40} onChange={e => update({ pronouns: e.target.value })} placeholder="e.g. xe/xem" autoFocus />}

      <div className="mt-6 flex gap-3">
        <Field className="flex-1" label="Playing age from" inputMode="numeric" maxLength={2} value={d.minAge} onChange={e => update({ minAge: e.target.value.replace(/\D/g, '') })} placeholder="20" />
        <Field className="flex-1" label="to" inputMode="numeric" maxLength={2} value={d.maxAge} onChange={e => update({ maxAge: e.target.value.replace(/\D/g, '') })} placeholder="28" />
      </div>
      <Field className="mt-4" label="Date of birth" type="date" value={d.dateOfBirth} max={new Date().toISOString().slice(0, 10)} min="1920-01-01" onChange={e => update({ dateOfBirth: e.target.value })} />
      <p className="mt-1.5 text-[12px] text-muted">Private — never shown on your profile. Helps us keep under-18s safe.</p>
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
      {video && uid ? (
        <div className="mt-6">
          <VideoEditor key={video.name + video.size} uid={uid} source={video} onCancel={() => setVideo(null)}
            onDone={v => { update({ reelUrl: v.url || '', reelPoster: v.poster_url, reelDuration: v.duration_s }); setVideo(null); toast('Showreel added') }} />
        </div>
      ) : (
        <div className="upload mt-6 px-4 py-3.5">
          <div className="flex items-center gap-3">
            {d.reelPoster
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={d.reelPoster} alt="" className="h-10 w-16 shrink-0 rounded-lg object-cover" />
              : <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-tint text-purple-ink"><Icon name="video" /></span>}
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium">{d.reelUrl ? 'Showreel added' : 'Add your showreel'}</span>
              <span className="block truncate text-[13px] text-muted">{d.reelPoster ? 'Uploaded video' + (d.reelDuration ? ' · ' + Math.floor(d.reelDuration / 60) + ':' + String(Math.round(d.reelDuration % 60)).padStart(2, '0') : '') : d.reelUrl || 'Upload a video or paste a Vimeo / YouTube link'}</span>
            </span>
            {d.reelUrl && <button type="button" onClick={() => { update({ reelUrl: '', reelPoster: null, reelDuration: null }); setShowReel(false) }} className="text-sm font-medium text-muted">Remove</button>}
          </div>
          {!d.reelPoster && (
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => videoRef.current?.click()} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-surface text-sm font-medium shadow-card"><Icon name="upload" className="size-4" />Upload video</button>
              <button type="button" onClick={() => setShowReel(v => !v)} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-surface text-sm font-medium shadow-card"><Icon name="link" className="size-4" />{showReel ? 'Hide link' : 'Paste link'}</button>
            </div>
          )}
          {showReel && !d.reelPoster && <Field className="mt-3" type="url" inputMode="url" value={d.reelUrl} onChange={e => update({ reelUrl: e.target.value })} placeholder="https://vimeo.com/…" autoFocus />}
          <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={pickVideo} />
        </div>
      )}

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

      <div className="mt-5 flex items-start gap-3 rounded-[var(--radius)] bg-sand p-4">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lime text-forest"><Icon name="file" strokeWidth={2} className="size-[18px]" /></span>
        <p className="text-[13px] text-muted-strong"><span className="block text-[15px] font-semibold text-ink">Got a CV?</span>Once you’re in, upload it in Customise profile and we’ll fill in your credits, skills and training — including the CV from Spotlight or Mandy.</p>
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
        {/* No Back on question 1: the account already exists */}
        {step > 0
          ? <button type="button" aria-label="Back" onClick={back} className="-ml-1.5 inline-flex h-10 w-8 items-center justify-start rounded-md text-ink active:opacity-50 focus-visible:outline-2 focus-visible:outline-lime"><Icon name="chevron-left" className="size-6" /></button>
          : <span className="w-6" />}
        <Steps step={step + 1} total={total} />
        <span className="w-12 text-right text-[13px] tabular-nums text-muted">{step + 1} of {total}</span>
      </div>

      <div key={step} className="animate-[rc-step-in_240ms_ease-out]">
        {(isCaster ? caster : performer)[step]}
      </div>

      <div className="mt-auto space-y-3 pt-10">
        <Button size="lg" full trailingIcon="arrow-right" onClick={next} disabled={!valid || saving}>{saving ? 'Saving your profile…' : step === last ? 'Finish' : 'Continue'}</Button>
        {optional && !saving && <button type="button" onClick={next} className="w-full text-center text-sm font-medium text-muted">Skip for now</button>}
      </div>
    </>
  )
}
