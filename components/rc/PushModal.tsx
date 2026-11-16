'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { toast } from '@/components/rc/ui'
import { enablePush, pushState, type PushState } from '@/lib/rc/push'

const SEEN_KEY = 'ident.pushModalSeen'
const WEEK = 7 * 864e5

// Full-screen "Don't miss an audition" ask, a few seconds into a visit while notifications are off.
// Shown at most once a week; the Home card and Settings stay available afterwards.
export default function PushModal({ caster }: { caster?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    try { if (Date.now() - Number(localStorage.getItem(SEEN_KEY) || 0) < WEEK) return } catch { return }
    const t = setTimeout(() => pushState().then(s => { if (live && (s === 'off' || s === 'ios-install')) setState(s) }), 2500)
    return () => { live = false; clearTimeout(t) }
  }, [])
  if (state !== 'off' && state !== 'ios-install') return null

  const close = () => { try { localStorage.setItem(SEEN_KEY, String(Date.now())) } catch { /* private mode */ } setState(null) }
  const turnOn = async () => {
    setBusy(true)
    try {
      const s = await enablePush()
      if (s === 'on') toast('Notifications on — we’ll tell you the moment casting gets in touch')
      else if (s === 'denied') toast('Notifications are blocked — you can allow them in your phone settings')
    } catch { toast('Couldn’t turn on notifications') }
    setBusy(false); close()
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="push-modal-title" className="fixed inset-0 z-[300] flex items-end justify-center bg-scrim p-4 sm:items-center">
      <div className="w-full max-w-[400px] overflow-hidden rounded-[28px] bg-surface shadow-card">
        <div className="relative flex flex-col items-center bg-hero px-6 pb-7 pt-9 text-center text-white">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-lime text-ink shadow-cta"><Icon name="bell" className="size-8" /></span>
          <h2 id="push-modal-title" className="mt-5 text-[26px] leading-tight text-white">{caster ? 'Never miss an applicant' : 'Don’t miss an audition'}</h2>
          <p className="mt-2 text-[15px] text-white/80">
            {caster ? 'Get an alert the moment someone applies or replies to you.' : 'Casting moves fast. Get an alert the second you’re invited, recalled, pencilled or booked.'}
          </p>
        </div>
        <div className="space-y-3 p-5">
          {state === 'ios-install' ? (
            <ol className="space-y-2 text-[14px]">
              <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">1</span> Tap <Icon name="share" className="inline size-4" /> <b>Share</b> at the bottom of Safari</li>
              <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">2</span> Choose <b>Add to Home Screen</b></li>
              <li className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-bold text-ink">3</span> Open The Ident from your Home Screen and turn notifications on</li>
            </ol>
          ) : (
            <button type="button" onClick={turnOn} disabled={busy} className="h-[52px] w-full rounded-[14px] bg-lime text-[16px] font-semibold text-ink shadow-cta disabled:opacity-60">
              {busy ? 'Turning on…' : 'Turn on notifications'}
            </button>
          )}
          <button type="button" onClick={close} className="h-11 w-full text-[15px] font-medium text-muted">{state === 'ios-install' ? 'Got it' : 'Not now'}</button>
        </div>
      </div>
    </div>
  )
}
