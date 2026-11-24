import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Public (anon) client only — the service-role key never ships to the browser or the app.
// PKCE: emailed links (reset, sign-up) and OAuth come back to /auth/callback?code=…, which this
// client exchanges for a session automatically (detectSessionInUrl). Inside the native app the
// deep link is exchanged by lib/rc/native.ts instead.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Remember "signed in" across theident.me hosts so the website (www) can show Dashboard instead of
// Log in / Get started. The flag holds no token or user data — the session itself stays on the app host.
export const SIGNED_IN_COOKIE = 'ident_signed_in'
function markSignedIn(on: boolean) {
  if (typeof document === 'undefined') return
  const host = window.location.hostname
  const domain = host === 'theident.me' || host.endsWith('.theident.me') ? '; Domain=.theident.me' : ''
  document.cookie = SIGNED_IN_COOKIE + '=' + (on ? '1; Max-Age=2592000' : '; Max-Age=0') + '; Path=/; SameSite=Lax' + domain + (location.protocol === 'https:' ? '; Secure' : '')
}
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) markSignedIn(true)
    else if (event === 'SIGNED_OUT') markSignedIn(false)
  })
}
export const hasSignedInCookie = () => typeof document !== 'undefined' && document.cookie.split('; ').includes(SIGNED_IN_COOKIE + '=1')
