'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

// Replays the entrance animations of whatever it wraps (the .hiw-* classes) each time the pointer enters
// the surrounding card ([data-card]) — the same motion as the How it works tab change. Remounting the
// children restarts their CSS animations. Throttled so quick in/out doesn't stutter.
export default function Replay({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [k, setK] = useState(0)
  useEffect(() => {
    const card = ref.current?.closest('[data-card]')
    if (!card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let last = 0
    const on = () => { const now = Date.now(); if (now - last < 1200) return; last = now; setK(v => v + 1) }
    card.addEventListener('mouseenter', on)
    return () => card.removeEventListener('mouseenter', on)
  }, [])
  return <span ref={ref} className="contents"><Fragment key={k}>{children}</Fragment></span>
}
