import type { Metadata } from 'next'
import { notFound, permanentRedirect } from 'next/navigation'
import { PublicProfile, loadPublic, publicMetadata } from '@/components/rc/PublicProfile'

// theident.me/<slug>: casting pages live here; performers moved to /performers/<slug> (old links redirect)
export const revalidate = 300
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return publicMetadata((await params).slug, '/')
}

export default async function SlugPage({ params }: Props) {
  const { slug } = await params
  const r = await loadPublic(slug)
  if (!r) notFound()
  if (r.full.profile!.account_role !== 'caster') permanentRedirect('/performers/' + slug)
  return <PublicProfile slug={slug} base="/" />
}
