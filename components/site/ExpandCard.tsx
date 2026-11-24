'use client'

import { useId, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'

// Feature card that shows the icon and title; the + opens the detail (smooth grid-rows height animation).
export default function ExpandCard({ icon, tone = 'bg-lime', title, body, dark }: { icon: string; tone?: string; title: string; body: string; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <li data-reveal className={cx('rounded-[var(--radius-feature)] p-6 md:p-7', dark ? 'bg-forest text-bg' : 'bg-sand text-ink')}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)} className="flex w-full items-center gap-4 text-left">
        <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full', tone)}><Icon name={icon} strokeWidth={2} className="size-5 text-forest" /></span>
        <h3 className="min-w-0 flex-1 font-display text-[20px] font-bold leading-[1.15] tracking-[-0.02em] md:text-[22px]">{title}</h3>
        <span className={cx('flex size-11 shrink-0 items-center justify-center rounded-[14px] border transition-colors duration-300',
          open ? (dark ? 'border-lime bg-lime text-forest' : 'border-forest bg-forest text-lime') : (dark ? 'border-white/20 bg-white/[0.08]' : 'border-line-strong bg-bg'))}>
          <Icon name="plus" strokeWidth={2.2} className={cx('size-4 transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]', open && 'rotate-45')} />
        </span>
      </button>
      <div id={id} role="region" className={cx('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className={cx('pt-4 text-[13px] leading-[1.6] transition-[opacity,translate] duration-500', open ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0', dark ? 'text-on-dark-muted' : 'text-muted-strong')}>{body}</p>
        </div>
      </div>
    </li>
  )
}
