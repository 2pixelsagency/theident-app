'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PlanPaywall from '@/components/rc/PlanPaywall'
import { PageLoading } from '@/components/rc/ui'
import { useMe } from '@/lib/rc/me'
import { supabase } from '@/lib/supabase'

const safe = (n: string | null) => (n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/plan') ? n : '/home')

export default function PlanPage() {
  const me = useMe()
  const { id: uid, refresh } = me
  const router = useRouter()
  const [q] = useState(() => new URLSearchParams(window.location.search))
  const next = safe(q.get('next'))
  const success = q.get('success') === '1'
  const [waiting, setWaiting] = useState(success)

  // Back from Stripe: wait for the webhook to switch the membership on, then carry on
  useEffect(() => {
    if (!success) return
    let tries = 0, stop = false
    const tick = async () => {
      const { data } = await supabase.rpc('has_plan', { pid: uid })
      if (stop) return
      if (data) { await refresh(); router.replace(next); return }
      if (++tries < 20) setTimeout(tick, 1500); else setWaiting(false)
    }
    tick()
    return () => { stop = true }
  }, [success, uid, refresh, next, router])

  if (waiting) return <div className="px-6 pt-24 text-center"><PageLoading /><p className="mt-4 text-[15px] text-muted">Switching on your membership…</p></div>
  return (
    <div className="flex min-h-dvh flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))]">
      <PlanPaywall role={me.role} next={next} title={success ? 'Almost there' : undefined} sub={success ? 'Payment received — it can take a minute to show. Refresh this page in a moment.' : q.get('cancelled') ? 'No problem — you weren’t charged. Start whenever you’re ready.' : undefined} />
    </div>
  )
}
