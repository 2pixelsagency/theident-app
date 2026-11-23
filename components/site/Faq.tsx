'use client'

import { useId, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { cx } from '@/components/rc/ui'

// Accordion with a smooth height animation (grid rows 0fr → 1fr), a fade/slide on the answer and a
// rotating plus. One open at a time. Answers stay in the HTML, so search engines still read them.
export default function Faq({ items }: { items: [string, string][] }) {
  const [open, setOpen] = useState<number | null>(null)
  const base = useId()
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map(([q, a], i) => {
        const on = open === i
        const id = base + '-' + i
        return (
          <div key={q} className="group/faq">
            <h3>
              <button type="button" aria-expanded={on} aria-controls={id} onClick={() => setOpen(on ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left text-[20px] font-semibold leading-snug transition-colors hover:text-green-ink md:text-[22px]">
                {q}
                <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full border transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)]',
                  on ? 'rotate-45 border-forest bg-forest text-lime' : 'border-line group-hover/faq:border-forest')}>
                  <Icon name="plus" className="size-4" />
                </span>
              </button>
            </h3>
            <div id={id} role="region" className={cx('grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]', on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
              <div className="overflow-hidden">
                <p className={cx('max-w-[640px] pb-7 text-[16px] leading-relaxed text-muted transition-all duration-500 ease-out', on ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0')}>{a}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
