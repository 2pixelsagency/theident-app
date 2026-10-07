'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import ProfileView, { heroPrimary, heroSecondary } from '@/components/rc/ProfileView'
import { PageLoading, toast } from '@/components/rc/ui'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { loadFullProfile } from '@/lib/rc/profile'

// The owner's view of their profile: the same immersive layout everyone else sees, with Edit/Share
export default function MyProfilePage() {
  const router = useRouter()
  const { id } = useMe()
  const { data, loading } = useAsync(() => loadFullProfile(id), [id])

  if (loading || !data?.profile) return <PageLoading />
  const p = data.profile
  const publicUrl = p.slug ? window.location.origin + '/' + p.slug : null

  const share = async () => {
    if (!publicUrl) { toast('Add your name to get a public link'); return }
    try { if (navigator.share) await navigator.share({ title: fullName(p), url: publicUrl }); else { await navigator.clipboard.writeText(publicUrl); toast('Profile link copied') } } catch { /* dismissed */ }
  }

  const requestTestimonial = async () => {
    if (!publicUrl) return
    await navigator.clipboard?.writeText(publicUrl).catch(() => {})
    toast('Link copied — send it to a director or choreographer')
  }

  return (
    <ProfileView
      signedIn
      data={data}
      owner
      onBack={() => (window.history.length > 1 ? router.back() : router.push('/home'))}
      onShare={share}
      topRight={<Link href="/me/edit" aria-label="Edit profile" className="inline-flex size-10 items-center justify-center rounded-full bg-dark/45 text-white backdrop-blur-md"><Icon name="pen" className="size-5" /></Link>}
      actions={<>
        <Link href="/me/edit" className={heroPrimary}><Icon name="pen" className="size-[18px]" /> Edit profile</Link>
        <button type="button" onClick={share} className={heroSecondary}><Icon name="share" className="size-[18px]" /> Share</button>
      </>}
      statusLine={<>This is how casting directors and the public see you · {data.connections} connection{data.connections === 1 ? '' : 's'}</>}
      below={p.account_role !== 'caster' && (
        <button type="button" onClick={requestTestimonial} className="upload mt-5 flex h-11 w-full items-center justify-center gap-2 text-sm font-medium"><Icon name="send" className="size-4" /> Request a testimonial</button>
      )}
    />
  )
}
