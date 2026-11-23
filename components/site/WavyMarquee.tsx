'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// React port of Osmo's "Wavy Marquee" (originally GSAP + Observer + ScrollTrigger), same settings and maths:
// items ride a sine wave, the loop auto-scrolls, scrolling the page speeds it up / flips it, dragging flings it.
const AUTO_SPEED = 100 // px per second
const VIEWPORT: [number, number, number][] = [[992, 1, 1], [768, 0.75, 1], [480, 0.6, 0.75], [0, 0.5, 0.75]] // min width, speed ×, wave scale
const SCROLL_SPEED = 0.0075
const DRAG_SPEED = 0.5
const MAX_DRAG_SPEED = 75
const DRAG_EASE = 0.1
const WAVE_Y = 0.25
const WAVE_BOOST = 0.01
const ITEMS_PER_WAVE = 10
const WAVE_TRAVEL = 0.25
const TAU = Math.PI * 2

const viewportFor = (w: number) => (VIEWPORT.find(([min]) => w >= min) || VIEWPORT[VIEWPORT.length - 1]).slice(1) as [number, number]
const wrap = (min: number, max: number, v: number) => { const r = max - min; return ((((v - min) % r) + r) % r) + min }

export default function WavyMarquee<T>({ items, render, flipped, flat, arc = 0, speedFactor = 1, className = '' }: { items: T[]; render: (item: T, i: number) => React.ReactNode; flipped?: boolean; flat?: boolean; arc?: number; speedFactor?: number; className?: string }) {
  const container = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [batches, setBatches] = useState(2)

  // Enough copies to cover the container twice over (measured after the first paint)
  useLayoutEffect(() => {
    const c = container.current, l = list.current
    if (!c || !l || !items.length) return
    const els = l.children as HTMLCollectionOf<HTMLElement>
    if (els.length < items.length * 2) return
    const loop = els[items.length].offsetLeft - els[0].offsetLeft
    const need = Math.max(2, Math.ceil(c.offsetWidth / Math.max(1, loop)) + 1)
    if (need !== batches) setBatches(need)
  }, [items.length, batches])

  useEffect(() => {
    const c = container.current, l = list.current
    if (!c || !l || !items.length) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const baseDir = flipped ? 1 : -1
    let [speedScale, waveScale] = viewportFor(window.innerWidth)
    let els: HTMLElement[] = [], xs: number[] = [], ws: number[] = [], hs: number[] = []
    let loopWidth = 0, waveLength = 0, avgWidth = 1
    let travel = 0, speed = 1, target = 1, dir = baseDir
    let active = true, dragging = false, raf = 0, last = performance.now(), hover = false, ease = 1

    const measure = () => {
      els = Array.from(l.children) as HTMLElement[]
      if (els.length < items.length * 2) return
      loopWidth = els[items.length].offsetLeft - els[0].offsetLeft
      avgWidth = els.slice(0, items.length).reduce((s, e) => s + e.offsetWidth, 0) / items.length
      waveLength = Math.max(c.offsetWidth, avgWidth * ITEMS_PER_WAVE) * waveScale
      xs = els.map(e => e.offsetLeft); ws = els.map(e => e.offsetWidth); hs = els.map(e => e.offsetHeight)
    }
    const draw = () => {
      if (!loopWidth || !waveLength) return
      const x = wrap(-loopWidth, 0, travel)
      const amp = flat ? 0 : WAVE_Y + (speed - 1) * WAVE_BOOST
      const phaseTravel = travel / waveLength * TAU * WAVE_TRAVEL
      const cw = c.offsetWidth
      l.style.transform = `translate3d(${x}px,0,0)`
      if (!amp && !arc) return
      for (let i = 0; i < els.length; i++) {
        const ix = xs[i] + x
        if (ix + ws[i] < 0 || ix > cw) continue
        if (arc) {
          // Gentle curve: cards drop and tilt slightly towards the edges
          const d = Math.max(-1.2, Math.min(1.2, (ix + ws[i] / 2 - cw / 2) / (cw / 2)))
          els[i].style.transform = `translate3d(0,${d * d * arc}px,0) rotate(${d * 2.5}deg)`
        } else els[i].style.transform = `translate3d(0,${Math.sin(ix / waveLength * TAU + phaseTravel) * hs[i] * amp}px,0)`
      }
    }
    const tick = (now: number) => {
      const dt = Math.min(64, now - last); last = now
      if (active && loopWidth) {
        speed += ((target !== 1 ? target : 1) - speed) * DRAG_EASE
        if (target !== 1) target += (1 - target) * DRAG_EASE
        // Glide almost to a stop while hovered so cards are easy to open
        ease += ((hover && !dragging ? 0.08 : 1) - ease) * 0.06
        travel += AUTO_SPEED * speedFactor * ease * speedScale * speed * dir * dt / 1000
        draw()
      }
      raf = requestAnimationFrame(tick)
    }
    measure(); draw()
    if (reduce) return

    // In view only
    const io = new IntersectionObserver(([e]) => { active = e.isIntersecting }, { rootMargin: '200px 0px' })
    io.observe(c)

    // Page scroll speeds it up; scroll direction sets the travel direction
    let lastY = window.scrollY, lastT = performance.now()
    const onScroll = () => {
      const t = performance.now(), y = window.scrollY
      const v = (y - lastY) / Math.max(1, t - lastT) * 1000
      lastY = y; lastT = t
      if (dragging || !v) return
      dir = v > 0 ? -baseDir : baseDir
      speed = 1 + Math.abs(v) * SCROLL_SPEED
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    // Drag / swipe to fling (horizontal only; vertical swipes still scroll the page)
    let startX = 0, startY = 0, prevX = 0, axis: 'x' | 'y' | null = null, down = false, moved = false
    const onDown = (e: PointerEvent) => { down = true; moved = false; axis = null; startX = prevX = e.clientX; startY = e.clientY }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      if (!axis) { const dx = Math.abs(e.clientX - startX), dy = Math.abs(e.clientY - startY); if (dx + dy < 6) return; axis = dx > dy ? 'x' : 'y' }
      if (axis !== 'x') return
      moved = true
      const d = e.clientX - prevX; prevX = e.clientX
      if (!d) return
      dragging = true; c.style.cursor = 'grabbing'
      dir = d > 0 ? 1 : -1
      target = Math.min(1 + Math.abs(d) / avgWidth * 100 * DRAG_SPEED, MAX_DRAG_SPEED)
    }
    const onUp = () => { down = false; dragging = false; c.style.cursor = 'grab' }
    // Swallow the click that ends a drag so cards (links) only open on a real tap
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }
    c.addEventListener('click', onClick, true)
    const onEnter = (e: PointerEvent) => { if (e.pointerType === 'mouse') hover = true }
    const onLeave = () => { hover = false }
    c.addEventListener('pointerenter', onEnter); c.addEventListener('pointerleave', onLeave)
    c.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)

    // Rebuild on width changes only
    let lastW = window.innerWidth, rt = 0
    const onResize = () => { clearTimeout(rt); rt = window.setTimeout(() => { if (window.innerWidth === lastW) return; lastW = window.innerWidth; [speedScale, waveScale] = viewportFor(lastW); measure(); draw() }, 150) }
    window.addEventListener('resize', onResize)

    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf); io.disconnect(); clearTimeout(rt)
      window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize)
      c.removeEventListener('pointerenter', onEnter); c.removeEventListener('pointerleave', onLeave)
      c.removeEventListener('pointerdown', onDown); c.removeEventListener('click', onClick, true); window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp)
    }
  }, [items.length, batches, flipped, flat, arc, speedFactor])

  return (
    <div ref={container} className={'relative w-full cursor-grab select-none ' + className}>
      <div ref={list} className="relative flex w-max touch-pan-y items-center gap-[clamp(.75em,1.125vw,2.25em)] will-change-transform">
        {Array.from({ length: batches }).flatMap((_, b) => items.map((it, i) => (
          <div key={b + '-' + i} aria-hidden={b > 0 || undefined} className="relative flex-none will-change-transform">{render(it, i)}</div>
        )))}
      </div>
    </div>
  )
}
