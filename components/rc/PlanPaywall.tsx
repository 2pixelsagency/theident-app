'use client'

import { useState } from 'react'
import Icon from './Icon'
import { Button, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { PLANS, TRIAL_DAYS, planFor, price } from '@/lib/rc/plans'
import { isNativeApp } from '@/lib/rc/authRedirect'
import { signOutAndReset } from '@/lib/rc/onboarding'

// The membership screen: one plan per side, no free tier. Used at the end of sign-up and as the in-app gate.
export default function PlanPaywall({ role, next = '/home', title, sub, firstTime }: { role: string | null | undefined; next?: string; title?: string; sub?: string; firstTime?: boolean }) {
  const kind = planFor(role), plan = PLANS[kind]
  const [busy, setBusy] = useState(false)
  // Apple doesn't allow web checkout for digital memberships inside the iOS app — no price or buy button there
  const [native] = useState(() => isNativeApp())

  const subscribe = async () => {
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/plan/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: JSON.stringify({ next }) })
    const j = await res.json().catch(() => ({}))
    if (j.url) { window.location.href = j.url; return }
    setBusy(false)
    toast(res.status === 503 ? 'Payments aren’t switched on yet — try again soon' : 'Couldn’t start checkout. Please try again.')
  }

  return (
    <div className="flex flex-1 flex-col">
      <h1 className="mt-10 text-[28px] leading-tight">{title || (firstTime ? 'One last step' : 'Your membership')}</h1>
      <p className="mt-1.5 text-[15px] text-muted">{sub || (native ? 'Your account doesn’t have an active membership.' : (kind === 'casting' ? 'Post roles, review applicants and book your cast — all in one place.' : 'Everything in The Ident for less than a coffee a month.'))}</p>

      <div className="mt-7 overflow-hidden rounded-[10px] border-2 border-green bg-surface shadow-card">
        {!native && TRIAL_DAYS > 0 && <div className="bg-lime px-5 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-ink">{TRIAL_DAYS}-day free trial</div>}
        <div className="p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[20px] title">{plan.name} membership</span>
            {!native && <span className="whitespace-nowrap"><span className="text-[26px] font-semibold">{price(plan.pence)}</span><span className="text-sm text-muted"> / month</span></span>}
          </div>
          <ul className="mt-4 space-y-2">
            {plan.features.map(f => <li key={f} className="flex items-start gap-2 text-[15px]"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-green" />{f}</li>)}
          </ul>
        </div>
      </div>
      {!native && <p className="mt-3 text-center text-[13px] text-muted">{TRIAL_DAYS > 0 ? `Free for ${TRIAL_DAYS} days, then ${price(plan.pence)} a month. ` : ''}Cancel any time in Settings.</p>}

      <div className="mt-auto space-y-3 pt-10">
        {!native && <Button size="lg" full onClick={subscribe} disabled={busy}>{busy ? 'Opening secure checkout…' : TRIAL_DAYS > 0 ? 'Start free trial' : 'Subscribe'}</Button>}
        <Button variant="ghost" size="lg" full onClick={() => signOutAndReset().then(() => { window.location.href = '/welcome' })}>Log out</Button>
      </div>
    </div>
  )
}
