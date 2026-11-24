'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'

// Horizontal slider for feature cards: full-bleed scroll-snap track that lines up with the page column,
// square arrow buttons and a progress line (same controls as the roles carousel).
const GUTTER = 'max(24px, calc((100% - 1248px) / 2 + 24px))'

export default function CardSlider({ children, label }: { children: React.ReactNode; label: string }) {
  const track = useRef<HTMLUListElement>(null)
  const [pos, setPos] = useState({ at: 0, start: true, end: false })
  useEffect(() => {
    const t = track.current
    if (!t) return
    const on = () => {
      const max = t.scrollWidth - t.clientWidth
      setPos({ at: max > 0 ? t.scrollLeft / max : 0, start: t.scrollLeft < 8, end: t.scrollLeft > max - 8 })
    }
    on(); t.addEventListener('scroll', on, { passive: true }); window.addEventListener('resize', on)
    return () => { t.removeEventListener('scroll', on); window.removeEventListener('resize', on) }
  }, [])
  const go = (dir: number) => track.current?.scrollBy({ left: dir * Math.min(track.current.clientWidth * 0.8, 760), behavior: 'smooth' })
  const arrow = (dir: number, disabled: boolean) => (
    <button type="button" aria-label={dir < 0 ? 'Previous' : 'Next'} onClick={() => go(dir)} disabled={disabled}
      className="inline-flex size-12 items-center justify-center rounded-[14px] border border-line-strong bg-bg text-ink transition-colors duration-300 hover:border-forest hover:bg-forest hover:text-lime disabled:pointer-events-none disabled:opacity-35">
      <Icon name={dir < 0 ? 'arrow-left' : 'arrow-right'} strokeWidth={2} className="size-5" />
    </button>
  )
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2">
      <ul ref={track} aria-label={label} style={{ paddingLeft: GUTTER, paddingRight: GUTTER, scrollPaddingLeft: GUTTER }}
        className="scrollbar-none flex snap-x snap-mandatory items-start gap-6 overflow-x-auto pb-2 lg:gap-8 [&>li]:w-[300px] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-[340px]">
        {children}
      </ul>
      <div className="mx-auto mt-6 flex max-w-[1248px] items-center gap-6 px-6">
        <div className="flex gap-2">{arrow(-1, pos.start)}{arrow(1, pos.end)}</div>
        <div className="relative h-px flex-1 bg-line-strong">
          <span className={cx('absolute inset-y-0 left-0 bg-forest transition-[width] duration-300')} style={{ width: Math.max(12, pos.at * 100) + '%', height: 2, top: -0.5 }} />
        </div>
      </div>
    </div>
  )
}
