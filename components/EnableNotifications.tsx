'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export default function EnableNotifications() {
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return
    if (Notification.permission === 'granted') {
      subscribe().catch(() => {})
    } else if (Notification.permission === 'default') {
      setShow(true)
    }
  }, [])

  const subscribe = async () => {
    if (!VAPID) { console.log('No VAPID public key set'); return }
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return

    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      })
    }

    const json: any = sub.toJSON()
    await supabase.from('push_subscriptions').upsert({
      profile_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }, { onConflict: 'endpoint' })
  }

  const enable = async () => {
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      if (perm === 'granted') await subscribe()
    } catch (e) {
      console.log('Enable notifications failed', e)
    }
    setBusy(false)
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{ position: 'fixed', left: '12px', right: '12px', bottom: 'calc(env(safe-area-inset-bottom) + 90px)', zIndex: 300, background: '#0c2520', borderRadius: '16px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 6px 24px rgba(12,37,32,0.28)' }}>
      <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'rgba(146,215,175,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: 500, color: '#f1f0ee', margin: 0, lineHeight: 1.35 }}>Turn on notifications for connections &amp; messages</p>
      </div>
      <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: '#92d7af', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '6px 4px', flexShrink: 0 }}>Not now</button>
      <button onClick={enable} disabled={busy} style={{ background: '#4ade80', border: 'none', color: '#061410', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', borderRadius: '20px', padding: '9px 16px', flexShrink: 0, opacity: busy ? 0.6 : 1 }}>{busy ? 'Enabling…' : 'Enable'}</button>
    </div>
  )
}
