'use client'

import { Suspense, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav, SideNav, isTabRoot } from '@/components/rc/nav'
import { PageLoading, Toaster, cx, listenNav, trackNav } from '@/components/rc/ui'
import { MeProvider, useMe } from '@/lib/rc/me'
import { VerifyGate } from '@/components/rc/verify'
import PushModal from '@/components/rc/PushModal'
import PlanPaywall from '@/components/rc/PlanPaywall'

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role, profile, hasPlan } = useMe()
  useEffect(() => listenNav(), [])
  useEffect(() => { trackNav() }, [pathname])
  const showNav = isTabRoot(pathname, role) && !(profile && !hasPlan)
  // Soft gate: browsing is open, but applying and posting wait for a verified email (also enforced by RLS)
  // No free tier: without a membership (trial, paid, grace, demo or admin) only these pages open
  const paywalled = profile && !hasPlan && !/^\/(plan|settings|help|verify)(\/|$)/.test(pathname)
  const gated = profile && !profile.email_verified
    ? /^\/find\/[^/]+\/apply$/.test(pathname) ? 'apply' : pathname === '/postings/new' ? 'post' : null
    : null
  return (
    <>
      <SideNav />
      {/* Phone: single column. Desktop: content column beside the left rail. */}
      <div className="lg:pl-64">
        <div className={cx('mx-auto min-h-dvh w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] lg:pb-12', showNav && 'pb-32')}><Suspense fallback={<PageLoading />}>{paywalled ? <div className="flex min-h-dvh flex-col px-6 pb-8"><PlanPaywall role={role} next={pathname} /></div> : gated ? <VerifyGate action={gated} /> : children}</Suspense></div>
      </div>
      {showNav && <BottomNav />}
      <Toaster />
      {profile && hasPlan && <PushModal caster={role === 'caster'} />}
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
