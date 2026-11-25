import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import { SITE_URL } from '@/lib/supabaseServer'

// www.theident.me is the site Google indexes; app.theident.me is the app and asks not to be indexed at all.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get('host') || '').toLowerCase()
  if (host.startsWith('app.')) return { rules: { userAgent: '*', disallow: '/' } }
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/home', '/find', '/castings', '/chats', '/me', '/talent', '/postings', '/settings', '/inbox', '/todo', '/blocks', '/diary', '/pay', '/tax', '/money', '/plan', '/start', '/welcome', '/verify', '/auth', '/menu', '/join'],
    },
    sitemap: SITE_URL + '/sitemap.xml',
  }
}
