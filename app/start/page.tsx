'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PageLoading } from '@/components/rc/ui'
import { isRole, readDraft, startSignup } from '@/lib/rc/onboarding'

// No role chooser: the Perform / Cast toggle on the entry screen already picked the side.
// /start?role=… (or an in-progress draft) goes straight into the questions; otherwise back to pick a side.
export default function StartSignup() {
  const router = useRouter()

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('role')
    const role = isRole(q) ? q : readDraft()?.role
    router.replace(role ? startSignup(role) : '/welcome')
  }, [router])

  return <PageLoading />
}
