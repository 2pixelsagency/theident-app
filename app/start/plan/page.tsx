'use client'

import { useState } from 'react'
import PlanPaywall from '@/components/rc/PlanPaywall'
import { dashboardFor, isRole } from '@/lib/rc/onboarding'

// Last onboarding step: start the membership (no free tier). Finishes on the dashboard for their side.
export default function ChoosePlan() {
  const [role] = useState(() => { const r = new URLSearchParams(window.location.search).get('role'); return isRole(r) ? r : null })
  return <PlanPaywall role={role} next={dashboardFor(role)} firstTime />
}
