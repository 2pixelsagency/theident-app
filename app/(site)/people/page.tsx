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
type Props = { searchParams: Promise<{ craft?: string; in?: string; q?: string }> }
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
  const { craft, in: place, q: query } = await searchParams
  let q = supabaseServer.from('profiles').select('slug, first_name, last_name, picture_url, what_i_do, location, availability_status, is_graduate, graduate_school')
    .eq('account_role', 'performer').eq('is_demo', false).or('show_talent.is.null,show_talent.eq.true').not('slug', 'is', null).not('first_name', 'is', null)
    .order('last_active', { ascending: false, nullsFirst: false }).limit(200)
  if (craft) q = q.ilike('what_i_do', '%' + craft.replace(/[%_]/g, '') + '%')
  if (place) q = q.ilike('location', '%' + place.replace(/[%_]/g, '') + '%')
  // Free-text search from the homepage: every meaningful word must match somewhere on the profile
  const words = (query || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w)).slice(0, 5)
  for (const w of words) q = q.or(['first_name', 'last_name', 'what_i_do', 'location', 'bio', 'summary'].map(c => `${c}.ilike.%${w}%`).join(','))
  const { data } = await q
  const people = (data || []) as Row[]
  const link = (c?: string) => '/people' + (c ? '?craft=' + encodeURIComponent(c) : '')

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'ItemList', name: (craft ? plural(craft) : 'Performers') + ' on The Ident',
        itemListElement: people.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE_URL + '/' + p.slug, name: [p.first_name, p.last_name].filter(Boolean).join(' ') })) }} />
      <section className="bg-bg">
        <Container className="pb-12 pt-32 md:pt-40">
          <SectionHeader level={1} eyebrow="Talent" title={<>{craft ? plural(craft) : 'Performers'} on The Ident</>}
            sub={<>{query ? <>Results for “{query}”. </> : null}Headshots, showreels, credits and skills — browse performers{place ? ' in ' + place : ''} and connect on The Ident.</>} />
          <nav aria-label="Filter by craft" className="-mt-2 flex flex-wrap gap-2">
            <Link href={link()} className={'inline-flex min-h-11 items-center rounded-full border px-5 text-[15px] font-medium transition-colors ' + (!craft ? 'border-forest bg-forest text-bg' : 'border-line-strong bg-sand hover:border-forest')}>All</Link>
            {CRAFTS.map(c => <Link key={c} href={link(c)} className={'inline-flex min-h-11 items-center rounded-full border px-5 text-[15px] font-medium transition-colors ' + (craft === c ? 'border-forest bg-forest text-bg' : 'border-line-strong bg-sand hover:border-forest')}>{PLURAL[c] ? c : c + 's'}</Link>)}
          </nav>
        </Container>
      </section>
      <Container className="py-14">
        {people.length === 0 ? (
          <p className="rounded-[var(--radius-feature)] bg-sand px-6 py-12 text-center text-muted-strong">No public profiles here yet. <Link href="/start?role=performer" className="font-semibold text-green-ink">Be the first</Link>.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-4">
            {people.map(p => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
              return (
                <li key={p.slug}>
                  <Link href={'/' + p.slug} className="group block rounded-[24px] bg-sand p-2 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-32px_rgb(21_33_28/0.35)]">
                    <span className="relative block aspect-[4/5] overflow-hidden rounded-[18px] bg-sand-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.picture_url ? <img src={p.picture_url} alt={name + ' headshot'} loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.03]" /> : <span className="flex size-full items-center justify-center font-display text-[40px] font-bold text-faint">{(p.first_name || '?')[0]}</span>}
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
