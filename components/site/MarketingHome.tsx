import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import RolesCarousel from './RolesCarousel'
import HeroTalent from './HeroTalent'
import WorkedWith from './WorkedWith'
import { Container, Cta, SECTION, SectionHead } from './Chrome'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import JsonLd from './JsonLd'
import Faq from './Faq'
import FeatureRows, { FeatureGrid } from './FeatureRows'
import { HOME_FAQ } from '@/lib/site/faq'
import { SITE_URL } from '@/lib/supabaseServer'

const STEPS = [
  { n: '01', title: 'Build your Ident', body: 'Headshots, showreel, credits, skills and CV — one profile that casting can trust.', tone: 'bg-mint', chip: 'Profile 100% complete', chipTone: 'bg-mint text-green-ink' },
  { n: '02', title: 'Find and apply', body: 'Roles from casting directors and the community, filtered to what fits you. Apply in a tap.', tone: 'bg-butter', chip: '3 new roles match you', chipTone: 'bg-butter' },
  { n: '03', title: 'Recall, pencil, book', body: 'Send self-tapes, join video-call recalls and sign your contract — all tracked for you.', tone: 'bg-lime', chip: 'You’re booked!', chipTone: 'bg-lime text-ink' },
]

export default function MarketingHome() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': SITE_URL + '/#org', name: 'The Ident', url: SITE_URL, logo: SITE_URL + '/icon-512.png', email: 'hello@theident.me', description: 'A casting app for performers and casting teams in the UK.' },
          { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL, name: 'The Ident', publisher: { '@id': SITE_URL + '/#org' },
            potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE_URL + '/people?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
          { '@type': 'SoftwareApplication', name: 'The Ident', applicationCategory: 'BusinessApplication', operatingSystem: 'Web, iOS', url: SITE_URL,
            offers: [
              { '@type': 'Offer', name: 'Performer membership', price: (PLANS.performer.pence / 100).toFixed(2), priceCurrency: 'GBP', category: 'subscription' },
              { '@type': 'Offer', name: 'Casting membership', price: (PLANS.casting.pence / 100).toFixed(2), priceCurrency: 'GBP', category: 'subscription' },
            ] },
          { '@type': 'FAQPage', mainEntity: HOME_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        ],
      }} />
      <HeroTalent />
      <WorkedWith />

      {/* ───── Roles carousel ───── */}
      <section className={'overflow-x-clip ' + SECTION}>
        <Container>
          <SectionHead eyebrow="Live now" title="Roles casting this week" sub="Real castings from casting directors, producers and the community — updated as they’re posted."
            action={<Link href="/jobs" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-green-ink">All roles <Icon name="arrow-right" className="size-4" /></Link>} />
        </Container>
        <RolesCarousel />
      </section>

      {/* ───── Features (alternating rows) ───── */}
      <section className={SECTION}>
        <Container>
          <SectionHead center eyebrow="For performers" title={<>Everything between “I saw a casting” and <span className="text-green-ink">“I’m booked”.</span></>} />
          <FeatureRows />
          <div className="mt-24 md:mt-32"><FeatureGrid /></div>
          <div className="mt-10 flex justify-center"><Cta href="/performers" variant="dark">Everything for performers</Cta></div>
        </Container>
      </section>

      {/* ───── Stacking cards ───── */}
      <section className={SECTION}>
        <Container>
          <SectionHead eyebrow="How it works" title="Three steps to your next job" />
          <ol className="relative">
            {STEPS.map((s, i) => (
              <li key={s.n} className="sticky pb-6" style={{ top: 96 + i * 28 }}>
                <div className="grid min-h-[300px] gap-8 rounded-[16px] border border-line bg-surface p-8 shadow-[0_30px_60px_-34px_rgb(18_49_39/0.4)] md:grid-cols-[1fr_1.2fr] md:p-12">
                  <div>
                    <p className={'flex size-14 items-center justify-center rounded-[12px] font-display text-[22px] font-bold ' + s.tone}>{s.n}</p>
                    <p className="mt-6 text-[28px] font-semibold leading-tight md:text-[34px]">{s.title}</p>
                  </div>
                  <div className="flex flex-col justify-between gap-6">
                    <p className="text-[18px] leading-relaxed text-muted">{s.body}</p>
                    <span className={'w-fit rounded-full px-4 py-2 text-[14px] font-semibold ' + s.chipTone}>{s.chip}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ───── Casting ───── */}
      <section className={'bg-forest text-white ' + SECTION}>
        <Container>
          <SectionHead light eyebrow="For casting teams" title="Cast faster, with every tape in one place." sub="Post a role, watch self-tapes inline, recall by tape, video call or in person — and book, without a single email chain."
            action={<div className="flex flex-wrap gap-3"><Cta href="/start?role=caster">Start casting</Cta><Cta href="/casting" variant="ghost-light">How it works</Cta></div>} />
          <div className="grid gap-4 md:grid-cols-4">
            {[['megaphone', 'Post in minutes', 'Ask for exactly the materials you need, add an NDA, set a closing date.'], ['play', 'Tapes inline', 'Watch reels and self-tapes, rate, shortlist and swipe through applicants.'], ['video', 'Recall your way', 'Another tape, a Zoom link, or in person — your call.'], ['users', 'Search talent', 'Find performers by skill, playing age and place, and invite them.']].map(([icon, t, b]) => (
              <div key={t} className="rounded-[16px] bg-white/[0.06] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.09]">
                <span className="flex size-11 items-center justify-center rounded-[10px] bg-lime text-ink"><Icon name={icon} className="size-5" /></span>
                <p className="mt-5 text-[18px] font-semibold">{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ───── FAQ (answer-engine friendly) ───── */}
      <section className={SECTION}>
        <Container className="grid gap-10 md:grid-cols-[minmax(240px,340px)_1fr] md:gap-16">
          <div className="md:sticky md:top-28 md:self-start">
            <p className="eyebrow text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">FAQ</p>
            <h2 className="mt-3 text-[34px] leading-[1.05] tracking-[-0.025em] md:text-[44px]">Good questions</h2>
          </div>
          <Faq items={HOME_FAQ} />
        </Container>
      </section>

      {/* ───── Final CTA ───── */}
      <section className={SECTION}>
        <Container>
          <div className="relative overflow-hidden rounded-[16px] bg-lime px-8 py-16 text-center md:py-20">
            <h2 className="mx-auto max-w-[720px] text-[36px] leading-[1.05] tracking-[-0.02em] md:text-[52px]">Your next role is already on The Ident.</h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[17px] text-ink/70">Try everything free for {TRIAL_DAYS} days. {price(PLANS.performer.pence)} a month after that — less than a coffee.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3"><Cta href="/start?role=performer" variant="dark">Start free trial</Cta><Cta href="/pricing" variant="outline">See pricing</Cta></div>
          </div>
        </Container>
      </section>
    </>
  )
}
