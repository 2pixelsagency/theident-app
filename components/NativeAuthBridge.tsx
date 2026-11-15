'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isNativeApp, NATIVE_SCHEME } from '@/lib/rc/authRedirect'
import { safeNext } from '@/lib/rc/onboarding'

// Native app only (Capacitor): catch theident://auth/callback?code=…&next=… (or the https App/Universal
// Link) when the reset or sign-up email opens the app, exchange the PKCE code for a session, then route
// to ?next= (e.g. Set new password). On the web this renders nothing and loads nothing.
export default function NativeAuthBridge() {
  const router = useRouter()

  useEffect(() => {
    if (!isNativeApp()) return
    let remove: (() => void) | undefined
    let cancelled = false
    import('@capacitor/app').then(({ App }) => {
      const handle = App.addListener('appUrlOpen', async ({ url }) => {
        const u = new URL(url)
        const isCallback = (u.protocol === NATIVE_SCHEME + ':' && (u.host + u.pathname).replace(/\/+$/, '') === 'auth/callback') || u.pathname === '/auth/callback'
        if (!isCallback) return
        const next = safeNext(u.searchParams.get('next'), '/home')
        const code = u.searchParams.get('code')
        if (!code || u.searchParams.get('error_code')) {
          router.replace('/auth/callback' + u.search + u.hash) // shows the expired / failed state
          return
        }
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        router.replace(error ? '/auth/callback?next=' + encodeURIComponent(next) + '&error_description=' + encodeURIComponent(error.message) : next)
      })
      handle.then(h => { if (cancelled) h.remove(); else remove = () => h.remove() })
    })
    return () => { cancelled = true; remove?.() }
  }, [router])

  return null
}
