import type { Metadata } from 'next'
import AuditionLanding, { openRoles, filterRoles } from '@/components/site/AuditionLanding'

// "Casting calls UK" — the hub for that search term; same live roles as /auditions, its own canonical copy.
export const revalidate = 1800

export async function generateMetadata(): Promise<Metadata> {
  const roles = filterRoles(await openRoles())
  return {
    title: 'Casting calls in the UK — open today | The Ident',
    description: `${roles.length ? roles.length + ' open casting calls. ' : ''}Casting calls for actors, dancers and singers across the UK — theatre, TV, film and commercials, with pay and closing dates up front.`,
    alternates: { canonical: '/casting-calls' },
  }
}

export default async function CastingCalls() {
  return <AuditionLanding roles={filterRoles(await openRoles())} heading="Casting calls in the UK" path="/casting-calls"
    intro="Open casting calls for actors, dancers and singers — theatre, TV and film, commercials and dance — posted by casting directors, producers and the community, with pay and closing dates up front." />
}
