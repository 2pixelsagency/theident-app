// Client-side media prep: shrink photos before upload, and trim / compress / grab a cover frame
// from videos in the browser so uploads stay under the storage limit and load fast on set wifi.

export const REEL_BUCKET_MAX = 50 * 1024 * 1024 // storage.buckets.reels file_size_limit
const VIDEO_TARGET = 46 * 1024 * 1024 // just under the 50MB bucket limit
// Quality floor: never below 720p at ~1.2 Mbps (crisp for faces and movement). Clips that can't fit at
// that quality are asked to trim rather than being blurred.
export const MIN_VIDEO_BITS = 1_200_000
export const maxCrispSeconds = () => Math.floor((VIDEO_TARGET * 8) / (MIN_VIDEO_BITS + 128_000))

const baseType = (t: string) => t.split(';')[0]
const extFor = (t: string) => (baseType(t) === 'video/webm' ? 'webm' : baseType(t) === 'video/quicktime' ? 'mov' : baseType(t) === 'image/webp' ? 'webp' : baseType(t) === 'image/png' ? 'png' : baseType(t).startsWith('video') ? 'mp4' : 'jpg')
export const fileExt = (f: Blob) => extFor(f.type)

function canvasBlob(c: HTMLCanvasElement, type: string, q: number) {
  return new Promise<Blob | null>(res => c.toBlob(res, type, q))
}

// Photos: longest side ≤ maxDim, JPEG ~0.85, EXIF rotation applied. Keeps the original if that's smaller
// or the browser can't decode it (e.g. HEIC on desktop Chrome — Supabase still stores it fine).
export async function compressImage(file: File, { maxDim = 2000, quality = 0.85 } = {}): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff' // flatten transparent PNGs onto white rather than black
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(bmp, 0, 0, c.width, c.height)
    bmp.close()
    const blob = await canvasBlob(c, 'image/jpeg', quality)
    if (!blob || (blob.size >= file.size && scale === 1)) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}

export function loadVideo(src: string) {
  return new Promise<HTMLVideoElement>((resolve, reject) => {
    const v = document.createElement('video')
    v.crossOrigin = 'anonymous'
    v.preload = 'auto'; v.muted = true; v.playsInline = true
    v.onloadedmetadata = () => resolve(v)
    v.onerror = () => reject(new Error('This video can’t be read in the browser'))
    v.src = src
  })
}

export function seek(v: HTMLVideoElement, t: number) {
  return new Promise<void>(res => {
    if (Math.abs(v.currentTime - t) < 0.01 && v.readyState >= 2) { res(); return }
    const done = () => { v.removeEventListener('seeked', done); res() }
    v.addEventListener('seeked', done)
    v.currentTime = t
  })
}

// One frame as a JPEG (the cover). Max 1280px wide.
export async function frameAt(v: HTMLVideoElement, t: number): Promise<Blob | null> {
  await seek(v, Math.max(0, Math.min(t, (v.duration || t) - 0.05)))
  const scale = Math.min(1, 1280 / (v.videoWidth || 1280))
  const c = document.createElement('canvas')
  c.width = Math.round((v.videoWidth || 1280) * scale); c.height = Math.round((v.videoHeight || 720) * scale)
  c.getContext('2d')!.drawImage(v, 0, 0, c.width, c.height)
  try { return await canvasBlob(c, 'image/jpeg', 0.82) } catch { return null } // tainted canvas (no CORS)
}

export function recorderType() {
  if (typeof MediaRecorder === 'undefined' || !HTMLCanvasElement.prototype.captureStream) return null
  for (const t of ['video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'])
    if (MediaRecorder.isTypeSupported(t)) return t
  return null
}

export function needsTranscode(file: File, v: HTMLVideoElement, start: number, end: number) {
  const trimmed = start > 0.25 || end < v.duration - 0.25
  return trimmed || file.size > VIDEO_TARGET || Math.min(v.videoWidth, v.videoHeight) > 1080 || !/^video\/(mp4|webm|quicktime)$/.test(file.type)
}

// Re-encode [start, end] at ≤720p by playing it into a canvas recorder. Runs in real time, so a 60s clip
// takes ~60s; onProgress gets 0–1. Bitrate is picked so the result lands under the bucket limit.
export async function transcode(src: string, start: number, end: number, onProgress?: (p: number) => void, signal?: AbortSignal, squeeze = 1): Promise<File> {
  const type = recorderType()
  if (!type) throw new Error('unsupported')
  const v = await loadVideo(src)
  v.muted = false; v.volume = 1
  const len = Math.max(0.5, end - start)
  // Bitrate that lands the whole clip under the target; long clips drop to 480p / 360p so they still look clean
  const audioBits = 128_000
  const videoBits = Math.max(MIN_VIDEO_BITS, Math.min(6_000_000, Math.floor(((VIDEO_TARGET * 8) / len - audioBits) * squeeze)))
  // 1080p when there's room for it, otherwise 720p — never lower
  const maxShort = videoBits >= 3_500_000 ? 1080 : 720
  const scale = Math.min(1, maxShort / Math.min(v.videoWidth || maxShort, v.videoHeight || maxShort))
  const c = document.createElement('canvas')
  c.width = Math.round((v.videoWidth || 1280) * scale / 2) * 2; c.height = Math.round((v.videoHeight || 720) * scale / 2) * 2
  const ctx = c.getContext('2d')!
  const stream = c.captureStream(30)

  // Audio via WebAudio (works on iOS Safari, where video.captureStream doesn't exist)
  let audio: AudioContext | null = null
  try {
    audio = new AudioContext()
    const dest = audio.createMediaStreamDestination()
    audio.createMediaElementSource(v).connect(dest)
    dest.stream.getAudioTracks().forEach(t => stream.addTrack(t))
  } catch { /* silent clip or no WebAudio — video only */ }

  const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: videoBits, audioBitsPerSecond: audioBits })
  const chunks: Blob[] = []
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }

  await seek(v, start)
  return new Promise<File>((resolve, reject) => {
    let raf = 0
    const stop = () => { cancelAnimationFrame(raf); v.pause(); if (rec.state !== 'inactive') rec.stop() }
    signal?.addEventListener('abort', () => { stop(); reject(new DOMException('Cancelled', 'AbortError')) })
    rec.onstop = () => {
      audio?.close().catch(() => {})
      v.removeAttribute('src'); v.load()
      if (signal?.aborted) return
      const blob = new Blob(chunks, { type: baseType(type) })
      resolve(new File([blob], 'reel.' + extFor(type), { type: baseType(type) }))
    }
    const draw = () => {
      ctx.drawImage(v, 0, 0, c.width, c.height)
      onProgress?.(Math.min(1, (v.currentTime - start) / len))
      if (v.currentTime >= end || v.ended) { stop(); return }
      raf = requestAnimationFrame(draw)
    }
    rec.start(1000)
    audio?.resume().catch(() => {})
    v.play().then(() => { raf = requestAnimationFrame(draw) }, err => { stop(); reject(err) })
  })
}

export const fmtSecs = (s: number) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0')
