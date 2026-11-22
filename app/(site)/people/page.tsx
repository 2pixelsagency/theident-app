import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Container, Cta } from '@/components/site/Chrome'
import { supabaseServer, SITE_URL } from '@/lib/supabaseServer'

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
      <section className="bg-glow">
        <Container className="pb-12 pt-32 md:pt-40">
          <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">Talent</p>
          <h1 className="mt-4 max-w-[820px] text-[42px] leading-[1.03] tracking-[-0.03em] md:text-[64px]">{craft ? plural(craft) : 'Performers'} on The Ident</h1>
          <p className="mt-4 max-w-[600px] text-[18px] text-muted">{query ? <>Results for “{query}”. </> : null}Headshots, showreels, credits and skills — browse performers{place ? ' in ' + place : ''} and connect on The Ident.</p>
          <nav aria-label="Filter by craft" className="mt-8 flex flex-wrap gap-2">
            <Link href={link()} className={'rounded-full border px-4 py-2 text-[14px] font-medium ' + (!craft ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>All</Link>
            {CRAFTS.map(c => <Link key={c} href={link(c)} className={'rounded-full border px-4 py-2 text-[14px] font-medium ' + (craft === c ? 'border-forest bg-forest text-white' : 'border-line bg-surface hover:border-ink/30')}>{PLURAL[c] ? c : c + 's'}</Link>)}
          </nav>
        </Container>
      </section>
      <Container className="py-14">
        {people.length === 0 ? (
          <p className="rounded-[var(--radius)] border border-dashed border-line px-6 py-10 text-center text-muted">No public profiles here yet. <Link href="/start?role=performer" className="font-semibold text-green-ink">Be the first</Link>.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {people.map(p => {
              const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
              return (
                <li key={p.slug}>
                  <Link href={'/' + p.slug} className="group block overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card transition hover:-translate-y-0.5">
                    <span className="relative block aspect-[4/5] bg-chip">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.picture_url ? <img src={p.picture_url} alt={name + ' headshot'} loading="lazy" className="size-full object-cover" /> : <span className="flex size-full items-center justify-center font-display text-[40px] font-bold text-faint">{(p.first_name || '?')[0]}</span>}
                      {p.availability_status === 'available' && <span className="absolute left-2 top-2 rounded-full bg-green px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Open to work</span>}
                    </span>
                    <span className="block p-3.5">
                      <span className="block truncate text-[15px] font-semibold">{name}</span>
                      <span className="block truncate text-[13px] text-muted">{[(p.what_i_do || '').split(',')[0], p.location?.split(',')[0]].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
        <div className="mt-14 flex flex-wrap items-center justify-between gap-6 rounded-[16px] bg-forest px-8 py-10 text-white">
          <div><p className="text-[24px] font-semibold">Want to be found?</p><p className="mt-1 text-white/70">Build your profile once — casting can find you here and in the app.</p></div>
          <div className="flex gap-3"><Cta href="/start?role=performer">Create your profile</Cta><Link href="/start?role=caster" className="inline-flex h-12 items-center gap-1 rounded-[10px] px-4 text-[15px] font-semibold text-lime">Casting? Search talent <Icon name="arrow-right" className="size-4" /></Link></div>
        </div>
      </Container>
    </>
  )
}
