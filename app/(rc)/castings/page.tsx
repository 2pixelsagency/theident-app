'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Card, Empty, IconButton, PageHeader, PageLoading, Pill, TabChips, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { ago } from '@/lib/rc/format'
import { PIPELINE_SELECT, STAGE_META, jobSub, jobTitle, nextAction, stageOf, type PipelineApp, type Stage } from '@/lib/rc/pipeline'

type Tab = 'active' | 'self_tape' | 'pencilled' | 'recall' | 'booked'
const TABS: { value: Tab; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'self_tape', label: 'Self-tape' },
  { value: 'pencilled', label: 'Pencilled' },
  { value: 'recall', label: 'Recalls' },
  { value: 'booked', label: 'Booked' },
]

// The tinted "next action" strip under each card, by stage
const ACTION_STYLE: Record<Stage, string> = {
  applied: 'bg-chip/70 text-muted',
  self_tape: 'bg-amber-tint text-amber',
  recall: 'bg-green-tint text-green-ink',
  pencilled: 'bg-pencil-tint text-pencil',
  booked: 'bg-green text-white',
  closed: 'bg-chip/70 text-faint',
}

export default function CastingsPage() {
  const { id } = useMe()
  const focus = useSearchParams().get('focus')
  const [tab, setTab] = useState<Tab>('active')
  const { data: apps, loading } = useAsync(async () => {
    const { data } = await supabase.from('applications').select(PIPELINE_SELECT).eq('profile_id', id).order('updated_at', { ascending: false })
    return (data || []) as unknown as PipelineApp[]
  }, [id])

  useEffect(() => {
    if (!focus || !apps) return
    document.getElementById('app-' + focus)?.scrollIntoView({ block: 'center' })
  }, [focus, apps])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const a of apps || []) c[stageOf(a)] = (c[stageOf(a)] || 0) + 1
    return c
  }, [apps])

  const shown = useMemo(() => {
    const list = apps || []
    if (tab === 'active') {
      // Booked last before closed, closed faded at the end
      const order: Stage[] = ['self_tape', 'recall', 'pencilled', 'applied', 'booked', 'closed']
      return [...list].sort((a, b) => order.indexOf(stageOf(a)) - order.indexOf(stageOf(b)))
    }
    return list.filter(a => stageOf(a) === tab)
  }, [apps, tab])

  return (
    <>
      <PageHeader title="Castings" right={<IconButton icon="calendar" label="Diary" href="/diary" />} />
      <div className="px-4">
        <TabChips value={tab} onChange={setTab} options={TABS.map(t => ({ ...t, count: t.value === 'active' ? undefined : counts[t.value] }))} />
        {loading ? <PageLoading /> : shown.length === 0 ? (
          <Empty icon="briefcase" title={tab === 'active' ? 'Nothing in play yet' : 'Nothing here right now'}
            sub={tab === 'active' ? 'Roles you apply for appear here and move along as casting gets back to you.' : 'When casting moves one of your roles to this stage it’ll show up here.'}
            action={tab === 'active' ? <Button size="sm" variant="dark" href="/find">Find roles</Button> : undefined} />
        ) : (
          <ul className="mt-3 space-y-3 pb-6">
            {shown.map(a => <CastingCard key={a.id} app={a} focused={a.id === focus} />)}
          </ul>
        )}
      </div>
    </>
  )
}

function CastingCard({ app, focused }: { app: PipelineApp; focused: boolean }) {
  const stage = stageOf(app)
  const meta = STAGE_META[stage]
  const title = jobTitle(app.jobs)
  const sub = stage === 'applied' ? [app.jobs?.production_types?.name, 'Applied ' + ago(app.created_at)].filter(Boolean).join(' · ') : jobSub(app.jobs)

  if (stage === 'closed') {
    return (
      <li id={'app-' + app.id} className="flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface/50 px-4 py-3.5 text-faint">
        <span className="truncate text-[15px]">{title}</span>
        <Pill>{meta.label}</Pill>
      </li>
    )
  }

  if (stage === 'booked') {
    return (
      <li id={'app-' + app.id} className={cx('rounded-[var(--radius)] bg-dark p-4 text-white shadow-card', focused && 'ring-2 ring-green')}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-medium">{title}</p>
            <p className="text-[13px] text-white/60">{sub}</p>
          </div>
          <Pill tone="dark">Booked</Pill>
        </div>
        <Link href={'/castings/' + app.id + '/contract'} className="mt-3 flex items-center gap-2 rounded-xl bg-green px-4 py-3 text-[15px] font-medium">
          <Icon name={app.contract_signed_at ? 'check-circle' : 'pen'} className="size-[18px]" />
          <span className="flex-1">{nextAction(app)}</span>
          <Icon name="chevron-right" className="size-4" />
        </Link>
      </li>
    )
  }

  return (
    <li id={'app-' + app.id}>
      <Card className={cx('p-4', focused && 'ring-2 ring-green')}>
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <Link href={'/find/' + app.job_id} className="text-[17px] font-medium">{title}</Link>
            <p className="text-[13px] text-muted">{sub}</p>
          </div>
          <Pill tone={meta.tone}>{meta.label}</Pill>
        </div>
        <div className={cx('mt-3 flex items-center gap-2 rounded-xl px-3.5 py-3 text-sm font-medium', ACTION_STYLE[stage])}>
          <Icon name={meta.icon} className="size-[18px] shrink-0" />
          <span>{nextAction(app)}</span>
        </div>
      </Card>
    </li>
  )
}
