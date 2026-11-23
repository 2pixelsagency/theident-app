import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Container } from '@/components/site/Chrome'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import JsonLd from '@/components/site/JsonLd'

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
      <div className={'flex flex-col p-8 md:p-12 ' + (dark ? 'bg-forest text-white' : 'bg-surface')}>
        <div className="flex items-center justify-between">
          <p className={'text-[13px] font-semibold uppercase tracking-[0.12em] ' + (dark ? 'text-lime' : 'text-green-ink')}>{p.name}</p>
          <p className={'text-[13px] ' + (dark ? 'text-white/60' : 'text-muted')}>{kind === 'casting' ? 'Casting directors & producers' : 'Actors, dancers, singers'}</p>
        </div>
        <p className="mt-10 flex items-start gap-1"><span className="mt-3 text-[22px] font-semibold">£</span><span className="font-display text-[88px] font-bold leading-none tracking-[-0.04em]">{(p.pence / 100).toFixed(2)}</span></p>
        <p className={'mt-3 text-[15px] ' + (dark ? 'text-white/70' : 'text-muted')}>per month · {TRIAL_DAYS} days free · cancel any time</p>
        <ul className={'mt-10 flex-1 divide-y border-t ' + (dark ? 'divide-white/10 border-white/10' : 'divide-line border-line')}>
          {p.features.map(f => <li key={f} className="flex items-start gap-3 py-3.5 text-[16px]"><Icon name="check" className={'mt-1 size-4 shrink-0 ' + (dark ? 'text-lime' : 'text-green')} />{f}</li>)}
        </ul>
        <Link href={href} className={'group mt-10 inline-flex h-14 items-center justify-between rounded-full pl-7 pr-2 text-[16px] font-semibold ' + (dark ? 'bg-lime text-ink' : 'bg-forest text-white')}>
          {cta}<span className={'flex size-10 items-center justify-center rounded-full transition group-hover:translate-x-0.5 ' + (dark ? 'bg-forest text-lime' : 'bg-lime text-ink')}><Icon name="arrow-right" className="size-5" /></span>
        </Link>
      </div>
    )
  }
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }} />
      <Container className="pb-14 pt-32 md:pt-44">
        <p className="rise text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">Pricing</p>
        <div className="mt-5 grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
          <h1 className="rise text-[44px] leading-[1.02] tracking-[-0.035em] md:text-[72px]" style={{ '--d': '100ms' } as React.CSSProperties}>Two plans.<br />No commission. Ever.</h1>
          <p className="rise text-[18px] leading-relaxed text-muted" style={{ '--d': '200ms' } as React.CSSProperties}>One plan for performers, one for casting teams. Try either free for {TRIAL_DAYS} days — browsing roles is always free.</p>
        </div>
      </Container>
      <Container>
        <div className="rise grid overflow-hidden rounded-[16px] border border-line shadow-[0_30px_70px_-40px_rgb(18_49_39/0.5)] md:grid-cols-2" style={{ '--d': '300ms' } as React.CSSProperties}>
          {plan('performer', '/start?role=performer', 'Start free trial')}
          {plan('casting', '/start?role=caster', 'Start casting', true)}
        </div>
      </Container>
      <Container className="grid gap-10 py-24 md:grid-cols-[minmax(240px,340px)_1fr] md:gap-16 md:py-32">
        <div className="md:sticky md:top-28 md:self-start">
          <h2 className="text-[34px] leading-[1.05] tracking-[-0.025em] md:text-[44px]">Questions,<br />answered</h2>
          <p className="mt-4 text-muted">Something else? <Link href="/contact" className="font-semibold text-green-ink underline">Get in touch</Link>.</p>
        </div>
        <div className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[20px] font-semibold leading-snug md:text-[22px]">
                {q}
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line transition group-open:rotate-45 group-open:border-forest group-open:bg-forest group-open:text-lime"><Icon name="plus" className="size-4" /></span>
              </summary>
              <p className="mt-3 max-w-[620px] text-[16px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Container>
    </>
  )
}
