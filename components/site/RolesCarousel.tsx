'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Avatar, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, closesLabel, jobSource, loadPosters, posterName, type Job, type Poster } from '@/lib/rc/jobs'
import { jobTitle } from '@/lib/rc/pipeline'
import { payLabel } from '@/lib/rc/pay'
import { toISODate } from '@/lib/rc/format'

// Full-bleed roles carousel for the homepage: Roles | Side hustles toggle, inviting cards with pay,
// "N applied" and closing date, and it opens a couple of cards in so the row fills the screen edge to edge.
const GUTTER = 'max(20px, calc((100vw - 1180px) / 2 + 32px))'
type Kind = 'roles' | 'side'

// Soft colour per production type so the row has rhythm
const TONES = ['bg-mint', 'bg-butter', 'bg-blossom', 'bg-chip']
const toneOf = (s: string) => TONES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length]

function RoleCard({ j, poster, applied }: { j: Job; poster?: Poster; applied: number }) {
  const pay = payLabel(j)
  const closes = closesLabel(j)
  const type = j.is_side_hustle ? 'Side hustle' : j.production_types?.name || 'Casting'
  const who = posterName(j, poster)
  const community = jobSource(j, poster) === 'community'
  return (
    <li>
      <Link href={'/jobs/' + j.id} className="group flex h-full flex-col rounded-[24px] bg-sand p-6 transition duration-500 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-1 hover:shadow-[0_28px_50px_-30px_rgb(18_49_39/0.45)]">
        <div className="flex items-center justify-between gap-3">
          <span className={cx('rounded-[10px] px-3 py-1.5 text-[13px] font-semibold text-ink', toneOf(type))}>{type}</span>
          {closes && closes !== 'Closed' && <span className="text-[12px] font-medium text-muted">{closes}</span>}
        </div>
        <p className="mt-4 font-display text-[22px] font-bold leading-[1.15] tracking-[-0.01em] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">{jobTitle(j)}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[14px] text-muted"><Icon strokeWidth={2} name="pin" className="size-3.5 shrink-0" /><span className="truncate">{j.location || 'Location TBC'}</span></p>
        <div className="mt-5 flex items-end justify-between gap-3 rounded-[16px] bg-surface p-4">
          <div>
            <p className="font-display text-[24px] font-bold leading-none tracking-[-0.02em]">{pay || 'Unpaid / TBC'}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-green-ink">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-green" /></span>
              {applied > 0 ? applied + ' applied' : 'Be the first to apply'}
            </p>
          </div>
        </div>
        <div className="mt-auto flex items-center gap-2.5 pt-5">
          <Avatar src={poster?.picture_url} name={who} size={28} />
          <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{community ? 'Community · ' : ''}{who}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-green-ink opacity-0 transition duration-300 group-hover:opacity-100">View role <Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-3.5" /></span>
        </div>
      </Link>
    </li>
  )
}

export default function RolesCarousel({ limit = 12 }: { limit?: number }) {
  const track = useRef<HTMLUListElement>(null)
  const [kind, setKind] = useState<Kind>('roles')
  const [pos, setPos] = useState({ p: 0, start: true, end: false })
  const { data } = useAsync(async () => {
    const today = toISODate(new Date())
    const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).eq('is_published', true).eq('is_side_hustle', kind === 'side')
      .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(limit)
    const list = (jobs || []) as unknown as Job[]
    const [posters, { data: counts }] = await Promise.all([
      loadPosters(list.map(j => j.created_by)),
      list.length ? supabase.rpc('job_application_counts', { ids: list.map(j => j.id) }) : Promise.resolve({ data: [] }),
    ])
    const applied = new Map(((counts || []) as { job_id: string; applied: number }[]).map(c => [c.job_id, c.applied]))
    return { jobs: list, posters, applied }
  }, [kind, limit])

  // Open a couple of cards in, so cards fill the left of the screen as well as the right
  useLayoutEffect(() => {
    const t = track.current
    if (!t || !data?.jobs.length) return
    const cards = t.children
    const target = cards[Math.min(2, cards.length - 1)] as HTMLElement | undefined
    if (target && data.jobs.length > 3) t.scrollLeft = target.offsetLeft - (cards[0] as HTMLElement).offsetLeft
    else t.scrollLeft = 0
  }, [data])

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
      className="group inline-flex size-12 items-center justify-center rounded-[14px] border border-line-strong bg-bg text-ink transition-colors duration-300 hover:border-forest hover:bg-forest hover:text-lime disabled:pointer-events-none disabled:opacity-35">
      <Icon strokeWidth={2} name={dir < 0 ? 'arrow-left' : 'arrow-right'} className="size-5" />
    </button>
  )

  return (
    <div>
      <div className="mx-auto mb-6 flex max-w-[1180px] px-5 md:px-8">
        <div role="tablist" aria-label="Type of work" className="inline-flex rounded-full border border-line bg-surface p-1">
          {([['roles', 'Casting roles'], ['side', 'Side hustles']] as const).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={kind === v} onClick={() => setKind(v)}
              className={cx('h-10 rounded-full px-5 text-[14px] font-semibold transition-colors duration-300', kind === v ? 'bg-forest text-white' : 'text-muted hover:text-ink')}>{l}</button>
          ))}
        </div>
      </div>
      <ul ref={track} style={{ paddingLeft: GUTTER, paddingRight: GUTTER, scrollPaddingLeft: GUTTER }}
        className="scrollbar-none flex snap-x snap-mandatory gap-5 overflow-x-auto pb-8 pt-2 [&>li]:w-[82vw] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[360px]">
        {data ? <>
          {data.jobs.map(j => <RoleCard key={j.id} j={j} poster={data.posters.get(j.created_by || '')} applied={data.applied.get(j.id) || 0} />)}
          <li>
            <Link href={kind === 'side' ? '/jobs' : '/jobs'} className="group flex h-full min-h-[260px] flex-col justify-between rounded-[14px] bg-forest p-6 text-white">
              <span className="text-[24px] font-semibold leading-tight">See every<br />live {kind === 'side' ? 'side hustle' : 'role'}</span>
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-lime">Browse the board <Icon strokeWidth={2} name="arrow-right" className="cta-arrow size-4" /></span>
            </Link>
          </li>
        </> : Array.from({ length: 5 }).map((_, i) => <li key={i} className="h-[260px] animate-pulse rounded-[14px] bg-chip" />)}
      </ul>
      <div className="mx-auto mt-2 flex max-w-[1180px] items-center gap-6 px-5 md:px-8">
        <div className="flex gap-3">{arrow(-1, pos.start)}{arrow(1, pos.end)}</div>
        <div className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-ink/10" aria-hidden>
          <div className="absolute inset-y-0 left-0 rounded-full bg-forest transition-[width] duration-200" style={{ width: Math.max(8, pos.p * 100) + '%' }} />
        </div>
      </div>
    </div>
  )
}
