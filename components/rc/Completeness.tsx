'use client'

import Link from 'next/link'
import Icon from './Icon'
import { cx } from './ui'
import { loadCompleteness, type completeness } from '@/lib/rc/completeness'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'

type Result = ReturnType<typeof completeness>

// "Profile 60% complete" with the next most useful things to add. Nudges, never blocks.
export default function CompletenessCard({ result, compact, className }: { result: Result; compact?: boolean; className?: string }) {
  const { score, next } = result
  if (score >= 100) return null
  const shown = next.slice(0, compact ? 2 : 3)
  return (
    <div className={cx('rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card', className)}>
      <div className="flex items-center gap-3">
        <span className="relative flex size-12 shrink-0 items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" strokeWidth="3.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--forest)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${(score / 100) * 97.4} 97.4`} />
          </svg>
          <span className="text-[13px] font-semibold">{score}%</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Profile {score}% complete</p>
          <p className="text-[13px] text-muted">Complete profiles get seen by more casting teams.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {shown.map(i => (
          <Link key={i.key} href={i.href} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-mint px-3 text-[13px] font-medium text-forest focus-visible:outline-2 focus-visible:outline-forest">
            <Icon name="plus" className="size-3.5" />{i.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

// Home dashboard: compact nudge, hidden at 100%
export function HomeCompleteness() {
  const { id } = useMe()
  const { data } = useAsync(() => loadCompleteness(id), [id])
  if (!data || data.score >= 100) return null
  return <div className="px-4 pt-3"><CompletenessCard result={data} compact /></div>
}
