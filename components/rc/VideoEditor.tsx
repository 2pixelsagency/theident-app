'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { REEL_BUCKET_MAX, fileExt, fmtSecs, frameAt, loadVideo, maxCrispSeconds, needsTranscode, recorderType, seek, transcode } from '@/lib/rc/media'

const stamp = () => Date.now().toString(36)
export type SavedVideo = { url?: string; poster_url: string | null; duration_s: number }

// Trim + cover frame for a new upload (source = File), or cover frame only for an existing clip (source = URL).
// Long or large clips are re-encoded to ≤720p in the browser so they fit the 50MB reel limit.
export default function VideoEditor({ uid, source, onDone, onCancel }: {
  uid: string; source: File | string; onDone: (v: SavedVideo) => void; onCancel: () => void
}) {
  const coverOnly = typeof source === 'string'
  const [src] = useState(() => (typeof source === 'string' ? source : URL.createObjectURL(source)))
  const preview = useRef<HTMLVideoElement>(null)
  const grabber = useRef<HTMLVideoElement | null>(null)
  const [duration, setDuration] = useState(0)
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [cover, setCover] = useState(0)
  const [stage, setStage] = useState<'loading' | 'ready' | 'encoding' | 'uploading' | 'error'>('loading')
  const [progress, setProgress] = useState(0)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    let live = true
    loadVideo(src).then(v => {
      if (!live) return
      grabber.current = v
      const d = Number.isFinite(v.duration) ? v.duration : 0
      setDuration(d); setEnd(d); setCover(Math.min(1, d / 3)); setStage('ready')
    }, () => live && setStage('error'))
    const ctl = abort
    return () => { live = false; ctl.current?.abort() } // blob URL is freed with the page; revoking here breaks StrictMode remounts
  }, [src])

  // Scrub the preview to whatever handle is being dragged
  const show = (t: number) => { if (preview.current) preview.current.currentTime = t }

  const save = async () => {
    const v = grabber.current
    if (!v) return
    const len = end - start
    if (len < 1) { toast('Keep at least a second of video'); return }
    let posterUrl: string | null = null
    try {
      setStage('uploading')
      const frame = await frameAt(v, cover)
      if (frame) {
        const path = uid + '/poster-' + stamp() + '.jpg'
        const { error } = await supabase.storage.from('headshots').upload(path, frame, { contentType: 'image/jpeg' })
        if (!error) posterUrl = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
      }
      if (coverOnly) {
        if (!posterUrl) throw new Error('cover')
        onDone({ poster_url: posterUrl, duration_s: Math.round(duration) })
        return
      }

      let file = source as File
      // Too long to fit at full quality? Ask for a trim instead of blurring it
      if (needsTranscode(file, v, start, end) && len > maxCrispSeconds() && file.size > REEL_BUCKET_MAX) {
        setStage('ready'); toast('To keep it crisp, trim this to under ' + fmtSecs(maxCrispSeconds()) + ' — drag the handles to your best moments'); return
      }
      if (needsTranscode(file, v, start, end)) {
        if (!recorderType()) {
          if (file.size > REEL_BUCKET_MAX || start > 0.25 || end < duration - 0.25) { setStage('ready'); toast('This browser can’t trim or compress video — try Chrome, or upload a clip under 50MB'); return }
        } else {
          setStage('encoding'); setProgress(0)
          abort.current = new AbortController()
          file = await transcode(src, start, end, setProgress, abort.current.signal)
          // Some browsers overshoot the bitrate: one more, tighter pass instead of giving up
          if (file.size > REEL_BUCKET_MAX) { setProgress(0); file = await transcode(src, start, end, setProgress, abort.current.signal, 0.8) }
          setStage('uploading')
        }
      }
      if (file.size > REEL_BUCKET_MAX) { setStage('ready'); toast('This clip is too long to fit — trim it to the best few minutes'); return }
      const path = uid + '/reel-' + stamp() + '.' + fileExt(file)
      const { error } = await supabase.storage.from('reels').upload(path, file, { contentType: file.type })
      if (error) throw error
      onDone({ url: supabase.storage.from('reels').getPublicUrl(path).data.publicUrl, poster_url: posterUrl, duration_s: Math.round(len) })
    } catch (e) {
      if ((e as Error).name === 'AbortError') { setStage('ready'); return }
      setStage('ready')
      toast(coverOnly ? 'Couldn’t grab a frame from this clip' : 'Upload failed — try again')
    }
  }

  if (stage === 'error') return (
    <div className="space-y-3">
      <p className="rounded-xl bg-field p-4 text-sm text-muted">This video can’t be opened in the browser (some phone formats can’t be). {coverOnly ? '' : 'Export it as MP4 and try again.'}</p>
      <Button full variant="outline" onClick={onCancel}>Back</Button>
    </div>
  )

  const busy = stage === 'encoding' || stage === 'uploading' || stage === 'loading'
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[var(--radius)] bg-dark">
        <video ref={preview} src={src} muted playsInline preload="auto" crossOrigin="anonymous" className="aspect-video w-full object-contain" />
        {stage === 'loading' && <span className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Loading video…</span>}
      </div>

      {!coverOnly && (
        <fieldset disabled={busy} className="space-y-2">
          <legend className="flex w-full justify-between text-[13px] font-medium"><span>Trim</span><span className="text-muted">{fmtSecs(start)} – {fmtSecs(end)} · {fmtSecs(Math.max(0, end - start))}</span></legend>
          <label className="block text-xs text-muted">Start
            <input type="range" min={0} max={duration} step={0.1} value={start} aria-label="Trim start" className="w-full accent-[var(--forest)]"
              onChange={e => { const t = Math.min(+e.target.value, end - 1); setStart(t); if (cover < t) setCover(t); show(t) }} />
          </label>
          <label className="block text-xs text-muted">End
            <input type="range" min={0} max={duration} step={0.1} value={end} aria-label="Trim end" className="w-full accent-[var(--forest)]"
              onChange={e => { const t = Math.max(+e.target.value, start + 1); setEnd(t); if (cover > t) setCover(t); show(t) }} />
          </label>
        </fieldset>
      )}

      <fieldset disabled={busy}>
        <legend className="flex w-full justify-between text-[13px] font-medium"><span>Cover frame</span><span className="text-muted">{fmtSecs(cover)}</span></legend>
        <input type="range" min={coverOnly ? 0 : start} max={coverOnly ? duration : end} step={0.1} value={cover} aria-label="Cover frame" className="w-full accent-[var(--forest)]"
          onChange={e => { setCover(+e.target.value); show(+e.target.value) }} onPointerUp={() => grabber.current && seek(grabber.current, cover)} />
        <p className="text-xs text-muted">This still shows on your profile before someone presses play.</p>
      </fieldset>

      {stage === 'encoding' && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-chip"><div className="h-full bg-forest transition-[width]" style={{ width: Math.round(progress * 100) + '%' }} /></div>
          <p className="mt-1.5 text-xs text-muted">Optimising your video… {Math.round(progress * 100)}% — keep this screen open. It plays through once, so a 2-minute clip takes about 2 minutes.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => (stage === 'encoding' ? abort.current?.abort() : onCancel())} disabled={stage === 'uploading'}>Cancel</Button>
        <Button onClick={save} disabled={busy}>{stage === 'uploading' ? 'Saving…' : stage === 'encoding' ? 'Optimising…' : coverOnly ? 'Save cover' : 'Save clip'}</Button>
      </div>
    </div>
  )
}
