'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav, SideNav, isTabRoot } from '@/components/rc/nav'
import { PageLoading, Toaster, cx } from '@/components/rc/ui'
import { MeProvider, useMe } from '@/lib/rc/me'

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role } = useMe()
  const showNav = isTabRoot(pathname, role)
  return (
    <>
      <SideNav />
      {/* Phone: single column. Desktop: content column beside the left rail. */}
      <div className="lg:pl-64">
        <div className={cx('mx-auto min-h-dvh w-full max-w-[480px] md:max-w-[640px] lg:max-w-[720px] lg:pb-12', showNav && 'pb-32')}><Suspense fallback={<PageLoading />}>{children}</Suspense></div>
      </div>
      {showNav && <BottomNav />}
      <Toaster />
    </>
  )
}

export default function RoleCallLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <MeProvider>
        <Shell>{children}</Shell>
      </MeProvider>
    </div>
  )
}
