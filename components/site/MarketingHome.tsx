import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import RolesCarousel from './RolesCarousel'
import HeroTalent from './HeroTalent'
import WorkedWith from './WorkedWith'
import { Container, Cta, Eyebrow, SECTION, SectionHead } from './Chrome'
import { CtaBand, FeatureCard, FloatFrame, IconBadge, IconCard, Panel, Tag } from './ds'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import JsonLd from './JsonLd'
import Faq from './Faq'
import CastingsSection from './castings/CastingsSection'
import { HOME_FAQ } from '@/lib/site/faq'
import { SITE_URL } from '@/lib/supabaseServer'

const STEPS = [
  { n: '01', title: 'Build your Ident', body: 'Headshots, showreel, credits, skills and CV — one profile that casting can trust.', badge: 'bg-mint', panel: 'var(--panel-mint)', icon: 'user', chip: 'Profile 100% complete', chipSub: 'Ready for casting to see' },
  { n: '02', title: 'Find and apply', body: 'Roles from casting directors and the community, filtered to what fits you. Apply in a tap.', badge: 'bg-butter', panel: 'var(--panel-butter)', icon: 'search', chip: '3 new roles match you', chipSub: 'Theatre · Manchester' },
  { n: '03', title: 'Recall, pencil, book', body: 'Send self-tapes, join video-call recalls and sign your contract — all tracked for you.', badge: 'bg-lime', panel: 'var(--panel-lime)', icon: 'check', chip: 'You’re booked!', chipSub: 'Sign your contract' },
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

      {/* ───── Castings bento (approved design) ───── */}
      <CastingsSection />

      {/* ───── How it works: three cards with a floating screen each ───── */}
      <section className={SECTION}>
        <Container>
          <SectionHead eyebrow="How it works" title="Three steps to your next job" sub="Build your profile once, apply in a tap, and let The Ident track everything from self-tape to contract." />
          <ol className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
            {STEPS.map(s => (
              <li key={s.n} className="flex">
                <FeatureCard size="sm" title={s.title} body={s.body}
                  header={<div className="flex items-center justify-between"><IconBadge tone={s.badge}><span className="font-display text-[15px] font-bold text-forest">{s.n}</span></IconBadge><Tag>Step {Number(s.n)}</Tag></div>}>
                  <Panel size="sm" background={s.panel} stripes="light">
                    <FloatFrame size="sm">
                      <div className="flex items-center gap-3">
                        <span className={'flex size-9 shrink-0 items-center justify-center rounded-[10px] ' + s.badge}><Icon name={s.icon} className="size-4 text-forest" /></span>
                        <span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{s.chip}</span><span className="block truncate text-[13px] text-muted">{s.chipSub}</span></span>
                      </div>
                    </FloatFrame>
                  </Panel>
                </FeatureCard>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ───── For casting teams ───── */}
      <section className={SECTION}>
        <Container>
          <SectionHead eyebrow="For casting teams" title="Cast faster, with every tape in one place." sub="Post a role, watch self-tapes inline, recall by tape, video call or in person — and book, without a single email chain."
            action={<><Cta href="/start?role=caster" variant="dark">Start casting</Cta><Cta href="/casting" variant="outline" arrow={false}>How it works</Cta></>} />
          <ul className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
            <IconCard icon="megaphone" tone="bg-lime" title="Post in minutes" body="Ask for exactly the materials you need, add an NDA, set a closing date." href="/casting" label="How posting a role works" />
            <IconCard icon="play" tone="bg-butter" title="Tapes inline" body="Watch reels and self-tapes, rate, shortlist and swipe through applicants." href="/casting" label="How reviewing tapes works" />
            <IconCard icon="video" tone="bg-mint" title="Recall your way" body="Another tape, a Zoom link, or in person — your call." href="/casting" label="How recalls work" />
            <IconCard icon="users" tone="bg-lime" dark title="Search talent" body="Find performers by skill, playing age and place, and invite them." href="/people" label="Browse talent" />
          </ul>
        </Container>
      </section>

      {/* ───── FAQ (answer-engine friendly) ───── */}
      <section className={SECTION}>
        <Container className="grid gap-10 md:grid-cols-[minmax(240px,380px)_1fr] md:gap-16">
          <div className="flex flex-col gap-4 md:sticky md:top-28 md:self-start">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[56px]">Good questions</h2>
          </div>
          <Faq items={HOME_FAQ} />
        </Container>
      </section>

      {/* ───── Final CTA ───── */}
      <section className={SECTION}>
        <Container>
          <CtaBand title="Your next role is already on The Ident." sub={`Try everything free for ${TRIAL_DAYS} days. ${price(PLANS.performer.pence)} a month after that — less than a coffee.`}
            actions={<><Cta href="/start?role=performer" variant="lime">Start free trial</Cta><Cta href="/pricing" variant="ghost-light" arrow={false}>See pricing</Cta></>} />
        </Container>
      </section>
    </>
  )
}
