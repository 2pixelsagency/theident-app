import { supabase } from '@/lib/supabase'
import { parseDate } from './format'

export type Block = {
  id: string
  goal: string
  start_date: string
  weeks: number
  actions: { label: string }[]
  why: string | null
  weekly_checkin: boolean
  is_active: boolean
  created_at: string
}

export type BlockCheck = { week_index: number; action_index: number; created_at?: string }

export async function loadActiveBlock(uid: string): Promise<{ block: Block | null; checks: BlockCheck[] }> {
  const { data } = await supabase.from('blocks').select('*').eq('profile_id', uid).eq('is_active', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!data) return { block: null, checks: [] }
  const { data: checks } = await supabase.from('block_checks').select('week_index, action_index, created_at').eq('block_id', data.id)
  return { block: data as Block, checks: (checks || []) as BlockCheck[] }
}

// 1-based week of the block we're in today (clamped to the block's length)
export function currentWeek(b: Block) {
  const start = parseDate(b.start_date)
  if (!start) return 1
  const days = Math.floor((Date.now() - start.getTime()) / 86_400_000)
  return Math.min(b.weeks, Math.max(1, Math.floor(days / 7) + 1))
}

export function blockProgress(b: Block) {
  return Math.round((currentWeek(b) / b.weeks) * 100)
}

// A week is "on track" when every weekly action was ticked off
export function weekDone(b: Block, checks: BlockCheck[], week: number) {
  if (!b.actions.length) return false
  return b.actions.every((_, i) => checks.some(c => c.week_index === week && c.action_index === i))
}

export function streakDays(checks: { created_at?: string }[]) {
  // Consecutive days (ending today or yesterday) with at least one tick
  const days = new Set(checks.map(c => (c.created_at || '').slice(0, 10)).filter(Boolean))
  let streak = 0
  const d = new Date()
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (days.has(d.toISOString().slice(0, 10))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}
