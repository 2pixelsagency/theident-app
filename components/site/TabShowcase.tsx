'use client'

import { useEffect, useId, useState } from 'react'
import { cx } from './castings/parts'

// Calendly-style tabbed showcase: step tabs on the left, a framed app screen on a tinted panel on the right.
// On every tab change the panel colour cross-fades, the stripes slide in, the card rises and its rows
// (.hiw-item) stagger in. Autoplays (pauses on hover/focus, stops once someone picks a tab, off for
// reduced motion). Widgets are passed in as elements, so pages can supply their own screens.
export type ShowcaseStep = { title: string; body: string; badge: string; panel: string; widget: React.ReactNode }

const AUTOPLAY_MS = 6000

export default function TabShowcase({ steps, label, start = 0 }: { steps: ShowcaseStep[]; label: string; start?: number }) {
  const uid = useId()
  const [step, setStep] = useState(start)
  const [auto, setAuto] = useState(false)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(true)
  }, [])
  useEffect(() => {
    if (!auto || paused) return
    const t = setTimeout(() => setStep(v => (v + 1) % steps.length), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [auto, paused, step, steps.length])
  const pick = (i: number) => { setAuto(false); setStep(i) }
  const tabId = (i: number) => uid + '-tab-' + i
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      className="grid gap-6 rounded-[var(--radius-feature)] bg-sand p-3 md:p-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
      <div role="tablist" aria-label={label} className="flex flex-col gap-2 p-1 md:p-2">
        {steps.map((s, i) => {
          const on = step === i
          return (
            <button key={s.title} type="button" role="tab" id={tabId(i)} aria-selected={on} aria-controls={uid + '-panel'} onClick={() => pick(i)}
              className={cx('group/tab relative flex gap-4 overflow-hidden rounded-[22px] p-4 text-left transition-[background-color,box-shadow,translate] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:p-5',
                on ? 'bg-surface shadow-[0_16px_32px_-24px_rgb(21_33_28/0.35)]' : 'hover:translate-x-1 hover:bg-white/50')}>
              <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold transition-[background-color,color,rotate,scale] duration-500',
                on ? s.badge + ' scale-110' : 'bg-sand-2 text-muted-strong group-hover/tab:-rotate-[8deg]')}>{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block font-display text-[20px] font-bold leading-tight tracking-[-0.02em]">{s.title}</span>
                <span className={cx('grid transition-[grid-template-rows] duration-500', on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <span className="overflow-hidden"><span className="block pt-1.5 text-[13px] leading-[1.6] text-muted-strong">{s.body}</span></span>
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <div id={uid + '-panel'} role="tabpanel" aria-labelledby={tabId(step)} className="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden rounded-[24px] p-4 sm:p-8">
        {steps.map((s, i) => (
          <div key={s.title} aria-hidden="true" className={cx('absolute inset-0 -z-10 transition-[opacity,scale] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]', step === i ? 'scale-100 opacity-100' : 'scale-110 opacity-0')}
            style={{ backgroundImage: s.panel }} />
        ))}
        <div key={'stripes' + step} aria-hidden="true" className="hiw-stripes absolute inset-x-0 top-[38%] h-[124px]"
          style={{ backgroundImage: steps[step].panel.includes('forest') ? 'var(--stripes-dark)' : 'var(--stripes-light)' }} />
        <div key={step} className="hiw-frame relative w-full max-w-[680px] rounded-[26px] border border-white/70 bg-white/45 p-2 shadow-[0_30px_60px_-36px_rgb(21_33_28/0.45)]">
          {steps[step].widget}
        </div>
      </div>
    </div>
  )
}
