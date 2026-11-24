import Link from 'next/link'
import { Container, Cta } from './Chrome'
import { CtaBand, IconCard, SectionHeader } from './ds'
import Faq from './Faq'
import JsonLd from './JsonLd'
import { SITE_URL } from '@/lib/supabaseServer'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

// SEO landing for people comparing casting platforms. Describes what The Ident does — it makes no claims
// about other platforms' prices or features (those change and aren't ours to state).
const FEATURES: [string, string, string][] = [
  ['shield-check', 'Pay up front', 'Every role shows the pay, dates and closing date before you apply, with a Fair pay badge where it meets the going rate.'],
  ['send', 'Apply in a tap', 'Your reel, CV, headshots and self-tapes go with every application.'],
  ['briefcase', 'Every casting tracked', 'Applied, self-tape, recall, pencilled, booked — one pipeline, sorted by what needs you next.'],
  ['video', 'Recalls your way', 'Send another tape, join a video call from the card, or see in-person details.'],
  ['pound', 'No commission', 'We never take a cut of work you book. Pay, invoices and a tax set-aside guide are built in.'],
  ['users', 'Community roles', 'Performers can post roles and side hustles too — clearly labelled — alongside castings.'],
]

export default function ComparePage({ name, slug, keyword, intro }: { name: string; slug: string; keyword: string; intro: string }) {
  const faq: [string, string][] = [
    [`Can I use The Ident alongside ${name}?`, `Yes. Many performers use more than one platform. The Ident works on its own, so you can use it alongside ${name} or instead of it.`],
    ['How much does The Ident cost?', `Performers pay ${price(PLANS.performer.pence)} a month after a ${TRIAL_DAYS}-day free trial. Casting teams pay ${price(PLANS.casting.pence)} a month. Browsing roles is free, and we never take commission.`],
    ['Who posts roles on The Ident?', 'Casting directors, producers and companies post castings directly, and performers can post community roles and side hustles. Each listing shows which it is.'],
    ['Is it only for actors?', 'No — actors, dancers, singers, musical theatre performers, voice artists and presenters all use The Ident.'],
  ]
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'WebPage', name: `${name} alternative for performers | The Ident`, url: SITE_URL + '/' + slug, description: intro },
        { '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      ] }} />
      <Container className="pb-6 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow={keyword} title={<>Looking for a {name} alternative?</>} sub={intro}
          actions={<><Cta href="/start?role=performer" variant="dark">Start free trial</Cta><Cta href="/jobs" variant="outline" arrow={false}>Browse roles</Cta></>} />
      </Container>
      <Container className="py-14 md:py-16">
        <SectionHeader eyebrow="What you get" title="Built for working performers" />
        <ul className="grid items-start gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))] lg:gap-10">
          {FEATURES.map(([icon, t, b], i) => <IconCard key={t} icon={icon} tone={['bg-lime', 'bg-mint', 'bg-butter', 'bg-blossom'][i % 4]} title={t} body={b} />)}
        </ul>
      </Container>
      <Container className="grid gap-10 py-14 md:grid-cols-[minmax(240px,380px)_1fr] md:gap-16 md:py-16">
        <div className="md:sticky md:top-28 md:self-start">
          <h2 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[48px]">Questions</h2>
          <p className="mt-4 text-[13px] text-muted-strong">See <Link href="/pricing" className="font-semibold text-forest underline">pricing</Link> or <Link href="/auditions" className="font-semibold text-forest underline">auditions by city</Link>.</p>
        </div>
        <Faq items={faq} />
      </Container>
      <Container className="pb-24 pt-6">
        <CtaBand title="Try The Ident free for 7 days." sub="Find roles, apply with your reel and track every casting in one place."
          actions={<><Cta href="/start?role=performer" variant="lime">Start free trial</Cta><Cta href="/pricing" variant="ghost-light" arrow={false}>See pricing</Cta></>} />
      </Container>
    </>
  )
}
