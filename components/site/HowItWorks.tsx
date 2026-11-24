'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'
import { PanelBars, PanelBase, type PanelTone } from './PanelArt'

// "Three steps to your next job" as a Calendly-style scheduling component: step tabs on the left,
// a booking-widget card on the right. Step 3 shows the recall casting has set, in calendar form.
// Demo content only (fictional show names).

const STEPS = [
  { n: '01', title: 'Build your Ident', body: 'Headshots, showreel, credits, skills and CV — one profile that casting can trust.', badge: 'bg-mint', tone: 'mint' as PanelTone },
  { n: '02', title: 'Find and apply', body: 'Roles from casting directors and the community, filtered to what fits you. Apply in a tap.', badge: 'bg-butter', tone: 'butter' as PanelTone },
  { n: '03', title: 'Recall, pencil, book', body: 'Your recall lands in your diary with the time, the video link and what to prepare.', badge: 'bg-lime', tone: 'lime' as PanelTone },
]

const MONTH = 'December 2026'
const FIRST_WEEKDAY = 1 // 1 Dec 2026 is a Tuesday (Mon = 0)
const DAYS_IN_MONTH = 31
const RECALL_DAY = 8
const BUSY = [3, 4, 10, 17]

function Calendar() {
  const cells: (number | null)[] = [...Array(FIRST_WEEKDAY).fill(null), ...Array.from({ length: DAYS_IN_MONTH }, (_, i) => i + 1)]
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="whitespace-nowrap text-[15px] font-semibold">{MONTH}</p>
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="flex size-8 items-center justify-center rounded-full bg-bg text-muted"><Icon strokeWidth={2} name="chevron-left" className="size-4" /></span>
          <span className="flex size-8 items-center justify-center rounded-full bg-mint text-forest"><Icon strokeWidth={2} name="chevron-right" className="size-4" /></span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="py-1">{d}</span>)}
      </div>
      <ol className="mt-1 grid grid-cols-7 gap-1 text-center text-[13px]">
        {cells.map((d, i) => d === null ? <li key={'e' + i} aria-hidden="true" /> : (
          <li key={d} aria-current={d === RECALL_DAY ? 'date' : undefined} aria-label={d === RECALL_DAY ? `${d} December, recall` : undefined}
            className={cx('flex aspect-square items-center justify-center rounded-full',
              d === RECALL_DAY ? 'hiw-ping bg-forest font-bold text-lime' : BUSY.includes(d) ? 'bg-butter/70 font-semibold' : 'text-ink/80')}>{d}</li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-forest" />Recall</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-butter" />Rehearsal</span>
      </div>
    </div>
  )
}

function RecallWidget() {
  return (
    <div className="grid overflow-hidden rounded-[20px] bg-surface text-ink md:grid-cols-[0.9fr_1.4fr]">
      <div className="flex flex-col gap-4 border-b border-line-soft p-5 md:border-b-0 md:border-r md:p-6">
        <span className="hiw-item flex size-10 items-center justify-center rounded-full bg-blossom text-[12px] font-bold">JK</span>
        <div className="hiw-item" style={{ '--i': 1 } as React.CSSProperties}><p className="text-[13px] text-muted">Jo Kendrick, Casting</p><p className="mt-1 font-display text-[22px] font-bold leading-tight tracking-[-0.02em]">Recall — Harbour Lights</p></div>
        <ul className="hiw-item flex flex-col gap-2.5 text-[14px] text-muted-strong" style={{ '--i': 2 } as React.CSSProperties}>
          <li className="flex items-center gap-2.5"><Icon strokeWidth={2} name="clock" className="size-4 text-forest" />15 min</li>
          <li className="flex items-center gap-2.5"><Icon strokeWidth={2} name="video" className="size-4 text-forest" />Video call</li>
          <li className="flex items-center gap-2.5"><Icon strokeWidth={2} name="file" className="size-4 text-forest" />Sides attached</li>
        </ul>
      </div>
      <div className="grid gap-5 p-5 sm:grid-cols-[1fr_150px] md:p-6">
        <div className="hiw-item" style={{ '--i': 3 } as React.CSSProperties}><Calendar /></div>
        <div className="hiw-item flex flex-col gap-2" style={{ '--i': 5 } as React.CSSProperties}>
          <p className="text-[13px] font-semibold">Tue 8 Dec</p>
          <p className="text-[12px] text-muted">Time set by casting</p>
          <span className="flex h-11 items-center justify-center rounded-[12px] bg-forest text-[14px] font-semibold text-bg">14:00</span>
          <span className="mt-1 flex h-11 items-center justify-center gap-1.5 rounded-[12px] bg-lime text-[14px] font-semibold"><Icon strokeWidth={2} name="video" className="size-4" />Join call</span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted"><Icon strokeWidth={2} name="check" className="size-3.5 text-forest" />In your diary</span>
        </div>
      </div>
    </div>
  )
}

function ProfileWidget() {
  return (
    <div className="rounded-[20px] bg-surface p-5 text-ink md:p-6">
      <div className="hiw-item flex items-center gap-4">
        <span className="flex size-14 items-center justify-center rounded-full bg-mint font-display text-[18px] font-bold">AM</span>
        <div className="min-w-0"><p className="font-display text-[22px] font-bold tracking-[-0.02em]">Alex Morgan</p><p className="text-[14px] text-muted">Actor · Manchester · Playing age 22–30</p></div>
        <span className="ml-auto hidden rounded-full bg-lime px-3 py-1 text-[12px] font-semibold sm:inline">Open to work</span>
      </div>
      <div className="hiw-item mt-5" style={{ '--i': 1 } as React.CSSProperties}><div className="flex justify-between text-[13px]"><span className="font-medium">Profile complete</span><span className="text-muted">100%</span></div><div className="mt-1.5 h-2 rounded-full bg-line-soft"><div className="hiw-grow h-2 w-full rounded-full bg-forest" /></div></div>
      <ul className="mt-5 grid gap-2 sm:grid-cols-2">
        {[['image', 'Headshots · 4'], ['play', 'Showreel · 1:42'], ['file', 'CV & credits'], ['star', 'Skills · 12']].map(([icon, l], i) => (
          <li key={l} style={{ '--i': i + 2 } as React.CSSProperties} className="hiw-item flex items-center gap-2.5 rounded-[12px] bg-bg px-3.5 py-3 text-[14px] font-medium"><Icon strokeWidth={2} name={icon} className="size-4 text-forest" />{l}</li>
        ))}
      </ul>
    </div>
  )
}

function ApplyWidget() {
  return (
    <div className="rounded-[20px] bg-surface p-5 text-ink md:p-6">
      <div className="hiw-item flex items-baseline justify-between"><p className="font-display text-[22px] font-bold tracking-[-0.02em]">Roles for you</p><span className="text-[13px] text-muted">3 new today</span></div>
      <ul className="mt-3">
        {[['Swing (female) — UK tour', 'Theatre · Manchester', '£700 / week', true], ['Young witness — Harbour Lights', 'TV series · London', '£450 / day', false], ['Dancer — Pulse arena tour', 'Dance · UK tour', '£650 / week', false]].map(([t, s, pay, applied], i) => (
          <li key={t as string} style={{ '--i': i + 1 } as React.CSSProperties} className="hiw-item flex items-center justify-between gap-3 border-t border-line-soft py-3.5">
            <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{t as string}</p><p className="truncate text-[13px] text-muted">{s as string} · {pay as string}</p></div>
            <span className={cx('shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-semibold', applied ? 'bg-mint' : 'bg-forest text-bg')}>{applied ? 'Applied ✓' : 'Apply'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const WIDGETS = [ProfileWidget, ApplyWidget, RecallWidget]

const AUTOPLAY_MS = 6000

export default function HowItWorks() {
  const [step, setStep] = useState(2)
  // Calendly-style autoplay: the active tab's bar fills, then the next step plays.
  // Pauses on hover/focus (CSS), stops for good once someone picks a tab, and is off for reduced motion.
  const [auto, setAuto] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setAuto(true)
  }, [])
  const W = WIDGETS[step]
  const pick = (i: number) => { setAuto(false); setStep(i) }
  return (
    <div className="hiw-root grid gap-6 rounded-[var(--radius-feature)] bg-sand p-3 md:p-4 lg:grid-cols-[minmax(280px,380px)_1fr]">
      <div role="tablist" aria-label="How it works" className="hiw-tabs flex flex-col gap-2 p-1 md:p-2">
        {STEPS.map((s, i) => {
          const on = step === i
          return (
            <button key={s.n} type="button" role="tab" id={'hiw-tab-' + i} aria-selected={on} aria-controls="hiw-panel" onClick={() => pick(i)}
              className={cx('group/tab relative flex gap-4 overflow-hidden rounded-[22px] p-4 text-left transition-[background-color,box-shadow,translate] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:p-5',
                on ? 'bg-surface shadow-[0_16px_32px_-24px_rgb(21_33_28/0.35)]' : 'hover:translate-x-1 hover:bg-white/50')}>
              <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold transition-[background-color,color,rotate,scale] duration-500',
                on ? s.badge + ' scale-110' : 'bg-sand-2 text-muted-strong group-hover/tab:-rotate-[8deg]')}>{s.n}</span>
              <span className="min-w-0">
                <span className="block font-display text-[20px] font-bold leading-tight tracking-[-0.02em]">{s.title}</span>
                <span className={cx('grid transition-[grid-template-rows] duration-500', on ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
                  <span className="overflow-hidden"><span className="block pt-1.5 text-[13px] leading-[1.6] text-muted-strong">{s.body}</span></span>
                </span>
              </span>
              {on && auto && (
                <span aria-hidden="true" className="absolute inset-x-5 bottom-2 h-[3px] overflow-hidden rounded-full bg-sand-2">
                  <span key={step} className="hiw-bar block h-full rounded-full bg-forest" style={{ '--hiw-ms': AUTOPLAY_MS + 'ms' } as React.CSSProperties}
                    onAnimationEnd={() => setStep(v => (v + 1) % STEPS.length)} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div id="hiw-panel" role="tabpanel" aria-labelledby={'hiw-tab-' + step} className="relative isolate flex min-h-[420px] items-center justify-center overflow-hidden rounded-[24px] p-4 sm:p-8">
        {/* each step's colour is its own layer, so changing tab cross-fades rather than jumps */}
        {STEPS.map((s, i) => (
          <div key={s.n} aria-hidden="true" className={cx('absolute inset-0 -z-10 transition-[opacity,scale] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]', step === i ? 'scale-100 opacity-100' : 'scale-110 opacity-0')}>
            <PanelBase tone={s.tone} />
          </div>
        ))}
        <PanelBars key={'bars' + step} tone={STEPS[step].tone} count={11} />
        <div key={step} className="hiw-frame relative w-full max-w-[680px] rounded-[26px] border border-white/70 bg-white/45 p-2 shadow-[0_30px_60px_-36px_rgb(21_33_28/0.45)]">
          <W />
        </div>
      </div>
    </div>
  )
}
