'use client'

import { forwardRef, useImperativeHandle, useRef, useState } from 'react'

export type SignaturePadHandle = { toBlob: () => Promise<Blob | null>; clear: () => void; isEmpty: () => boolean }

// Finger/mouse signature on a dashed pad. Ink uses the --ink token.
const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (signed: boolean) => void; hint?: string }>(function SignaturePad({ onChange, hint = 'Sign with your finger' }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [signed, setSigned] = useState(false)

  const point = (e: React.PointerEvent) => {
    const c = canvas.current!
    const r = c.getBoundingClientRect()
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) }
  }

  const start = (e: React.PointerEvent) => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    canvas.current!.setPointerCapture(e.pointerId)
    const { x, y } = point(e)
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || 'black'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!signed) { setSigned(true); onChange?.(true) }
  }

  const end = () => { drawing.current = false }

  useImperativeHandle(ref, () => ({
    toBlob: () => new Promise(resolve => canvas.current ? canvas.current.toBlob(resolve, 'image/png') : resolve(null)),
    clear: () => {
      const c = canvas.current
      c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
      setSigned(false)
      onChange?.(false)
    },
    isEmpty: () => !signed,
  }), [signed, onChange])

  return (
    <div className="upload relative">
      <canvas ref={canvas} width={640} height={200} aria-label="Signature pad"
        onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
        className="block h-[110px] w-full cursor-crosshair touch-none" />
      <span className="pointer-events-none absolute inset-x-10 bottom-7 border-t border-line" />
      {!signed && <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs text-faint">{hint}</span>}
    </div>
  )
})

export default SignaturePad
