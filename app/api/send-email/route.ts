import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Sends fixed, server-owned templates to the signed-in user only.
// (Previously accepted arbitrary to/subject/html from anyone — an open relay.)
export async function POST(req: NextRequest) {
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!jwt) return NextResponse.json({ error: 'no auth' }, { status: 401 })

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: userErr } = await anon.auth.getUser(jwt)
  if (userErr || !user || !user.email) {
    return NextResponse.json({ error: 'invalid session' }, { status: 401 })
  }

  let body: { type?: string } | null
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  if (body?.type !== 'welcome') return NextResponse.json({ error: 'unknown template' }, { status: 400 })

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'The Ident <notifications@theident.me>',
      to: user.email,
      subject: 'Welcome to The Ident',
      html:
        '<div style="font-family: system-ui, sans-serif; max-width:480px; margin:0 auto; color:#1a1a1a; padding:24px;">' +
        '<h1 style="font-size:22px; font-weight:400; margin:0 0 12px;">Welcome to The Ident</h1>' +
        '<p style="font-size:15px; line-height:1.6; color:#6e6a62; margin:0;">Your account is set up. Finish your profile so casters can find you.</p>' +
        '</div>',
    }),
  })

  if (!res.ok) return NextResponse.json({ error: 'email failed' }, { status: 502 })
  return NextResponse.json({ ok: true })
}
