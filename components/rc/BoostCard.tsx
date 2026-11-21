'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { BOOST_PLANS, daysLeft, gbp, isBoosted, type BoostPlanId } from '@/lib/rc/boost'

// "Boost your profile": Featured at the top of casting's talent search. Paid with Stripe Checkout.
export default function BoostCard({ uid, until: initial }: { uid: string; until: string | null | undefined }) {
  const [until, setUntil] = useState(initial || null)
  const [busy, setBusy] = useState<BoostPlanId | null>(null)
  const [plan, setPlan] = useState<BoostPlanId>('month')
  const [waiting, setWaiting] = useState(false)

  // Back from Stripe: the boost is applied by Stripe's confirmation a few seconds later — wait for it
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('boost')
    if (!q) return
    window.history.replaceState(null, '', '/me')
    if (q === 'cancelled') { toast('No payment taken'); return }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off: show 'confirming' while we poll for the webhook
    setWaiting(true)
    let tries = 0
    const t = setInterval(async () => {
      tries++
      const { data } = await supabase.from('profiles').select('boosted_until').eq('id', uid).maybeSingle()
      if (isBoosted(data?.boosted_until) && data?.boosted_until !== initial) {
        clearInterval(t); setWaiting(false); setUntil(data!.boosted_until); toast('You’re featured — casting sees you first')
      } else if (tries > 15) { clearInterval(t); setWaiting(false); toast('Payment received — your boost will show in a minute') }
    }, 2000)
    return () => clearInterval(t)
  }, [uid, initial])

  const buy = async () => {
    setBusy(plan)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/boost/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: JSON.stringify({ plan }) })
    const out = await res.json().catch(() => ({}))
    if (!res.ok || !out.url) { setBusy(null); toast(out.error === 'payments not configured' ? 'Boosts are coming soon' : 'Couldn’t open checkout — try again'); return }
    window.location.href = out.url
  }

  const active = isBoosted(until)
  return (
    <div className="mt-5 overflow-hidden rounded-[var(--radius)] bg-forest text-white">
      <div className="p-5">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-lime"><Icon name="star" className="size-4 fill-current" />{active ? 'You’re featured' : 'Boost your profile'}</p>
        <p className="title mt-2 text-[22px] text-white">{active ? daysLeft(until) + ' day' + (daysLeft(until) === 1 ? '' : 's') + ' left at the top' : 'Get seen first by casting'}</p>
        <p className="mt-1 text-[14px] text-white/75">
          {waiting ? 'Confirming your payment…' : active
            ? 'You’re shown first in talent search with a Featured label. Extend any time — days add on.'
            : 'Featured at the top of talent search, with a Featured label on your profile. Applications stay in fair order.'}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {BOOST_PLANS.map(p => (
            <button key={p.id} type="button" onClick={() => setPlan(p.id)} aria-pressed={plan === p.id}
              className={cx('rounded-[10px] border p-3 text-left transition', plan === p.id ? 'border-lime bg-white/10' : 'border-white/20')}>
              <span className="block text-[13px] text-white/70">{p.label}</span>
              <span className="title block text-[20px] text-white">{gbp(p.pence)}</span>
              {p.id === 'month' && <span className="mt-1 inline-block rounded-full bg-lime px-2 py-0.5 text-[10px] font-semibold text-ink">Best value</span>}
            </button>
          ))}
        </div>
        <button type="button" onClick={buy} disabled={!!busy || waiting}
          className="mt-4 h-12 w-full rounded-[10px] bg-lime text-[15px] font-semibold text-ink shadow-cta disabled:opacity-60">
          {busy ? 'Opening checkout…' : (active ? 'Extend' : 'Boost') + ' for ' + gbp(BOOST_PLANS.find(p => p.id === plan)!.pence)}
        </button>
        <p className="mt-2 text-center text-[11px] text-white/55">Secure payment by Stripe · Apple Pay & Google Pay · one-off, no subscription</p>
      </div>
    </div>
  )
}
