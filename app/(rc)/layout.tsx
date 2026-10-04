'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { BottomNav, isTabRoot } from '@/components/rc/nav'
import { PageLoading, Toaster, cx } from '@/components/rc/ui'
import { MeProvider, useMe } from '@/lib/rc/me'

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role } = useMe()
  const showNav = isTabRoot(pathname, role)
  return (
    <>
      <div className={cx('mx-auto min-h-dvh w-full max-w-[480px]', showNav && 'pb-24')}><Suspense fallback={<PageLoading />}>{children}</Suspense></div>
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
