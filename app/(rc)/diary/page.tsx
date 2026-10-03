'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Chip, Empty, Field, IconButton, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { KIND_COLOUR, KIND_LABEL, kindsByDay, loadDiary, type DiaryItem, type DiaryKind } from '@/lib/rc/diary'
import { fmtDate, toISODate } from '@/lib/rc/format'

const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const BAR: Record<DiaryKind, string> = { self_tape: 'bg-amber', recall: 'bg-green', pencil: 'bg-pencil', booked: 'bg-green-ink', other: 'bg-faint' }

function monthGrid(year: number, month: number) {
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(1 - ((first.getDay() + 6) % 7))
  const weeks = Math.ceil((((first.getDay() + 6) % 7) + new Date(year, month + 1, 0).getDate()) / 7)
  return Array.from({ length: weeks * 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d })
}

export default function DiaryPage() {
  const { id } = useMe()
  const now = new Date()
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() })
  const [selected, setSelected] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const days = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor])
  const { data: items, reload } = useAsync(async () => {
    const to = new Date(days[days.length - 1]); to.setDate(to.getDate() + 60) // agenda looks ahead past the month
    return loadDiary(id, days[0], to)
  }, [id, days])

  const kinds = useMemo(() => kindsByDay(items || []), [items])
  const today = toISODate(now)
  const agenda = (items || []).filter(i => selected ? (i.date <= selected && (i.endDate || i.date) >= selected) : (i.endDate || i.date) >= today)

  const shift = (n: number) => { setSelected(null); setCursor(c => { const d = new Date(c.y, c.m + n, 1); return { y: d.getFullYear(), m: d.getMonth() } }) }

  return (
    <>
      <BackHeader title="Diary" right={<IconButton icon="plus" label="Add to diary" onClick={() => setAdding(true)} />} />
      <div className="px-4 pb-8">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" aria-label="Previous month" onClick={() => shift(-1)} className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="chevron-left" /></button>
            <p className="text-[17px] font-medium">{new Date(cursor.y, cursor.m).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
            <button type="button" aria-label="Next month" onClick={() => shift(1)} className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="chevron-right" /></button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] text-faint">{DOW.map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center">
            {days.map(d => {
              const key = toISODate(d)
              const inMonth = d.getMonth() === cursor.m
              const dots = Array.from(kinds.get(key) || []).slice(0, 3)
              const isSel = selected === key
              const isToday = key === today
              return (
                <button key={key} type="button" onClick={() => setSelected(isSel ? null : key)} aria-pressed={isSel} aria-label={fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}
                  className="flex flex-col items-center gap-1 py-1">
                  <span className={cx('flex size-9 items-center justify-center rounded-full text-[15px]', isSel || isToday ? 'bg-dark text-white' : inMonth ? 'text-ink' : 'text-faint/60', isToday && !isSel && 'bg-dark/80')}>{d.getDate()}</span>
                  <span className="flex h-1.5 gap-0.5">{dots.map(k => <span key={k} className={cx('size-1.5 rounded-full', KIND_COLOUR[k])} />)}</span>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-muted">
            {(['self_tape', 'recall', 'pencil', 'booked'] as DiaryKind[]).map(k => <span key={k} className="flex items-center gap-1.5"><span className={cx('size-2 rounded-full', KIND_COLOUR[k])} />{KIND_LABEL[k]}</span>)}
          </div>
        </Card>

        <p className="mb-3 mt-6 text-xs font-medium uppercase tracking-[0.08em] text-muted">{selected ? fmtDate(selected, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Upcoming'}</p>
        {agenda.length === 0 ? (
          <Card><Empty icon="calendar" title={selected ? 'Nothing on this day' : 'Nothing coming up'} sub="Self-tapes, recalls, pencils and bookings appear here automatically." /></Card>
        ) : (
          <ul className="space-y-3">{agenda.map(i => <AgendaRow key={i.id} item={i} />)}</ul>
        )}
      </div>
      <AddEntry key={selected || today} open={adding} onClose={() => setAdding(false)} uid={id} defaultDate={selected || today} onAdded={reload} />
    </>
  )
}

function AgendaRow({ item }: { item: DiaryItem }) {
  const inner = (
    <Card className="flex items-stretch gap-3 p-4">
      <span className={cx('w-1 shrink-0 rounded-full', BAR[item.kind])} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium">{item.title}</span>
        <span className="block truncate text-[13px] text-muted">{item.sub}</span>
      </span>
    </Card>
  )
  return <li>{item.href ? <Link href={item.href}>{inner}</Link> : inner}</li>
}

const ENTRY_TYPES: { value: string; label: string }[] = [
  { value: 'self_tape', label: 'Self-tape' }, { value: 'recall', label: 'Recall' }, { value: 'pencil', label: 'Pencil' },
  { value: 'show', label: 'Show / booking' }, { value: 'other', label: 'Other' },
]

function AddEntry({ open, onClose, uid, defaultDate, onAdded }: { open: boolean; onClose: () => void; uid: string; defaultDate: string; onAdded: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('other')
  const [date, setDate] = useState(defaultDate)
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('calendar_events').insert({
      profile_id: uid, title: title.trim(), event_type: type, start_date: date || defaultDate,
      start_time: time || null, all_day: !time, status: 'confirmed',
    })
    setSaving(false)
    if (error) { toast('Couldn’t save that — try again'); return }
    toast('Added to your diary')
    setTitle(''); setTime('')
    onAdded(); onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Add to diary">
      <div className="space-y-4">
        <Field label="What" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Dance class, recall, travel day" autoFocus />
        <div className="flex flex-wrap gap-2">{ENTRY_TYPES.map(t => <Chip key={t.value} selected={type === t.value} onClick={() => setType(t.value)}>{t.label}</Chip>)}</div>
        <div className="flex gap-3">
          <Field className="flex-1" label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Field className="flex-1" label="Time (optional)" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
        <Button full size="lg" onClick={save} disabled={saving || !title.trim()}>{saving ? 'Saving…' : 'Add'}</Button>
      </div>
    </Sheet>
  )
}
