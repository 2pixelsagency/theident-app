'use client'

import { useId, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'

// Feature card: icon, title and copy always visible; the + opens a bullet list of what's included.
export default function ExpandCard({ icon, tone = 'bg-lime', title, body, points = [], dark }: { icon: string; tone?: string; title: string; body: string; points?: readonly string[]; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <li data-reveal className={cx('flex flex-col rounded-[var(--radius-feature)] p-7 md:p-8', dark ? 'bg-forest text-bg' : 'bg-sand text-ink')}>
      <div className="flex items-center justify-between gap-4">
        <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full', tone)}><Icon name={icon} strokeWidth={2} className="size-5 text-forest" /></span>
        {points.length > 0 && (
          <button type="button" aria-expanded={open} aria-controls={id} aria-label={(open ? 'Hide' : 'Show') + ' what’s included: ' + title} onClick={() => setOpen(v => !v)}
            className={cx('flex size-11 shrink-0 items-center justify-center rounded-[14px] border transition-colors duration-300',
              open ? (dark ? 'border-lime bg-lime text-forest' : 'border-forest bg-forest text-lime') : (dark ? 'border-white/20 bg-white/[0.08] hover:bg-white/15' : 'border-line-strong bg-bg hover:border-forest'))}>
            <Icon name="plus" strokeWidth={2.2} className={cx('size-4 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]', open && 'rotate-45')} />
          </button>
        )}
      </div>
      <h3 className="mt-5 font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[24px]">{title}</h3>
      <p className={cx('mt-2 min-h-[calc(1.6em*3)] text-[13px] leading-[1.6]', dark ? 'text-on-dark-muted' : 'text-muted-strong')}>{body}</p>
      {points.length > 0 && (
        <div id={id} role="region" aria-label={'What’s included: ' + title} className={cx('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="overflow-hidden">
            <ul className={cx('mt-5 flex flex-col gap-2.5 border-t pt-5', dark ? 'border-white/10' : 'border-line-strong/70')}>
              {points.map((pt, i) => (
                <li key={pt} style={{ transitionDelay: open ? 120 + i * 60 + 'ms' : '0ms' }}
                  className={cx('flex items-start gap-2.5 text-[13px] leading-snug transition-[opacity,translate] duration-500', open ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0')}>
                  <span className={cx('mt-px flex size-[18px] shrink-0 items-center justify-center rounded-full', dark ? 'bg-lime text-forest' : 'bg-forest text-bg')}>
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
                  </span>
                  {pt}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </li>
  )
}
