'use client'

import { useSyncExternalStore } from 'react'
import PlanPaywall from '@/components/rc/PlanPaywall'
import { dashboardFor, isRole } from '@/lib/rc/onboarding'

// Last onboarding step: start the membership (no free tier). Finishes on the dashboard for their side.
// The ?role hint is read hydration-safely (reading window in a state initializer showed casting the performer price).
const noop = () => () => {}
export default function ChoosePlan() {
  const search = useSyncExternalStore(noop, () => window.location.search, () => '')
  const r = new URLSearchParams(search).get('role'), role = isRole(r) ? r : null
  return <PlanPaywall role={role} next={dashboardFor(role)} firstTime />
}
