'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import ProfileView, { heroPrimary, heroSecondary } from '@/components/rc/ProfileView'
import { ClientOnly, Empty, PageLoading, Toaster, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { loadFullProfile } from '@/lib/rc/profile'

// Public profile link (theident.me/<slug>). Same immersive layout as in the app.
// Signed-in visitors are sent to the in-app version so owners can edit and casters can invite.
function PublicProfile() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()

  const { data, loading } = useAsync(async () => {
    const [{ data: { session } }, { data: row }] = await Promise.all([
      supabase.auth.getSession(),
      supabase.from('profiles').select('id, show_talent').eq('slug', slug).maybeSingle(),
    ])
    if (!row) return { state: 'missing' as const }
    const me = session?.user?.id
    if (me) return { state: 'redirect' as const, to: me === row.id ? '/me' : '/talent/' + row.id }
    if (row.show_talent === false) return { state: 'hidden' as const }
    supabase.from('profile_views').insert({ profile_id: row.id, viewer_id: null }).then(() => {}, () => {})
    return { state: 'ok' as const, full: await loadFullProfile(row.id, false) }
  }, [slug])

  useEffect(() => { if (data?.state === 'redirect') router.replace(data.to) }, [data, router])

  if (loading || !data || data.state === 'redirect') return <PageLoading />
  if (data.state !== 'ok' || !data.full.profile) {
    return (
      <div className="px-6 pt-24">
        <Empty icon="user" title={data.state === 'hidden' ? 'This profile is private' : 'Profile not found'} sub={data.state === 'hidden' ? 'The owner has hidden it from public view.' : 'Check the link and try again.'} />
        <Link href="/welcome" className="mx-auto mt-6 block w-fit text-sm font-medium text-green-ink">Go to RoleCall ›</Link>
      </div>
    )
  }

  const p = data.full.profile
  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: fullName(p), url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); toast('Link copied') } } catch { /* dismissed */ }
  }

  return (
    <>
      <ProfileView
        data={data.full}
        onBack={() => (window.history.length > 1 ? router.back() : router.push('/welcome'))}
        onShare={share}
        actions={<>
          <Link href="/welcome" className={heroPrimary}><Icon name="chat" className="size-[18px]" /> Message {p.first_name || ''}</Link>
          <Link href="/start?role=performer" className={heroSecondary}>Join RoleCall</Link>
        </>}
        statusLine="On RoleCall — the career app for performers"
      />
      <p className="pb-10 text-center text-xs text-faint">Made with <Link href="/welcome" className="font-medium text-green-ink">RoleCall</Link></p>
    </>
  )
}

export default function PublicProfilePage() {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <div className="mx-auto w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px]">
        <ClientOnly><PublicProfile /></ClientOnly>
      </div>
      <Toaster />
    </div>
  )
}
