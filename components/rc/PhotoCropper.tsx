'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Sheet } from './ui'

// Crop a profile photo: drag to position, pinch / slider / scroll to zoom, then save a square JPEG.
// Shown in a square frame with a circle guide (avatars appear round in some places, square in others).
const OUT = 1000

export default function PhotoCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (cropped: File) => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 }) // offset in frame pixels
  const [busy, setBusy] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const pinch = useRef<{ d: number; z: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())

  const [frameSize, setFrameSize] = useState(300)

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const i = new Image()
    i.onload = () => { setSrc(url); setImg(i); setZoom(1); setPos({ x: 0, y: 0 }) }
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Track the frame's rendered width (it shrinks on small phones)
  useEffect(() => {
    const el = frame.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrameSize(el.clientWidth || 300))
    ro.observe(el)
    return () => ro.disconnect()
  }, [img])

  const size = () => frameSize
  // Image drawn to "cover" the frame at zoom 1
  const dims = () => {
    if (!img) return { w: 0, h: 0 }
    const s = size(), base = Math.max(s / img.width, s / img.height)
    return { w: img.width * base * zoom, h: img.height * base * zoom }
  }
  // Keep the photo covering the frame (no empty edges)
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    if (!img) return p
    const s = size(), base = Math.max(s / img.width, s / img.height)
    const mx = Math.max(0, (img.width * base * z - s) / 2), my = Math.max(0, (img.height * base * z - s) / 2)
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) }
  }
  const setZ = (z: number) => { const nz = Math.min(4, Math.max(1, z)); setZoom(nz); setPos(p => clamp(p, nz)) }

  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; drag.current = null
    } else drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
  }
  const move = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      setZ(pinch.current.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d))
    } else if (drag.current) {
      setPos(clamp({ x: drag.current.px + e.clientX - drag.current.x, y: drag.current.py + e.clientY - drag.current.y }))
    }
  }
  const up = (e: React.PointerEvent) => { pointers.current.delete(e.pointerId); if (pointers.current.size < 2) pinch.current = null; if (!pointers.current.size) drag.current = null }

  const save = async () => {
    if (!img || !file) return
    setBusy(true)
    const s = size(), { w, h } = dims()
    // Frame → source pixels
    const left = (s - w) / 2 + pos.x, top = (s - h) / 2 + pos.y, scale = img.width / w
    const c = document.createElement('canvas'); c.width = OUT; c.height = OUT
    const ctx = c.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, -left * scale, -top * scale, s * scale, s * scale, 0, 0, OUT, OUT)
    const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.9))
    setBusy(false)
    if (blob) onDone(new File([blob], 'photo.jpg', { type: 'image/jpeg' }))
  }

  const { w, h } = dims()
  return (
    <Sheet open={!!file} onClose={onCancel} title="Position your photo">
      <div className="space-y-4">
        <div ref={frame} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onWheel={e => setZ(zoom - e.deltaY * 0.002)}
          className="relative mx-auto aspect-square w-full max-w-[340px] touch-none select-none overflow-hidden rounded-[20px] bg-dark">
          {src && img && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="" draggable={false} className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{ width: w, height: h, transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }} />
          )}
          {/* circle guide */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="absolute inset-[6%] rounded-full ring-2 ring-white/80 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
          </div>
        </div>
        <label className="flex items-center gap-3">
          <span className="text-[13px] font-medium text-muted">Zoom</span>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={e => setZ(+e.target.value)} aria-label="Zoom" className="flex-1 accent-[var(--forest)]" />
        </label>
        <p className="text-center text-[12px] text-muted">Drag to move · pinch or use the slider to zoom</p>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy || !img}>{busy ? 'Saving…' : 'Use photo'}</Button>
        </div>
      </div>
    </Sheet>
  )
}
