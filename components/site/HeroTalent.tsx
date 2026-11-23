'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import WavyMarquee from './WavyMarquee'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'

type Face = { id: string; slug: string | null; first_name: string | null; last_name: string | null; picture_url: string; what_i_do: string | null; location: string | null }
const EXAMPLES = ['Swing in Wicked', 'Funny guy', 'Dancer in Manchester', 'Actor, playing age 20–30', 'Tap and jazz', 'Singer in London']

// Search box whose placeholder types example searches, like a casting brief being written
function TypedSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [ph, setPh] = useState('')
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPh(EXAMPLES[0]); return } // eslint-disable-line react-hooks/set-state-in-effect
    let i = 0, n = 0, del = false, t = 0
    const step = () => {
      const word = EXAMPLES[i]
      if (!del && n < word.length) { n++; t = window.setTimeout(step, 70) }
      else if (!del) { del = true; t = window.setTimeout(step, 1600) }
      else if (n > 0) { n--; t = window.setTimeout(step, 30) }
      else { del = false; i = (i + 1) % EXAMPLES.length; t = window.setTimeout(step, 300) }
      setPh(word.slice(0, n))
    }
    t = window.setTimeout(step, 900)
    return () => clearTimeout(t)
  }, [])
  return (
    <form onSubmit={e => { e.preventDefault(); router.push('/people' + (q.trim() ? '?q=' + encodeURIComponent(q.trim()) : '')) }}
      className="rise mx-auto flex h-[60px] w-full max-w-[560px] items-center gap-2 rounded-[14px] border border-line bg-surface pl-5 pr-2 shadow-[0_18px_40px_-28px_rgb(18_49_39/0.5)] focus-within:border-green" style={{ '--d': '450ms' } as React.CSSProperties}>
      <Icon name="search" className="size-5 shrink-0 text-muted" />
      <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search talent" placeholder={ph}
        className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-ink/70" />
      <button type="submit" className="h-11 shrink-0 rounded-[10px] bg-forest px-5 text-[15px] font-semibold text-white transition hover:bg-forest/90">Search now</button>
    </form>
  )
}

// Portrait headshots in a gently scrolling row. Members who opted in ("Feature me on theident.me") show
// with their name and open their profile; the site's own headshots (used with permission) fill the row
// without names and open the talent directory.
const SITE_FACES = [1, 2, 3, 4, 5, 6, 7].map(n => '/headshots/face-' + n + '.webp')
type Card = { key: string; src: string; href: string; name?: string; sub?: string }

function Headshots() {
  const { data } = useAsync(async () => {
    const { data: real } = await supabase.from('profiles').select('id, slug, first_name, last_name, picture_url, what_i_do, location')
      .eq('account_role', 'performer').eq('feature_on_site', true).eq('is_demo', false).not('picture_url', 'is', null).not('slug', 'is', null).limit(30)
    const members: Card[] = ((real || []) as Face[]).map(f => ({
      key: f.id, src: f.picture_url, href: '/' + f.slug, name: [f.first_name, f.last_name].filter(Boolean).join(' '),
      sub: [(f.what_i_do || '').split(',')[0], f.location?.split(',')[0]].filter(Boolean).join(' · '),
    }))
    // Interleave so named members are spread through the row
    const cards: Card[] = []
    const site = SITE_FACES.map((src, i) => ({ key: 'site-' + i, src, href: '/people' }))
    for (let i = 0; i < Math.max(members.length, site.length); i++) { if (members[i]) cards.push(members[i]); if (site[i]) cards.push(site[i]) }
    return cards
  }, [])
  const card = 'w-[clamp(9.5em,15vw,17em)] aspect-[4/5]'
  if (!data) return (
    <div className="flex justify-center gap-[clamp(.75em,1.125vw,2.25em)] overflow-hidden py-12 md:py-16">
      {Array.from({ length: 7 }).map((_, i) => <div key={i} className={card + ' shrink-0 animate-pulse rounded-[12px] bg-chip'} style={{ animationDelay: i * 80 + 'ms' }} />)}
    </div>
  )
  return (
    <WavyMarquee flat items={data} className="py-12 md:py-16" render={(c, i) => (
      <Link href={c.href} draggable={false} aria-label={c.name ? 'View ' + c.name + '’s profile' : 'Browse talent'}
        className={'group relative block overflow-hidden rounded-[12px] bg-chip shadow-[0_22px_44px_-26px_rgb(18_49_39/0.6)] ' + card}
        style={{ animation: 'rc-rise .8s cubic-bezier(.2,.7,.2,1) both', animationDelay: Math.min(i, 10) * 70 + 'ms' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={c.src} alt={c.name ? c.name + ' headshot' : 'Performer headshot'} draggable={false} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        {c.name ? (
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-dark/80 via-dark/30 to-transparent p-3 pt-10 text-white">
            <span className="block truncate text-[15px] font-semibold">{c.name}</span>
            {c.sub && <span className="block truncate text-[12px] text-white/75">{c.sub}</span>}
            <span className="mt-2 inline-flex translate-y-1 items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-ink opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">View profile <Icon name="arrow-right" className="size-3" /></span>
          </span>
        ) : (
          <span className="absolute bottom-3 left-3 inline-flex translate-y-1 items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-ink opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">Browse talent <Icon name="arrow-right" className="size-3" /></span>
        )}
      </Link>
    )} />
  )
}

export default function HeroTalent() {
  return (
    <section className="relative overflow-clip bg-bg">
      <div className="mx-auto max-w-[1180px] px-5 pt-32 text-center md:px-8 md:pt-40">
        <p className="rise inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/80 px-3 py-1.5 text-[13px] font-medium shadow-card backdrop-blur">
          <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-green" /></span>
          Live castings, updated daily
        </p>
        <h1 className="rise mx-auto mt-6 max-w-[900px] text-[44px] leading-[1.02] tracking-[-0.035em] md:text-[76px]" style={{ '--d': '120ms' } as React.CSSProperties}>
          You’re not <span className="inline-block -skew-x-6 text-green-ink">boring.</span><br />So why is your ident?
        </h1>
        <p className="rise mx-auto mt-5 max-w-[560px] text-[17px] leading-relaxed text-muted md:text-[19px]" style={{ '--d': '260ms' } as React.CSSProperties}>
          Showcase your talent with a strong ident, put your best work front and centre, and stay visible to casting — all in one place.
        </p>
        <div className="mt-9"><TypedSearch /></div>
      </div>
      <Headshots />
      <div className="rise flex flex-wrap justify-center gap-3 px-5 pb-20 md:pb-28" style={{ '--d': '600ms' } as React.CSSProperties}>
        <Link href="/people" className="inline-flex h-12 items-center gap-1.5 rounded-[10px] bg-forest px-6 text-[15px] font-semibold text-white">Browse talent <Icon name="arrow-right" className="size-4" /></Link>
        <Link href="/start?role=performer" className="inline-flex h-12 items-center rounded-[10px] bg-lime px-6 text-[15px] font-semibold text-ink shadow-cta">Start 7-day free trial</Link>
        <Link href="/performers" className="inline-flex h-12 items-center rounded-[10px] border border-line bg-surface px-6 text-[15px] font-semibold">Features</Link>
      </div>
    </section>
  )
}
