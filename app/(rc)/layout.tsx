'use client'

import { Suspense, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav, SideNav, isTabRoot } from '@/components/rc/nav'
import { PageLoading, Toaster, cx, listenNav, trackNav } from '@/components/rc/ui'
import { MeProvider, useMe } from '@/lib/rc/me'
import { VerifyGate } from '@/components/rc/verify'
import PushModal from '@/components/rc/PushModal'
import PlanPaywall from '@/components/rc/PlanPaywall'
import Tour from '@/components/rc/Tour'
import HomeSidebar from '@/components/rc/HomeSidebar'
import { useIsDesktop } from '@/lib/rc/useIsDesktop'

// Screens that use the full desktop width
const WIDE = /^\/(home|find|classes|postings|talent|digs|whats-on|castings|chats|inbox|todo|blocks|diary|pay|tax|money)\/?$/
// Wide screens that also get the sticky profile sidebar (Home draws its own)
const ASIDE = /^\/(find|classes|postings|talent|digs|whats-on|castings|chats|inbox|todo|blocks|diary|pay|tax|money)\/?$/

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role, profile, hasPlan } = useMe()
  const desktop = useIsDesktop()
  useEffect(() => listenNav(), [])
  useEffect(() => { trackNav() }, [pathname])
  const showNav = isTabRoot(pathname, role) && !(profile && !hasPlan)
  // Soft gate: browsing is open, but applying and posting wait for a verified email (also enforced by RLS)
  // No free tier: without a membership (trial, paid, grace, demo or admin) only these pages open
  const noPlan = !!profile && !hasPlan
  const paywalled = noPlan && !/^\/(plan|settings|help|verify)(\/|$)/.test(pathname)
  const gated = profile && !profile.email_verified
    ? /^\/find\/[^/]+\/apply$/.test(pathname) ? 'apply' : pathname === '/postings/new' ? 'post' : null
    : null
  return (
    <>
      {/* No membership: no app navigation either — just the membership screen (and Settings/Help/Verify) */}
      {!noPlan && <SideNav />}
      {profile && !noPlan && <Tour role={role} autoStart={pathname === '/home'} />}
      {/* Phone: single column. Desktop: beside the slim rail — boards and Home go wide, detail screens stay readable. */}
      <div className={noPlan ? '' : 'lg:pl-[76px]'}>
        <div className={cx('mx-auto min-h-dvh w-full max-w-[480px] md:max-w-[640px] lg:pb-12', WIDE.test(pathname) ? 'lg:max-w-[1180px] lg:px-6' : 'lg:max-w-[760px]', showNav && 'pb-[calc(84px+env(safe-area-inset-bottom))] lg:pb-12')}><Suspense fallback={<PageLoading />}>{paywalled ? <div className="flex min-h-dvh flex-col px-6 pb-8"><PlanPaywall role={role} next={pathname} /></div> : gated ? <VerifyGate action={gated} />
          : desktop && ASIDE.test(pathname) ? (
            <div className="grid grid-cols-[minmax(0,1fr)_340px] gap-6 pt-6">
              <div className="min-w-0">{children}</div>
              <div className="sticky top-6 self-start"><HomeSidebar /></div>
            </div>
          ) : children}</Suspense></div>
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
