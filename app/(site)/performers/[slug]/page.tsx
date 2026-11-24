import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { PublicProfile, loadPublic, publicMetadata } from '@/components/rc/PublicProfile'

// A performer's public profile: www.theident.me/performers/<slug>
export const revalidate = 300
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return publicMetadata((await params).slug, '/performers/')
}

export default async function PerformerPage({ params }: Props) {
  const { slug } = await params
  const r = await loadPublic(slug)
  if (!r) notFound()
  if (r.full.profile!.account_role === 'caster') permanentRedirect('/' + slug)
  return <PublicProfile slug={slug} base="/performers/" />
}
