import type { Metadata } from 'next'
import AuditionLanding, { openRoles, filterRoles, landingDescription } from '@/components/site/AuditionLanding'

export const revalidate = 1800

export async function generateMetadata(): Promise<Metadata> {
  const roles = filterRoles(await openRoles())
  return {
    title: 'Auditions & castings in the UK — open roles today | The Ident',
    description: landingDescription(undefined, undefined, roles.length),
    alternates: { canonical: '/auditions' },
  }
}

export default async function AuditionsHub() {
  return <AuditionLanding roles={filterRoles(await openRoles())} />
}
