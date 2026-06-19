import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // Identify the caller from their Supabase access token
  const authHeader = req.headers.get('authorization') || ''
  const jwt = authHeader.replace('Bearer ', '').trim()
  if (!jwt) return NextResponse.json({ error: 'no auth' }, { status: 401 })

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data: { user }, error: userErr } = await anon.auth.getUser(jwt)
  if (userErr || !user || !user.email) {
    return NextResponse.json({ error: 'invalid session' }, { status: 401 })
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Create a fresh single-use token (expires in 24h via the table default)
  const { data: row, error: insErr } = await admin
    .from('email_verifications')
    .insert({ profile_id: user.id, email: user.email })
    .select('token')
    .single()
  if (insErr || !row) {
    return NextResponse.json({ error: 'could not create token' }, { status: 500 })
  }

  const link = 'https://app.theident.me/verify?token=' + row.token

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'The Ident <noreply@theident.me>',
      to: user.email,
      subject: 'Verify your email · The Ident',
      html:
        '<div style="font-family: Georgia, serif; max-width:480px; margin:0 auto; color:#0c2520; padding:24px;">' +
        '<h1 style="font-size:22px; margin:0 0 12px;">Verify your email</h1>' +
        '<p style="font-size:15px; line-height:1.6; color:#444; margin:0 0 16px;">Confirm your email address to secure your account on The Ident.</p>' +
        '<a href="' + link + '" style="display:inline-block; background:#0c2520; color:#f1f0ee; text-decoration:none; padding:12px 24px; border-radius:24px; font-size:15px;">Verify email</a>' +
        '<p style="font-size:12px; color:#888; margin:20px 0 0;">Or paste this link into your browser:<br>' + link + '</p>' +
        '<p style="font-size:12px; color:#aaa; margin:8px 0 0;">This link expires in 24 hours.</p>' +
        '</div>',
    }),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    return NextResponse.json({ error: 'email failed', detail }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
