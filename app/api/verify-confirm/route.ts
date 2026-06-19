import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }
  const token = body?.token
  if (!token) return NextResponse.json({ error: 'no token' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: row } = await admin
    .from('email_verifications')
    .select('token, profile_id, expires_at, used')
    .eq('token', token)
    .maybeSingle()

  if (!row) return NextResponse.json({ error: 'invalid' }, { status: 400 })
  if (row.used) return NextResponse.json({ ok: true, already: true })
  if (new Date(row.expires_at) < new Date()) return NextResponse.json({ error: 'expired' }, { status: 400 })

  await admin.from('profiles').update({ email_verified: true }).eq('id', row.profile_id)
  await admin.from('email_verifications').update({ used: true }).eq('token', token)

  return NextResponse.json({ ok: true })
}
