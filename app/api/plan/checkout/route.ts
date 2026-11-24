import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PLANS, TRIAL_DAYS, planForProfile } from '@/lib/rc/plans'

export const runtime = 'nodejs'

// Starts a Stripe Checkout subscription for the member's plan (performer, graduate or casting — prices in lib/rc/plans.ts)
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'payments not configured' }, { status: 503 })
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: { user } } = await anon.auth.getUser(jwt)
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('account_role, stripe_customer_id, plan_status, is_graduate, graduate_year').eq('id', user.id).maybeSingle()
  const kind = planForProfile(p?.account_role, p), plan = PLANS[kind]
  const origin = req.headers.get('origin') || 'https://app.theident.me'
  let next = '/home'
  try { const b = await req.json(); if (typeof b?.next === 'string' && b.next.startsWith('/') && !b.next.startsWith('//')) next = b.next } catch { /* */ }

  const form = new URLSearchParams({
    mode: 'subscription',
    success_url: origin + '/plan?success=1&next=' + encodeURIComponent(next),
    cancel_url: origin + '/plan?cancelled=1',
    client_reference_id: user.id,
    'metadata[profile_id]': user.id, 'metadata[kind]': kind,
    'subscription_data[metadata][profile_id]': user.id, 'subscription_data[metadata][kind]': kind,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][unit_amount]': String(plan.pence),
    'line_items[0][price_data][recurring][interval]': 'month',
    'line_items[0][price_data][product_data][name]': 'The Ident · ' + plan.name + ' membership',
    allow_promotion_codes: 'true',
  })
  // One free trial per member
  if (TRIAL_DAYS > 0 && !p?.plan_status) form.set('subscription_data[trial_period_days]', String(TRIAL_DAYS))
  if (p?.stripe_customer_id) form.set('customer', p.stripe_customer_id); else if (user.email) form.set('customer_email', user.email)

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' }, body: form })
  const session = await res.json().catch(() => ({}))
  if (!res.ok || !session.url) return NextResponse.json({ error: session?.error?.message || 'checkout failed' }, { status: 502 })
  return NextResponse.json({ url: session.url })
}
