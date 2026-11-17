'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Field, TextArea, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { fmtDate } from '@/lib/rc/format'

// Industry goals with suggested weekly actions; everything is editable and they can write their own
const GOALS: { goal: string; icon: string; actions: string[] }[] = [
  { goal: 'Create a showreel', icon: 'video', actions: ['Film 1 scene or self-tape', 'Collect footage from past jobs', 'Edit or send clips to an editor', 'Upload the finished reel to my profile'] },
  { goal: 'Go to dance classes', icon: 'sparkle', actions: ['Take 2 dance classes', 'Stretch and condition 3 times', 'Learn 1 new routine', 'Film my progress'] },
  { goal: 'Land a lead role', icon: 'star', actions: ['Apply to 5 roles', 'Record 1 self-tape', 'Prepare 1 new monologue'] },
  { goal: 'Sign with an agent', icon: 'briefcase', actions: ['Research 5 agents', 'Send 3 agent submissions', 'Invite agents to see my work'] },
  { goal: 'Get new headshots', icon: 'camera', actions: ['Shortlist 3 photographers', 'Book the shoot', 'Pick favourites and upload them'] },
  { goal: 'Improve my singing', icon: 'mic', actions: ['Have 1 singing lesson', 'Practise 4 times', 'Learn 1 new song for my book'] },
  { goal: 'Learn an accent', icon: 'globe', actions: ['Practise 20 minutes, 4 times', 'Record myself and compare', 'Read a scene in the accent'] },
  { goal: 'Get fitter for the stage', icon: 'zap', actions: ['Train 3 times', 'Do 1 stamina session', 'Stretch daily'] },
  { goal: 'Grow my network', icon: 'users', actions: ['Reach out to 3 people', 'Go to 1 industry event or show', 'Follow up with someone I met'] },
  { goal: 'Write my own work', icon: 'pen', actions: ['Write 3 sessions', 'Share pages with someone', 'Read 1 new play'] },
]
const LENGTHS = [6, 12, 16]
const actionsFor = (g: string) => (GOALS.find(x => x.goal === g)?.actions || ['Apply to 5 roles', 'Record 1 self-tape', 'Take 2 classes']).map(label => ({ label, on: true }))

export default function NewBlockPage() {
  const router = useRouter()
  const { id } = useMe()
  const [goal, setGoal] = useState(GOALS[0].goal)
  const [weeks, setWeeks] = useState(12)
  const [actions, setActions] = useState(() => actionsFor(GOALS[0].goal))
  // Picking a suggested goal swaps in its weekly actions (their own added actions are kept)
  const pickGoal = (g: string) => { setGoal(g); setActions(a => [...actionsFor(g), ...a.filter(x => (x as { own?: boolean }).own)]) }
  const [custom, setCustom] = useState('')
  const [why, setWhy] = useState('')
  const [checkin, setCheckin] = useState(true)
  const [saving, setSaving] = useState(false)

  const end = new Date(); end.setDate(end.getDate() + weeks * 7)

  const addCustom = () => {
    const label = custom.trim()
    if (!label) return
    setActions(a => [...a, { label, on: true, own: true }])
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
    if (error) { toast('Couldn’t save your goal — try again'); return }
    router.replace('/blocks') // the form isn't left behind in history
  }

  return (
    <>
      <BackHeader title="New goal" />
      <div className="px-4 pb-8">
        <p className="text-[15px] text-muted">Pick an industry goal or write your own, then the few things you’ll do each week. Tick them off as you go.</p>

        <Step n={1} label="Your goal" />
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map(g => (
            <button key={g.goal} type="button" onClick={() => pickGoal(g.goal)} aria-pressed={goal === g.goal}
              className={cx('flex items-center gap-2 rounded-xl border px-3 py-3 text-left text-[14px] font-medium transition', goal === g.goal ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>
              <Icon name={g.icon} className={cx('size-4 shrink-0', goal === g.goal ? 'text-lime' : 'text-muted')} />{g.goal}
            </button>
          ))}
        </div>
        <Field className="mt-3" value={goal} onChange={e => setGoal(e.target.value)} aria-label="Your goal" placeholder="Or write your own goal…" />

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

        <Button className="mt-6" size="lg" full trailingIcon="arrow-right" onClick={start} disabled={saving}>{saving ? 'Starting…' : 'Start this goal'}</Button>
      </div>
    </>
  )
}

function Step({ n, label, optional }: { n: number; label: string; optional?: boolean }) {
  return <p className="mb-2 mt-6 text-xs font-medium uppercase tracking-[0.08em] text-muted">{n} · {label}{optional && <span className="normal-case tracking-normal text-faint"> · optional</span>}</p>
}
