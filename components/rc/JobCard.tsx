'use client'

import Link from 'next/link'
import Icon from './Icon'
import { Tag, cx } from './ui'
import { fairPay, payLabel, type PayJob } from '@/lib/rc/pay'
import { closesLabel, lengthLabel, posterName, type Job, type Poster } from '@/lib/rc/jobs'
import { jobTitle } from '@/lib/rc/pipeline'

export function VerifiedTick({ className = 'size-[18px]' }: { className?: string }) {
  return (
    <span title="Verified employer" className={cx('inline-flex shrink-0 items-center justify-center rounded-full bg-green text-white', className)}>
      <Icon name="check" className="size-[65%]" strokeWidth={3} />
    </span>
  )
}

export function FairPayBadge({ job, compact }: { job: PayJob; compact?: boolean }) {
  const fp = fairPay(job)
  if (fp === 'fair') return <span className="inline-flex items-center gap-1 rounded-md bg-green-tint px-2 py-1 text-xs font-medium text-green-ink"><Icon name="shield-check" className="size-3.5" />{compact ? 'Fair' : 'Fair pay'}</span>
  if (fp === 'below_min_wage') return <span className="inline-flex items-center gap-1 rounded-md bg-red-tint px-2 py-1 text-xs font-medium text-red"><Icon name="alert" className="size-3.5" />Below min wage</span>
  return null
}

export default function JobCard({ job, poster, saved, onToggleSave }: { job: Job; poster?: Poster; saved?: boolean; onToggleSave?: () => void }) {
  const pay = payLabel(job)
  const side = job.is_side_hustle
  const sub = side
    ? [poster?.is_verified ? posterName(job, poster) : 'Posted by a member', job.location].filter(Boolean).join(' · ')
    : [job.production_types?.name, job.location].filter(Boolean).join(' · ')
  const tags = side
    ? [job.commitment_level, job.schedule].filter(Boolean)
    : [lengthLabel(job), job.project_role?.split(/[ /]/)[0]].filter(Boolean)
  const closes = closesLabel(job)

  return (
    <li className="relative rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
      <Link href={'/find/' + job.id} className="block pr-8">
        <span className="flex items-center gap-1.5">
          <span className="text-[17px] font-medium leading-snug">{jobTitle(job)}</span>
          {poster?.is_verified && <VerifiedTick />}
        </span>
        <span className="mt-0.5 block text-[13px] text-muted">{sub}</span>
        <span className="mt-3 flex flex-wrap gap-2">
          {pay && <Tag tone={side ? 'purple' : 'neutral'}>{pay}</Tag>}
          {tags.slice(0, 2).map(t => <Tag key={t as string}>{t}</Tag>)}
          <FairPayBadge job={job} compact />
          {closes && !side && closes !== 'Closed' && <span className="self-center text-xs text-muted">{closes}</span>}
        </span>
      </Link>
      {onToggleSave && (
        <button type="button" onClick={onToggleSave} aria-pressed={saved} aria-label={saved ? 'Remove from saved' : 'Save job'}
          className={cx('absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full', saved ? 'text-green' : 'text-faint')}>
          <Icon name="bookmark" className={cx('size-5', saved && 'fill-current')} />
        </button>
      )}
    </li>
  )
}
