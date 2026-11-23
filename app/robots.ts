import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/supabaseServer'

// Public pages are crawlable; the signed-in app, admin and APIs are not
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin', '/home', '/find', '/castings', '/chats', '/me', '/talent', '/postings', '/settings', '/inbox', '/todo', '/blocks', '/diary', '/pay', '/tax', '/plan', '/start', '/welcome', '/verify', '/auth', '/menu', '/join'],
    },
    sitemap: SITE_URL + '/sitemap.xml',
  }
}
