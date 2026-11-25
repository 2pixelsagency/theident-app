'use client'

import { useState } from 'react'
import Icon from './Icon'
import { Button, Field, Sheet, TextArea, cx, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { compressImage } from '@/lib/rc/media'

// Cast chats: polls, events (Going / Maybe / Can't go → added to your Diary + a calendar file), chat photo.
export type PollMeta = { question: string; options: string[] }
export type EventMeta = { title: string; date: string; time?: string; location?: string; details?: string }
export type Vote = { message_id: string; profile_id: string; option: number }
export type Rsvp = { message_id: string; profile_id: string; response: 'going' | 'maybe' | 'no' }

const fmtEventDate = (e: EventMeta) => new Date(e.date + 'T' + (e.time || '12:00')).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }) + (e.time ? ' · ' + e.time : '')

// .ics so it lands in Apple / Google / Outlook calendars
export function downloadIcs(e: EventMeta) {
  const d = e.date.replace(/-/g, '')
  const start = e.time ? d + 'T' + e.time.replace(':', '') + '00' : d
  const endDate = new Date(e.date + 'T' + (e.time || '00:00'))
  if (e.time) endDate.setHours(endDate.getHours() + 2); else endDate.setDate(endDate.getDate() + 1)
  const pad = (n: number) => String(n).padStart(2, '0')
  const end = e.time ? `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00` : `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}`
  const esc = (s = '') => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n')
  const dt = (v: string) => (e.time ? ':' + v : ';VALUE=DATE:' + v)
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Ident//Cast chat//EN', 'BEGIN:VEVENT',
    'UID:' + Date.now() + '@theident.me', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
    'DTSTART' + dt(start), 'DTEND' + dt(end), 'SUMMARY:' + esc(e.title), e.location ? 'LOCATION:' + esc(e.location) : '', e.details ? 'DESCRIPTION:' + esc(e.details) : '',
    'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n')
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
  const a = document.createElement('a'); a.href = url; a.download = e.title.replace(/[^\w]+/g, '-').slice(0, 40) + '.ics'; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function PollCard({ id, meta, votes, me, onVote }: { id: string; meta: PollMeta; votes: Vote[]; me: string; onVote: (option: number | null) => void }) {
  const mine = votes.find(v => v.profile_id === me)?.option ?? null
  const total = votes.length
  return (
    <div className="rounded-[18px] border border-line bg-surface p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted"><Icon name="trending" className="size-3.5" />Poll</p>
      <p className="mt-1.5 text-[16px] font-semibold">{meta.question}</p>
      <div className="mt-3 space-y-2">
        {meta.options.map((o, i) => {
          const n = votes.filter(v => v.option === i).length
          const pct = total ? Math.round((n / total) * 100) : 0
          const on = mine === i
          return (
            <button key={i} type="button" onClick={() => onVote(on ? null : i)} aria-pressed={on}
              className={cx('relative w-full overflow-hidden rounded-[12px] border px-3 py-2.5 text-left text-[14px]', on ? 'border-forest' : 'border-line')}>
              <span aria-hidden="true" className={cx('absolute inset-y-0 left-0 transition-[width] duration-500', on ? 'bg-lime/60' : 'bg-chip')} style={{ width: (mine !== null ? pct : 0) + '%' }} />
              <span className="relative flex items-center justify-between gap-3"><span className="font-medium">{on && '✓ '}{o}</span>{mine !== null && <span className="text-[13px] font-semibold tabular-nums">{pct}%</span>}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-[12px] text-muted">{total} {total === 1 ? 'vote' : 'votes'}{mine === null ? ' · tap to vote' : ' · tap again to change'}</p>
      <span className="sr-only">{id}</span>
    </div>
  )
}

export function EventCard({ meta, rsvps, me, onRsvp, names }: { meta: EventMeta; rsvps: Rsvp[]; me: string; onRsvp: (r: Rsvp['response']) => void; names: (id: string) => string }) {
  const mine = rsvps.find(r => r.profile_id === me)?.response
  const going = rsvps.filter(r => r.response === 'going')
  const opts: [Rsvp['response'], string][] = [['going', 'Going'], ['maybe', 'Maybe'], ['no', 'Can’t go']]
  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-card">
      <div className="flex items-start gap-3 bg-forest p-4 text-bg">
        <span className="flex w-12 shrink-0 flex-col items-center rounded-[12px] bg-lime py-1.5 text-forest">
          <span className="text-[10px] font-bold uppercase">{new Date(meta.date + 'T12:00').toLocaleDateString('en-GB', { month: 'short' })}</span>
          <span className="font-display text-[20px] font-bold leading-none">{new Date(meta.date + 'T12:00').getDate()}</span>
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-on-dark-muted">Event</p>
          <p className="text-[16px] font-semibold leading-tight">{meta.title}</p>
          <p className="mt-1 text-[13px] text-on-dark-muted">{fmtEventDate(meta)}{meta.location ? ' · ' + meta.location : ''}</p>
        </div>
      </div>
      <div className="p-4">
        {meta.details && <p className="mb-3 whitespace-pre-line text-[14px] text-muted-strong">{meta.details}</p>}
        <div className="grid grid-cols-3 gap-2">
          {opts.map(([v, l]) => (
            <button key={v} type="button" onClick={() => onRsvp(v)} aria-pressed={mine === v}
              className={cx('h-10 rounded-full text-[13px] font-semibold transition-colors', mine === v ? (v === 'no' ? 'bg-chip text-ink' : 'bg-forest text-lime') : 'border border-line bg-surface')}>{l}</button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[12px] text-muted">{going.length ? going.length + ' going · ' + going.slice(0, 3).map(g => names(g.profile_id)).join(', ') + (going.length > 3 ? '…' : '') : 'No one yet'}</p>
          <button type="button" onClick={() => downloadIcs(meta)} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-green-ink"><Icon name="calendar" className="size-4" />Add to calendar</button>
        </div>
      </div>
    </div>
  )
}

// "+" in the composer: create a poll or an event
export function CreateSheet({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (kind: 'poll' | 'event', meta: PollMeta | EventMeta, body: string) => Promise<boolean> }) {
  const [kind, setKind] = useState<'poll' | 'event' | null>(null)
  const [q, setQ] = useState('')
  const [opts, setOpts] = useState(['', ''])
  const [ev, setEv] = useState<EventMeta>({ title: '', date: '', time: '', location: '', details: '' })
  const [busy, setBusy] = useState(false)
  const reset = () => { setKind(null); setQ(''); setOpts(['', '']); setEv({ title: '', date: '', time: '', location: '', details: '' }); setBusy(false) }
  const close = () => { reset(); onClose() }
  const submit = async () => {
    if (kind === 'poll') {
      const options = opts.map(o => o.trim()).filter(Boolean)
      if (!q.trim() || options.length < 2) { toast('Add a question and at least two options'); return }
      setBusy(true)
      if (await onCreate('poll', { question: q.trim().slice(0, 200), options: options.slice(0, 12).map(o => o.slice(0, 80)) }, '📊 Poll: ' + q.trim())) close(); else setBusy(false)
    } else if (kind === 'event') {
      if (!ev.title.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(ev.date)) { toast('Add a title and a date'); return }
      setBusy(true)
      const meta: EventMeta = { title: ev.title.trim().slice(0, 120), date: ev.date, time: ev.time || undefined, location: ev.location?.trim() || undefined, details: ev.details?.trim().slice(0, 600) || undefined }
      if (await onCreate('event', meta, '📅 ' + meta.title + ' — ' + fmtEventDate(meta))) close(); else setBusy(false)
    }
  }
  return (
    <Sheet open={open} onClose={close} title={kind === 'poll' ? 'New poll' : kind === 'event' ? 'New event' : 'Add to the chat'}>
      {!kind ? (
        <div className="grid grid-cols-2 gap-3">
          {([['poll', 'trending', 'Poll', 'Ask the company to vote'], ['event', 'calendar', 'Event', 'Drinks, a rehearsal call, a social']] as const).map(([k, icon, t, s]) => (
            <button key={k} type="button" onClick={() => setKind(k)} className="flex flex-col items-start gap-2 rounded-[18px] border border-line bg-surface p-4 text-left hover:border-forest">
              <span className="flex size-10 items-center justify-center rounded-[12px] bg-lime text-forest"><Icon name={icon} strokeWidth={2} className="size-5" /></span>
              <span className="text-[15px] font-semibold">{t}</span><span className="text-[13px] text-muted">{s}</span>
            </button>
          ))}
        </div>
      ) : kind === 'poll' ? (
        <div className="space-y-3">
          <Field label="Question" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. Where for post-show drinks?" autoFocus />
          {opts.map((o, i) => <Field key={i} label={'Option ' + (i + 1)} value={o} onChange={e => setOpts(l => l.map((x, j) => (j === i ? e.target.value : x)))} />)}
          {opts.length < 12 && <button type="button" onClick={() => setOpts(l => [...l, ''])} className="text-sm font-semibold text-green-ink">+ Add option</button>}
          <Button full size="lg" onClick={submit} disabled={busy}>{busy ? 'Posting…' : 'Post poll'}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <Field label="What" value={ev.title} onChange={e => setEv(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Cast drinks" autoFocus />
          <div className="flex gap-3">
            <Field className="flex-1" label="Date" type="date" value={ev.date} onChange={e => setEv(p => ({ ...p, date: e.target.value }))} />
            <Field className="w-32" label="Time (optional)" type="time" value={ev.time || ''} onChange={e => setEv(p => ({ ...p, time: e.target.value }))} />
          </div>
          <Field label="Where (optional)" value={ev.location || ''} onChange={e => setEv(p => ({ ...p, location: e.target.value }))} placeholder="e.g. The Crown, stage door" />
          <TextArea label="Details (optional)" value={ev.details || ''} onChange={e => setEv(p => ({ ...p, details: e.target.value }))} />
          <Button full size="lg" onClick={submit} disabled={busy}>{busy ? 'Posting…' : 'Post event'}</Button>
        </div>
      )}
    </Sheet>
  )
}

// Admin: change the chat photo (stored under the admin's own headshots folder)
export async function uploadChatPhoto(uid: string, chatId: string, file: File) {
  const img = await compressImage(file, { maxDim: 600 })
  const path = uid + '/chat-' + chatId + '-' + Date.now().toString(36) + '.jpg'
  const { error } = await supabase.storage.from('headshots').upload(path, img, { contentType: img.type || 'image/jpeg' })
  if (error) return null
  const url = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
  const { error: e2 } = await supabase.from('cast_chats').update({ photo_url: url }).eq('id', chatId)
  return e2 ? null : url
}
