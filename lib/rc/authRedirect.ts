// Where Supabase sends people back to after an emailed link or OAuth.
// Web: https://<host>/auth/callback?next=…   Native app (Capacitor): theident://auth/callback?next=…
// Both must be in Supabase → Authentication → URL Configuration → Redirect URLs.

export const NATIVE_SCHEME = 'theident'

export function isNativeApp() {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  return !!cap?.isNativePlatform?.()
}

export function authRedirect(next: string) {
  const path = '/auth/callback?next=' + encodeURIComponent(next)
  return isNativeApp() ? NATIVE_SCHEME + ':/' + path : window.location.origin + path
}
