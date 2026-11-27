'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import BrandMarquee from './BrandMarquee'
import AgentDock from './AgentDock'
import { VerifiedTick } from './JobCard'
import { Avatar, cx, toast } from './ui'
import { GENDER_NAMES, HeroMedia, SkillGroups } from './ProfileView'
import { fullName } from '@/lib/rc/format'
import { craftTag, graduateLabel, playingAge } from '@/lib/rc/talent'
import type { Credit, FullProfileData } from '@/lib/rc/profile'

// The public, shareable profile on the website (theident.me/performers/<slug>): a personal portfolio
// rather than the in-app LinkedIn-style view. Name and pitch on the left, showreel on the right, then
// numbers, credits, skills, gallery and what directors say — with a few gentle animations.
export default function PortfolioProfile({ data, onShare }: { data: FullProfileData; onShare: () => void }) {
  const p = data.profile!
  const { reels, skills, credits, brands, testimonials, gallery, training, hair, eyes } = data
  const name = fullName(p) || 'Performer'
  const words = name.split(/\s+/)
  const craft = craftTag(p)
  const grad = graduateLabel(p)
  const pitch = p.summary || (p.bio && p.bio.length < 260 ? p.bio : p.bio?.split(/(?<=[.!?])\s/).slice(0, 2).join(' '))
  const [busy, setBusy] = useState(false)

  const downloadCv = async () => {
    setBusy(true)
    try { const { downloadCv } = await import('@/lib/rc/cv'); await downloadCv(data) } catch { toast('Couldn’t create the CV — try again') }
    setBusy(false)
  }

  // Honest numbers from their profile (only shown when there's something to count)
  const years = credits.map(c => Number(c.year)).filter(y => y > 1950)
  const since = years.length ? Math.min(...years) : null
  const stats = [
    { n: credits.length, label: credits.length === 1 ? 'Credit' : 'Credits' },
    { n: since ? new Date().getFullYear() - since : 0, label: 'Years performing', plus: true },
    { n: skills.length, label: 'Skills' },
    { n: brands.length, label: 'Brands & companies' },
  ].filter(s => s.n > 0)

  const facts = ([
    ['Playing age', playingAge(p)], ['Height', p.height], ['Based in', p.location], ['Also based in', p.extra_locations?.join(', ')],
    ['Gender', GENDER_NAMES[p.gender_id ?? 0]], ['Eyes', eyes.find(e => e.id === p.eye_colour_id)?.name],
    ['Hair', [hair.find(h => h.id === p.hair_colour_id)?.name, p.hair_length].filter(Boolean).join(' · ')],
    ['Vocal range', p.vocal_range], ['Nationality', p.nationalities?.join(', ')], ['Age', data.age != null && p.show_age ? String(data.age) : null],
  ] as const).filter(([, v]) => !!v) as [string, string][]

  return (
    <div className="pb-6">
      {/* ---------- Hero: name left, showreel right ---------- */}
      <section className="relative mx-auto grid max-w-[1180px] items-center gap-10 px-5 pb-14 pt-[104px] md:px-8 md:pt-[124px] lg:min-h-[86vh] lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div className="hero-in">
          <div className="rise flex flex-wrap items-center gap-2" style={{ '--d': '0ms' } as React.CSSProperties}>
            {p.availability_status === 'available' && <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink"><span className="size-1.5 animate-pulse rounded-full bg-forest" /> Open to work</span>}
            {p.pro_verified && <span title={p.pro_verified_via || 'Verified professional'} className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink"><Icon name="shield-check" strokeWidth={2} className="size-3.5" /> Verified pro</span>}
            {grad && <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold text-ink"><Icon name="graduation-cap" className="size-3.5" />{grad}</span>}
          </div>

          <p className="rise mt-6 text-[13px] font-semibold uppercase tracking-[0.16em] text-muted" style={{ '--d': '80ms' } as React.CSSProperties}>
            {[craft, p.location?.split(',')[0]].filter(Boolean).join(' · ')}{p.pronouns ? ' · ' + p.pronouns : ''}
          </p>
          <h1 className="mt-3 font-display text-[52px] font-bold leading-[0.95] tracking-[-0.045em] sm:text-[68px] lg:text-[88px]">
            {words.map((w, k) => (
              <span key={k} className={cx('rise relative mr-[0.22em] inline-block', k === words.length - 1 && 'text-forest')} style={{ '--d': 140 + k * 110 + 'ms' } as React.CSSProperties}>
                {w}
                {k === 0 && (
                  // Hand-drawn Lime underline under the first name
                  <svg aria-hidden="true" viewBox="0 0 300 24" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.12em] left-0 h-[0.22em] w-full overflow-visible">
                    <path d="M4 16 C 70 4, 150 4, 296 12" fill="none" stroke="var(--lime)" strokeWidth="9" strokeLinecap="round"
                      className="pf-motion" style={{ strokeDasharray: 420, strokeDashoffset: 420, animation: 'pf-draw 1s cubic-bezier(.5,0,.2,1) 700ms forwards' }} />
                  </svg>
                )}
              </span>
            ))}
            {p.is_verified && <span className="rise inline-block align-middle" style={{ '--d': '400ms' } as React.CSSProperties}><VerifiedTick /></span>}
          </h1>
          {pitch && <p className="rise mt-6 max-w-[520px] text-[17px] leading-relaxed text-muted-strong" style={{ '--d': '420ms' } as React.CSSProperties}>{pitch}</p>}

          <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ '--d': '520ms' } as React.CSSProperties}>
            <Link href="/welcome" className="inline-flex h-13 items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-[15px] font-semibold text-bg shadow-cta transition hover:-translate-y-0.5">
              <Icon name="chat" className="size-[18px]" /> Message {p.first_name || ''}
            </Link>
            <button type="button" onClick={downloadCv} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:-translate-y-0.5 hover:border-forest disabled:opacity-60">
              <Icon name="download" className="size-[18px]" /> {busy ? 'Creating…' : 'Download CV'}
            </button>
            <button type="button" onClick={onShare} aria-label="Share profile" className="inline-flex size-12 items-center justify-center rounded-full border border-line-strong bg-surface text-ink transition hover:-translate-y-0.5 hover:border-forest">
              <Icon name="share" className="size-[18px]" />
            </button>
          </div>
        </div>

        {/* Showreel card, tilted, with a drifting Lime glow and the headshot floating over the corner */}
        <div className="relative mx-auto w-full max-w-[560px]">
          <div aria-hidden="true" className="pf-motion absolute -right-6 -top-8 size-[70%] rounded-full bg-lime/50 blur-3xl" style={{ animation: 'pf-blob 9s ease-in-out infinite' }} />
          <div aria-hidden="true" className="pf-motion absolute -bottom-10 -left-8 size-[45%] rounded-full bg-mint blur-3xl" style={{ animation: 'pf-blob 11s ease-in-out infinite reverse' }} />
          <div className="pf-motion group relative aspect-[4/5] overflow-hidden rounded-[32px] bg-dark shadow-[0_40px_80px_-30px_rgb(0_0_0/0.55)] transition-transform duration-500 hover:!rotate-0 sm:aspect-[5/4] lg:aspect-[4/5]"
            style={{ animation: 'pf-card-in 1s cubic-bezier(.2,.8,.2,1) 250ms both' }}>
            <HeroMedia reel={reels[0]} cover={p.banner_url} headshot={p.picture_url} name={name} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-dark/70 to-transparent" />
            {reels[0] && <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-dark/55 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-md"><Icon name="play" className="size-3 fill-current" /> {reels[0].label || 'Showreel'}</span>}
          </div>
          <div className="pf-motion absolute -bottom-6 -left-4 sm:-left-8" style={{ animation: 'pf-float 6s ease-in-out infinite' }}>
            {p.picture_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.picture_url} alt={name + ' headshot'} className="size-[104px] rounded-[22px] object-cover shadow-[0_20px_40px_-15px_rgb(0_0_0/0.5)] ring-4 ring-bg sm:size-[124px]" />
              : <span className="block rounded-[22px] ring-4 ring-bg"><Avatar name={name} size={110} /></span>}
          </div>
        </div>
      </section>

      {/* ---------- Numbers ---------- */}
      {stats.length > 0 && (
        <section className="mx-auto max-w-[1180px] px-5 md:px-8">
          <div className={cx('grid gap-4 rounded-[28px] bg-surface p-6 shadow-card md:p-8', stats.length >= 4 ? 'grid-cols-2 md:grid-cols-4' : stats.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {stats.map(s => <Stat key={s.label} n={s.n} label={s.label} plus={s.plus} />)}
          </div>
        </section>
      )}

      {brands.length > 0 && (
        <section className="mx-auto mt-16 max-w-[1180px] px-5 md:px-8">
          <SectionTitle eyebrow="Worked with" title="Brands & companies" />
          <BrandMarquee brands={brands} />
        </section>
      )}

      {/* ---------- About + at a glance ---------- */}
      {(p.bio || facts.length > 0) && (
        <section className="mx-auto mt-20 grid max-w-[1180px] gap-10 px-5 md:px-8 lg:grid-cols-[1.3fr_1fr]">
          {p.bio && (
            <div>
              <SectionTitle eyebrow="About" title={'Hi, I’m ' + (p.first_name || name)} />
              <p className="whitespace-pre-line text-[17px] leading-[1.75] text-ink/85">{p.bio}</p>
            </div>
          )}
          {facts.length > 0 && (
            <div className="self-start rounded-[28px] bg-sand p-6 md:p-7">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-muted">At a glance</p>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-4">
                {facts.map(([k, v]) => <div key={k}><dt className="text-[12px] text-muted">{k}</dt><dd className="mt-0.5 text-[15px] font-semibold">{v}</dd></div>)}
              </dl>
            </div>
          )}
        </section>
      )}

      {/* ---------- Showreel & tapes ---------- */}
      {reels.length > 1 && (
        <section className="mx-auto mt-20 max-w-[1180px] px-5 md:px-8">
          <SectionTitle eyebrow="Watch" title="Showreel & tapes" />
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reels.map(r => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="group relative block aspect-video overflow-hidden rounded-[22px] bg-dark bg-cover bg-center" style={r.poster_url || p.picture_url ? { backgroundImage: `url(${r.poster_url || p.picture_url})` } : undefined}>
                  <span className="absolute inset-0 bg-gradient-to-t from-dark/75 to-dark/10 transition group-hover:from-dark/60" />
                  <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-lime text-ink transition duration-300 group-hover:scale-110"><Icon name="play" className="size-5 fill-current" /></span>
                  <span className="absolute bottom-3 left-4 right-4 truncate text-[14px] font-semibold text-white">{r.label || 'Showreel'}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {credits.length > 0 && <Credits credits={credits} />}

      {/* ---------- Training + skills ---------- */}
      {(training.length > 0 || skills.length > 0 || (p.is_graduate && p.graduate_school)) && (
        <section className="mx-auto mt-20 grid max-w-[1180px] gap-10 px-5 md:px-8 lg:grid-cols-[1fr_1.4fr]">
          {(training.length > 0 || (p.is_graduate && p.graduate_school)) && (
            <div>
              <SectionTitle eyebrow="Training" title="Where I trained" />
              <ol className="relative space-y-3 border-l-2 border-line pl-6">
                {training.map(t => (
                  <li key={t.id} className="relative rounded-[18px] bg-surface p-4 shadow-card">
                    <span aria-hidden="true" className="absolute -left-[31px] top-5 size-3 rounded-full bg-lime ring-4 ring-bg" />
                    {t.years && <p className="text-[12px] font-semibold text-muted">{t.years}</p>}
                    <p className="text-[15px] font-semibold">{t.school}</p>
                    {t.course && <p className="text-[13px] text-muted-strong">{t.course}</p>}
                  </li>
                ))}
                {!training.length && p.graduate_school && (
                  <li className="relative rounded-[18px] bg-surface p-4 shadow-card">
                    <span aria-hidden="true" className="absolute -left-[31px] top-5 size-3 rounded-full bg-lime ring-4 ring-bg" />
                    {p.graduate_year && <p className="text-[12px] font-semibold text-muted">{p.graduate_year}</p>}
                    <p className="text-[15px] font-semibold">{p.graduate_school}</p>
                  </li>
                )}
              </ol>
            </div>
          )}
          {skills.length > 0 && (
            <div>
              <SectionTitle eyebrow="Skills" title="What I bring" />
              <SkillGroups skills={skills} />
            </div>
          )}
        </section>
      )}

      {/* ---------- Gallery ---------- */}
      {gallery.length > 0 && (
        <section className="mx-auto mt-20 max-w-[1180px] px-5 md:px-8">
          <SectionTitle eyebrow="Gallery" title="On stage & on set" />
          <div className="columns-2 gap-4 md:columns-3">
            {gallery.map(g => (
              <a key={g.id} href={g.url} target="_blank" rel="noopener noreferrer" className="group mb-4 block overflow-hidden rounded-[20px]" aria-label={'Open photo of ' + name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={name + ' — production still or photo'} loading="lazy" className="w-full transition duration-700 group-hover:scale-[1.04]" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Testimonials ---------- */}
      {testimonials.length > 0 && (
        <section className="mx-auto mt-20 max-w-[1180px] px-5 md:px-8">
          <SectionTitle eyebrow="Kind words" title="What directors say" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map(t => (
              <figure key={t.id} className="flex flex-col rounded-[24px] bg-forest p-6 text-white transition duration-300 hover:-translate-y-1">
                <span aria-hidden className="font-display text-5xl leading-none text-lime">“</span>
                <blockquote className="-mt-3 flex-1 text-[16px] leading-relaxed">{t.quote}</blockquote>
                <figcaption className="mt-5 text-[14px] font-semibold">{t.author_name}{t.author_title && <span className="block text-[12px] font-normal uppercase tracking-[0.06em] text-white/60">{t.author_title}</span>}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Work together ---------- */}
      <section className="mx-auto mt-20 max-w-[1180px] px-5 md:px-8">
        <div className="relative overflow-hidden rounded-[32px] bg-forest px-6 py-12 text-center text-white md:py-16">
          <div aria-hidden="true" className="pf-motion absolute -right-10 -top-10 size-56 rounded-full bg-lime/25 blur-3xl" style={{ animation: 'pf-blob 10s ease-in-out infinite' }} />
          <h2 className="relative font-display text-[34px] font-bold leading-tight tracking-[-0.03em] md:text-[48px]">Want {p.first_name || 'them'} on your next project?</h2>
          <p className="relative mx-auto mt-3 max-w-[460px] text-[16px] text-white/70">Message, invite to audition or book — all through The Ident.</p>
          <div className="relative mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/welcome" className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3.5 text-[15px] font-semibold text-ink transition hover:-translate-y-0.5"><Icon name="chat" className="size-[18px]" /> Message {p.first_name || ''}</Link>
            <Link href="/start?role=caster" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3.5 text-[15px] font-semibold text-white transition hover:bg-white/10">I’m casting</Link>
          </div>
        </div>
      </section>

      <AgentDock p={p} agents={data.agents} />
    </div>
  )
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-6">
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-forest"><span className="size-1.5 rounded-full bg-forest" />{eyebrow}</p>
      <h2 className="mt-2 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.03em] md:text-[42px]">{title}</h2>
    </div>
  )
}

// Counts up from 0 the first time it scrolls into view
function Stat({ n, label, plus }: { n: number; label: string; plus?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { const t = setTimeout(() => setV(n), 0); return () => clearTimeout(t) }
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const start = performance.now()
      const tick = (t: number) => { const k = Math.min(1, (t - start) / 1200); setV(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(tick) }
      raf = requestAnimationFrame(tick)
    }, { threshold: 0.4 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf) }
  }, [n])
  return (
    <div ref={ref} className="text-center">
      <p className="font-display text-[40px] font-bold leading-none tracking-[-0.03em] text-forest md:text-[52px]">{v}{plus && v === n ? '+' : ''}</p>
      <p className="mt-2 text-[13px] font-medium text-muted-strong">{label}</p>
    </div>
  )
}

// Credits as a timeline, one production type at a time (opens on the biggest)
function Credits({ credits }: { credits: Credit[] }) {
  const groups = useMemo(() => credits.reduce<Record<string, Credit[]>>((acc, c) => { const k = c.production_types?.name || 'Other'; (acc[k] ||= []).push(c); return acc }, {}), [credits])
  const names = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length)
  const [tab, setTab] = useState(names[0])
  const [all, setAll] = useState(false)
  const list = groups[tab] || []
  const shown = all ? list : list.slice(0, 8)
  return (
    <section className="mx-auto mt-20 grid max-w-[1180px] gap-8 px-5 md:px-8 lg:grid-cols-[320px_1fr]">
      <div className="lg:sticky lg:top-28 lg:self-start">
        <SectionTitle eyebrow="Credits" title="Selected work" />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Credit types">
          {names.map(n => (
            <button key={n} type="button" role="tab" aria-selected={tab === n} onClick={() => { setTab(n); setAll(false) }}
              className={cx('rounded-full px-4 py-2 text-[13px] font-semibold transition', tab === n ? 'bg-forest text-bg' : 'bg-sand text-ink hover:bg-sand-2')}>
              {n} <span className={tab === n ? 'text-bg/60' : 'text-faint'}>{groups[n].length}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <ul key={tab} className="grid gap-3 sm:grid-cols-2">
          {shown.map((c, k) => (
            <li key={c.id} className="animate-[rc-step-in_320ms_ease-out_both] rounded-[20px] border border-line-soft bg-surface p-5 shadow-card transition duration-300 hover:-translate-y-0.5 hover:border-forest" style={{ animationDelay: Math.min(k, 8) * 40 + 'ms' }}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-[16px] font-semibold leading-snug">{c.title}</p>
                {c.year && <span className="shrink-0 rounded-full bg-sand px-2.5 py-0.5 text-[12px] font-semibold text-muted-strong">{c.year}</span>}
              </div>
              <p className="mt-1 text-[13px] text-muted-strong">{[c.role, c.production_company, c.director && 'dir. ' + c.director].filter(Boolean).join(' · ')}</p>
            </li>
          ))}
        </ul>
        {list.length > 8 && <button type="button" onClick={() => setAll(a => !a)} className="mt-4 text-[14px] font-semibold text-green-ink">{all ? 'Show fewer' : `Show all ${list.length}`}</button>}
      </div>
    </section>
  )
}
