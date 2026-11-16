import { supabase } from '@/lib/supabase'

// Web push for this device. iOS only allows it once the app is added to the Home Screen.
export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true

function keyBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

async function registration() {
  return (await navigator.serviceWorker.getRegistration('/')) || navigator.serviceWorker.register('/sw.js')
}

export async function pushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported'
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return isIOS() && !standalone() ? 'ios-install' : 'unsupported'
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission !== 'granted') return 'off'
  const reg = await navigator.serviceWorker.getRegistration('/')
  return (await reg?.pushManager.getSubscription()) ? 'on' : 'off'
}

export async function enablePush(): Promise<PushState> {
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return perm === 'denied' ? 'denied' : 'off'
  const reg = await registration()
  await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
  })
  const j = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.rpc('register_push', { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth })
  if (error) throw error
  return 'on'
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration('/')
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe().catch(() => {})
  }
  return 'off'
}

// The prompt on Home: show while push is off, unless dismissed in the last 14 days
const DISMISS_KEY = 'ident.pushPromptDismissed'
export function promptDismissed() {
  try { return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < 14 * 864e5 } catch { return false }
}
export function dismissPrompt() { try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* private mode */ } }

export const NOTIFICATION_TYPES = [
  { key: 'messages', title: 'Messages', sub: 'Direct messages from casting and connections' },
  { key: 'cast_chats', title: 'Cast chats', sub: 'New messages in your company and crew chats' },
  { key: 'applications', title: 'Castings & applications', sub: 'Invites, recalls, pencils, bookings — and new applicants on your posts' },
  { key: 'matches', title: 'New roles for me', sub: 'Roles that match your profile (also hides them from your inbox)' },
  { key: 'connections', title: 'Connection requests', sub: null },
] as const
export type PrefKey = (typeof NOTIFICATION_TYPES)[number]['key']
