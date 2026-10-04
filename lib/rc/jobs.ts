import { supabase } from '@/lib/supabase'
import { daysUntil, parseDate } from './format'
import type { PayJob } from './pay'

export type Job = PayJob & {
  id: string
  is_side_hustle: boolean
  project_role: string | null
  project_in: string | null
  job_title: string | null
  company: string | null
  production_company: string | null
  casting_team: string | null
  location: string | null
  contract_dates: string | null
  start_date: string | null
  end_date: string | null
  application_deadline: string | null
  age_range: string | null
  gender_requirement: string | null
  appearance_notes: string | null
  description: string | null
  short_summary: string | null
  commitment_level: string | null
  schedule: string | null
  job_category: string | null
  created_at: string
  created_by: string | null
  requires_nda: boolean | null
  nda_text: string | null
  submit_materials: string[] | null
  application_method: string | null
  application_email: string | null
  submission_link: string | null
  is_published: boolean
  production_type_id: number | null
  job_skills?: { skills: { id: number; name: string } | null }[]
}

export const JOB_SELECT = 'id, is_side_hustle, project_role, project_in, job_title, company, production_company, casting_team, location, salary, is_paid, pay_amount, pay_unit, contract_dates, start_date, end_date, application_deadline, age_range, gender_requirement, appearance_notes, description, short_summary, commitment_level, schedule, job_category, created_at, created_by, requires_nda, nda_text, submit_materials, application_method, application_email, submission_link, is_published, production_type_id, production_types(name), job_skills(skills(id, name))'

export type Poster = { id: string; first_name: string | null; last_name: string | null; company_name: string | null; picture_url: string | null; is_verified: boolean }

// jobs.created_by points at auth.users, so posters are fetched separately
export async function loadPosters(ids: (string | null)[]) {
  const unique = Array.from(new Set(ids.filter((x): x is string => !!x)))
  if (!unique.length) return new Map<string, Poster>()
  const { data } = await supabase.from('profiles').select('id, first_name, last_name, company_name, picture_url, is_verified').in('id', unique)
  return new Map((data || []).map(p => [p.id, p as Poster]))
}

export function posterName(job: Job, poster?: Poster) {
  return job.production_company || job.company || poster?.company_name || [poster?.first_name, poster?.last_name].filter(Boolean).join(' ') || 'A RoleCall member'
}

export function lengthLabel(j: Job) {
  const s = parseDate(j.start_date), e = parseDate(j.end_date)
  if (s && e) {
    const weeks = Math.round((e.getTime() - s.getTime()) / (7 * 86_400_000))
    if (weeks >= 8) return Math.round(weeks / 4.33) + ' months'
    if (weeks >= 1) return weeks + ' weeks'
    const days = Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1
    return days + (days === 1 ? ' day' : ' days')
  }
  return j.contract_dates || j.commitment_level || null
}

export function closesLabel(j: Job) {
  const n = daysUntil(j.application_deadline)
  if (n == null) return null
  if (n < 0) return 'Closed'
  if (n === 0) return 'Closes today'
  return 'Closes in ' + n + (n === 1 ? ' day' : ' days')
}

export function skillsOf(j: Job) {
  return (j.job_skills || []).map(s => s.skills?.name).filter((s): s is string => !!s)
}

export function jobMatchesQuery(j: Job, q: string) {
  if (!q.trim()) return true
  const hay = [j.project_role, j.project_in, j.job_title, j.company, j.production_company, j.location, j.job_category, j.production_types?.name, ...skillsOf(j)].join(' ').toLowerCase()
  return q.toLowerCase().split(/\s+/).every(w => hay.includes(w))
}
