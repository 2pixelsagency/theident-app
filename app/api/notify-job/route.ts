import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { job_id } = await request.json()
    if (!job_id) return NextResponse.json({ error: 'Missing job_id' }, { status: 400 })

    const { data: job } = await supabase.from('jobs').select('*').eq('id', job_id).single()
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    const title = job.is_side_hustle ? job.job_title : job.project_role
    const { data: profiles } = await supabase.from('profiles').select('id, gender_id, minimum_age, maximum_age')

    const matches: string[] = []

    for (const profile of profiles || []) {
      let score = 0

      if (job.gender_ids && job.gender_ids.length > 0) {
        if (!profile.gender_id || !job.gender_ids.includes(profile.gender_id)) continue
        score += 5
      } else { score += 5 }

      if (job.age_range && profile.minimum_age !== null && profile.maximum_age !== null) {
        const m = job.age_range.match(/(\d+)\s*-\s*(\d+)/)
        if (m) {
          const jobMin = parseInt(m[1]); const jobMax = parseInt(m[2])
          if (profile.minimum_age > jobMax || profile.maximum_age < jobMin) continue
          score += 5
        }
      } else { score += 5 }

      if (score >= 6) matches.push(profile.id)
    }

    if (matches.length === 0) return NextResponse.json({ ok: true, matched: 0 })

    // Insert notifications
    await supabase.from('notifications').insert(
      matches.map(profile_id => ({
        profile_id,
        type: 'job_match',
        title: 'New role for you',
        body: `${title}${job.location ? ` · ${job.location}` : ''}`,
        data: { job_id, url: `/jobs/${job_id}` },
      }))
    )

    // Send push notifications
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('profile_id, subscription')
      .in('profile_id', matches)

    const pushPayload = JSON.stringify({
      title: 'New role for you',
      body: `${title}${job.location ? ` · ${job.location}` : ''}`,
      url: `/jobs/${job_id}`,
    })

    await Promise.allSettled(
      (subs || []).map(s => webpush.sendNotification(s.subscription, pushPayload))
    )

    return NextResponse.json({ ok: true, matched: matches.length })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
