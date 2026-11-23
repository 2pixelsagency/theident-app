import type { MetadataRoute } from 'next'
import { supabaseServer, SITE_URL } from '@/lib/supabaseServer'
import { openRoles, filterRoles, landingPath } from '@/components/site/AuditionLanding'
import { TYPES, CITIES } from '@/lib/site/auditions'

export const revalidate = 3600

// Everything Google should index: site pages, the job board, open jobs and public (real) performer profiles
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const [{ data: people }, { data: jobs }] = await Promise.all([
    supabaseServer.from('profiles').select('slug, updated_at').eq('account_role', 'performer').eq('is_demo', false).or('show_talent.is.null,show_talent.eq.true').not('slug', 'is', null).not('first_name', 'is', null).eq('placeholder_account', false).limit(5000),
    supabaseServer.from('jobs').select('id, created_at').eq('is_published', true).eq('is_demo', false).or('application_deadline.is.null,application_deadline.gte.' + today).limit(5000),
  ])
  // Audition landing pages: the hub and every type always; a city (or type + city) only once it has open roles
  const roles = await openRoles()
  const landings = ['/auditions', ...TYPES.map(t => landingPath(t)),
    ...CITIES.filter(c => filterRoles(roles, undefined, c).length).map(c => landingPath(undefined, c)),
    ...TYPES.flatMap(t => CITIES.filter(c => filterRoles(roles, t, c).length).map(c => landingPath(t, c)))]
  const page = (path: string, priority: number, changeFrequency: 'daily' | 'weekly' | 'monthly' = 'weekly') => ({ url: SITE_URL + path, lastModified: now, changeFrequency, priority })
  return [
    page('', 1, 'daily'), page('/jobs', 0.9, 'daily'), page('/people', 0.9, 'daily'),
    ...landings.map(l => page(l, l === '/auditions' ? 0.9 : 0.8, 'daily')),
    page('/performers', 0.7), page('/casting', 0.7), page('/pricing', 0.6), page('/contact', 0.4, 'monthly'), page('/privacy', 0.2, 'monthly'), page('/terms', 0.2, 'monthly'),
    ...((people || []) as { slug: string; updated_at: string | null }[]).map(p => ({ url: `${SITE_URL}/${p.slug}`, lastModified: p.updated_at ? new Date(p.updated_at) : now, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...((jobs || []) as { id: string; created_at: string }[]).map(j => ({ url: `${SITE_URL}/jobs/${j.id}`, lastModified: new Date(j.created_at), changeFrequency: 'daily' as const, priority: 0.7 })),
  ]
}
