'use client'

import { useRef, useState } from 'react'
import Icon from './Icon'
import { cx } from './ui'

export type SwipeAction = { label: string; icon: string; tone: 'green' | 'amber' | 'neutral'; run: () => void }

const TONE = { green: 'bg-green text-white', amber: 'bg-amber text-white', neutral: 'bg-dark text-white' }
const THRESHOLD = 96

// Email-style swipe: drag right to reveal `right` (e.g. Save), left to reveal `left` (e.g. Later).
// Only horizontal drags are taken over, so the page still scrolls normally; a swipe never counts as a tap.
export default function SwipeRow({ right, left, children, className }: { right: SwipeAction; left: SwipeAction; children: React.ReactNode; className?: string }) {
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const start = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null)
  const moved = useRef(false)
  const armed = useRef(false)
  const rowRef = useRef<HTMLDivElement>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    start.current = { x: e.clientX, y: e.clientY, axis: null }
    moved.current = false
    armed.current = false
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current
    if (!s) return
    const ddx = e.clientX - s.x, ddy = e.clientY - s.y
    if (!s.axis) {
      if (Math.abs(ddx) > 8 && Math.abs(ddx) > Math.abs(ddy) * 1.2) { s.axis = 'x'; setDragging(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) }
      else if (Math.abs(ddy) > 8) { start.current = null; return }
      else return
    }
    moved.current = true
    // resist past the threshold so it feels like a rubber band
    const over = Math.max(0, Math.abs(ddx) - THRESHOLD)
    const next = Math.sign(ddx) * (Math.min(Math.abs(ddx), THRESHOLD) + over * 0.35)
    const isArmed = Math.abs(ddx) >= THRESHOLD
    if (isArmed !== armed.current) { armed.current = isArmed; if (isArmed) navigator.vibrate?.(8) }
    setDx(next)
  }

  const finish = () => {
    const s = start.current
    start.current = null
    setDragging(false)
    if (!s || s.axis !== 'x') return
    if (Math.abs(dx) >= THRESHOLD) {
      const action = dx > 0 ? right : left
      const w = rowRef.current?.offsetWidth || 400
      setDx(Math.sign(dx) * w) // slide off, then act and settle back
      setTimeout(() => { action.run(); setDx(0) }, 180)
    } else setDx(0)
  }

  const showing = dx > 0 ? right : left
  const progress = Math.min(1, Math.abs(dx) / THRESHOLD)

  return (
    <li className={cx('relative list-none', className)}>
      {dx !== 0 && (
        <div aria-hidden="true" className={cx('absolute inset-0 flex items-center rounded-[var(--radius)] px-6', TONE[showing.tone], dx > 0 ? 'justify-start' : 'justify-end')} style={{ opacity: 0.35 + progress * 0.65 }}>
          <span className="flex flex-col items-center gap-1 text-[13px] font-medium" style={{ transform: `scale(${0.85 + progress * 0.15})` }}>
            <Icon name={showing.icon} className="size-6" />{showing.label}
          </span>
        </div>
      )}
      <div
        ref={rowRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onDragStart={e => e.preventDefault()} // links are natively draggable, which would cancel the swipe
        onClickCapture={e => { if (moved.current) { e.preventDefault(); e.stopPropagation(); moved.current = false } }}
        className={cx('relative touch-pan-y select-none', !dragging && 'transition-transform duration-200 ease-out')}
        style={{ transform: `translateX(${dx}px)` }}
      >
        {children}
      </div>
    </li>
  )
}
