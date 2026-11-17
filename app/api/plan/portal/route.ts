import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Stripe's customer portal: update card, see invoices, cancel. (Turn the portal on in Stripe → Settings → Billing.)
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'payments not configured' }, { status: 503 })
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: { user } } = await anon.auth.getUser(jwt)
  if (!user) return NextResponse.json({ error: 'not signed in' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: p } = await admin.from('profiles').select('stripe_customer_id').eq('id', user.id).maybeSingle()
  if (!p?.stripe_customer_id) return NextResponse.json({ error: 'no subscription yet' }, { status: 404 })
  const origin = req.headers.get('origin') || 'https://app.theident.me'
  const res = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
    method: 'POST', headers: { Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ customer: p.stripe_customer_id, return_url: origin + '/settings' }),
  })
  const s = await res.json().catch(() => ({}))
  if (!res.ok || !s.url) return NextResponse.json({ error: s?.error?.message || 'portal failed' }, { status: 502 })
  return NextResponse.json({ url: s.url })
}
