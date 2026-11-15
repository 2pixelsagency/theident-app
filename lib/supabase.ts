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
