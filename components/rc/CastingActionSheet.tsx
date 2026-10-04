'use client'

import { useState } from 'react'
import { Button, Chip, Field, Sheet, TextArea, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { setStage, type CasterApp, type CastingStep } from '@/lib/rc/casting'
import { toISODate } from '@/lib/rc/format'

type Posting = { id: string; title: string }

const COPY: Record<CastingStep['field'], { title: string; cta: string }> = {
  due: { title: 'Invite to audition', cta: 'Send invite' },
  datetime: { title: 'Recall', cta: 'Send recall' },
  held: { title: 'Make an offer', cta: 'Pencil them in' },
  terms: { title: 'Book', cta: 'Book & send contract' },
}

// One sheet for every stateful casting action. With no application yet (talent
// found via search), the caster picks which of their postings to invite them to.
export default function CastingActionSheet({ open, onClose, step, app, profileId, talentName, postings, onDone }: {
  open: boolean
  onClose: () => void
  step: CastingStep
  app: CasterApp | null
  profileId: string
  talentName: string
  postings: Posting[]
  onDone: (updated: Partial<CasterApp> & { id: string }) => void
}) {
  const inAWeek = new Date(); inAWeek.setDate(inAWeek.getDate() + 7)
  const [jobId, setJobId] = useState(app?.job_id || postings[0]?.id || '')
  const [date, setDate] = useState(toISODate(inAWeek))
  const [time, setTime] = useState('14:00')
  const [heldTo, setHeldTo] = useState('')
  const [note, setNote] = useState('')
  const [terms, setTerms] = useState('')
  const [saving, setSaving] = useState(false)
  const copy = COPY[step.field]

  const submit = async () => {
    setSaving(true)
    const due_at = step.field === 'due' ? new Date(date + 'T18:00:00').toISOString() : step.field === 'datetime' ? new Date(date + 'T' + time + ':00').toISOString() : undefined
    const patch = {
      status: step.next,
      outcome: null,
      next_step_note: note.trim() || null,
      ...(due_at ? { due_at } : {}),
      ...(step.field === 'held' ? { held_from: date, held_to: heldTo || date } : {}),
      ...(step.field === 'terms' && terms.trim() ? { contract_terms: terms.trim() } : {}),
    }

    if (!app) {
      if (!jobId) { setSaving(false); toast('Post a job first, then invite people to it'); return }
      const { data, error } = await supabase.from('applications')
        .insert({ job_id: jobId, profile_id: profileId, status: 'audition', invited: true, due_at, next_step_note: patch.next_step_note })
        .select('id').single()
      setSaving(false)
      if (error) { toast(error.code === '23505' ? talentName + ' is already in that casting' : 'Couldn’t send the invite'); return }
      toast('Invite sent to ' + talentName)
      onDone({ id: data.id, job_id: jobId, profile_id: profileId, status: 'audition', invited: true, outcome: null, shortlisted: false })
      onClose()
      return
    }

    const error = await setStage(app.id, patch)
    setSaving(false)
    if (error) { toast('Couldn’t update — try again'); return }
    toast(copy.title + ' sent to ' + talentName)
    onDone({ id: app.id, ...patch })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={copy.title}>
      <div className="space-y-4">
        {!app && (
          postings.length ? (
            <div>
              <p className="mb-2 text-[13px] font-medium">For which posting?</p>
              <div className="flex flex-wrap gap-2">{postings.map(p => <Chip key={p.id} selected={jobId === p.id} onClick={() => setJobId(p.id)}>{p.title}</Chip>)}</div>
            </div>
          ) : <p className="rounded-xl bg-amber-tint px-4 py-3 text-sm text-amber">You don’t have an open posting yet. Post a job, then invite {talentName} to it.</p>
        )}

        {step.field === 'due' && <Field label="Self-tape due by" type="date" value={date} onChange={e => setDate(e.target.value)} />}
        {step.field === 'datetime' && (
          <div className="flex gap-3">
            <Field className="flex-1" label="Recall date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Field className="flex-1" label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        )}
        {step.field === 'held' && (
          <div className="flex gap-3">
            <Field className="flex-1" label="Hold from" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Field className="flex-1" label="Hold to" type="date" value={heldTo} onChange={e => setHeldTo(e.target.value)} />
          </div>
        )}
        {step.field === 'terms' && <TextArea label="Contract terms (optional)" value={terms} onChange={e => setTerms(e.target.value)} placeholder="Paste your agreement. Leave blank to send our plain-English standard terms built from the posting." className="[&_textarea]:min-h-32" />}

        <TextArea label={'Note to ' + talentName.split(' ')[0] + ' (optional)'} value={note} onChange={e => setNote(e.target.value)} placeholder={step.field === 'due' ? 'e.g. Two contrasting speeches, under 3 minutes' : step.field === 'datetime' ? 'e.g. Studio 2, Spotlight Studios — bring heels' : 'Anything they should know'} />
        <Button full size="lg" onClick={submit} disabled={saving || (!app && !postings.length)}>{saving ? 'Sending…' : copy.cta}</Button>
      </div>
    </Sheet>
  )
}
