import { createClient } from '@supabase/supabase-js'

// Server-side anon client for public, crawlable pages (SEO). No session, no service role.
export const supabaseServer = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export const SITE_URL = 'https://www.theident.me'
