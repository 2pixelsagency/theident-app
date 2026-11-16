'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import JobCard from './JobCard'
import { Avatar } from './ui'
import { supabase } from '@/lib/supabase'
import { fullName } from '@/lib/rc/format'
import { JOB_SELECT, loadPosters, type Job, type Poster } from '@/lib/rc/jobs'
import { toISODate } from '@/lib/rc/format'
import { ProfileSafety, heroRound, type ProfileViewProps } from './ProfileView'

type Stats = { live: number; posted: number; booked: number }

// A casting director / production company page: who they are, what they're casting now, what they've cast.
export default function CastingProfile({ data, owner, onBack, onShare, topRight, actions, statusLine, below, signedIn }: ProfileViewProps) {
  const p = data.profile!
  const { credits, brands, testimonials } = data
  const company = p.company_name || fullName(p) || 'Casting'
  const person = [fullName(p), p.what_i_do || 'Casting director'].filter(Boolean).join(' · ')
  const [extra, setExtra] = useState<{ stats: Stats; jobs: Job[]; posters: Map<string, Poster> } | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      const today = toISODate(new Date())
      const [{ data: stats }, { data: jobs }] = await Promise.all([
        supabase.rpc('casting_stats', { pid: p.id }),
        supabase.from('jobs').select(JOB_SELECT).eq('created_by', p.id).eq('is_published', true).or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(10),
      ])
      const list = (jobs || []) as unknown as Job[]
      const posters = await loadPosters([p.id])
      const st = (Array.isArray(stats) ? stats[0] : stats) as Stats | null
      if (live) setExtra({ stats: st || { live: list.length, posted: list.length, booked: 0 }, jobs: list, posters })
    })()
    return () => { live = false }
  }, [p.id])

  const site = p.website ? p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : null
  const head = (title: string, edit: string, count?: number) => (
    <div className="mb-3 mt-8 flex items-center justify-between">
      <h2 className="text-[18px]">{title}</h2>
      {owner && <Link href={'/me/edit#' + edit} className="inline-flex items-center gap-1 text-sm font-semibold text-green-ink"><Icon name={count ? 'pen' : 'plus'} className="size-3.5" />{count ? 'Edit' : 'Add'}</Link>}
    </div>
  )

  return (
    <>
      <section className="relative bg-surface lg:rounded-b-[28px]">
        <div className="relative aspect-[16/7] max-h-[42dvh] w-full overflow-hidden bg-hero lg:rounded-b-[28px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.banner_url && <img src={p.banner_url} alt="" className="absolute inset-0 size-full object-cover" />}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-dark/50 to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-4 pt-[max(14px,env(safe-area-inset-top))]">
            {onBack ? <button type="button" aria-label="Back" onClick={onBack} className={heroRound}><Icon name="chevron-left" /></button> : <span />}
            <div className="flex gap-2">
              <button type="button" aria-label="Share" onClick={onShare} className={heroRound}><Icon name="share" className="size-5" /></button>
              {topRight}
            </div>
          </div>
        </div>

        <div className="relative px-5 pb-6">
          <div className="-mt-12 flex items-end justify-between gap-3">
            <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-surface shadow-card ring-4 ring-surface">
              {p.picture_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={p.picture_url} alt={company} className="size-full object-cover" />
                : <Avatar name={company} size={96} className="rounded-[22px]" />}
            </span>
            {p.is_verified && <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-mint px-3 py-1 text-[12px] font-semibold text-ink"><Icon name="shield-check" className="size-3.5" /> Verified casting</span>}
          </div>
          <h1 className="mt-4 flex items-center gap-2 text-[30px] leading-tight">{company}</h1>
          <p className="mt-1 text-[15px] text-muted">{person}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {p.location && <span className="inline-flex items-center gap-1"><Icon name="pin" className="size-4" />{p.location}</span>}
            {site && <a href={p.website!} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-green-ink"><Icon name="globe" className="size-4" />{site}</a>}
          </div>
          {!!p.specialisms?.length && (
            <div className="mt-3 flex flex-wrap gap-2">{p.specialisms.map(s => <span key={s} className="rounded-full bg-chip px-3 py-1 text-[13px] font-medium">{s}</span>)}</div>
          )}
          {actions && <div className="mt-5 flex gap-3 [&>*]:!border-line [&>*]:!text-ink [&>a:first-child]:!bg-forest [&>a:first-child]:!text-white [&>button:first-child]:!bg-forest [&>button:first-child]:!text-white">{actions}</div>}
          {statusLine && <p className="mt-3 text-xs text-muted">{statusLine}</p>}
        </div>
      </section>

      <div className="px-4 pb-10">
        {below}

        <div className="mt-5 grid grid-cols-3 gap-2">
          {([['Casting now', extra?.stats.live], ['Roles posted', extra?.stats.posted], ['Performers booked', extra?.stats.booked]] as const).map(([k, v]) => (
            <div key={k} className="rounded-[var(--radius)] border border-line bg-surface p-3 text-center shadow-card">
              <p className="text-[24px] font-semibold leading-none">{v ?? '–'}</p>
              <p className="mt-1 text-[12px] text-muted">{k}</p>
            </div>
          ))}
        </div>

        <div className="mb-3 mt-8 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[18px]">Casting now {!!extra?.jobs.length && <span className="rounded-full bg-lime px-2 py-0.5 text-[12px] font-semibold text-ink">{extra.jobs.length}</span>}</h2>
          {owner && <Link href="/postings/new" className="inline-flex items-center gap-1 text-sm font-semibold text-green-ink"><Icon name="plus" className="size-3.5" />Post a role</Link>}
        </div>
        {!extra ? <div className="h-28 animate-pulse rounded-[var(--radius)] bg-chip" /> : extra.jobs.length ? (
          <ul className="space-y-3">{extra.jobs.map(j => <JobCard key={j.id} job={j} poster={extra.posters.get(p.id)} href={signedIn ? undefined : '/jobs/' + j.id} />)}</ul>
        ) : <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{owner ? 'Nothing live right now — post a role and it shows here.' : 'No open roles right now.'}</p>}

        {(p.bio || owner) && (<>
          {head('About', 'about', p.bio ? 1 : 0)}
          {p.bio ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{p.bio}</p>
            : <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">Tell performers who you are, what you cast and how you like to work.</p>}
        </>)}

        {(credits.length > 0 || owner) && (<>
          {head('Productions', 'credits', credits.length)}
          {credits.length ? (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
              {credits.map(c => (
                <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">{c.title}</span><span className="block text-[13px] text-muted">{[c.production_types?.name, c.production_company].filter(Boolean).join(' · ')}</span></span>
                  {c.year && <span className="text-sm text-faint">{c.year}</span>}
                </li>
              ))}
            </ul>
          ) : <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">Shows, films and campaigns you’ve cast.</p>}
        </>)}

        {(brands.length > 0 || owner) && (<>
          {head('Worked with', 'brands', brands.length)}
          {brands.length ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {brands.map(b => (
                <div key={b.id} className="flex aspect-[3/2] items-center justify-center rounded-xl border border-line bg-surface p-3 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.logo_url ? <img src={b.logo_url} alt={b.brand_name} className="max-h-9 max-w-full object-contain grayscale" /> : <span className="font-display text-[15px] font-bold leading-tight">{b.brand_name}</span>}
                </div>
              ))}
            </div>
          ) : <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">Theatres, broadcasters and brands you cast for.</p>}
        </>)}

        {(testimonials.length > 0 || owner) && (<>
          {head('What performers say', 'testimonials', testimonials.length)}
          {testimonials.length ? (
            <div className="scrollbar-none -mx-4 flex snap-x gap-3 overflow-x-auto px-4">
              {testimonials.map(t => (
                <figure key={t.id} className="w-[85%] shrink-0 snap-start rounded-[var(--radius)] bg-forest p-5 text-white sm:w-[70%]">
                  <span aria-hidden className="font-display text-5xl leading-none text-lime">“</span>
                  <blockquote className="-mt-3 text-[16px] leading-relaxed">{t.quote}</blockquote>
                  <figcaption className="mt-4"><span className="block text-sm font-semibold">{t.author_name}</span>{t.author_title && <span className="block text-[13px] text-white/65">{t.author_title}</span>}</figcaption>
                </figure>
              ))}
            </div>
          ) : <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">Kind words from performers you’ve worked with build trust.</p>}
        </>)}

        {!owner && signedIn && <ProfileSafety id={p.id} name={company} />}
      </div>
    </>
  )
}
