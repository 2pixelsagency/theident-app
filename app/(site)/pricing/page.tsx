import Link from 'next/link'
import { Container } from '@/components/site/Chrome'
import { Eyebrow, SectionHeader } from '@/components/site/ds'
import PlanCard, { PlanGrid } from '@/components/site/PlanCard'
import { GRADUATE_YEARS, PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import JsonLd from '@/components/site/JsonLd'
import Faq from '@/components/site/Faq'

export const metadata = { alternates: { canonical: '/pricing' }, title: 'Pricing · The Ident', description: `Performers ${price(PLANS.performer.pence)}/month (recent graduates ${price(PLANS.graduate.pence)}), casting ${price(PLANS.casting.pence)}/month. ${TRIAL_DAYS}-day free trial, cancel any time.` }

const FAQ = [
  ['Is there a free trial?', `Yes — ${TRIAL_DAYS} days free on either plan. We’ll remind you before it ends, and you can cancel any time.`],
  ['Can I browse roles without paying?', 'Yes. The job board is open to everyone. You need a membership to apply, post, message and use the rest of the app.'],
  ['How do I cancel?', 'In the app: Settings → Membership → Manage. Cancel any time; you keep access until the end of the period you’ve paid for.'],
  ['Can I switch between performer and casting?', 'Each account is one type. If you need both, contact us and we’ll help.'],
  ['Can performers post jobs?', 'Yes — performers can post roles and side hustles and review applicants. They’re labelled “Community” on the board.'],
  ['Do you take a cut of my pay?', 'No. We never take commission on work you book through The Ident.'],
]

export default function PricingPage() {
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
      <Container className="pb-4 pt-32 md:pt-40">
        <SectionHeader center level={1} eyebrow="Pricing" title={<>Two plans.<br />No commission. Ever.</>} sub={`One plan for performers, one for casting teams. Try either free for ${TRIAL_DAYS} days — browsing roles is always free.`} />
        <div className="mx-auto max-w-[880px]">
          <PlanGrid>
            <PlanCard label="For actors, dancers and singers" name="Performer" line="Find roles, apply with your reel and track every casting." value={price(PLANS.performer.pence)} unit="/month"
              small={`${TRIAL_DAYS} days free, then billed monthly · Graduated in the last ${GRADUATE_YEARS} years? ${price(PLANS.graduate.pence)}/month`} cta={{ href: '/start?role=performer', label: 'Start free trial' }} note="Cancel anytime" included={PLANS.performer.features} />
            <PlanCard dark badge={`${TRIAL_DAYS} days free`} label="For casting directors and producers" name="Casting" line="Post roles, watch tapes inline, recall and book your cast." value={price(PLANS.casting.pence)} unit="/month"
              small={`${TRIAL_DAYS} days free, then billed monthly`} cta={{ href: '/start?role=caster', label: 'Start casting' }} note="Cancel anytime" included={PLANS.casting.features} />
          </PlanGrid>
        </div>
      </Container>
      <Container className="grid gap-10 py-24 md:grid-cols-[minmax(240px,380px)_1fr] md:gap-16">
        <div className="flex flex-col gap-4 md:sticky md:top-28 md:self-start">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[56px]">Questions, answered</h2>
          <p className="text-[13px] text-muted-strong">Something else? <Link href="/contact" className="font-semibold text-forest underline">Get in touch</Link>.</p>
        </div>
        <Faq items={FAQ as [string, string][]} />
      </Container>
    </>
  )
}
