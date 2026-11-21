'use client'

import { useRef } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import JobCard from '@/components/rc/JobCard'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, loadPosters, type Job } from '@/lib/rc/jobs'
import { toISODate } from '@/lib/rc/format'

// Live roles as a snap carousel with arrow controls
export default function RolesCarousel({ limit = 10 }: { limit?: number }) {
  const track = useRef<HTMLUListElement>(null)
  const { data } = useAsync(async () => {
    const today = toISODate(new Date())
    const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).eq('is_published', true)
      .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(limit)
    const list = (jobs || []) as unknown as Job[]
    return { jobs: list, posters: await loadPosters(list.map(j => j.created_by)) }
  }, [limit])
  const go = (dir: number) => track.current?.scrollBy({ left: dir * Math.min(track.current.clientWidth * 0.9, 760), behavior: 'smooth' })

  return (
    <div>
      <ul ref={track} className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 md:-mx-8 md:scroll-px-8 md:px-8 [&>li]:w-[86%] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[360px]">
        {data ? data.jobs.map(j => <JobCard key={j.id} job={j} poster={data.posters.get(j.created_by || '')} href={'/jobs/' + j.id} />)
          : Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-[132px] animate-pulse rounded-[var(--radius)] bg-chip" />)}
        <li>
          <Link href="/jobs" className="flex h-full min-h-[132px] flex-col justify-between rounded-[var(--radius)] bg-forest p-5 text-white">
            <span className="text-[17px] font-semibold">See every live role</span>
            <span className="inline-flex items-center gap-1 text-[14px] font-semibold text-lime">Browse the board <Icon name="arrow-right" className="size-4" /></span>
          </Link>
        </li>
      </ul>
      <div className="mt-6 flex gap-2">
        <button type="button" aria-label="Previous roles" onClick={() => go(-1)} className="inline-flex size-11 items-center justify-center rounded-[10px] border border-line bg-surface transition hover:border-ink/30"><Icon name="chevron-left" className="size-5" /></button>
        <button type="button" aria-label="Next roles" onClick={() => go(1)} className="inline-flex size-11 items-center justify-center rounded-[10px] border border-line bg-surface transition hover:border-ink/30"><Icon name="chevron-right" className="size-5" /></button>
      </div>
    </div>
  )
}
