'use client'

import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Empty, PageLoading, Pill, Progress, SectionTitle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { currentWeek, loadActiveBlock, streakDays, weekDone, type BlockCheck } from '@/lib/rc/blocks'

export default function BlocksPage() {
  const { id } = useMe()
  const { data, loading, mutate } = useAsync(async () => {
    const [active, { count }] = await Promise.all([
      loadActiveBlock(id),
      supabase.from('blocks').select('id', { count: 'exact', head: true }).eq('profile_id', id).eq('is_active', false),
    ])
    return { ...active, pastCount: count || 0 }
  }, [id])

  const newBtn = <Button size="sm" variant="dark" icon="plus" href="/blocks/new">New</Button>
  if (loading || !data) return <><BackHeader title="Your Block" /><PageLoading /></>

  const { block, checks, pastCount } = data
  if (!block) {
    return (
      <>
        <BackHeader title="Your Block" right={newBtn} />
        <div className="px-4">
          <p className="text-[15px] text-muted">One goal. A few actions each week. The only score that matters is showing up.</p>
          <Card className="mt-5"><Empty icon="grid" title="No Block running" sub="Pick a goal for the next 6–16 weeks and the few things you’ll do each week to get there." action={<Button variant="dark" size="sm" href="/blocks/new">Start a Block</Button>} /></Card>
        </div>
      </>
    )
  }

  const week = currentWeek(block)
  const weeksLeft = block.weeks - week
  const thisWeek = checks.filter(c => c.week_index === week)
  const doneCount = block.actions.filter((_, i) => thisWeek.some(c => c.action_index === i)).length
  const onTrack = Array.from({ length: week - 1 }, (_, i) => weekDone(block, checks, i + 1)).filter(Boolean).length
  const windowStart = Math.max(1, Math.min(week - 2, block.weeks - 5))
  const windowWeeks = Array.from({ length: Math.min(6, block.weeks) }, (_, i) => windowStart + i)

  const toggle = async (actionIndex: number) => {
    const has = thisWeek.some(c => c.action_index === actionIndex)
    const optimistic: BlockCheck[] = has
      ? checks.filter(c => !(c.week_index === week && c.action_index === actionIndex))
      : [...checks, { week_index: week, action_index: actionIndex, created_at: new Date().toISOString() }]
    mutate(d => d && { ...d, checks: optimistic })
    const q = has
      ? supabase.from('block_checks').delete().eq('block_id', block.id).eq('week_index', week).eq('action_index', actionIndex)
      : supabase.from('block_checks').insert({ block_id: block.id, profile_id: id, week_index: week, action_index: actionIndex })
    const { error } = await q
    if (error) { toast('Couldn’t save that tick'); mutate(d => d && { ...d, checks }) }
  }

  const endBlock = async () => {
    if (!confirm('End this Block? You can start a new one straight away.')) return
    await supabase.from('blocks').update({ is_active: false }).eq('id', block.id)
    mutate(d => d && { ...d, block: null, checks: [], pastCount: d.pastCount + 1 })
  }

  return (
    <>
      <BackHeader title="Your Block" right={newBtn} />
      <div className="px-4 pb-8">
        <p className="text-[15px] text-muted">One goal. A few actions each week. The only score that matters is showing up.</p>

        <div className="mt-5 rounded-[var(--radius)] bg-dark p-5 text-white">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-medium uppercase tracking-[0.08em] text-white/80"><span className="size-2 rounded-full bg-green" /> Working on</span>
            <span className="text-white/70">Week {week} of {block.weeks}</span>
          </div>
          <p className="mt-2 text-[22px] font-medium">{block.goal}</p>
          <Progress dark value={(week / block.weeks) * 100} className="mt-4" />
          <p className="mt-2 text-[13px] text-white/60">{weeksLeft === 0 ? 'Final week' : weeksLeft + ' week' + (weeksLeft === 1 ? '' : 's') + ' to go'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-dark-2 p-4"><p className="text-[22px] font-medium">{streakDays(checks)}</p><p className="text-xs text-white/60">day streak</p></div>
            <div className="rounded-xl bg-dark-2 p-4"><p className="text-[22px] font-medium">{onTrack} / {Math.max(0, week - 1)}</p><p className="text-xs text-white/60">weeks on track</p></div>
          </div>
          {block.why && <p className="mt-4 border-t border-white/10 pt-3 text-[13px] italic text-white/70">“{block.why}”</p>}
        </div>

        <div className="mb-3 mt-6 flex items-center justify-between">
          <h2 className="text-[18px]">This week</h2>
          <span className="text-sm font-medium text-green-ink">{doneCount} of {block.actions.length} done</span>
        </div>
        <Card className="divide-y divide-line overflow-hidden">
          {block.actions.map((a, i) => {
            const done = thisWeek.some(c => c.action_index === i)
            return (
              <button key={i} type="button" onClick={() => toggle(i)} aria-pressed={done} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <span className={cx('flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition', done ? 'border-green bg-green text-white' : 'border-line')}>
                  {done && <Icon name="check" className="size-4" strokeWidth={2.4} />}
                </span>
                <span className={cx('flex-1 text-[15px]', done && 'text-faint line-through')}>{a.label}</span>
                {!done && <Pill tone="amber">To do</Pill>}
              </button>
            )
          })}
        </Card>

        <SectionTitle title="Consistency" />
        <Card className="p-4">
          <div className="flex justify-between">
            {windowWeeks.map(w => {
              const past = w < week
              const ok = past && weekDone(block, checks, w)
              const now = w === week
              return (
                <div key={w} className="flex flex-col items-center gap-1.5">
                  <span className={cx('flex size-10 items-center justify-center rounded-full', ok ? 'bg-green text-white' : now ? 'border-2 border-green bg-green-tint' : past ? 'border-2 border-line' : 'bg-chip')}>
                    {ok && <Icon name="check" className="size-4" strokeWidth={2.4} />}
                  </span>
                  <span className={cx('text-[11px]', now ? 'font-medium text-green-ink' : 'text-faint')}>{now ? 'Now' : 'W' + w}</span>
                </div>
              )
            })}
          </div>
          {week > 1 && <p className="mt-4 text-center text-[13px] text-muted">You’ve hit {onTrack} of the last {week - 1} week{week - 1 === 1 ? '' : 's'}. Showing up beats being perfect.</p>}
        </Card>

        {pastCount > 0 && (
          <Card className="mt-4 flex items-center gap-3 p-4">
            <span className="flex size-9 items-center justify-center rounded-lg bg-green-tint text-green-ink"><Icon name="check" className="size-4" /></span>
            <span className="flex-1 text-[15px] font-medium">{pastCount} past Block{pastCount === 1 ? '' : 's'} completed</span>
          </Card>
        )}

        <button type="button" onClick={endBlock} className="mt-6 w-full text-center text-sm text-muted">End this Block</button>
        <p className="mt-2 text-center text-xs text-faint"><Link href="/blocks/new" className="underline">Start a different Block</Link></p>
      </div>
    </>
  )
}
