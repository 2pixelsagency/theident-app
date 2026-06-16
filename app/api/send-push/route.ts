import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  // 1. Verify the request really came from our Supabase webhook
  const secret = req.headers.get('x-webhook-secret')
  if (!process.env.PUSH_WEBHOOK_SECRET || secret !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // 2. Make sure push is configured
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'vapid not configured' }, { status: 500 })
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:hello@theident.me',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  )

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. The new notification row Supabase sends us
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad json' }, { status: 400 }) }

  const record = body?.record
  if (!record || !record.profile_id) {
    return NextResponse.json({ skipped: 'no record' }, { status: 200 })
  }

  // 4. Find every device this person has registered
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('profile_id', record.profile_id)

  if (!subs || subs.length === 0) {
    return NextResponse.json({ sent: 0 }, { status: 200 })
  }

  // 5. Build the payload the service worker will display
  const url = (record.data && record.data.url) || '/'
  const payload = JSON.stringify({
    title: record.title || 'The Ident',
    body: record.body || '',
    url,
    tag: record.type || undefined,
  })

  // 6. Send to each device; remove any that are dead
  let sent = 0
  await Promise.all((subs as any[]).map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      )
      sent++
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await admin.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error('push send error', err?.statusCode, err?.body)
      }
    }
  }))

  return NextResponse.json({ sent }, { status: 200 })
}
