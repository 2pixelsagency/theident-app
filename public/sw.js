import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { subscription, profile_id } = await request.json()
    if (!subscription || !profile_id) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    await supabase.from('push_subscriptions').upsert({
      profile_id,
      subscription,
    }, { onConflict: 'profile_id' })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
