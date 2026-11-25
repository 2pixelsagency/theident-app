import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { nudgeEmail, sendEmail } from '@/lib/email'

export const runtime = 'nodejs'

// Daily (vercel.json cron): one "Have you forgotten about us?" email to people who signed up
// 1–14 days ago and never started a membership. Each person gets it at most once (nudge_sent_at).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== 'Bearer ' + secret) return NextResponse.json({ error: 'unauthorised' }, { status: 401 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const day = 86_400_000, now = Date.now()
  const { data: rows, error } = await db.from('profiles')
    .select('id, first_name, account_role')
    .is('plan_status', null).is('nudge_sent_at', null).or('is_demo.is.null,is_demo.eq.false')
    .lte('created_at', new Date(now - day).toISOString()).gte('created_at', new Date(now - 14 * day).toISOString())
    .limit(100)
  if (error) return NextResponse.json({ error: 'query failed' }, { status: 500 })

  let sent = 0
  for (const p of rows || []) {
    const { data: { user } } = await db.auth.admin.getUserById(p.id)
    if (!user?.email) continue
    // Mark first so a retry or overlapping run can never send twice
    await db.from('profiles').update({ nudge_sent_at: new Date().toISOString() }).eq('id', p.id)
    if (await sendEmail(user.email, 'Have you forgotten about us?', nudgeEmail({ firstName: p.first_name, caster: p.account_role === 'caster' }))) sent++
  }
  return NextResponse.json({ checked: rows?.length || 0, sent })
}
