'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import JobCard from '@/components/rc/JobCard'
import { cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, loadPosters, type Job } from '@/lib/rc/jobs'
import { toISODate } from '@/lib/rc/format'

// Full-bleed roles carousel: starts on the page grid, runs off the right edge of the screen.
// Gutter = the space left of the 1180px container, so the first card lines up with the headings.
const GUTTER = 'max(20px, calc((100vw - 1180px) / 2 + 32px))'

export default function RolesCarousel({ limit = 10 }: { limit?: number }) {
  const track = useRef<HTMLUListElement>(null)
  const [pos, setPos] = useState({ p: 0, start: true, end: false })
  const { data } = useAsync(async () => {
    const today = toISODate(new Date())
    const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).eq('is_published', true)
      .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(limit)
    const list = (jobs || []) as unknown as Job[]
    return { jobs: list, posters: await loadPosters(list.map(j => j.created_by)) }
  }, [limit])

  useEffect(() => {
    const t = track.current
    if (!t) return
    const on = () => { const max = t.scrollWidth - t.clientWidth; setPos({ p: max > 0 ? t.scrollLeft / max : 0, start: t.scrollLeft < 4, end: t.scrollLeft > max - 4 }) }
    on(); t.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on)
    return () => { t.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [data])
  const go = (dir: number) => track.current?.scrollBy({ left: dir * Math.min(track.current.clientWidth * 0.8, 760), behavior: 'smooth' })
  const arrow = (dir: number, disabled: boolean) => (
    <button type="button" aria-label={dir < 0 ? 'Previous roles' : 'Next roles'} onClick={() => go(dir)} disabled={disabled}
      className="group inline-flex size-14 items-center justify-center rounded-full border border-ink/15 bg-surface text-ink shadow-[0_10px_24px_-16px_rgb(18_49_39/0.5)] transition duration-300 hover:scale-105 hover:border-forest hover:bg-forest hover:text-lime disabled:pointer-events-none disabled:opacity-35">
      <Icon name={dir < 0 ? 'arrow-left' : 'arrow-right'} className="size-5 transition duration-300 group-hover:translate-x-0.5" />
    </button>
  )

  return (
    <div>
      <ul ref={track} style={{ paddingLeft: GUTTER, paddingRight: GUTTER, scrollPaddingLeft: GUTTER }}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto pb-6 pt-2 [&>li]:w-[82vw] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[380px]">
        {data ? data.jobs.map(j => <JobCard key={j.id} job={j} poster={data.posters.get(j.created_by || '')} href={'/jobs/' + j.id} />)
          : Array.from({ length: 4 }).map((_, i) => <li key={i} className="h-[150px] animate-pulse rounded-[var(--radius)] bg-chip" />)}
        <li>
          <Link href="/jobs" className="group flex h-full min-h-[150px] flex-col justify-between rounded-[var(--radius)] bg-forest p-6 text-white">
            <span className="text-[20px] font-semibold leading-tight">See every<br />live role</span>
            <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-lime">Browse the board <Icon name="arrow-right" className="size-4 transition group-hover:translate-x-1" /></span>
          </Link>
        </li>
      </ul>
      <div className="mx-auto mt-4 flex max-w-[1180px] items-center gap-6 px-5 md:px-8">
        <div className="flex gap-3">{arrow(-1, pos.start)}{arrow(1, pos.end)}</div>
        <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden>
          <div className={cx('absolute inset-y-0 left-0 rounded-full bg-forest transition-[width] duration-200')} style={{ width: Math.max(8, pos.p * 100) + '%' }} />
        </div>
      </div>
    </div>
  )
}
