'use client'

import { useState } from 'react'
import Icon from '@/components/rc/Icon'
import { Button, cx, toast } from '@/components/rc/ui'

// Optional payment step. Stripe isn't connected yet, so Pro is a waitlist for now.
const PLANS = [
  { id: 'free', name: 'Free', blurb: 'Everything you need to get started', features: ['Apply to verified roles', 'Track castings, recalls and bookings', 'Pay, tax and expenses tools'] },
  { id: 'pro', name: 'Pro', blurb: 'Get seen first', features: ['Priority placement in casting searches', 'Unlimited self-tape storage', 'Featured profile badge'] },
] as const

export default function ChoosePlan() {
  const [plan, setPlan] = useState<'free' | 'pro'>('free')

  return (
    <>
      <h1 className="mt-10 text-[26px]">You’re in.</h1>
      <p className="mt-1.5 text-[15px] text-muted">Pick a plan — you can change it any time in Settings.</p>

      <div role="radiogroup" className="mt-7 space-y-4">
        {PLANS.map(p => {
          const on = plan === p.id
          return (
            <button key={p.id} type="button" role="radio" aria-checked={on} onClick={() => setPlan(p.id)}
              className={cx('w-full overflow-hidden rounded-[20px] border-2 bg-surface text-left shadow-card transition', on ? 'border-green' : 'border-transparent')}>
              {p.id === 'pro' && <div className="bg-accent px-5 py-2 text-xs font-medium uppercase tracking-[0.08em] text-ink">Coming soon</div>}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-[19px] font-medium">{p.name}</span>
                  <span className={cx('flex size-6 items-center justify-center rounded-full border-2', on ? 'border-green bg-green text-white' : 'border-line')}>
                    {on && <Icon name="check" className="size-3.5" strokeWidth={2.4} />}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-muted">{p.blurb}</p>
                <ul className="mt-3 space-y-1.5">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm"><Icon name="check" className="mt-0.5 size-4 text-green" />{f}</li>
                  ))}
                </ul>
              </div>
            </button>
          )
        })}
      </div>

      <div className="mt-auto space-y-3 pt-10">
        {plan === 'pro'
          ? <Button size="lg" full onClick={() => toast('Pro is coming soon — we’ll let you know when it’s ready')}>Join the Pro waitlist</Button>
          : <Button size="lg" full trailingIcon="arrow-right" href="/home">Continue free</Button>}
        {plan === 'pro' && <Button variant="outline" size="lg" full href="/home">Maybe later</Button>}
      </div>
    </>
  )
}
