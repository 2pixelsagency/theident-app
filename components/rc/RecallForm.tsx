'use client'

import { useState } from 'react'
import { Button, Field, Segmented, TextArea, toast } from './ui'
import { toISODate } from '@/lib/rc/format'
import type { RecallKind } from '@/lib/rc/casting'

export type RecallPatch = { status: 'callback'; shortlisted: true; outcome: null; recall_kind: RecallKind; meeting_url: string | null; due_at: string; next_step_note: string | null }

const KINDS: { value: RecallKind; label: string }[] = [
  { value: 'self_tape', label: 'Another tape' },
  { value: 'video_call', label: 'Video call' },
  { value: 'in_person', label: 'In person' },
]

// How a recall happens: another self-tape (by a date), a video call (date, time + Zoom/Teams/Meet link) or in person.
export default function RecallForm({ who, saving, onSubmit }: { who: string; saving?: boolean; onSubmit: (patch: RecallPatch) => void }) {
  const soon = new Date(); soon.setDate(soon.getDate() + 5)
  const [kind, setKind] = useState<RecallKind>('video_call')
  const [date, setDate] = useState(toISODate(soon))
  const [time, setTime] = useState('14:00')
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')

  const submit = () => {
    const url = link.trim()
    if (kind === 'video_call' && !/^https:\/\/\S+$/i.test(url)) { toast('Paste the call link (starts with https://)'); return }
    onSubmit({
      status: 'callback', shortlisted: true, outcome: null, recall_kind: kind,
      meeting_url: kind === 'video_call' ? url : null,
      due_at: new Date(date + 'T' + (kind === 'self_tape' ? '18:00' : time) + ':00').toISOString(),
      next_step_note: note.trim() || null,
    })
  }

  return (
    <div className="space-y-4">
      <Segmented value={kind} onChange={setKind} options={KINDS} />
      {kind === 'self_tape' ? (
        <Field label="New tape due by" type="date" value={date} onChange={e => setDate(e.target.value)} />
      ) : (
        <div className="flex gap-3">
          <Field className="flex-1" label={kind === 'video_call' ? 'Call date' : 'Recall date'} type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Field className="flex-1" label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      )}
      {kind === 'video_call' && <Field label="Call link" type="url" inputMode="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://zoom.us/j/… or Teams / Meet link" />}
      <TextArea label={'Note to ' + who + ' (optional)'} value={note} onChange={e => setNote(e.target.value)}
        placeholder={kind === 'self_tape' ? 'e.g. Same scene, play it angrier — and add the new sides attached' : kind === 'video_call' ? 'e.g. Have the sides ready; camera on, quiet room' : 'e.g. Studio 2, Spotlight Studios — bring heels'} />
      <Button full size="lg" onClick={submit} disabled={saving}>{saving ? 'Sending…' : kind === 'self_tape' ? 'Ask for another tape' : kind === 'video_call' ? 'Send call invite' : 'Send recall'}</Button>
    </div>
  )
}
