import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Cta } from '@/components/site/Chrome'
import { supabaseServer, SITE_URL } from '@/lib/supabaseServer'
import JsonLd from '@/components/site/JsonLd'
import { CtaBand, SectionHeader } from '@/components/site/ds'

// Public, crawlable talent directory (theident.me/people). Only public, real (non-demo) performers.
export const revalidate = 600

const CRAFTS = ['Actor', 'Dancer', 'Singer', 'Musical theatre', 'Musician', 'Presenter', 'Voiceover', 'Model']
const PLURAL: Record<string, string> = { 'Musical theatre': 'Musical theatre performers', Voiceover: 'Voiceover artists' }
const plural = (c: string) => PLURAL[c] || c + 's'
type Props = { searchParams: Promise<{ craft?: string; in?: string; q?: string; open?: string; grad?: string }> }
const STOP = new Set(['in', 'a', 'an', 'the', 'for', 'and', 'with', 'of', 'to', 'guy', 'girl', 'playing', 'age'])

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { craft, in: place } = await searchParams
  const what = craft ? plural(craft).toLowerCase() : 'performers'
  const where = place ? ' in ' + place : ' in the UK'
  const title = `Find ${what}${where} | The Ident`
  return {
    title, description: `Browse ${what}${where} — headshots, showreels, credits and skills. Casting directors and performers connect on The Ident.`,
    alternates: { canonical: SITE_URL + '/people' + (craft ? '?craft=' + encodeURIComponent(craft) : '') },
  }
}

type Row = { slug: string | null; first_name: string | null; last_name: string | null; picture_url: string | null; what_i_do: string | null; location: string | null; availability_status: string | null; is_graduate: boolean | null; graduate_school: string | null }

export default async function PeoplePage({ searchParams }: Props) {
  const { craft, in: place, q: query, open, grad } = await searchParams
  let q = supabaseServer.from('profiles').select('slug, first_name, last_name, picture_url, what_i_do, location, availability_status, is_graduate, graduate_school')
    .eq('account_role', 'performer').eq('is_demo', false).or('show_talent.is.null,show_talent.eq.true').not('slug', 'is', null).not('first_name', 'is', null)
    .order('last_active', { ascending: false, nullsFirst: false }).limit(200)
  if (craft) q = q.ilike('what_i_do', '%' + craft.replace(/[%_]/g, '') + '%')
  if (place) q = q.ilike('location', '%' + place.replace(/[%_]/g, '') + '%')
  if (open) q = q.eq('availability_status', 'available')
  if (grad) q = q.eq('is_graduate', true)
  // Free-text search from the homepage: every meaningful word must match somewhere on the profile
  const words = (query || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w)).slice(0, 5)
  for (const w of words) q = q.or(['first_name', 'last_name', 'what_i_do', 'location', 'bio', 'summary'].map(c => `${c}.ilike.%${w}%`).join(','))
  const { data } = await q
  const people = (data || []) as Row[]
  // Filter links keep the other filters; pass a key as null to clear it
  const current: Record<string, string | undefined> = { q: query, in: place, craft, open, grad }
  const link = (over: Record<string, string | null>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...current, ...over })) if (v) sp.set(k, v)
    const qs = sp.toString(); return '/people' + (qs ? '?' + qs : '')
  }
  const active = [query, place, craft, open, grad].filter(Boolean).length
  const pill = (on: boolean) => 'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors ' + (on ? 'border-forest bg-forest text-bg' : 'border-line-strong bg-bg hover:border-forest')

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: (craft ? plural(craft) : 'Performers') + ' on The Ident',
        itemListElement: people.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE_URL + '/performers/' + p.slug, name: [p.first_name, p.last_name].filter(Boolean).join(' ') })) }} />
      <section className="bg-bg">
        <Container className="pb-4 pt-32 md:pt-40">
          <SectionHeader level={1} eyebrow="Talent" title={<>{craft ? plural(craft) : 'Performers'} on The Ident</>}
            sub={<>{query ? <>Results for “{query}”. </> : null}Headshots, showreels, credits and skills — browse performers{place ? ' in ' + place : ''} and connect on The Ident.</>} />
          {/* Filter panel: search + location (GET form), craft pills, quick toggles — all shareable URLs */}
          <div className="rounded-[var(--radius-feature)] bg-sand p-4 md:p-6">
            <form action="/people" method="get" role="search" className="grid gap-3 md:grid-cols-[1.4fr_1fr_auto]">
              {craft && <input type="hidden" name="craft" value={craft} />}
              {open && <input type="hidden" name="open" value={open} />}
              {grad && <input type="hidden" name="grad" value={grad} />}
              <label className="relative block">
                <span className="sr-only">Search by name or skill</span>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <input name="q" defaultValue={query} placeholder="Name, skill or school — e.g. tap, Welsh accent" className="h-12 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-[15px] outline-none placeholder:text-faint focus:border-forest focus:ring-2 focus:ring-lime/50" />
              </label>
              <label className="relative block">
                <span className="sr-only">Location</span>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"><path d="M12 21s-7-6.2-7-11.5a7 7 0 1 1 14 0C19 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
                <input name="in" defaultValue={place} placeholder="Location — e.g. Manchester" className="h-12 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-[15px] outline-none placeholder:text-faint focus:border-forest focus:ring-2 focus:ring-lime/50" />
              </label>
              <button type="submit" className="h-12 rounded-full bg-forest px-7 text-[15px] font-semibold text-bg transition-colors hover:bg-lime hover:text-ink">Search</button>
            </form>
            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-4">
              <nav aria-label="Filter by craft" className="flex flex-wrap gap-2">
                <Link href={link({ craft: null })} className={pill(!craft)}>All</Link>
                {CRAFTS.map(c => <Link key={c} href={link({ craft: craft === c ? null : c })} aria-current={craft === c ? 'true' : undefined} className={pill(craft === c)}>{PLURAL[c] ? c : c + 's'}</Link>)}
              </nav>
              <span aria-hidden="true" className="hidden h-6 w-px bg-line-strong md:block" />
              <div className="flex flex-wrap gap-2">
                <Link href={link({ open: open ? null : '1' })} className={pill(!!open)}><span className="size-2 rounded-full bg-lime" />Open to work</Link>
                <Link href={link({ grad: grad ? null : '1' })} className={pill(!!grad)}>Recent graduates</Link>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <p className="text-muted-strong"><b className="text-ink">{people.length}</b> {people.length === 1 ? 'performer' : 'performers'}{place ? ' in ' + place : ''}</p>
            {active > 0 && <Link href="/people" className="font-semibold text-forest underline-offset-4 hover:underline">Clear filters</Link>}
          </div>
        </Container>
      </section>
      <Container className="pb-14 pt-6">
        {people.length === 0 ? (
          <p className="rounded-[var(--radius-feature)] bg-sand px-6 py-12 text-center text-muted-strong">{active ? <>No one matches those filters. <Link href="/people" className="font-semibold text-forest">Clear filters</Link>.</> : <>No public profiles here yet. <Link href="/start?role=performer" className="font-semibold text-forest">Be the first</Link>.</>}</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {people.map(p => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
              return (
                <li key={p.slug}>
                  <Link href={'/performers/' + p.slug} className="group block rounded-[24px] bg-sand p-2">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-[18px] bg-sand-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.picture_url ? <img src={p.picture_url} alt={name + ' headshot'} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center font-display text-[40px] font-bold text-faint">{(p.first_name || '?')[0]}</span>}
                      {p.availability_status === 'available' && <span className="absolute left-2.5 top-2.5 rounded-full bg-lime px-2.5 py-1 text-[11px] font-semibold text-ink">Open to work</span>}
                    </span>
                    <span className="block px-2.5 pb-2 pt-3">
                      <span className="block truncate text-[15px] font-semibold">{name}</span>
                      <span className="block truncate text-[13px] text-muted">{[(p.what_i_do || '').split(',')[0], p.location?.split(',')[0]].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-14"><CtaBand title="Want to be found?" sub="Build your profile once — casting can find you here and in the app."
          actions={<><Cta href="/start?role=performer" variant="lime">Create your profile</Cta><Cta href="/start?role=caster" variant="ghost-light">Casting? Search talent</Cta></>} /></div>
      </Container>
    </>
  )
}
