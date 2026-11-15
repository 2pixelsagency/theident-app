import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { brandedEmail, sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Account-security notice to the signed-in user only (fixed template, never arbitrary recipients).
// The app sends exactly two kinds of email: verify account (/api/send-verification) and this one.
export async function POST(req: NextRequest) {
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!jwt) return NextResponse.json({ error: 'no auth' }, { status: 401 })

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user }, error: userErr } = await anon.auth.getUser(jwt)
  if (userErr || !user || !user.email) return NextResponse.json({ error: 'invalid session' }, { status: 401 })

  let body: { type?: string } | null
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (body?.type !== 'password_changed') return NextResponse.json({ error: 'unknown template' }, { status: 400 })

  const when = new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/London' })
  const ok = await sendEmail(user.email, 'Your password was changed · The Ident', brandedEmail({
    title: 'Your password was changed',
    body: [
      'The password for your The Ident account (' + user.email + ') was changed on ' + when + ' (UK time).',
      'If this was you, there’s nothing else to do. If it wasn’t, reset your password straight away and contact hello@theident.me.',
    ],
    button: { label: 'Reset password', href: 'https://app.theident.me/forgot-password' },
    footer: 'You’re getting this because it’s an account security notice. We only email you about your account’s security.',
  }))
  if (!ok) return NextResponse.json({ error: 'email failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
