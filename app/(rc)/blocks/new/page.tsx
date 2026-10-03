'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Chip, Field, TextArea, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { fmtDate } from '@/lib/rc/format'

const GOALS = ['Land a lead role', 'Rebuild my reel', 'Sign with an agent', 'Book a tour', 'More on-camera work', 'Grow my network']
const LENGTHS = [6, 12, 16]
const DEFAULT_ACTIONS = [
  { label: 'Apply to 5 roles', on: true },
  { label: 'Record 1 self-tape', on: true },
  { label: 'Take 2 classes', on: true },
  { label: 'Reach out to 3 people', on: false },
]

export default function NewBlockPage() {
  const router = useRouter()
  const { id } = useMe()
  const [goal, setGoal] = useState(GOALS[0])
  const [weeks, setWeeks] = useState(12)
  const [actions, setActions] = useState(DEFAULT_ACTIONS)
  const [custom, setCustom] = useState('')
  const [why, setWhy] = useState('')
  const [checkin, setCheckin] = useState(true)
  const [saving, setSaving] = useState(false)

  const end = new Date(); end.setDate(end.getDate() + weeks * 7)

  const addCustom = () => {
    const label = custom.trim()
    if (!label) return
    setActions(a => [...a, { label, on: true }])
    setCustom('')
  }

  const start = async () => {
    const picked = actions.filter(a => a.on).map(a => ({ label: a.label }))
    if (!goal.trim()) { toast('Pick a goal'); return }
    if (!picked.length) { toast('Pick at least one weekly action'); return }
    setSaving(true)
    // One Block at a time: retire the current one first
    await supabase.from('blocks').update({ is_active: false }).eq('profile_id', id).eq('is_active', true)
    const { error } = await supabase.from('blocks').insert({ profile_id: id, goal: goal.trim(), weeks, actions: picked, why: why.trim() || null, weekly_checkin: checkin })
    setSaving(false)
    if (error) { toast('Couldn’t start your Block — try again'); return }
    router.push('/blocks')
  }

  return (
    <>
      <BackHeader title="New Block" />
      <div className="px-4 pb-8">
        <p className="text-[15px] text-muted">Pick one goal and a few weekly actions. We’ll track the rest for the next few weeks.</p>

        <Step n={1} label="Your goal" />
        <Field value={goal} onChange={e => setGoal(e.target.value)} aria-label="Your goal" />
        <div className="mt-3 flex flex-wrap gap-2">{GOALS.map(g => <Chip key={g} selected={goal === g} onClick={() => setGoal(g)}>{g}</Chip>)}</div>

        <Step n={2} label="How long?" />
        <div className="grid grid-cols-3 gap-2">
          {LENGTHS.map(w => (
            <button key={w} type="button" onClick={() => setWeeks(w)} aria-pressed={weeks === w}
              className={cx('h-12 rounded-xl border text-[15px] font-medium', weeks === w ? 'border-dark bg-dark text-white' : 'border-line bg-surface')}>{w} wks</button>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-sm"><Icon name="calendar" className="size-4 text-muted" /> Starts today · ends {fmtDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}</p>

        <Step n={3} label="Weekly actions" />
        <Card className="divide-y divide-line overflow-hidden">
          {actions.map((a, i) => (
            <button key={a.label + i} type="button" aria-pressed={a.on} onClick={() => setActions(list => list.map((x, j) => j === i ? { ...x, on: !x.on } : x))} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <span className={cx('flex size-6 items-center justify-center rounded-md border-2', a.on ? 'border-green bg-green text-white' : 'border-line')}>{a.on && <Icon name="check" className="size-3.5" strokeWidth={2.6} />}</span>
              <span className={cx('flex-1 text-[15px] font-medium', !a.on && 'text-muted')}>{a.label}</span>
              <span className="text-xs text-faint">/ week</span>
            </button>
          ))}
          <div className="flex items-center gap-2 px-4 py-2">
            <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCustom() }} placeholder="Add your own…" className="h-10 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
            <button type="button" onClick={addCustom} className="text-sm font-medium text-green-ink">+ add</button>
          </div>
        </Card>

        <Step n={4} label="Why it matters" optional />
        <TextArea value={why} onChange={e => setWhy(e.target.value)} placeholder="A line to read on the hard days — why you’re chasing this goal…" aria-label="Why it matters" />

        <Card className="mt-5 flex items-center gap-3 px-4 py-3.5">
          <div className="flex-1"><p className="text-[15px] font-medium">Weekly check-in</p><p className="text-[13px] text-muted">A nudge every Monday morning</p></div>
          <Toggle checked={checkin} onChange={setCheckin} label="Weekly check-in" />
        </Card>

        <Button className="mt-6" size="lg" full trailingIcon="arrow-right" onClick={start} disabled={saving}>{saving ? 'Starting…' : 'Start this Block'}</Button>
      </div>
    </>
  )
}

function Step({ n, label, optional }: { n: number; label: string; optional?: boolean }) {
  return <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-[0.08em] text-muted">{n} · {label}{optional && <span className="normal-case tracking-normal text-faint"> · optional</span>}</p>
}
