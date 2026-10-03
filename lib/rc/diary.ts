import { supabase } from '@/lib/supabase'
import { fmtDate, fmtRange, fmtTime, fmtTimeOfDay, parseDate, toISODate } from './format'
import { PIPELINE_SELECT, jobTitle, stageOf, type PipelineApp } from './pipeline'

// The performer's diary merges their own calendar entries with dates that come
// from the castings pipeline (self-tape deadlines, recalls, pencils, bookings).

export type DiaryKind = 'self_tape' | 'recall' | 'pencil' | 'booked' | 'other'
export type DiaryItem = { id: string; date: string; endDate?: string | null; kind: DiaryKind; title: string; sub: string; href?: string }

export const KIND_COLOUR: Record<DiaryKind, string> = {
  self_tape: 'bg-amber',
  recall: 'bg-green',
  pencil: 'bg-pencil',
  booked: 'bg-green-ink',
  other: 'bg-faint',
}

export const KIND_LABEL: Record<DiaryKind, string> = {
  self_tape: 'Self-tape', recall: 'Recall', pencil: 'Pencilled', booked: 'Booked', other: 'Diary',
}

function kindForEvent(type: string | null): DiaryKind {
  const t = (type || '').toLowerCase()
  if (t.includes('tape') || t === 'audition') return 'self_tape'
  if (t.includes('recall') || t.includes('callback') || t === 'casting') return 'recall'
  if (t.includes('pencil') || t.includes('hold')) return 'pencil'
  if (t.includes('book') || t.includes('show') || t.includes('contract') || t.includes('rehearsal')) return 'booked'
  return 'other'
}

type CalRow = { id: string; title: string; description: string | null; event_type: string | null; start_date: string; end_date: string | null; start_time: string | null; location: string | null }

export async function loadDiary(uid: string, from: Date, to: Date): Promise<DiaryItem[]> {
  const fromS = toISODate(from), toS = toISODate(to)
  const [{ data: cal }, { data: apps }] = await Promise.all([
    supabase.from('calendar_events').select('id, title, description, event_type, start_date, end_date, start_time, location')
      .eq('profile_id', uid).lte('start_date', toS).or('end_date.gte.' + fromS + ',and(end_date.is.null,start_date.gte.' + fromS + ')'),
    supabase.from('applications').select(PIPELINE_SELECT).eq('profile_id', uid).is('outcome', null),
  ])

  const items: DiaryItem[] = ((cal || []) as CalRow[]).map(e => ({
    id: 'cal-' + e.id,
    date: e.start_date,
    endDate: e.end_date,
    kind: kindForEvent(e.event_type),
    title: e.title,
    sub: [e.end_date && e.end_date !== e.start_date ? fmtRange(e.start_date, e.end_date) : fmtDate(e.start_date), fmtTimeOfDay(e.start_time), e.location].filter(Boolean).join(' · '),
  }))

  for (const a of (apps || []) as unknown as PipelineApp[]) {
    const title = jobTitle(a.jobs)
    const stage = stageOf(a)
    const href = '/castings?focus=' + a.id
    if (stage === 'self_tape' && a.due_at) items.push({ id: 'tape-' + a.id, date: a.due_at.slice(0, 10), kind: 'self_tape', title: 'Self-tape due — ' + title, sub: fmtDate(a.due_at), href })
    if (stage === 'recall' && a.due_at) items.push({ id: 'recall-' + a.id, date: a.due_at.slice(0, 10), kind: 'recall', title: 'Recall — ' + title, sub: fmtDate(a.due_at) + ', ' + fmtTime(a.due_at), href })
    if (stage === 'pencilled' && a.held_from) items.push({ id: 'pencil-' + a.id, date: a.held_from, endDate: a.held_to, kind: 'pencil', title: 'Pencilled — ' + title, sub: 'Held ' + fmtRange(a.held_from, a.held_to), href })
    if (stage === 'booked' && a.jobs?.start_date) items.push({ id: 'booked-' + a.id, date: a.jobs.start_date, endDate: a.jobs.end_date, kind: 'booked', title: 'Starts — ' + title, sub: fmtDate(a.jobs.start_date), href: '/castings/' + a.id + '/contract' })
  }

  return items
    .filter(i => i.date <= toS && (i.endDate || i.date) >= fromS)
    .sort((a, b) => a.date.localeCompare(b.date))
}

// Which kinds fall on each day (multi-day items mark every day they cover)
export function kindsByDay(items: DiaryItem[]) {
  const map = new Map<string, Set<DiaryKind>>()
  for (const i of items) {
    const start = parseDate(i.date), end = parseDate(i.endDate || i.date)
    if (!start || !end) continue
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const k = toISODate(d)
      if (!map.has(k)) map.set(k, new Set())
      map.get(k)!.add(i.kind)
    }
  }
  return map
}
