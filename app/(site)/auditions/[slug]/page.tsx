import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AuditionLanding, { openRoles, filterRoles, landingTitle, landingDescription, landingPath } from '@/components/site/AuditionLanding'
import { TYPES, CITIES, typeBySlug, cityBySlug } from '@/lib/site/auditions'

// /auditions/dance (a type across the UK) or /auditions/manchester (every type in a city)
export const revalidate = 1800
export const dynamicParams = false
export const generateStaticParams = () => [...TYPES, ...CITIES].map(x => ({ slug: x.slug }))

type Props = { params: Promise<{ slug: string }> }
const resolve = (slug: string) => ({ type: typeBySlug(slug), city: cityBySlug(slug) })

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type, city } = resolve((await params).slug)
  if (!type && !city) return {}
  const roles = filterRoles(await openRoles(), type, city)
  return {
    title: landingTitle(type, city) + ' | The Ident',
    description: landingDescription(type, city, roles.length),
    alternates: { canonical: landingPath(type, city) },
    // A city page with nothing open is thin — keep it out of the index until it has roles
    robots: city && !roles.length ? { index: false, follow: true } : undefined,
  }
}

export default async function Page({ params }: Props) {
  const { type, city } = resolve((await params).slug)
  if (!type && !city) notFound()
  return <AuditionLanding type={type} city={city} roles={filterRoles(await openRoles(), type, city)} />
}
