'use client'

import { useRef, useState } from 'react'
import Icon from './Icon'
import { Button, Sheet, Field, toast, cx } from './ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { fullName } from '@/lib/rc/format'
import { jobTitle, needsNda, needsTape, type PipelineApp } from '@/lib/rc/pipeline'

const MAX_MB = 500
const stamp = () => Date.now().toString(36)
const ext = (f: File) => (f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '') || 'mp4'

// The performer's actions on a casting card: sign the NDA, send a self-tape, join the call.
export default function CastingNextStep({ app, onChange }: { app: PipelineApp; onChange: (patch: Partial<PipelineApp>) => void }) {
  const me = useMe()
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [nda, setNda] = useState(false)
  const lockedByNda = needsNda(app)
  const tape = needsTape(app)
  const call = app.recall_kind === 'video_call' && app.status === 'callback' && !app.outcome && app.meeting_url

  const send = async (file: File) => {
    if (!file.type.startsWith('video/')) { toast('Choose a video file'); return }
    if (file.size > MAX_MB * 1024 * 1024) { toast('That video is over ' + MAX_MB + 'MB — trim or compress it first'); return }
    setUploading(true)
    const path = me.id + '/' + app.job_id + '/tape-' + stamp() + '.' + ext(file)
    const { error: upErr } = await supabase.storage.from('applications').upload(path, file, { contentType: file.type })
    if (upErr) { setUploading(false); toast('Upload failed — check your connection and try again'); return }
    const label = (app.status === 'callback' ? 'Recall tape · ' : 'Self-tape · ') + file.name
    const { error: fErr } = await supabase.from('application_files').insert({ application_id: app.id, file_url: path, file_type: 'video', file_name: label })
    const sentAt = new Date().toISOString()
    const { error: aErr } = fErr ? { error: fErr } : await supabase.from('applications').update({ tape_sent_at: sentAt }).eq('id', app.id)
    setUploading(false)
    if (aErr) { toast('Couldn’t send your tape — try again'); return }
    onChange({ tape_sent_at: sentAt })
    toast('Self-tape sent to casting')
  }

  if (!lockedByNda && !tape && !call) return null
  return (
    <div className="mt-3 space-y-2">
      {lockedByNda && (
        <Button full icon="lock" onClick={() => setNda(true)}>Sign the NDA to continue</Button>
      )}
      {tape && !lockedByNda && (
        <>
          <input ref={input} type="file" accept="video/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) send(f) }} />
          <Button full variant={app.tape_sent_at ? 'outline' : 'primary'} icon={app.tape_sent_at ? 'video' : 'upload'} disabled={uploading} onClick={() => input.current?.click()}>
            {uploading ? 'Uploading — keep this screen open…' : app.tape_sent_at ? 'Send another take' : 'Upload your self-tape'}
          </Button>
        </>
      )}
      {call && !lockedByNda && (
        <a href={app.meeting_url!} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-full bg-forest text-[15px] font-semibold text-white">
          <Icon name="video" className="size-[18px]" /> Join video call
        </a>
      )}
      {nda && <NdaSheet app={app} name={fullName(me.profile) || ''} onClose={() => setNda(false)} onSigned={p => { onChange(p); setNda(false) }} />}
    </div>
  )
}

function NdaSheet({ app, name, onClose, onSigned }: { app: PipelineApp; name: string; onClose: () => void; onSigned: (p: Partial<PipelineApp>) => void }) {
  const [typed, setTyped] = useState(name)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const ok = agree && typed.trim().length > 2
  const sign = async () => {
    setBusy(true)
    const at = new Date().toISOString()
    const { error } = await supabase.from('applications').update({ nda_signed: true, nda_signed_at: at, nda_signed_name: typed.trim() }).eq('id', app.id)
    setBusy(false)
    if (error) { toast('Couldn’t sign — try again'); return }
    toast('NDA signed')
    onSigned({ nda_signed: true })
  }
  return (
    <Sheet open onClose={onClose} title="Non-disclosure agreement">
      <div className="space-y-4">
        <p className="text-sm text-muted">{jobTitle(app.jobs)} asks everyone to keep the project confidential before seeing sides or meeting the team.</p>
        <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-xl border border-line bg-field p-4 text-[13px] leading-relaxed">
          {app.jobs?.nda_text || 'You agree not to share any scripts, sides, plot details, cast information or materials from this production with anyone outside the casting process, or post about it online, unless the production has made it public. This applies during and after the casting process.'}
        </div>
        <Field label="Type your full name to sign" value={typed} onChange={e => setTyped(e.target.value)} autoComplete="name" />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className={cx('mt-0.5 size-5 accent-[var(--forest)]')} />
          <span>I’ve read and agree to this NDA. Typing my name counts as my signature.</span>
        </label>
        <Button full size="lg" onClick={sign} disabled={!ok || busy}>{busy ? 'Signing…' : 'Sign NDA'}</Button>
      </div>
    </Sheet>
  )
}
