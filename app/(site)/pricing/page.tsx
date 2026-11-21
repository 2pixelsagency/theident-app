import Icon from '@/components/rc/Icon'
import { Cta, Eyebrow } from '@/components/site/Chrome'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

export const metadata = { title: 'Pricing · The Ident', description: `Performers ${price(PLANS.performer.pence)}/month, casting ${price(PLANS.casting.pence)}/month. ${TRIAL_DAYS}-day free trial, cancel any time.` }

const FAQ = [
  ['Is there a free trial?', `Yes — ${TRIAL_DAYS} days free on either plan. We’ll remind you before it ends, and you can cancel any time.`],
  ['Can I browse roles without paying?', 'Yes. The job board is open to everyone. You need a membership to apply, post, message and use the rest of the app.'],
  ['How do I cancel?', 'In the app: Settings → Membership → Manage. Cancel any time; you keep access until the end of the period you’ve paid for.'],
  ['Can I switch between performer and casting?', 'Each account is one type. If you need both, contact us and we’ll help.'],
  ['Can performers post jobs?', 'Yes — performers can post roles and side hustles and review applicants. They’re labelled “Community” on the board.'],
  ['Do you take a cut of my pay?', 'No. We never take commission on work you book through The Ident.'],
]

export default function PricingPage() {
  const card = (kind: 'performer' | 'casting', href: string, cta: string, dark?: boolean) => {
    const p = PLANS[kind]
    return (
      <div className={'flex flex-col rounded-[var(--radius)] p-7 shadow-card ' + (dark ? 'bg-forest text-white' : 'border border-line bg-surface')}>
        <p className={'text-[15px] font-semibold ' + (dark ? 'text-lime' : 'text-green-ink')}>{p.name}</p>
        <p className="mt-3"><span className="font-display text-[48px] font-bold leading-none">{price(p.pence)}</span><span className={dark ? 'text-white/70' : 'text-muted'}> / month</span></p>
        <p className={'mt-2 text-[14px] ' + (dark ? 'text-white/70' : 'text-muted')}>{TRIAL_DAYS} days free, then billed monthly. Cancel any time.</p>
        <ul className="mt-6 flex-1 space-y-2.5">{p.features.map(f => <li key={f} className="flex items-start gap-2.5 text-[15px]"><Icon name="check" className={'mt-0.5 size-4 shrink-0 ' + (dark ? 'text-lime' : 'text-green')} />{f}</li>)}</ul>
        <div className="mt-8"><Cta href={href}>{cta}</Cta></div>
      </div>
    )
  }
  return (
    <>
      <section className="bg-glow">
        <div className="mx-auto max-w-[1000px] px-5 pb-6 pt-14 text-center md:pt-20">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-3 text-[40px] leading-[1.05] md:text-[56px]">Simple pricing. No commission.</h1>
          <p className="mx-auto mt-4 max-w-[560px] text-[18px] text-muted">One plan for performers, one for casting teams. Try either free for {TRIAL_DAYS} days.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1000px] gap-5 px-5 py-10 md:grid-cols-2">
        {card('performer', '/start?role=performer', 'Start free trial')}
        {card('casting', '/start?role=caster', 'Start casting', true)}
      </section>
      <section className="mx-auto max-w-[760px] px-5 pb-20 pt-6">
        <h2 className="text-[28px]">Questions</h2>
        <div className="mt-6 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">{q}<Icon name="plus" className="size-4 shrink-0 transition group-open:rotate-45" /></summary>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}
