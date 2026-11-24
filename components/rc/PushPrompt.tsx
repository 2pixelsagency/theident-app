'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { toast } from '@/components/rc/ui'
import { dismissPrompt, enablePush, promptDismissed, pushState, type PushState } from '@/lib/rc/push'

// "Turn on notifications" card on Home. Hidden once push is on, blocked, or dismissed (comes back after 14 days).
export default function PushPrompt({ caster }: { caster?: boolean }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    if (!promptDismissed()) pushState().then(s => live && setState(s))
    return () => { live = false }
  }, [])
  if (state !== 'off' && state !== 'ios-install') return null

  const close = () => { dismissPrompt(); setState(null) }
  const turnOn = async () => {
    setBusy(true)
    try {
      const s = await enablePush()
      if (s === 'on') { toast('Notifications on'); setState(null) } else { setState(s); if (s === 'denied') close() }
    } catch { toast('Couldn’t turn on notifications') } finally { setBusy(false) }
  }

  return (
    <div className="relative mx-4 mt-4 flex items-start gap-3 rounded-[var(--radius)] bg-forest p-4 text-white">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-lime text-ink"><Icon name="bell" className="size-5" /></span>
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-[15px] font-semibold">Don’t miss a recall</p>
        <p className="mt-0.5 text-[13px] text-white/75">
          {state === 'ios-install'
            ? 'On iPhone, tap Share → Add to Home Screen, then open The Ident from there to get alerts.'
            : caster ? 'Get an alert when someone applies or messages you.' : 'Get an alert when casting invites you, recalls you or messages you.'}
        </p>
        {state === 'off' && (
          <button type="button" onClick={turnOn} disabled={busy} className="mt-3 h-9 rounded-full bg-lime px-4 text-sm font-semibold text-ink">{busy ? 'Turning on…' : 'Turn on notifications'}</button>
        )}
      </div>
      <button type="button" aria-label="Not now" onClick={close} className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full text-white/70 hover:bg-white/10"><Icon name="x" className="size-4" /></button>
    </div>
  )
}
