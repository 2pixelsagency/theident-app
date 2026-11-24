import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Container } from '@/components/site/Chrome'
import { Eyebrow, IconBadge, Pill, SandCard, SectionHeader, Tag } from '@/components/site/ds'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import JsonLd from '@/components/site/JsonLd'
import Faq from '@/components/site/Faq'

export const metadata = { alternates: { canonical: '/pricing' }, title: 'Pricing · The Ident', description: `Performers ${price(PLANS.performer.pence)}/month, casting ${price(PLANS.casting.pence)}/month. ${TRIAL_DAYS}-day free trial, cancel any time.` }

const FAQ = [
  ['Is there a free trial?', `Yes — ${TRIAL_DAYS} days free on either plan. We’ll remind you before it ends, and you can cancel any time.`],
  ['Can I browse roles without paying?', 'Yes. The job board is open to everyone. You need a membership to apply, post, message and use the rest of the app.'],
  ['How do I cancel?', 'In the app: Settings → Membership → Manage. Cancel any time; you keep access until the end of the period you’ve paid for.'],
  ['Can I switch between performer and casting?', 'Each account is one type. If you need both, contact us and we’ll help.'],
  ['Can performers post jobs?', 'Yes — performers can post roles and side hustles and review applicants. They’re labelled “Community” on the board.'],
  ['Do you take a cut of my pay?', 'No. We never take commission on work you book through The Ident.'],
]

export default function PricingPage() {
  const plan = (kind: 'performer' | 'casting', href: string, cta: string, dark?: boolean) => {
    const p = PLANS[kind]
    return (
      <SandCard as="article" dark={dark} className="flex flex-col gap-3 shadow-[0_1px_0_rgb(21_33_28/0.04),0_24px_48px_-32px_rgb(21_33_28/0.25)]">
        <div className="flex flex-wrap items-center gap-2.5">
          <IconBadge tone={dark ? 'bg-lime' : 'bg-forest'}><Icon strokeWidth={2} name={kind === 'casting' ? 'megaphone' : 'user'} className={'size-5 ' + (dark ? 'text-forest' : 'text-lime')} /></IconBadge>
          <span className="font-display text-[20px] font-bold">{p.name}</span>
          <Tag light={dark}>{kind === 'casting' ? 'Casting teams' : 'Performers'}</Tag>
        </div>
        <p className="mt-6 flex items-start gap-1"><span className="mt-3 text-[22px] font-semibold">£</span><span className="font-display text-[80px] font-extrabold leading-none tracking-[-0.04em] md:text-[88px]">{(p.pence / 100).toFixed(2)}</span></p>
        <p className={'text-[13px] ' + (dark ? 'text-on-dark-muted' : 'text-muted-strong')}>per month · {TRIAL_DAYS} days free · cancel any time</p>
        <ul className={'mt-6 flex-1 rounded-[20px] p-5 ' + (dark ? 'bg-forest-raised' : 'bg-surface')}>
          {p.features.map(f => <li key={f} className={'flex items-start gap-3 border-b py-3 text-[13px] last:border-0 ' + (dark ? 'border-white/10' : 'border-line-soft')}><Icon strokeWidth={2} name="check" className={'mt-1 size-4 shrink-0 ' + (dark ? 'text-lime' : 'text-forest')} />{f}</li>)}
        </ul>
        <Pill href={href} variant={dark ? 'lime' : 'forest'} arrow className="mt-6 w-full">{cta}</Pill>
      </SandCard>
    )
  }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
      <Container className="pb-4 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow="Pricing" title={<>Two plans.<br />No commission. Ever.</>} sub={`One plan for performers, one for casting teams. Try either free for ${TRIAL_DAYS} days — browsing roles is always free.`} />
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))]">
          {plan('performer', '/start?role=performer', 'Start free trial')}
          {plan('casting', '/start?role=caster', 'Start casting', true)}
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
