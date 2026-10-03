import { supabase } from '@/lib/supabase'
import { fmtDate } from './format'

// Caster-side view of the pipeline (same rows as the performer's Castings).
//   To review → Shortlist → Recall → Booked   (+ "No" closes it)
export type CasterStage = 'review' | 'shortlist' | 'recall' | 'booked' | 'no'

export type CasterApp = {
  id: string
  job_id: string
  profile_id: string
  status: 'submitted' | 'audition' | 'callback' | 'offer' | 'booked'
  outcome: string | null
  shortlisted: boolean
  invited: boolean
  created_at: string
  due_at: string | null
  held_from: string | null
  held_to: string | null
  cover_note: string | null
}

export const CASTER_APP_SELECT = 'id, job_id, profile_id, status, outcome, shortlisted, invited, created_at, due_at, held_from, held_to, cover_note'

export function casterStage(a: Pick<CasterApp, 'status' | 'outcome' | 'shortlisted'>): CasterStage {
  if (a.outcome) return 'no'
  if (a.status === 'booked' || a.status === 'offer') return 'booked'
  if (a.status === 'callback') return 'recall'
  if (a.status === 'audition' || a.shortlisted) return 'shortlist'
  return 'review'
}

// The stateful primary action on a talent profile, by casting relationship:
// Invite to audition (not engaged) → Recall (auditioned) → Make offer → Book
export type CastingStep = { label: string; next: CasterApp['status']; field: 'due' | 'datetime' | 'held' | 'terms'; icon: string; done?: boolean }

export function nextStep(app: Pick<CasterApp, 'status' | 'outcome'> | null): CastingStep {
  if (!app || app.outcome || app.status === 'submitted') return { label: 'Invite to audition', next: 'audition', field: 'due', icon: 'send' }
  if (app.status === 'audition') return { label: 'Recall', next: 'callback', field: 'datetime', icon: 'calendar' }
  if (app.status === 'callback') return { label: 'Make offer', next: 'offer', field: 'held', icon: 'clock' }
  if (app.status === 'offer') return { label: 'Book', next: 'booked', field: 'terms', icon: 'pen' }
  return { label: 'Booked', next: 'booked', field: 'terms', icon: 'check', done: true }
}

export function stageNote(a: CasterApp) {
  if (a.status === 'audition') return a.due_at ? 'Self-tape due ' + fmtDate(a.due_at) : 'Self-tape requested'
  if (a.status === 'callback') return a.due_at ? 'Recall ' + fmtDate(a.due_at) : 'Recalled'
  if (a.status === 'offer') return 'Pencilled'
  if (a.status === 'booked') return 'Booked'
  return a.invited ? 'Invited' : 'Applied ' + fmtDate(a.created_at, { day: 'numeric', month: 'short' })
}

export async function setStage(appId: string, patch: Partial<Pick<CasterApp, 'status' | 'outcome' | 'shortlisted' | 'due_at' | 'held_from' | 'held_to'>> & { next_step_note?: string | null; contract_terms?: string | null }) {
  const { error } = await supabase.from('applications').update(patch).eq('id', appId)
  return error
}
