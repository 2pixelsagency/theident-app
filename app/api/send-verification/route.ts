import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { brandedEmail, sendEmail, welcomeEmail } from '@/lib/email'

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

  // Google / Apple have already verified the address: mark it verified, no email needed
  const provider = (user.app_metadata?.provider as string | undefined) || 'email'
  const { data: who } = await admin.from('profiles').select('first_name, account_role, welcome_sent_at').eq('id', user.id).maybeSingle()
  const caster = who?.account_role === 'caster'
  if (provider !== 'email' && user.user_metadata?.email_verified === true) {
    await admin.from('profiles').update({ email_verified: true }).eq('id', user.id)
    // Google / Apple sign-ups still get the welcome, once (no verify step)
    if (!who?.welcome_sent_at && user.email && await sendEmail(user.email, 'Welcome to The Ident', welcomeEmail({ firstName: who?.first_name || null, caster }))) {
      await admin.from('profiles').update({ welcome_sent_at: new Date().toISOString() }).eq('id', user.id)
    }
    return NextResponse.json({ ok: true, verified_by: provider })
  }

  // Resend is user-triggered: at most 3 links per 10 minutes, and none once verified
  const { data: prof } = await admin.from('profiles').select('email_verified').eq('id', user.id).maybeSingle()
  if (prof?.email_verified) return NextResponse.json({ ok: true, already: true })
  const since = new Date(Date.now() - 10 * 60_000).toISOString()
  const { count } = await admin.from('email_verifications').select('token', { count: 'exact', head: true }).eq('profile_id', user.id).gte('created_at', since)
  if ((count || 0) >= 3) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })

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

  // First email ever → the full welcome with the verify button; resends stay short
  if (!who?.welcome_sent_at) {
    const sent = await sendEmail(user.email, 'Welcome to The Ident — verify your email', welcomeEmail({ firstName: who?.first_name || null, caster, verifyLink: link }))
    if (!sent) return NextResponse.json({ error: 'email failed' }, { status: 500 })
    await admin.from('profiles').update({ welcome_sent_at: new Date().toISOString() }).eq('id', user.id)
    return NextResponse.json({ ok: true })
  }
  const ok = await sendEmail(user.email, 'Verify your email · The Ident', brandedEmail({
    title: 'Verify your email',
    body: ['Confirm this is your email address to start applying for roles and posting jobs on The Ident. You can keep browsing in the meantime.'],
    button: { label: 'Verify email', href: link },
    footer: 'Or paste this link into your browser: ' + link + ' — it expires in 24 hours. Didn’t sign up? You can ignore this email.',
  }))
  if (!ok) return NextResponse.json({ error: 'email failed' }, { status: 500 })

  return NextResponse.json({ ok: true })
}
