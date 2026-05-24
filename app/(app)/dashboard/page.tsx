import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

type Job = {
  id: string
  project_role: string | null
  project_in: string | null
  production_company: string | null
  casting_team: string | null
  location: string | null
  short_summary: string | null
  age_range: string | null
  salary: string | null
  production_type_id: number | null
  gender_ids: number[] | null
  ethnicity_ids: number[] | null
  hair_colour_ids: number[] | null
  eye_colour_ids: number[] | null
  created_at: string
}

type Profile = {
  id: string
  first_name: string | null
  location: string | null
  minimum_age: number | null
  maximum_age: number | null
  gender_id: number | null
  ethnicity_id: number | null
  hair_colour_id: number | null
  eye_colour_id: number | null
  last_match_email_at: string | null
  email_alerts_enabled: boolean
}

async function sb(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Supabase error: ${res.status} ${text}`)
  }
  return res.json()
}

serve(async (req) => {
  try {
    const profilesData: Profile[] = await sb('profiles?select=id,first_name,location,minimum_age,maximum_age,gender_id,ethnicity_id,hair_colour_id,eye_colour_id,last_match_email_at,email_alerts_enabled&email_alerts_enabled=eq.true')

    const usersRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    })
    const usersData = await usersRes.json()
    const userEmailMap = new Map<string, string>()
    ;(usersData.users || []).forEach((u: { id: string; email: string }) => {
      if (u.email) userEmailMap.set(u.id, u.email)
    })

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentJobs: Job[] = await sb(`jobs?select=*&is_published=eq.true&is_side_hustle=eq.false&created_at=gte.${since}`)

    if (recentJobs.length === 0) {
      return new Response(JSON.stringify({ message: 'No new jobs in last 24h' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const jobIds = recentJobs.map(j => j.id)
    const jobSkillsData: { job_id: string; skill_id: number }[] = await sb(`job_skills?select=job_id,skill_id&job_id=in.(${jobIds.join(',')})`)
    const jobSkillsMap = new Map<string, Set<number>>()
    jobSkillsData.forEach(js => {
      if (!jobSkillsMap.has(js.job_id)) jobSkillsMap.set(js.job_id, new Set())
      jobSkillsMap.get(js.job_id)!.add(js.skill_id)
    })

    let emailsSent = 0
    const results: { user: string; matches: number; emailed: boolean }[] = []

    for (const profile of profilesData) {
      const email = userEmailMap.get(profile.id)
      if (!email) continue

      const userSkillsData: { skill_id: number }[] = await sb(`profile_skills?select=skill_id&profile_id=eq.${profile.id}`)
      const userSkillIds = new Set(userSkillsData.map(s => s.skill_id))

      // Skip if profile has no data to match against
      const hasAnyData = profile.gender_id || profile.minimum_age !== null || userSkillIds.size > 0 || profile.ethnicity_id || profile.location
      if (!hasAnyData) continue

      type ScoredJob = Job & { score: number; reasons: string[] }
      const matches: ScoredJob[] = []

      for (const job of recentJobs) {
        let score = 0
        const reasons: string[] = []
        let excluded = false

        // HARD: Gender
        if (job.gender_ids && job.gender_ids.length > 0) {
          if (profile.gender_id && job.gender_ids.includes(profile.gender_id)) {
            score += 5
            reasons.push('Gender matches')
          } else {
            excluded = true
          }
        } else {
          score += 5
          reasons.push('Open to any gender')
        }

        // HARD: Age
        if (job.age_range && !excluded) {
          const m = job.age_range.match(/(\d+)\s*-\s*(\d+)/)
          if (m && profile.minimum_age !== null && profile.maximum_age !== null) {
            const jobMin = parseInt(m[1])
            const jobMax = parseInt(m[2])
            if (profile.minimum_age <= jobMax && profile.maximum_age >= jobMin) {
              score += 5
              reasons.push(`Playing age ${jobMin}–${jobMax} fits yours`)
            } else {
              excluded = true
            }
          }
        } else if (!excluded) {
          score += 5
          reasons.push('Open to any age')
        }

        if (excluded) continue

        // Skills
        const jobSkills = jobSkillsMap.get(job.id) || new Set()
        let matchingSkillCount = 0
        jobSkills.forEach(sid => { if (userSkillIds.has(sid)) matchingSkillCount++ })
        if (matchingSkillCount > 0) {
          score += Math.min(matchingSkillCount * 3, 12)
          reasons.push(`${matchingSkillCount} of your skill${matchingSkillCount === 1 ? '' : 's'} match${matchingSkillCount === 1 ? 'es' : ''}`)
        }

        // Ethnicity
        if (job.ethnicity_ids && job.ethnicity_ids.length > 0) {
          if (profile.ethnicity_id && job.ethnicity_ids.includes(profile.ethnicity_id)) {
            score += 2
            reasons.push('Ethnicity matches')
          }
        } else {
          score += 2
        }

        // Hair
        if (job.hair_colour_ids && job.hair_colour_ids.length > 0) {
          if (profile.hair_colour_id && job.hair_colour_ids.includes(profile.hair_colour_id)) {
            score += 1
          }
        } else {
          score += 1
        }

        // Eye
        if (job.eye_colour_ids && job.eye_colour_ids.length > 0) {
          if (profile.eye_colour_id && job.eye_colour_ids.includes(profile.eye_colour_id)) {
            score += 1
          }
        } else {
          score += 1
        }

        // Location bonus
        if (profile.location && job.location && job.location.toLowerCase().includes(profile.location.toLowerCase())) {
          score += 1
          reasons.push(`Based in ${profile.location}`)
        }

        if (score >= 10) {
          matches.push({ ...job, score, reasons })
        }
      }

      if (matches.length === 0) {
        results.push({ user: email, matches: 0, emailed: false })
        continue
      }

      matches.sort((a, b) => b.score - a.score)

      const firstName = profile.first_name || 'there'
      const jobsHtml = matches.slice(0, 5).map(job => `
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 16px; background: #ffffff; border: 1px solid #e8e6e0; border-radius: 12px;">
          <tr>
            <td style="padding: 24px;">
              <span style="display: inline-block; background: #92d7af; color: #0c2520; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Strong match</span>
              <h2 style="font-family: Georgia, serif; font-size: 20px; font-weight: 500; color: #0c2520; margin: 0 0 4px;">${job.project_role || ''}</h2>
              ${job.project_in ? `<p style="font-size: 14px; color: #666; font-style: italic; margin: 0 0 12px;">In ${job.project_in}</p>` : ''}
              ${job.short_summary ? `<p style="font-size: 14px; color: #0c2520; margin: 0 0 14px; line-height: 1.5;">${job.short_summary}</p>` : ''}
              <div style="background: #f5f3ee; padding: 12px 16px; border-radius: 8px; margin-bottom: 14px;">
                <p style="font-size: 11px; color: #888; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;">Why this matches you</p>
                <ul style="margin: 0; padding: 0 0 0 18px; font-size: 13px; color: #0c2520; line-height: 1.6;">
                  ${job.reasons.map(r => `<li>${r}</li>`).join('')}
                </ul>
              </div>
              <p style="font-size: 13px; color: #666; margin: 0 0 14px;">
                ${job.location || ''}${job.salary ? ` · ${job.salary}` : ''}${job.casting_team ? ` · Sent by ${job.casting_team}` : (job.production_company ? ` · ${job.production_company}` : '')}
              </p>
              <a href="https://theident-app.vercel.app/jobs/${job.id}" style="display: inline-block; background: #0c2520; color: #f1f0ee; padding: 10px 28px; border-radius: 24px; font-size: 14px; font-weight: 500; text-decoration: none;">View job</a>
            </td>
          </tr>
        </table>
      `).join('')

      const totalMatches = matches.length
      const subject = totalMatches === 1
        ? `${firstName}, you have 1 new match on The Ident`
        : `${firstName}, you have ${totalMatches} new matches on The Ident`

      const emailHtml = `
        <!DOCTYPE html><html><head><meta charset="utf-8"></head>
        <body style="margin: 0; padding: 0; background: #f1f0ee; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f1f0ee; padding: 40px 20px;">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width: 600px;">
                <tr><td style="padding: 0 0 32px;">
                  <h1 style="font-family: Georgia, serif; font-size: 24px; font-weight: 500; color: #0c2520; margin: 0;">theident</h1>
                </td></tr>
                <tr><td>
                  <h2 style="font-family: Georgia, serif; font-size: 28px; font-weight: 500; color: #0c2520; margin: 0 0 8px;">Hi ${firstName},</h2>
                  <p style="font-size: 15px; color: #0c2520; margin: 0 0 32px; line-height: 1.5;">
                    ${totalMatches === 1 ? 'We found a job that strongly matches your profile.' : `We found ${totalMatches} jobs that strongly match your profile.`}
                  </p>
                </td></tr>
                <tr><td>${jobsHtml}</td></tr>
                ${matches.length > 5 ? `<tr><td style="padding: 8px 0 24px; text-align: center;"><a href="https://theident-app.vercel.app/dashboard" style="color: #0c2520; font-size: 14px;">View all ${matches.length} matches</a></td></tr>` : ''}
                <tr><td style="padding: 32px 0; border-top: 1px solid #e8e6e0; text-align: center;">
                  <p style="font-size: 12px; color: #888; margin: 0 0 8px;">You're receiving this because you have email alerts enabled.</p>
                  <p style="font-size: 12px; color: #888; margin: 0;"><a href="https://theident-app.vercel.app/profile" style="color: #888;">Manage email preferences</a></p>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
      `

      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'The Ident <updates@theident.me>',
          to: email,
          subject,
          html: emailHtml,
        }),
      })

      if (resendRes.ok) {
        emailsSent++
        results.push({ user: email, matches: matches.length, emailed: true })
        await sb(`profiles?id=eq.${profile.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ last_match_email_at: new Date().toISOString() }),
        })
      } else {
        const errText = await resendRes.text()
        results.push({ user: email, matches: matches.length, emailed: false })
        console.error(`Failed to email ${email}: ${errText}`)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      emailsSent,
      totalProfiles: profilesData.length,
      results,
    }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
