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

  const event = JSON.parse(payload) as { type: string; data: { object: { id: string; payment_status?: string; amount_total?: number; currency?: string; metadata?: Record<string, string> } } }
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
