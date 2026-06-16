'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String: string) {
  const cleaned = base64String.replace(/\s/g, '')
  const padding = '='.repeat((4 - cleaned.length % 4) % 4)
  const base64 = (cleaned + padding).replace(/-/g, '+').replace(/_/g, '/')
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
    ;(async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready
        const existing = await reg.pushManager.getSubscription()
        if (existing && Notification.permission === 'granted') {
          await saveSubscription(existing)
          setShow(false)
        } else {
          setShow(true)
        }
      } catch {
        setShow(true)
      }
    })()
  }, [])

  const saveSubscription = async (sub: PushSubscription) => {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return { error: { message: 'Not signed in' } }
    const json: any = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({
      profile_id: user.id,
      endpoint: json.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
    }, { onConflict: 'endpoint' })
    return { error }
  }

  const enable = async () => {
    setBusy(true)
    try {
      if (!VAPID) {
        alert('Notifications can’t start: the public key (NEXT_PUBLIC_VAPID_PUBLIC_KEY) isn’t in this build. Add it in Vercel and redeploy, then try again.')
        setBusy(false); return
      }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        alert('Notifications were not allowed (permission: ' + perm + '). On iPhone, make sure the app was opened from the Home Screen icon, and check iOS Settings → Notifications for The Ident.')
        setBusy(false); return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      let sub = await reg.pushManager.getSubscription()
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID),
        })
      }
      const { error } = await saveSubscription(sub)
      if (error) {
        alert('Couldn’t save your device:\n\n' + ((error as any).message || JSON.stringify(error)))
        setBusy(false); return
      }
      alert('Notifications are on for this device.')
      setShow(false)
    } catch (e: any) {
      alert('Notifications failed:\n\n' + (e?.message || String(e)))
    }
    setBusy(false)
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
