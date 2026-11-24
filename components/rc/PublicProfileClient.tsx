'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from './Icon'
import ProfileView, { heroPrimary, heroSecondary } from './ProfileView'
import { Toaster, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { fullName } from '@/lib/rc/format'
import type { loadFullProfile } from '@/lib/rc/profile'

type Full = Awaited<ReturnType<typeof loadFullProfile>>

// Interactive layer of the public profile. The page itself is server-rendered so search engines see it.
// Signed-in visitors are sent to the in-app version (owners edit, members message/invite).
export default function PublicProfileClient({ full, inSite = false }: { full: Full; inSite?: boolean }) {
  const router = useRouter()
  const p = full.profile!
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const me = session?.user?.id
      if (me) { router.replace(me === p.id ? '/me' : '/talent/' + p.id); return }
      supabase.from('profile_views').insert({ profile_id: p.id, viewer_id: null }).then(() => {}, () => {})
    })
  }, [p.id, router])

  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: fullName(p), url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); toast('Link copied') } } catch { /* dismissed */ }
  }
  return (
    // On the website (/performers/<slug>) it sits under the site nav as an inset, rounded card
    <div className={inSite ? 'bg-bg px-3 pb-16 pt-[84px] text-ink md:px-6 md:pt-[100px]' : 'min-h-dvh bg-bg text-ink'}>
      <div className={inSite ? 'mx-auto w-full max-w-[760px] [&>section:first-child]:overflow-hidden [&>section:first-child]:rounded-[28px]' : 'mx-auto w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px]'}>
        <ProfileView
          data={full}
          onBack={() => (window.history.length > 1 ? router.back() : router.push('/people'))}
          onShare={share}
          actions={<>
            <Link href="/welcome" className={heroPrimary}><Icon name="chat" className="size-[18px]" /> Message {p.first_name || ''}</Link>
            <Link href="/start?role=performer" className={heroSecondary}>Join The Ident</Link>
          </>}
          statusLine="On The Ident — the career app for performers"
        />
        <p className="pb-10 text-center text-xs text-faint">Made with <Link href="https://www.theident.me/" className="font-medium text-green-ink">The Ident</Link> · <Link href="/people" className="font-medium text-green-ink">Browse more talent</Link></p>
      </div>
      <Toaster />
    </div>
  )
}
