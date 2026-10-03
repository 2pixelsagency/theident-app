import type { Tone } from '@/components/rc/ui'
import { fmtDate, fmtRange, fmtTime } from './format'

// One application = one role in the performer's Castings pipeline.
// DB status flow (check constraint): submitted → audition → callback → offer → booked
// UI names:                           Applied     Self-tape  Recall     Pencilled  Booked

export type AppStatus = 'submitted' | 'audition' | 'callback' | 'offer' | 'booked'
export type Stage = 'applied' | 'self_tape' | 'recall' | 'pencilled' | 'booked' | 'closed'

export type PipelineApp = {
  id: string
  job_id: string
  status: AppStatus
  outcome: string | null
  created_at: string
  due_at: string | null
  held_from: string | null
  held_to: string | null
  next_step_note: string | null
  contract_signed_at: string | null
  jobs: PipelineJob | null
}

export type PipelineJob = {
  id: string
  project_role: string | null
  project_in: string | null
  job_title: string | null
  company: string | null
  production_company: string | null
  casting_team: string | null
  is_side_hustle: boolean
  location: string | null
  start_date: string | null
  end_date: string | null
  salary: string | null
  production_types?: { name: string } | null
}

export const PIPELINE_SELECT = 'id, job_id, status, outcome, created_at, due_at, held_from, held_to, next_step_note, contract_signed_at, jobs(id, project_role, project_in, job_title, company, production_company, casting_team, is_side_hustle, location, start_date, end_date, salary, production_types(name))'

export function stageOf(a: Pick<PipelineApp, 'status' | 'outcome'>): Stage {
  if (a.outcome) return 'closed'
  switch (a.status) {
    case 'audition': return 'self_tape'
    case 'callback': return 'recall'
    case 'offer': return 'pencilled'
    case 'booked': return 'booked'
    default: return 'applied'
  }
}

export const STAGE_META: Record<Stage, { label: string; tone: Tone; icon: string }> = {
  applied: { label: 'Applied', tone: 'neutral', icon: 'check-circle' },
  self_tape: { label: 'Self-tape', tone: 'amber', icon: 'video' },
  recall: { label: 'Recall', tone: 'green', icon: 'calendar' },
  pencilled: { label: 'Pencilled', tone: 'pencil', icon: 'clock' },
  booked: { label: 'Booked', tone: 'dark', icon: 'pen' },
  closed: { label: 'Not this time', tone: 'neutral', icon: 'x' },
}

type TitleJob = Pick<PipelineJob, 'is_side_hustle' | 'job_title' | 'project_in' | 'production_company' | 'project_role'>

export function jobTitle(j: TitleJob | null | undefined) {
  if (!j) return 'Role'
  if (j.is_side_hustle) return j.job_title || 'Side hustle'
  const prod = j.project_in || j.production_company
  const role = j.project_role || j.job_title
  return prod && role ? `${prod} — ${role}` : role || prod || 'Role'
}

export function jobSub(j: PipelineJob | null | undefined) {
  if (!j) return ''
  const type = j.production_types?.name
  const who = j.casting_team ? 'Casting: ' + j.casting_team : j.production_company || j.company
  return [type, who].filter(Boolean).join(' · ')
}

// The single next thing the performer needs to do or know
export function nextAction(a: PipelineApp): string {
  const stage = stageOf(a)
  if (a.next_step_note && stage !== 'booked') return a.next_step_note
  switch (stage) {
    case 'self_tape': return a.due_at ? `Submit your self-tape by ${fmtDate(a.due_at)}` : 'Submit your self-tape'
    case 'recall': return a.due_at ? `Recall — ${fmtDate(a.due_at)}, ${fmtTime(a.due_at)}` : 'Recall — time to be confirmed'
    case 'pencilled': return a.held_from ? `Held for shoot dates · ${fmtRange(a.held_from, a.held_to)}` : 'Held — dates to be confirmed'
    case 'booked': return a.contract_signed_at ? 'Contract signed — you’re booked' : 'Sign your contract to confirm'
    case 'closed': return 'Not this time'
    default: return 'Submitted — awaiting response'
  }
}
