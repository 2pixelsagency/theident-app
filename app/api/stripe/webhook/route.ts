import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'crypto'

export const runtime = 'nodejs'

// Stripe → us when a payment completes. Verifies Stripe's signature (STRIPE_WEBHOOK_SECRET), then applies the boost.
function verify(payload: string, header: string | null, secret: string) {
  if (!header) return false
  const parts = Object.fromEntries(header.split(',').map(kv => kv.split('=') as [string, string]))
  const t = Number(parts.t)
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false // reject old/replayed events
  const expected = createHmac('sha256', secret).update(t + '.' + payload).digest()
  return header.split(',').filter(kv => kv.startsWith('v1=')).some(kv => {
    const sig = Buffer.from(kv.slice(3), 'hex')
    return sig.length === expected.length && timingSafeEqual(sig, expected)
  })
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'webhook not configured' }, { status: 503 })
  const payload = await req.text()
  if (!verify(payload, req.headers.get('stripe-signature'), secret)) return NextResponse.json({ error: 'bad signature' }, { status: 400 })

  type Obj = { id: string; mode?: string; customer?: string; subscription?: string; status?: string; payment_status?: string; amount_total?: number; currency?: string
    metadata?: Record<string, string>; current_period_end?: number; items?: { data?: { current_period_end?: number }[] } }
  const event = JSON.parse(payload) as { type: string; data: { object: Obj } }
  const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  // Memberships (subscriptions)
  const o = event.data.object
  if (event.type === 'checkout.session.completed' && o.mode === 'subscription' && o.metadata?.profile_id) {
    const { error } = await admin().rpc('apply_plan', { p_profile: o.metadata.profile_id, p_customer: o.customer || null, p_subscription: o.subscription || null, p_status: 'active', p_kind: o.metadata.kind || null, p_period_end: null })
    if (error) return NextResponse.json({ error: 'could not apply' }, { status: 500 })
    return NextResponse.json({ received: true })
  }
  if (event.type.startsWith('customer.subscription.') && o.metadata?.profile_id) {
    const end = o.current_period_end ?? o.items?.data?.[0]?.current_period_end
    const status = event.type === 'customer.subscription.deleted' ? 'canceled' : o.status || 'active'
    const { error } = await admin().rpc('apply_plan', { p_profile: o.metadata.profile_id, p_customer: o.customer || null, p_subscription: o.id, p_status: status, p_kind: o.metadata.kind || null, p_period_end: end ? new Date(end * 1000).toISOString() : null })
    if (error) return NextResponse.json({ error: 'could not apply' }, { status: 500 })
    return NextResponse.json({ received: true })
  }
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    const s = event.data.object
    const profile = s.metadata?.profile_id, days = Number(s.metadata?.days)
    if (s.payment_status === 'paid' && profile && days > 0) {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
      const { error } = await admin.rpc('apply_boost', { p_profile: profile, p_session: s.id, p_days: days, p_amount: s.amount_total || 0, p_currency: s.currency || 'gbp' })
      if (error) return NextResponse.json({ error: 'could not apply' }, { status: 500 }) // Stripe retries
    }
  }
  return NextResponse.json({ received: true })
}
