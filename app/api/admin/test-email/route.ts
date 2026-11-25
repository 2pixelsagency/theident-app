import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nudgeEmail, sendEmail, welcomeEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Admins only: send a preview of the welcome email to *your own* address (never to anyone else)
export async function POST(req: NextRequest) {
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!jwt) return NextResponse.json({ error: 'no auth' }, { status: 401 })
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: 'Bearer ' + jwt } }, auth: { persistSession: false },
  })
  const { data: { user } } = await asUser.auth.getUser(jwt)
  if (!user?.email) return NextResponse.json({ error: 'invalid session' }, { status: 401 })
  const { data: admin } = await asUser.rpc('is_admin')
  if (!admin) return NextResponse.json({ error: 'not admin' }, { status: 403 })

  let body: { variant?: string } = {}
  try { body = await req.json() } catch { /* default variant */ }
  const caster = body.variant === 'casting'
  const { data: p } = await asUser.from('profiles').select('first_name').eq('id', user.id).maybeSingle()
  // variant 'nudge' previews the "Have you forgotten about us?" reminder
  const ok = body.variant === 'nudge'
    ? await sendEmail(user.email, '[Test] Have you forgotten about us?', nudgeEmail({ firstName: p?.first_name || null, caster: false }))
    : await sendEmail(user.email, '[Test] Welcome to The Ident' + (caster ? ' (casting)' : ''), welcomeEmail({ firstName: p?.first_name || null, caster }))
  return ok ? NextResponse.json({ ok: true, to: user.email }) : NextResponse.json({ error: 'email failed' }, { status: 502 })
}
