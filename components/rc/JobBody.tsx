'use client'

import Icon from '@/components/rc/Icon'
import { FairPayBadge, VerifiedTick } from '@/components/rc/JobCard'
import { Avatar, Card } from '@/components/rc/ui'
import { closesLabel, lengthLabel, posterName, skillsOf, type Job, type Poster } from '@/lib/rc/jobs'
import { ago, fmtDate } from '@/lib/rc/format'
import { payLabel } from '@/lib/rc/pay'
import { jobTitle } from '@/lib/rc/pipeline'

const MATERIAL: Record<string, { icon: string; label: string }> = {
  showreel: { icon: 'video', label: 'Showreel' },
  self_tape: { icon: 'play', label: 'Self-tape' },
  headshots: { icon: 'image', label: 'Headshots' },
  cv: { icon: 'file', label: 'CV' },
}

// The listing itself — shared by the in-app detail (/find/[id]) and the public page (/jobs/[id])
export default function JobBody({ j, poster, posted }: { j: Job; poster?: Poster; posted: number }) {
  const pay = payLabel(j)
  const length = lengthLabel(j)
  const closes = closesLabel(j)
  const skills = skillsOf(j)
  const materials = (j.submit_materials || ['showreel']).filter(m => MATERIAL[m])
  const lookingFor = [j.age_range && 'Playing age ' + j.age_range, j.gender_requirement, ...skills].filter(Boolean) as string[]
  const tiles = ([
    [j.is_side_hustle ? 'Category' : 'Contract', j.is_side_hustle ? j.job_category : [j.production_types?.name, length].filter(Boolean).join(' · ')],
    [j.is_side_hustle ? 'When' : 'Where', j.is_side_hustle ? j.schedule || j.commitment_level : j.location],
    ['Starts', j.start_date ? fmtDate(j.start_date, { month: 'short', year: 'numeric' }) : j.contract_dates],
    ['Closes', closes ? closes.replace('Closes ', '') : 'Open'],
  ] as const).filter(([, v]) => !!v)
  return (
    <>
        {j.is_demo && <p className="mt-4 flex items-center gap-2 rounded-xl bg-butter px-4 py-3 text-[13px] font-medium text-ink"><Icon name="alert" className="size-4 shrink-0" /> Demo listing — used to show how The Ident works. It isn’t a real role.</p>}
        <h1 className="mt-5 flex items-center gap-2 text-[24px]">{jobTitle(j)} {poster?.is_verified && <VerifiedTick className="size-5" />}</h1>
        <p className="mt-1 text-sm text-muted">{posterName(j, poster)} · posted {ago(j.created_at)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {pay && <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">{pay}</span>}
          {length && <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">{length}</span>}
          {j.location && <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">{j.location}</span>}
          <FairPayBadge job={j} />
        </div>

        {tiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {tiles.map(([k, v]) => <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-[15px] font-medium">{v}</p></Card>)}
          </div>
        )}

        {(j.description || j.short_summary) && (
          <>
            <h2 className="mb-2 mt-6 text-[18px]">The brief</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{j.description || j.short_summary}</p>
          </>
        )}

        {lookingFor.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Who they’re looking for</h2>
            <div className="flex flex-wrap gap-2">{lookingFor.map(t => <span key={t} className="rounded-full bg-green-tint px-3 py-1.5 text-[13px] text-green-ink">{t}</span>)}</div>
            {j.appearance_notes && <p className="mt-3 text-sm text-muted">{j.appearance_notes}</p>}
          </>
        )}

        {!j.is_side_hustle && materials.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">What to submit</h2>
            <div className="grid grid-cols-2 gap-3">
              {materials.map(m => <Card key={m} className="flex items-center gap-2 px-4 py-3 text-sm font-medium"><Icon name={MATERIAL[m].icon} className="size-[18px]" />{MATERIAL[m].label}</Card>)}
            </div>
            {j.requires_nda && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Icon name="lock" className="size-4" /> You’ll sign an NDA when you apply</p>}
          </>
        )}

        <Card className="mt-6 flex items-center gap-3 p-4">
          <Avatar src={poster?.picture_url} name={posterName(j, poster)} size={48} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-medium">{posterName(j, poster)} {poster?.is_verified && <VerifiedTick className="size-4" />}</p>
            <p className="text-[13px] text-muted">{poster?.is_verified ? 'Verified employer' : 'Community post'} · {posted} role{posted === 1 ? '' : 's'} posted</p>
          </div>
        </Card>
        {!poster?.is_verified && j.is_side_hustle && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-tint px-4 py-3 text-[13px] text-amber"><Icon name="alert" className="mt-0.5 size-4 shrink-0" /> Community post — not a verified employer. Meet somewhere public and never pay to apply.</p>
        )}
    </>
  )
}
