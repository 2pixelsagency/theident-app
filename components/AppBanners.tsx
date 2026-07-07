'use client'

import EnableNotifications from '@/components/EnableNotifications'
import VerifyEmailBanner from '@/components/VerifyEmailBanner'

export default function AppBanners() {
  return (
    <div style={{ position: 'fixed', left: '12px', right: '12px', bottom: 'calc(env(safe-area-inset-bottom) + 84px)', zIndex: 300, display: 'flex', flexDirection: 'column', gap: '10px', pointerEvents: 'none' }}>
      <VerifyEmailBanner />
      <EnableNotifications />
    </div>
  )
}
