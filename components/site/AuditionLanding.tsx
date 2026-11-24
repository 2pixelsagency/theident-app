import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Container, Cta, Eyebrow, SECTION } from '@/components/site/Chrome'
import { ARROW_BOX, ArrowGlyph, SectionHeader } from '@/components/site/ds'
import Faq from '@/components/site/Faq'
import JsonLd from '@/components/site/JsonLd'
import { supabaseServer, SITE_URL } from '@/lib/supabaseServer'
import { JOB_SELECT, type Job } from '@/lib/rc/jobs'
import { payLabel } from '@/lib/rc/pay'
import { PLANS, price } from '@/lib/rc/plans'
import { daysUntil } from '@/lib/rc/format'
import { TYPES, CITIES, matchesType, matchesCity, type AuditionType, type City } from '@/lib/site/auditions'

// Open, real (non-demo) roles — shared by every landing page
export async function openRoles(): Promise<Job[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await supabaseServer.from('jobs').select(JOB_SELECT).eq('is_published', true).eq('is_demo', false)
    .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(500)
  return (data || []) as unknown as Job[]
}
export const filterRoles = (jobs: Job[], type?: AuditionType, city?: City) =>
  jobs.filter(j => !j.is_side_hustle && (!type || matchesType(j, type)) && (!city || matchesCity(j, city)))

export function landingPath(type?: AuditionType, city?: City) {
  if (type && city) return `/auditions/${type.slug}/${city.slug}`
  return '/auditions' + (type ? '/' + type.slug : city ? '/' + city.slug : '')
}
export function landingTitle(type?: AuditionType, city?: City) {
  const what = type ? type.plural : 'auditions and castings'
  const cap = what.charAt(0).toUpperCase() + what.slice(1)
  return cap + (city ? ' in ' + city.name : ' in the UK')
}
export function landingDescription(type?: AuditionType, city?: City, count = 0) {
  const where = city ? ' in ' + city.name : ' across the UK'
  const n = count ? `${count} open ${count === 1 ? 'role' : 'roles'} now. ` : ''
  return `${n}Find ${type ? type.plural : 'auditions, castings and paid work'}${where}. See the pay and closing date, apply with your reel and track every self-tape and recall on The Ident.`
}

function RoleRow({ j }: { j: Job }) {
  const pay = payLabel(j)
  const days = daysUntil(j.application_deadline)
  const title = j.project_role || j.job_title || 'Role'
  return (
    <li>
      <Link href={'/jobs/' + j.id} className="group flex items-center gap-5 rounded-[22px] px-4 py-5 transition-colors hover:bg-surface md:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-green-ink">{j.production_types?.name || 'Role'}{j.location ? ' · ' + j.location : ''}</p>
          <h3 className="mt-1.5 text-[20px] font-semibold leading-snug md:text-[22px]">{title}{j.project_in ? <span className="text-muted"> — {j.project_in}</span> : null}</h3>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[14px] text-muted">
            {pay && <span className="font-medium text-ink">{pay}</span>}
            {j.age_range && <span>Playing age {j.age_range}</span>}
            {days != null && <span>{days <= 0 ? 'Closes today' : `Closes in ${days} day${days === 1 ? '' : 's'}`}</span>}
          </p>
        </div>
        <span className={ARROW_BOX}><ArrowGlyph /></span>
      </Link>
    </li>
  )
}

const GENERAL_FAQ: [string, string][] = [
  ['Is The Ident free for performers?', 'Performers get 7 days free, then it is ' + price(PLANS.performer.pence) + ' a month (' + price(PLANS.graduate.pence) + ' for recent graduates). That covers applying to every role, your profile with headshots and reels, and tracking every self-tape and recall.'],
  ['How is this different from Spotlight or Mandy?', 'The Ident shows the pay and closing date up front, lets you apply in a tap with your reel, and tracks each application — self-tape requested, recall, booked — in one place. Performers can also post community roles and side hustles.'],
  ['Who posts these roles?', 'Casting directors, producers and companies post castings directly. Performers can post community roles too — each listing shows which it is.'],
]

export default function AuditionLanding({ type, city, roles, heading, intro: introOverride, path: pathOverride }: { type?: AuditionType; city?: City; roles: Job[]; heading?: string; intro?: string; path?: string }) {
  const title = heading ?? landingTitle(type, city)
  const path = pathOverride ?? landingPath(type, city)
  const faq: [string, string][] = [...(type?.tips || []), ...GENERAL_FAQ]
  const crumbs: [string, string][] = [['The Ident', '/'], ['Auditions', '/auditions']]
  if (type) crumbs.push([type.name, '/auditions/' + type.slug])
  if (city) crumbs.push([city.name, path])
  if (!type && !city) crumbs.pop()

  const intro = introOverride ?? (type
    ? type.blurb + (city ? ` Roles listed here are based in or around ${city.name}.` : '')
    : city ? `Auditions, castings and paid work in ${city.name} — theatre, TV and film, dance, commercials and more, with pay and closing dates up front.`
    : 'Every open audition and casting on The Ident, by type and city — with pay, dates and closing dates up front.')

  // Sibling links: same type in other cities, or other types in this city
  const siblings: [string, string][] = type
    ? CITIES.filter(c => c.slug !== city?.slug).map(c => [`${type.name} in ${c.name}`, landingPath(type, c)])
    : TYPES.map(t => [city ? `${t.name} in ${city.name}` : t.plural.charAt(0).toUpperCase() + t.plural.slice(1), landingPath(t, city)])
  const more: [string, string][] = type
    ? TYPES.filter(t => t.slug !== type.slug).map(t => [t.plural.charAt(0).toUpperCase() + t.plural.slice(1) + (city ? ' in ' + city.name : ''), landingPath(t, city)])
    : city ? CITIES.filter(c => c.slug !== city.slug).map(c => ['Auditions in ' + c.name, landingPath(undefined, c)])
    : CITIES.map(c => ['Auditions in ' + c.name, landingPath(undefined, c)])

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'BreadcrumbList', itemListElement: crumbs.map(([name, href], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE_URL + (href === '/' ? '' : href) })) },
        { '@type': 'CollectionPage', name: title, url: SITE_URL + path, description: landingDescription(type, city, roles.length),
          mainEntity: { '@type': 'ItemList', numberOfItems: roles.length, itemListElement: roles.slice(0, 30).map((j, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE_URL + '/jobs/' + j.id, name: j.project_role || j.job_title || 'Role' })) } },
        { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      ] }} />

      <section className="bg-bg">
        <Container className="pb-4 pt-32 md:pt-40">
          <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-[14px] text-muted">
            {crumbs.map(([name, href], i) => (
              <span key={href} className="flex items-center gap-2">
                {i > 0 && <Icon strokeWidth={2} name="chevron-right" className="size-3.5" />}
                {i === crumbs.length - 1 ? <span className="text-ink">{name}</span> : <Link href={href} className="hover:text-ink">{name}</Link>}
              </span>
            ))}
          </nav>
          <SectionHeader level={1} eyebrow={roles.length + ' open ' + (roles.length === 1 ? 'role' : 'roles') + ' right now'} title={title} sub={intro}
            actions={<Cta href="/start?role=performer" variant="dark">Get these roles · 7 days free</Cta>} />
        </Container>
      </section>

      <Container className="py-10 md:py-14">
        {roles.length ? (
          <ul className="rounded-[var(--radius-feature)] bg-sand p-2 md:p-3">{roles.slice(0, 40).map(j => <RoleRow key={j.id} j={j} />)}</ul>
        ) : (
          <div className="rounded-[var(--radius-feature)] bg-sand p-8 md:p-10">
            <h2 className="font-display text-[26px] font-bold tracking-[-0.02em]">No open {type ? type.plural : 'roles'}{city ? ' in ' + city.name : ''} this minute</h2>
            <p className="mt-2 max-w-[560px] text-[13px] leading-[1.6] text-muted-strong">New castings are added every day. Join The Ident and get notified the moment one matches you — or browse every open role now.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Cta href="/jobs" variant="dark">Browse all roles</Cta><Cta href="/start?role=performer" variant="outline" arrow={false}>Join free for 7 days</Cta></div>
          </div>
        )}
        {roles.length > 40 && <div className="mt-8"><Cta href="/jobs" variant="outline">See all {roles.length} roles</Cta></div>}
      </Container>

      <section className={SECTION}>
        <Container className="grid gap-14 md:grid-cols-[1fr_1.4fr]">
          <div>
            <Eyebrow>Good to know</Eyebrow>
            <h2 className="mt-4 font-display text-[34px] font-bold leading-[1.04] tracking-[-0.03em] md:text-[48px]">{type ? type.name + ' auditions' : 'Auditions'}, answered</h2>
          </div>
          <Faq items={faq} />
        </Container>
      </section>

      <section className={SECTION}>
        <Container className="grid gap-12 md:grid-cols-2">
          {[['Browse by ' + (type ? 'city' : 'type'), siblings], ['More searches', more]].map(([h, links]) => (
            <div key={h as string} className="rounded-[var(--radius-feature)] bg-sand p-6 md:p-8">
              <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">{h as string}</h2>
              <ul className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {(links as [string, string][]).map(([label, href]) => <li key={href}><Link href={href} className="text-[15px] text-ink underline-offset-4 hover:text-green-ink hover:underline">{label}</Link></li>)}
              </ul>
            </div>
          ))}
        </Container>
      </section>
    </>
  )
}
