import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { brandedEmail, sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Start a verification check.
//  graduate     → school_email (we email a confirm link) or evidence (an admin checks the upload)
//  professional → agent (we email the agent a confirm link) or link (Spotlight / IMDb / Equity — an admin checks)
// Being booked through The Ident verifies a professional automatically (database trigger).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: { user } } = await anon.auth.getUser(jwt)
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  let b: { kind?: string; method?: string; email?: string; link?: string; evidence_path?: string }
  try { b = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  const kind = b.kind, method = b.method
  const ok = (kind === 'graduate' && (method === 'school_email' || method === 'evidence')) || (kind === 'professional' && (method === 'agent' || method === 'link'))
  if (!ok) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { data: p } = await admin.from('profiles').select('first_name, last_name, is_graduate, graduate_school, graduate_verified, pro_verified').eq('id', user.id).maybeSingle()
  if (!p) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  if (kind === 'graduate' && p.graduate_verified) return NextResponse.json({ ok: true, already: true })
  if (kind === 'professional' && p.pro_verified) return NextResponse.json({ ok: true, already: true })
  if (kind === 'graduate' && !p.is_graduate) return NextResponse.json({ error: 'Add your school and graduation year first.' }, { status: 400 })

  const since = new Date(Date.now() - 864e5).toISOString()
  const { count } = await admin.from('verification_checks').select('id', { count: 'exact', head: true }).eq('profile_id', user.id).gte('created_at', since)
  if ((count || 0) >= 6) return NextResponse.json({ error: 'You’ve sent a few requests today — try again tomorrow.' }, { status: 429 })

  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'A performer'
  const row: Record<string, unknown> = { profile_id: user.id, kind, method }

  if (method === 'school_email' || method === 'agent') {
    const email = (b.email || '').trim().toLowerCase()
    if (!EMAIL.test(email)) return NextResponse.json({ error: 'Enter a full email address.' }, { status: 400 })
    if (email === (user.email || '').toLowerCase()) return NextResponse.json({ error: method === 'agent' ? 'Use your agent’s email, not your own.' : 'Use your school email address.' }, { status: 400 })
    row.email = email; row.status = 'awaiting_email'
    const { data: ins, error } = await admin.from('verification_checks').insert(row).select('token').single()
    if (error || !ins) return NextResponse.json({ error: 'Couldn’t start that — try again.' }, { status: 500 })
    const link = 'https://app.theident.me/confirm?token=' + ins.token
    const html = method === 'agent'
      ? brandedEmail({
          preheader: name + ' says you represent them',
          title: 'Do you represent ' + name + '?',
          body: [name + ' has asked you to confirm that you are their agent on The Ident, the casting app for performers.', 'If you represent them, tap the button. If not, you can ignore this email and nothing will change.'],
          button: { label: 'Yes, I represent ' + (p.first_name || 'them'), href: link },
          footer: 'This link works once and expires in 7 days.',
        })
      : brandedEmail({
          preheader: 'Confirm your school email',
          title: 'Confirm your graduation',
          body: ['Tap the button to confirm this is your ' + (p.graduate_school || 'school') + ' email address. Once confirmed, you’ll get the graduate price on The Ident.'],
          button: { label: 'Confirm my school email', href: link },
          footer: 'This link works once and expires in 7 days. Didn’t ask for this? Ignore this email.',
        })
    const sent = await sendEmail(email, method === 'agent' ? 'Please confirm you represent ' + name : 'Confirm your school email', html)
    if (!sent) return NextResponse.json({ error: 'Couldn’t send the email — check the address and try again.' }, { status: 502 })
    return NextResponse.json({ ok: true, sent: true })
  }

  if (method === 'link') {
    const link = (b.link || '').trim()
    if (!/^https?:\/\/[^\s]+\.[^\s]+/i.test(link)) return NextResponse.json({ error: 'Paste a full link starting https://' }, { status: 400 })
    row.link = link.slice(0, 500)
  } else {
    const path = (b.evidence_path || '').trim()
    if (!path.startsWith(user.id + '/')) return NextResponse.json({ error: 'Upload your proof first.' }, { status: 400 })
    row.evidence_path = path
  }
  row.status = 'pending'
  const { error } = await admin.from('verification_checks').insert(row)
  if (error) return NextResponse.json({ error: 'Couldn’t send that — try again.' }, { status: 500 })
  return NextResponse.json({ ok: true, pending: true })
}
