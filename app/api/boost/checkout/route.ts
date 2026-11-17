import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { planById } from '@/lib/rc/boost'

export const runtime = 'nodejs'

// Starts a Stripe Checkout for a profile boost (performers only). Stripe's REST API, no SDK needed.
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'payments not configured' }, { status: 503 })
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: 'Bearer ' + jwt } }, auth: { persistSession: false } })
  const { data: { user } } = await asUser.auth.getUser(jwt)
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })

  let body: { plan?: string } = {}
  try { body = await req.json() } catch { /* */ }
  const plan = planById(body.plan || '')
  if (!plan) return NextResponse.json({ error: 'unknown plan' }, { status: 400 })
  const { data: p } = await asUser.from('profiles').select('account_role').eq('id', user.id).maybeSingle()
  if (p?.account_role === 'caster') return NextResponse.json({ error: 'boosts are for performer profiles' }, { status: 400 })

  const origin = req.headers.get('origin') || 'https://app.theident.me'
  const form = new URLSearchParams({
    mode: 'payment',
    success_url: origin + '/me?boost=success',
    cancel_url: origin + '/me?boost=cancelled',
    client_reference_id: user.id,
    'metadata[profile_id]': user.id,
    'metadata[plan]': plan.id,
    'metadata[days]': String(plan.days),
    'payment_intent_data[metadata][profile_id]': user.id,
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'gbp',
    'line_items[0][price_data][unit_amount]': String(plan.pence),
    'line_items[0][price_data][product_data][name]': 'The Ident profile boost · ' + plan.label,
    'line_items[0][price_data][product_data][description]': 'Featured at the top of casting’s talent search for ' + plan.days + ' days.',
    allow_promotion_codes: 'true',
  })
  if (user.email) form.set('customer_email', user.email)
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  })
  const session = await res.json().catch(() => ({}))
  if (!res.ok || !session.url) return NextResponse.json({ error: session?.error?.message || 'checkout failed' }, { status: 502 })
  return NextResponse.json({ url: session.url })
}
