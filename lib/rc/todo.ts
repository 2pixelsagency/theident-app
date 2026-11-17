import { supabase } from '@/lib/supabase'
import { PIPELINE_SELECT, jobTitle, stageOf, type PipelineApp } from './pipeline'
import { loadCompleteness } from './completeness'
import { currentWeek, loadActiveBlock } from './blocks'
import { toISODate } from './format'

// A performer's to-do list: automatic items from what's happening in the app, plus their own tasks.
export type AutoTodo = { key: string; title: string; sub?: string; href: string; icon: string; due?: string | null; urgent?: boolean }
export type Todo = { id: string; title: string; due_on: string | null; done_at: string | null; created_at: string }

const DAY = 864e5
// Whole calendar days from today (0 = today, 1 = tomorrow, -1 = yesterday), in local time
const daysUntil = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const now = new Date()
  return Math.round((new Date(y, m - 1, d).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / DAY)
}
export function dueLabel(iso: string | null | undefined) {
  if (!iso) return null
  const d = daysUntil(iso)
  return d < 0 ? 'Overdue' : d === 0 ? 'Due today' : d === 1 ? 'Due tomorrow' : d < 7 ? 'Due in ' + d + ' days' : 'Due ' + new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export async function loadTodos(id: string, emailVerified: boolean) {
  const today = toISODate(new Date())
  const soon = toISODate(new Date(Date.now() + 4 * DAY))
  const [apps, saved, invoices, mine, comp, goal] = await Promise.all([
    supabase.from('applications').select(PIPELINE_SELECT).eq('profile_id', id).is('outcome', null),
    supabase.from('saved_jobs').select('job_id, list, jobs(id, project_role, project_in, job_title, production_company, is_side_hustle, application_deadline, is_published)').eq('profile_id', id).eq('list', 'saved'),
    supabase.from('invoices').select('id, number, client_name, status, due_date').eq('profile_id', id).in('status', ['draft', 'sent']),
    supabase.from('todos').select('id, title, due_on, done_at, created_at').eq('profile_id', id).order('done_at', { nullsFirst: true }).order('due_on', { nullsFirst: false }).order('created_at').limit(100),
    loadCompleteness(id),
    loadActiveBlock(id),
  ])

  const auto: AutoTodo[] = []
  const applied = new Set<string>()
  for (const a of (apps.data || []) as unknown as PipelineApp[]) {
    applied.add(a.job_id)
    const t = jobTitle(a.jobs)
    const stage = stageOf(a)
    if (stage === 'self_tape') auto.push({ key: 'tape-' + a.id, icon: 'video', title: 'Send your self-tape', sub: t, href: '/castings?focus=' + a.id, due: a.due_at, urgent: !!a.due_at && daysUntil(a.due_at) <= 1 })
    if (stage === 'pencilled') auto.push({ key: 'pencil-' + a.id, icon: 'clock', title: 'Keep your pencilled dates free', sub: t + (a.held_from ? ' · from ' + new Date(a.held_from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''), href: '/castings?focus=' + a.id })
    if (stage === 'booked' && !a.contract_signed_at) auto.push({ key: 'contract-' + a.id, icon: 'pen', title: 'Sign your contract', sub: t, href: '/castings/' + a.id + '/contract', urgent: true })
    if (stage === 'recall' && a.next_step_note) auto.push({ key: 'recall-' + a.id, icon: 'calendar', title: 'Prepare for your recall', sub: t + ' · ' + a.next_step_note, href: '/castings?focus=' + a.id })
  }
  type SavedRow = { job_id: string; jobs: { id: string; project_role: string | null; project_in: string | null; job_title: string | null; production_company: string | null; is_side_hustle: boolean; application_deadline: string | null; is_published: boolean } | null }
  for (const s of (saved.data || []) as unknown as SavedRow[]) {
    const j = s.jobs
    if (!j?.is_published || applied.has(s.job_id) || !j.application_deadline || j.application_deadline < today || j.application_deadline > soon) continue
    auto.push({ key: 'apply-' + j.id, icon: 'send', title: 'Apply before it closes', sub: jobTitle(j), href: '/find/' + j.id, due: j.application_deadline, urgent: daysUntil(j.application_deadline) <= 1 })
  }
  for (const inv of invoices.data || []) {
    if (inv.status === 'draft') auto.push({ key: 'inv-' + inv.id, icon: 'receipt', title: 'Send invoice ' + inv.number, sub: inv.client_name, href: '/pay/invoices/' + inv.id })
    else if (inv.due_date && inv.due_date < today) auto.push({ key: 'chase-' + inv.id, icon: 'pound', title: 'Chase overdue invoice ' + inv.number, sub: inv.client_name, href: '/pay/invoices/' + inv.id, urgent: true })
  }
  // This week's goal actions still to tick off (Goals → /blocks)
  if (goal.block) {
    const week = currentWeek(goal.block)
    goal.block.actions.forEach((a, i) => {
      if (!goal.checks.some(c => c.week_index === week && c.action_index === i))
        auto.push({ key: 'goal-' + i, icon: 'target', title: a.label, sub: 'Goal: ' + goal.block!.goal + ' · this week', href: '/blocks' })
    })
  }
  if (!emailVerified) auto.push({ key: 'verify', icon: 'mail', title: 'Verify your email', sub: 'Needed before you can apply', href: '/verify', urgent: true })
  const gap = comp?.next[0]
  if (gap && (comp?.score ?? 100) < 90) auto.push({ key: 'profile-' + gap.key, icon: 'user', title: gap.label, sub: 'Profile ' + comp!.score + '% complete', href: gap.href })

  auto.sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || (a.due || '9').localeCompare(b.due || '9'))
  return { auto, mine: (mine.data || []) as Todo[] }
}

export async function addTodo(title: string, due_on: string | null) {
  return supabase.from('todos').insert({ title, due_on }).select('id, title, due_on, done_at, created_at').single()
}
export async function setDone(id: string, done: boolean) {
  return supabase.from('todos').update({ done_at: done ? new Date().toISOString() : null }).eq('id', id)
}
export async function removeTodo(id: string) {
  return supabase.from('todos').delete().eq('id', id)
}
