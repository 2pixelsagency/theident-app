import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import PublicProfileClient from '@/components/rc/PublicProfileClient'
import { supabaseServer, SITE_URL } from '@/lib/supabaseServer'
import { loadFullProfile } from '@/lib/rc/profile'
import { fullName } from '@/lib/rc/format'

// Public profile link (theident.me/<slug>) — server-rendered so Google can index it.
export const revalidate = 300

type Props = { params: Promise<{ slug: string }> }

async function load(slug: string) {
  const { data: row } = await supabaseServer.from('profiles').select('id, show_talent, is_demo').eq('slug', slug).maybeSingle()
  if (!row || row.show_talent === false) return null
  const full = await loadFullProfile(row.id, false, supabaseServer)
  return full.profile ? { full, demo: !!row.is_demo } : null
}

const craftOf = (what?: string | null) => (what || 'Performer').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' & ')

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const r = await load(slug)
  if (!r) return { title: 'Profile not found · The Ident', robots: { index: false } }
  const p = r.full.profile!
  const name = fullName(p) || 'Performer'
  const title = `${name} — ${craftOf(p.what_i_do)}${p.location ? ' · ' + p.location.split(',')[0] : ''} | The Ident`
  const description = (p.summary || p.bio || `${name} is a ${craftOf(p.what_i_do).toLowerCase()}${p.location ? ' based in ' + p.location : ''} on The Ident. See their showreel, credits and skills.`).replace(/\s+/g, ' ').slice(0, 160)
  return {
    title, description,
    alternates: { canonical: `${SITE_URL}/${slug}` },
    robots: r.demo ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, url: `${SITE_URL}/${slug}`, type: 'profile', images: p.picture_url ? [{ url: p.picture_url }] : undefined },
    twitter: { card: p.picture_url ? 'summary_large_image' : 'summary', title, description, images: p.picture_url ? [p.picture_url] : undefined },
  }
}

export default async function PublicProfilePage({ params }: Props) {
  const { slug } = await params
  const r = await load(slug)
  if (!r) notFound()
  const p = r.full.profile!
  // Structured data: a Person with their craft, place, credits and skills
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: fullName(p),
    url: `${SITE_URL}/${slug}`,
    image: p.picture_url || undefined,
    jobTitle: craftOf(p.what_i_do),
    description: p.summary || p.bio || undefined,
    homeLocation: p.location ? { '@type': 'Place', name: p.location } : undefined,
    alumniOf: p.is_graduate && p.graduate_school ? { '@type': 'EducationalOrganization', name: p.graduate_school } : undefined,
    knowsAbout: r.full.skills.map(s => s.name).slice(0, 20),
    performerIn: r.full.credits.slice(0, 10).map(c => ({ '@type': 'CreativeWork', name: c.title })),
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <PublicProfileClient full={r.full} />
    </>
  )
}
