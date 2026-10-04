'use client'

import { useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import SignaturePad, { type SignaturePadHandle } from '@/components/rc/SignaturePad'
import { VerifiedTick } from '@/components/rc/JobCard'
import { BackHeader, Button, Card, Empty, PageLoading, Pill, Tag, TextArea, UploadTile, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, lengthLabel, loadPosters, type Job } from '@/lib/rc/jobs'
import { payLabel } from '@/lib/rc/pay'
import { jobTitle } from '@/lib/rc/pipeline'
import { fmtDate, fullName } from '@/lib/rc/format'

type Reel = { id: string; label: string | null; url: string }
type Upload = { path: string; name: string } | null
const MAX_MB = 500
// Unique-enough suffix for storage paths
const stamp = () => Date.now().toString(36)

export default function ApplyPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const router = useRouter()
  const me = useMe()
  const pad = useRef<SignaturePadHandle>(null)
  const reelInput = useRef<HTMLInputElement>(null)
  const tapeInput = useRef<HTMLInputElement>(null)
  const cvInput = useRef<HTMLInputElement>(null)

  const [reelId, setReelId] = useState<string | null>(null)
  const [selfTape, setSelfTape] = useState<Upload>(null)
  const [cv, setCv] = useState<Upload>(null)
  const [withHeadshot, setWithHeadshot] = useState(true)
  const [note, setNote] = useState('')
  const [consent, setConsent] = useState(false)
  const [inked, setInked] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: job }, { data: reels }, { data: existing }] = await Promise.all([
      supabase.from('jobs').select(JOB_SELECT).eq('id', jobId).maybeSingle(),
      supabase.from('reels').select('id, label, url').eq('profile_id', me.id).order('sort_order'),
      supabase.from('applications').select('id').eq('job_id', jobId).eq('profile_id', me.id).maybeSingle(),
    ])
    const j = job as unknown as Job | null
    const posters = await loadPosters([j?.created_by ?? null])
    return { job: j, poster: posters.get(j?.created_by || ''), reels: (reels || []) as Reel[], existing }
  }, [jobId, me.id])

  if (loading) return <><BackHeader title="Apply" /><PageLoading /></>
  if (!data?.job) return <><BackHeader title="Apply" /><Empty icon="briefcase" title="This listing isn’t available" /></>
  if (data.existing) return <><BackHeader title="Apply" /><Empty icon="check-circle" title="You’ve already applied" sub="Follow its progress in Castings." action={<Button size="sm" variant="dark" href={'/castings?focus=' + data.existing.id}>Track application</Button>} /></>

  const { job: j, poster, reels } = data
  const needs = new Set(j.submit_materials || ['showreel'])
  const needsReel = needs.has('showreel')
  const needsTape = needs.has('self_tape')
  const pickedReel = reelId ?? reels[0]?.id ?? null
  const picture = me.profile?.picture_url

  const upload = async (kind: 'reel' | 'tape' | 'cv', file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) { toast('That file is over ' + MAX_MB + 'MB'); return }
    setUploading(kind)
    const ext = file.name.split('.').pop() || 'bin'
    if (kind === 'reel') {
      const path = me.id + '/reel-' + stamp() + '.' + ext
      const { error: upErr } = await supabase.storage.from('reels').upload(path, file, { contentType: file.type })
      if (upErr) { setUploading(null); toast('Upload failed — try again'); return }
      const url = supabase.storage.from('reels').getPublicUrl(path).data.publicUrl
      const { data: row } = await supabase.from('reels').insert({ profile_id: me.id, label: file.name.replace(/\.[^.]+$/, ''), url, sort_order: reels.length }).select('id, label, url').single()
      if (row) { mutate(d => d && { ...d, reels: [...d.reels, row as Reel] }); setReelId(row.id) }
    } else {
      // Private applications bucket: store the path; the poster sees it via a signed URL
      const path = me.id + '/' + j.id + '/' + kind + '-' + stamp() + '.' + ext
      const { error: upErr } = await supabase.storage.from('applications').upload(path, file, { contentType: file.type })
      if (upErr) { setUploading(null); toast('Upload failed — try again'); return }
      ;(kind === 'tape' ? setSelfTape : setCv)({ path, name: file.name })
    }
    setUploading(null)
  }

  const pick = (kind: 'reel' | 'tape' | 'cv') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (f) upload(kind, f)
  }

  const missing = [
    needsReel && !pickedReel && 'a showreel',
    needsTape && !selfTape && 'your self-tape',
    j.requires_nda ? !inked && 'your signature' : !consent && 'your consent',
  ].filter(Boolean) as string[]

  const submit = async () => {
    if (missing.length) { setError('Add ' + missing.join(', ') + ' to send this application.'); return }
    setSubmitting(true)
    setError(null)

    let signaturePath: string | null = null
    if (j.requires_nda && pad.current) {
      const blob = await pad.current.toBlob()
      const path = me.id + '/' + j.id + '/nda-signature-' + stamp() + '.png'
      const { error: sigErr } = blob ? await supabase.storage.from('applications').upload(path, blob, { contentType: 'image/png' }) : { error: new Error('empty') }
      if (sigErr) { setSubmitting(false); setError('Couldn’t save your signature. Please try again.'); return }
      signaturePath = path
    }

    const signedAt = new Date().toISOString()
    const { data: app, error: appErr } = await supabase.from('applications').insert({
      job_id: j.id, profile_id: me.id, cover_note: note.trim() || null, status: 'submitted',
      nda_signed: !!j.requires_nda, nda_signed_at: j.requires_nda ? signedAt : null, signature_url: signaturePath,
    }).select('id').single()

    if (appErr || !app) {
      setSubmitting(false)
      setError(appErr?.code === '23505' ? 'You’ve already applied for this role.' : 'Couldn’t send your application. Please try again.')
      return
    }

    // The poster is notified (in-app + push) by the on_application_insert trigger
    const reel = reels.find(r => r.id === pickedReel)
    const files = [
      reel && { file_url: reel.url, file_type: 'video', file_name: reel.label || 'Showreel' },
      selfTape && { file_url: selfTape.path, file_type: 'video', file_name: 'Self-tape · ' + selfTape.name },
      cv && { file_url: cv.path, file_type: 'document', file_name: cv.name },
      withHeadshot && picture && { file_url: picture, file_type: 'image', file_name: 'Headshot' },
    ].filter(Boolean) as { file_url: string; file_type: string; file_name: string }[]
    if (files.length) {
      const { error: fErr } = await supabase.from('application_files').insert(files.map(f => ({ ...f, application_id: app.id })))
      if (fErr) console.error('application_files insert failed', fErr)
    }

    router.replace('/find/' + j.id + '/applied')
  }

  const pay = payLabel(j)
  const length = lengthLabel(j)

  return (
    <>
      <BackHeader title="Apply" right={<span className="flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs text-muted"><Icon name="clock" className="size-3.5" /> ~2 min</span>} />
      <div className="px-4 pb-10">
        <div className="rounded-[var(--radius)] bg-dark p-5 text-white">
          <p className="flex items-center gap-2 text-[18px] font-medium">{jobTitle(j)} {poster?.is_verified && <VerifiedTick />}</p>
          <p className="mt-0.5 text-sm text-white/60">{[j.production_types?.name, j.location].filter(Boolean).join(' · ')}</p>
          <div className="mt-3 flex flex-wrap gap-2">{[pay, length].filter(Boolean).map(t => <span key={t as string} className="rounded-md bg-dark-2 px-2.5 py-1 text-xs font-medium">{t}</span>)}</div>
        </div>

        {/* Showreel */}
        <div className="mb-3 mt-6 flex items-center justify-between">
          <h2 className="text-[18px]">Choose your showreel</h2>
          {needsReel && <Pill tone="green">Required</Pill>}
        </div>
        {reels.length > 0 && (
          <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {reels.map(r => {
              const on = r.id === pickedReel
              return (
                <button key={r.id} type="button" onClick={() => setReelId(r.id)} aria-pressed={on}
                  className={cx('relative w-[46%] shrink-0 overflow-hidden rounded-[var(--radius)] border-2 bg-surface text-left shadow-card', on ? 'border-green' : 'border-transparent')}>
                  <span className="relative block aspect-[16/10] bg-dark bg-cover bg-center" style={picture ? { backgroundImage: `url(${picture})` } : undefined}>
                    <span className="absolute inset-0 bg-dark/35" />
                    <span className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name="play" className="size-4 fill-current" /></span>
                    {on && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-green text-white"><Icon name="check" className="size-3.5" strokeWidth={2.6} /></span>}
                  </span>
                  <span className="block truncate px-3 py-2.5 text-sm font-medium">{r.label || 'Showreel'}</span>
                </button>
              )
            })}
          </div>
        )}
        <UploadTile className="mt-3" icon="upload" title={uploading === 'reel' ? 'Uploading…' : 'Upload a new reel'} sub={'MP4 · up to ' + MAX_MB + 'MB'} onClick={() => reelInput.current?.click()} />
        <input ref={reelInput} type="file" accept="video/*" className="hidden" onChange={pick('reel')} />

        {/* Supporting materials */}
        <h2 className="mb-3 mt-6 text-[18px]">Supporting materials</h2>
        <Card className="divide-y divide-line overflow-hidden">
          <MaterialRow icon="video" tone="bg-purple-tint text-purple-ink" title="Self-tape" sub={selfTape ? selfTape.name : (needsTape ? 'Required' : 'Optional') + ' · record or upload'}
            done={!!selfTape} busy={uploading === 'tape'} onAdd={() => tapeInput.current?.click()} />
          <MaterialRow icon="file" tone="bg-green-tint text-green-ink" title="CV / résumé" sub={cv ? cv.name : 'PDF or Word'} done={!!cv} busy={uploading === 'cv'} onAdd={() => cvInput.current?.click()} />
          <div className="flex items-center gap-3 px-4 py-3.5">
            {picture
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={picture} alt="" className="size-10 rounded-xl object-cover" />
              : <span className="flex size-10 items-center justify-center rounded-xl bg-chip text-muted"><Icon name="image" /></span>}
            <div className="flex-1"><p className="text-[15px] font-medium">Headshots</p><p className="text-[13px] text-muted">{picture ? 'From your profile' : 'Add a headshot to your profile'}</p></div>
            {picture && <button type="button" onClick={() => setWithHeadshot(v => !v)} className={cx('flex items-center gap-1 text-sm font-medium', withHeadshot ? 'text-green-ink' : 'text-muted')}>{withHeadshot ? <><Icon name="check" className="size-4" /> Attached</> : 'Attach'}</button>}
          </div>
        </Card>
        <input ref={tapeInput} type="file" accept="video/*" capture="user" className="hidden" onChange={pick('tape')} />
        <input ref={cvInput} type="file" accept=".pdf,.doc,.docx,application/pdf" className="hidden" onChange={pick('cv')} />

        {/* Message */}
        <h2 className="mb-3 mt-6 text-[18px]">Message to casting <span className="text-[15px] text-faint">· optional</span></h2>
        <TextArea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything the panel should know — availability, recent credits, a note on the brief…" aria-label="Message to casting" />

        {/* Sign */}
        <h2 className="mb-3 mt-6 text-[18px]">{j.requires_nda ? 'Sign the NDA to apply' : 'Consent'}</h2>
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-tint text-green-ink"><Icon name={j.requires_nda ? 'lock' : 'shield-check'} /></span>
            <div className="flex-1">
              <p className="text-[15px] font-medium">{j.requires_nda ? 'Non-disclosure agreement' : 'Self-tape usage & consent'}</p>
              <p className="text-[13px] text-muted">{j.requires_nda ? 'Read the terms, then sign below.' : 'Your materials are used for this casting only and deleted if you withdraw.'}</p>
            </div>
          </div>
          {j.requires_nda ? (
            <>
              {j.nda_text && <div className="mt-3 max-h-40 overflow-y-auto whitespace-pre-line rounded-xl bg-field p-3 text-[13px] leading-relaxed text-muted">{j.nda_text}</div>}
              <div className="mt-3"><SignaturePad ref={pad} onChange={setInked} /></div>
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>{fullName(me.profile)} · {fmtDate(new Date(), { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {inked && <button type="button" onClick={() => pad.current?.clear()} className="font-medium text-green-ink">Clear</button>}
              </div>
            </>
          ) : (
            <button type="button" onClick={() => setConsent(v => !v)} aria-pressed={consent}
              className={cx('mt-3 flex w-full items-center gap-3 rounded-xl border p-3 text-left text-sm transition', consent ? 'border-green bg-green-tint/60' : 'border-line bg-field')}>
              <span className={cx('flex size-6 items-center justify-center rounded-full border-2', consent ? 'border-green bg-green text-white' : 'border-line')}>{consent && <Icon name="check" className="size-3.5" strokeWidth={2.6} />}</span>
              <span className="flex-1">I agree — signed {fullName(me.profile)}</span>
            </button>
          )}
        </Card>

        {error && <p role="alert" className="mt-4 text-sm text-red">{error}</p>}
        <Button className="mt-6" size="lg" full trailingIcon="arrow-right" onClick={submit} disabled={submitting || uploading !== null}>{submitting ? 'Sending…' : 'Send application'}</Button>
        <p className="mt-3 text-center text-xs text-muted">You’ll get a confirmation and can track it in Castings.</p>
        {j.is_side_hustle && <div className="mt-2 flex justify-center"><Tag>Side hustle · the poster replies by message</Tag></div>}
      </div>
    </>
  )
}

function MaterialRow({ icon, tone, title, sub, done, busy, onAdd }: { icon: string; tone: string; title: string; sub: string; done: boolean; busy: boolean; onAdd: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', tone)}><Icon name={icon} /></span>
      <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{title}</p><p className="truncate text-[13px] text-muted">{sub}</p></div>
      {done ? <button type="button" onClick={onAdd} className="flex items-center gap-1 text-sm font-medium text-green-ink"><Icon name="check" className="size-4" /> Attached</button>
        : <Button size="sm" variant="dark" onClick={onAdd} disabled={busy}>{busy ? '…' : 'Add'}</Button>}
    </div>
  )
}
