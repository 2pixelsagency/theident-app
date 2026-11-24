'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import CompletenessCard from '@/components/rc/Completeness'
import BoostCard from '@/components/rc/BoostCard'
import ProfileView, { heroPrimary, heroSecondary } from '@/components/rc/ProfileView'
import { PageLoading, toast, useGoBack } from '@/components/rc/ui'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { loadFullProfile } from '@/lib/rc/profile'
import { completenessOf } from '@/lib/rc/completeness'

// The owner's view of their profile: the same immersive layout everyone else sees, with Edit/Share,
// a completeness nudge, and "Preview as casting" to see exactly what a casting director sees.
export default function MyProfilePage() {
  const goBack = useGoBack('/home')
  const { id } = useMe()
  const [preview, setPreview] = useState(false)
  const { data, loading } = useAsync(() => loadFullProfile(id), [id])

  if (loading || !data?.profile) return <PageLoading />
  const p = data.profile
  const caster = p.account_role === 'caster'
  const publicUrl = p.slug ? window.location.origin + '/' + p.slug : null
  const result = completenessOf(data)

  const share = async () => {
    if (!publicUrl) { toast('Add your name to get a public link'); return }
    try { if (navigator.share) await navigator.share({ title: fullName(p), url: publicUrl }); else { await navigator.clipboard.writeText(publicUrl); toast('Profile link copied') } } catch { /* dismissed */ }
  }

  const requestTestimonial = async () => {
    if (!publicUrl) return
    await navigator.clipboard?.writeText(publicUrl).catch(() => {})
    toast('Link copied — send it to a director or choreographer')
  }

  if (preview) {
    // Exactly what casting sees: their actions, and private contact hidden unless you chose to show it
    const asCasting = { ...data, profile: { ...p, ...(p.show_agent_contact ? {} : { agent_email: null, agent_phone: null }) } }
    const inert = () => toast('This is a preview — casting directors use these buttons')
    return (
      <>
        <ProfileView
          signedIn
          data={asCasting}
          onBack={() => setPreview(false)}
          onShare={inert}
          actions={<>
            <button type="button" onClick={inert} className={heroPrimary}><Icon name="send" className="size-[18px]" /> Invite to audition</button>
            <button type="button" onClick={inert} className={heroSecondary}><Icon name="chat" className="size-[18px]" /> Message</button>
          </>}
          statusLine={p.show_talent === false ? 'Hidden — casting can’t find you in search right now' : 'Preview — this is what a casting director sees'}
        />
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+108px)] lg:left-[76px] lg:pb-8">
          <button type="button" onClick={() => setPreview(false)} className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-lime px-5 text-[15px] font-semibold text-ink shadow-cta focus-visible:outline-2 focus-visible:outline-forest">
            <Icon name="eye" className="size-[18px]" /> Previewing as casting · Exit
          </button>
        </div>
      </>
    )
  }

  return (
    <ProfileView
      signedIn
      data={data}
      owner
      onBack={goBack}
      onShare={share}
      topRight={<Link href="/me/edit" aria-label="Edit profile" className="inline-flex size-10 items-center justify-center rounded-full bg-dark/45 text-white backdrop-blur-md"><Icon name="pen" className="size-5" /></Link>}
      actions={<>
        <Link href="/me/edit" className={heroPrimary}><Icon name="pen" className="size-[18px]" /> Edit profile</Link>
        <button type="button" onClick={share} className={heroSecondary}><Icon name="share" className="size-[18px]" /> Share</button>
      </>}
      statusLine={<>{data.connections} connection{data.connections === 1 ? '' : 's'}</>}
      below={<>
        {result && <CompletenessCard result={result} className="mt-5" />}
        {!caster && <BoostCard uid={p.id} until={p.boosted_until} />}
        {!caster && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => { setPreview(true); window.scrollTo(0, 0) }} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold"><Icon name="eye" className="size-4" /> Preview as casting</button>
            <button type="button" onClick={requestTestimonial} className="flex h-11 items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold"><Icon name="send" className="size-4" /> Ask for a testimonial</button>
          </div>
        )}
      </>}
    />
  )
}
