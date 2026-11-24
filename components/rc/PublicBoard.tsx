'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import JobCard from '@/components/rc/JobCard'
import Typewriter from '@/components/rc/Typewriter'
import SiteNav from '@/components/site/Nav'
import { Empty, PageLoading, SearchField, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, jobMatchesQuery, jobSource, loadPosters, type Job } from '@/lib/rc/jobs'
import { toISODate } from '@/lib/rc/format'

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    let live = true
    supabase.auth.getSession().then(({ data: { session } }) => live && setSignedIn(!!session))
    return () => { live = false }
  }, [])
  return signedIn
}

// Same floating nav as the website, so the board and the site feel like one place
export function PublicTopBar() {
  return <SiteNav />
}

type Cat = 'all' | 'side' | 'casting' | 'community' | string
const dayKey = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  return days < 1 ? 'Today' : days < 7 ? 'This week' : days < 31 ? 'This month' : 'Earlier'
}

// The public front door: every live role, newest first, searchable — like a job board.
export default function PublicBoard() {
  const signedIn = useSignedIn()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<Cat>('all')
  const { data, loading } = useAsync(async () => {
    const today = toISODate(new Date())
    const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).eq('is_published', true)
      .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(300)
    const list = (jobs || []) as unknown as Job[]
    return { jobs: list, posters: await loadPosters(list.map(j => j.created_by)) }
  }, [])

  const jobs = useMemo(() => data?.jobs || [], [data])
  const cats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const j of jobs) if (!j.is_side_hustle && j.production_types?.name) counts.set(j.production_types.name, (counts.get(j.production_types.name) || 0) + 1)
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name)
  }, [jobs])
  const shown = jobs.filter(j => jobMatchesQuery(j, q) && (cat === 'all' || (cat === 'side' ? j.is_side_hustle
    : cat === 'casting' || cat === 'community' ? jobSource(j, data?.posters.get(j.created_by || '')) === cat
    : !j.is_side_hustle && j.production_types?.name === cat)))
  const groups = shown.reduce<{ label: string; jobs: Job[] }[]>((acc, j) => {
    const label = dayKey(j.created_at)
    const last = acc[acc.length - 1]
    if (last?.label === label) last.jobs.push(j); else acc.push({ label, jobs: [j] })
    return acc
  }, [])
  const chip = (value: Cat, label: string) => (
    <button key={value} type="button" onClick={() => setCat(value)} aria-pressed={cat === value}
      className={cx('h-9 shrink-0 rounded-full border px-4 text-sm font-medium transition', cat === value ? 'border-forest bg-forest text-white' : 'border-line bg-surface hover:border-ink/30')}>{label}</button>
  )

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <PublicTopBar />
      <section className="relative -mt-[68px] overflow-hidden bg-bg">
        <div className="mx-auto max-w-[1180px] px-5 pb-10 pt-28 md:px-8 md:pt-36">
          <p className="rise inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-[13px] font-medium shadow-card">
            <span className="size-2 rounded-full bg-lime ring-2 ring-forest/15" /> {loading ? 'Loading roles…' : jobs.length + ' live role' + (jobs.length === 1 ? '' : 's')}
          </p>
          <h1 className="mt-4 min-h-[3.15em] max-w-[680px] sm:min-h-[2.1em] text-[38px] leading-[1.05] sm:text-[52px]"><Typewriter text="Castings, auditions & paid work for " words={['performers', 'actors', 'dancers', 'singers', 'musicians']} /></h1>
          <p className="rise mt-3 max-w-[560px] text-[16px] text-muted" style={{ '--d': '900ms' } as React.CSSProperties}>Theatre, screen, commercials and dance — posted by casting directors and producers. Free to browse — join to apply.</p>
          <div className="rise mt-6 max-w-[560px]" style={{ '--d': '1050ms' } as React.CSSProperties}><SearchField value={q} onChange={setQ} placeholder="Search roles, shows, places…" /></div>
        </div>
      </section>

      <div className="sticky top-[68px] z-30 border-b border-line/70 bg-bg/90 backdrop-blur">
        <div className="scrollbar-none mx-auto flex max-w-[1180px] gap-2 overflow-x-auto px-5 py-3 md:px-8">
          {chip('all', 'All roles')}
          {chip('casting', 'From casting')}
          {chip('community', 'Community')}
          {cats.map(c => chip(c, c))}
          {jobs.some(j => j.is_side_hustle) && chip('side', 'Side hustles')}
        </div>
      </div>

      <main className="mx-auto max-w-[1180px] px-5 pb-16 md:px-8 lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        <div>
          {loading ? <PageLoading /> : shown.length === 0 ? (
            <div className="pt-10"><Empty icon="search" title="No roles match" sub="Try a different search or category." /></div>
          ) : groups.map(g => (
            <section key={g.label}>
              <h2 className="mb-3 mt-7 text-xs font-semibold uppercase tracking-[0.1em] text-muted">{g.label}</h2>
              <ul className="rise-stagger space-y-3">
                {g.jobs.map(j => <JobCard key={j.id} job={j} poster={data?.posters.get(j.created_by || '')} href={(signedIn ? '/find/' : '/jobs/') + j.id} />)}
              </ul>
            </section>
          ))}
        </div>

        <aside className="rise mt-8 space-y-4 lg:sticky lg:top-32 lg:mt-7 lg:self-start">
          {!signedIn && (
            <div className="relative overflow-hidden rounded-[24px] p-6 text-white" style={{ backgroundImage: 'var(--panel-forest)' }}>
              <p className="font-display text-[22px] font-bold leading-tight">Get matched to roles</p>
              <p className="mt-2 text-sm text-white/75">Build your profile once — showreel, credits, CV — and get an alert when a role fits you.</p>
              <Link href="/start?role=performer" className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-lime text-[15px] font-semibold text-ink transition-colors hover:bg-bg">Join · 7 days free</Link>
            </div>
          )}
          <div className="rounded-[24px] bg-sand p-6">
            <p className="flex items-center gap-2 text-[15px] font-semibold"><Icon name="megaphone" className="size-5 text-green-ink" /> Casting a show?</p>
            <p className="mt-1.5 text-sm text-muted">Post a role, review reels and self-tapes, and book your cast in one place.</p>
            <Link href={signedIn ? '/postings/new' : '/welcome?side=cast'} className="mt-3 inline-flex text-sm font-semibold text-green-ink">Post a casting →</Link>
          </div>
        </aside>
      </main>
    </div>
  )
}
