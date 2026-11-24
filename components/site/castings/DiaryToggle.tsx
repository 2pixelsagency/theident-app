'use client'

import { useState } from 'react'
import { cx } from './parts'

// A real, working switch so the demo diary isn't a dead control
export default function DiaryToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial)
  return (
    <div className="flex items-center justify-between gap-2">
      <span id="open-to-tours" className="text-[14px] font-medium">Open to tours</span>
      <button type="button" role="switch" aria-checked={on} aria-labelledby="open-to-tours" onClick={() => setOn(v => !v)}
        className={cx('flex h-7 w-12 rounded-full p-[3px] transition-colors duration-300', on ? 'justify-end bg-forest' : 'justify-start bg-line-strong')}>
        <span className={cx('size-[22px] rounded-full transition-colors', on ? 'bg-lime' : 'bg-surface')} />
      </button>
    </div>
  )
}
