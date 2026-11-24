'use client'

import { useRouter } from 'next/navigation'
import { Segmented } from '@/components/rc/ui'

export type FindTab = 'roles' | 'side' | 'people'
const HREF: Record<FindTab, string> = { roles: '/find', side: '/find?tab=side', people: '/talent' }

// The one switcher across Find (roles, side hustles) and People, so the screen doesn't jump when you change tab.
// Tabs replace rather than push, so Back leaves search instead of stepping through every tab you tried.
export default function FindTabs({ value, onChange }: { value: FindTab; onChange?: (t: FindTab) => void }) {
  const router = useRouter()
  return (
    <Segmented value={value} onChange={t => (onChange ? onChange(t) : router.replace(HREF[t], { scroll: false }))}
      options={[{ value: 'roles', label: 'Roles' }, { value: 'side', label: 'Side hustles' }, { value: 'people', label: 'People' }]} />
  )
}
