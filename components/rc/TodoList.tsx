'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Card, PageLoading, cx, toast } from '@/components/rc/ui'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { addTodo, dueLabel, loadTodos, removeTodo, setDone, type AutoTodo, type Todo } from '@/lib/rc/todo'

function Check({ done, onClick, label }: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={done} aria-label={label} onClick={onClick}
      className={cx('flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition', done ? 'border-forest bg-forest text-lime' : 'border-line hover:border-forest')}>
      {done && <Icon name="check" className="size-3.5" strokeWidth={3} />}
    </button>
  )
}

function AutoRow({ t }: { t: AutoTodo }) {
  const due = dueLabel(t.due)
  return (
    <Link href={t.href} className="flex items-center gap-3 px-4 py-3">
      <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-lg', t.urgent ? 'bg-lime text-ink' : 'bg-chip text-muted')}><Icon name={t.icon} className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{t.title}</span>
        {(t.sub || due) && <span className="block truncate text-[13px] text-muted">{[due, t.sub].filter(Boolean).join(' · ')}</span>}
      </span>
      <Icon name="chevron-right" className="size-4 text-faint" />
    </Link>
  )
}

// Automatic items (self-tapes, contracts, closing roles, invoices…) + their own tasks.
// `compact` is the Home card: a few items and a link to the full list.
export default function TodoList({ compact }: { compact?: boolean }) {
  const { id, profile } = useMe()
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const { data, loading, mutate } = useAsync(() => loadTodos(id, !!profile?.email_verified), [id, profile?.email_verified])

  if (loading || !data) return compact ? null : <PageLoading />
  const open = data.mine.filter(t => !t.done_at)
  const done = data.mine.filter(t => t.done_at)
  const total = data.auto.length + open.length

  const toggle = async (t: Todo) => {
    const next = !t.done_at
    mutate(d => d && { ...d, mine: d.mine.map(x => x.id === t.id ? { ...x, done_at: next ? new Date().toISOString() : null } : x) })
    const { error } = await setDone(t.id, next)
    if (error) { toast('Couldn’t update that'); mutate(d => d && { ...d, mine: d.mine.map(x => x.id === t.id ? t : x) }) }
  }
  const remove = async (t: Todo) => {
    mutate(d => d && { ...d, mine: d.mine.filter(x => x.id !== t.id) })
    const { error } = await removeTodo(t.id)
    if (error) { toast('Couldn’t delete that'); mutate(d => d && { ...d, mine: [...d.mine, t] }) }
  }
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = title.trim()
    if (!text) return
    setAdding(true)
    const { data: row, error } = await addTodo(text, due || null)
    setAdding(false)
    if (error || !row) { toast('Couldn’t add that'); return }
    mutate(d => d && { ...d, mine: [row as Todo, ...d.mine] })
    setTitle(''); setDue('')
  }

  const autoShown = compact ? data.auto.slice(0, 3) : data.auto
  const mineShown = compact ? open.slice(0, Math.max(0, 4 - autoShown.length)) : open
  const more = total - autoShown.length - mineShown.length

  const myRow = (t: Todo) => {
    const label = dueLabel(t.due_on)
    return (
      <li key={t.id} className="group flex items-center gap-3 px-4 py-3">
        <Check done={!!t.done_at} onClick={() => toggle(t)} label={(t.done_at ? 'Mark not done: ' : 'Mark done: ') + t.title} />
        <span className="min-w-0 flex-1">
          <span className={cx('block text-[15px]', t.done_at && 'text-muted line-through')}>{t.title}</span>
          {label && !t.done_at && <span className={cx('block text-[13px]', label === 'Overdue' || label === 'Due today' ? 'font-medium text-red' : 'text-muted')}>{label}</span>}
        </span>
        {!compact && <button type="button" aria-label={'Delete ' + t.title} onClick={() => remove(t)} className="inline-flex size-8 items-center justify-center rounded-full text-faint hover:bg-chip hover:text-ink"><Icon name="x" className="size-4" /></button>}
      </li>
    )
  }

  const form = (
    <form onSubmit={add} className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line px-4 py-2.5">
      <Icon name="plus" className="size-5 shrink-0 text-muted" />
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a to-do, e.g. learn sides" aria-label="New to-do" maxLength={200}
        className="h-10 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint" />
      {title.trim() && <span className="basis-full sm:hidden" />}
      <input type="date" value={due} onChange={e => setDue(e.target.value)} aria-label="Due date (optional)" className={cx('h-9 shrink-0 rounded-lg border border-line bg-field px-2 text-[13px] max-sm:ml-7 max-sm:flex-1', !due && 'text-faint', !title.trim() && 'max-sm:hidden')} />
      <button type="submit" disabled={adding || !title.trim()} className={cx('h-9 shrink-0 rounded-full bg-forest px-3 text-sm font-semibold text-white disabled:opacity-40', !title.trim() && 'max-sm:hidden')}>Add</button>
    </form>
  )

  return (
    <div>
      {compact && (
        <div className="mb-3 mt-7 flex items-center justify-between">
          <h2 className="text-[18px]">To do{total ? <span className="ml-2 rounded-full bg-lime px-2 py-0.5 align-middle text-[12px] font-semibold text-ink">{total}</span> : null}</h2>
          <Link href="/todo" className="text-sm font-semibold text-green-ink">See all</Link>
        </div>
      )}
      <Card className="overflow-hidden">
        {!compact && data.auto.length > 0 && <p className="bg-chip/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">From your castings</p>}
        <ul className="divide-y divide-line">
          {autoShown.map(t => <li key={t.key}><AutoRow t={t} /></li>)}
        </ul>
        {!compact && <p className="border-t border-line bg-chip/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">My list</p>}
        <ul className={cx('divide-y divide-line', autoShown.length > 0 && compact && mineShown.length > 0 && 'border-t border-line')}>{mineShown.map(myRow)}</ul>
        {total === 0 && <p className="px-4 py-4 text-sm text-muted">You’re all caught up. Add anything you need to remember — fittings, sides to learn, headshot day.</p>}
        {compact && more > 0 && <Link href="/todo" className="block border-t border-line px-4 py-2.5 text-sm font-medium text-green-ink">+{more} more</Link>}
        {form}
      </Card>
      {!compact && done.length > 0 && (
        <div className="mt-4">
          <button type="button" onClick={() => setShowDone(v => !v)} className="flex items-center gap-1 text-sm font-medium text-muted">
            <Icon name={showDone ? 'chevron-down' : 'chevron-right'} className="size-4" /> Done · {done.length}
          </button>
          {showDone && <Card className="mt-2 overflow-hidden"><ul className="divide-y divide-line">{done.map(myRow)}</ul></Card>}
        </div>
      )}
    </div>
  )
}
