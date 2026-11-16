'use client'

import { Suspense, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav, SideNav, isTabRoot } from '@/components/rc/nav'
import { PageLoading, Toaster, cx, trackNav } from '@/components/rc/ui'
import { MeProvider, useMe } from '@/lib/rc/me'
import { VerifyGate } from '@/components/rc/verify'
import PushModal from '@/components/rc/PushModal'

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role, profile } = useMe()
  useEffect(() => { trackNav() }, [pathname])
  const showNav = isTabRoot(pathname, role)
  // Soft gate: browsing is open, but applying and posting wait for a verified email (also enforced by RLS)
  const gated = profile && !profile.email_verified
    ? /^\/find\/[^/]+\/apply$/.test(pathname) ? 'apply' : pathname === '/postings/new' ? 'post' : null
    : null
  return (
    <>
      <SideNav />
      {/* Phone: single column. Desktop: content column beside the left rail. */}
      <div className="lg:pl-64">
        <div className={cx('mx-auto min-h-dvh w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] lg:pb-12', showNav && 'pb-32')}><Suspense fallback={<PageLoading />}>{gated ? <VerifyGate action={gated} /> : children}</Suspense></div>
      </div>
      {showNav && <BottomNav />}
      <Toaster />
      {profile && <PushModal caster={role === 'caster'} />}
    </>
  )
}

export default function IdentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <MeProvider>
        <Shell>{children}</Shell>
      </MeProvider>
    </div>
  )
}
