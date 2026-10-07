// "More filters" on Find: every job field, applied client-side to the loaded listings.
import { daysUntil } from './format'
import { fairPay } from './pay'
import { skillsOf, type Job } from './jobs'

// Role type isn't a column, so it's read from the role name / title
export const ROLE_TYPES: { value: string; label: string; re: RegExp }[] = [
  { value: 'lead', label: 'Lead', re: /\blead|principal|title role|protagonist/i },
  { value: 'supporting', label: 'Supporting', re: /supporting role|\bsupport\b|featured/i },
  { value: 'ensemble', label: 'Ensemble', re: /ensemble|chorus|company member/i },
  { value: 'swing', label: 'Swing / cover', re: /swing|cover|understudy|standby/i },
  { value: 'dancer', label: 'Dancer', re: /dancer|dance/i },
  { value: 'extra', label: 'Extra / SA', re: /\bextra|background|supporting artist|\bSA\b/i },
  { value: 'voice', label: 'Voice', re: /voice|vo\b|narrat/i },
  { value: 'presenter', label: 'Presenter / host', re: /presenter|host|mc\b/i },
]

export const PAY_UNITS = [
  { value: '', label: 'Any' }, { value: 'hour', label: 'Hour' }, { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }, { value: 'fixed', label: 'Fixed fee' },
] as const

export type JobFilters = {
  location: string
  types: string[] // production type (roles) or category (side hustles)
  roleTypes: string[]
  experience: string[]
  commitment: string[]
  gender: string[]
  skills: string[]
  payUnit: string
  payMin: string
  payMax: string
  paidOnly: boolean
  fairOnly: boolean
  startFrom: string
  startTo: string
  closingWithin: number // days, 0 = any
}

export const NO_FILTERS: JobFilters = {
  location: '', types: [], roleTypes: [], experience: [], commitment: [], gender: [], skills: [],
  payUnit: '', payMin: '', payMax: '', paidOnly: false, fairOnly: false, startFrom: '', startTo: '', closingWithin: 0,
}

export const typeOf = (j: Job) => (j.is_side_hustle ? j.job_category : j.production_types?.name) || null
export const experienceOf = (j: Job) => (j.experience_level || j.experience || '').trim() || null
const roleText = (j: Job) => [j.project_role, j.job_title, j.short_summary].filter(Boolean).join(' ')

export function activeCount(f: JobFilters) {
  return (f.location.trim() ? 1 : 0) + f.types.length + f.roleTypes.length + f.experience.length + f.commitment.length + f.gender.length + f.skills.length
    + (f.payMin || f.payMax || f.payUnit ? 1 : 0) + (f.paidOnly ? 1 : 0) + (f.fairOnly ? 1 : 0) + (f.startFrom || f.startTo ? 1 : 0) + (f.closingWithin ? 1 : 0)
}

export function applyFilters(list: Job[], f: JobFilters) {
  const loc = f.location.trim().toLowerCase()
  const min = f.payMin ? Number(f.payMin) : null
  const max = f.payMax ? Number(f.payMax) : null
  return list.filter(j => {
    if (loc && !(j.location || '').toLowerCase().includes(loc)) return false
    if (f.types.length && !f.types.some(t => t.toLowerCase() === (typeOf(j) || '').toLowerCase())) return false
    if (f.roleTypes.length && !ROLE_TYPES.some(r => f.roleTypes.includes(r.value) && r.re.test(roleText(j)))) return false
    if (f.experience.length && !f.experience.includes(experienceOf(j) || '')) return false
    if (f.commitment.length && !f.commitment.includes(j.commitment_level || '')) return false
    if (f.gender.length && !f.gender.includes(j.gender_requirement || '')) return false
    if (f.skills.length && !skillsOf(j).some(s => f.skills.includes(s))) return false
    if (f.paidOnly && (j.is_paid === false || (j.pay_amount == null && !j.salary))) return false
    if (f.fairOnly && fairPay(j) !== 'fair') return false
    if (f.payUnit && j.pay_unit !== f.payUnit) return false
    if ((min != null || max != null) && j.pay_amount == null) return false
    if (min != null && Number(j.pay_amount) < min) return false
    if (max != null && Number(j.pay_amount) > max) return false
    // Dates: the job must start inside the window you're free
    if (f.startFrom && (!j.start_date || j.start_date < f.startFrom)) return false
    if (f.startTo && (!j.start_date || j.start_date > f.startTo)) return false
    if (f.closingWithin) {
      const n = daysUntil(j.application_deadline)
      if (n == null || n < 0 || n > f.closingWithin) return false
    }
    return true
  })
}

// Option lists built from the listings actually loaded, most common first
export function optionsFrom(list: Job[], pick: (j: Job) => string | null | string[], limit = 16) {
  const counts = new Map<string, number>()
  for (const j of list) {
    const v = pick(j)
    for (const x of Array.isArray(v) ? v : v ? [v] : []) counts.set(x, (counts.get(x) || 0) + 1)
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([v]) => v)
}
