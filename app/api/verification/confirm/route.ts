import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// A school or agent clicked the link in our email.
//  School: a .ac.uk / .edu address is verified straight away; any other domain proves the inbox, then an admin checks.
//  Agent: an agency domain is verified straight away; a personal webmail address (gmail etc.) goes to an admin.
const WEBMAIL = /@(gmail|googlemail|hotmail|outlook|live|msn|yahoo|ymail|icloud|me|mac|aol|proton|protonmail|gmx|mail|btinternet|sky|virginmedia|talktalk)\./i

export async function POST(req: NextRequest) {
  let token = ''
  try { token = String((await req.json())?.token || '') } catch { /* */ }
  if (!/^[0-9a-f-]{36}$/i.test(token)) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const { data: c } = await admin.from('verification_checks').select('id, profile_id, kind, method, status, email, expires_at').eq('token', token).maybeSingle()
  if (!c) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  if (c.status === 'approved' || c.status === 'pending') return NextResponse.json({ ok: true, already: true, status: c.status, kind: c.kind })
  if (c.status !== 'awaiting_email') return NextResponse.json({ error: 'invalid' }, { status: 400 })
  if (new Date(c.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 400 })

  const email = c.email || ''
  const auto = c.method === 'school_email' ? /\.(ac\.uk|edu)$/i.test(email) : !WEBMAIL.test(email)
  await admin.from('verification_checks').update({ status: auto ? 'approved' : 'pending', decided_at: auto ? new Date().toISOString() : null }).eq('id', c.id)
  if (auto) {
    if (c.kind === 'graduate') await admin.from('profiles').update({ graduate_verified: true }).eq('id', c.profile_id)
    else await admin.from('profiles').update({ pro_verified: true, pro_verified_via: 'Agent confirmed' }).eq('id', c.profile_id).eq('pro_verified', false)
    await admin.from('notifications').insert({
      profile_id: c.profile_id, type: 'verification', title: c.kind === 'graduate' ? 'Graduation verified' : 'You’re a verified professional',
      body: c.kind === 'graduate' ? 'Your school confirmed it — the graduate price now applies.' : 'Your agent confirmed they represent you.', data: { url: '/me' },
    })
  }
  return NextResponse.json({ ok: true, status: auto ? 'approved' : 'pending', kind: c.kind, method: c.method })
}
