import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AuditionLanding, { openRoles, filterRoles, landingTitle, landingDescription, landingPath } from '@/components/site/AuditionLanding'
import { TYPES, CITIES, typeBySlug, cityBySlug } from '@/lib/site/auditions'

// /auditions/musical-theatre/manchester
export const revalidate = 1800
export const dynamicParams = false
export const generateStaticParams = () => TYPES.flatMap(t => CITIES.map(c => ({ slug: t.slug, city: c.slug })))

type Props = { params: Promise<{ slug: string; city: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await params
  const type = typeBySlug(p.slug), city = cityBySlug(p.city)
  if (!type || !city) return {}
  const roles = filterRoles(await openRoles(), type, city)
  return {
    title: landingTitle(type, city) + ' | The Ident',
    description: landingDescription(type, city, roles.length),
    alternates: { canonical: landingPath(type, city) },
    robots: roles.length ? undefined : { index: false, follow: true },
  }
}

export default async function Page({ params }: Props) {
  const p = await params
  const type = typeBySlug(p.slug), city = cityBySlug(p.city)
  if (!type || !city) notFound()
  return <AuditionLanding type={type} city={city} roles={filterRoles(await openRoles(), type, city)} />
}
