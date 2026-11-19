'use client'

import Link from 'next/link'
import Icon from './Icon'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'

// Performer Home: a clear way in to posting a job, and — once they have — to their postings dashboard.
export default function HiringCard() {
  const { id } = useMe()
  const { data } = useAsync(async () => {
    const { data: jobs } = await supabase.from('jobs').select('id, is_published').eq('created_by', id)
    const ids = (jobs || []).map(j => j.id)
    const { count } = ids.length
      ? await supabase.from('applications').select('id', { count: 'exact', head: true }).in('job_id', ids).eq('status', 'submitted').is('outcome', null)
      : { count: 0 }
    return { posted: ids.length, live: (jobs || []).filter(j => j.is_published).length, toReview: count || 0 }
  }, [id])
  if (!data) return <div className="mt-4 h-[76px] animate-pulse rounded-[var(--radius)] bg-chip" />

  if (!data.posted) return (
    <Link href="/postings/new" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-ink"><Icon name="megaphone" className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">Casting or hiring?</span>
        <span className="block text-[13px] text-muted">Post a role and review applicants</span>
      </span>
      <span className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-forest px-3.5 text-[13px] font-semibold text-white"><Icon name="plus" className="size-4" />Post a job</span>
    </Link>
  )

  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius)] bg-forest text-white shadow-card">
      <Link href="/postings" className="flex items-center gap-3 p-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-ink"><Icon name="megaphone" className="size-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold">Your postings</span>
          <span className="block text-[13px] text-white/70">{data.live} live · {data.toReview ? data.toReview + ' new applicant' + (data.toReview === 1 ? '' : 's') + ' to review' : 'no new applicants yet'}</span>
        </span>
        {data.toReview > 0 && <span className="rounded-full bg-lime px-2.5 py-0.5 text-[13px] font-semibold text-ink">{data.toReview}</span>}
        <Icon name="chevron-right" className="size-5 text-white/60" />
      </Link>
      <Link href="/postings/new" className="flex items-center justify-center gap-1.5 border-t border-white/10 py-2.5 text-[13px] font-semibold text-lime"><Icon name="plus" className="size-4" />Post another job</Link>
    </div>
  )
}
