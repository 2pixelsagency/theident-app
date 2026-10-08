import type { Metadata } from 'next'
import { Suspense } from 'react'
import EntryScreen from './EntryScreen'

export const metadata: Metadata = {
  title: 'Welcome · RoleCall',
}

// Log-in screen with the Perform / Cast toggle (?side=cast opens on the casting side)
export default function WelcomePage() {
  return <Suspense fallback={<main className="min-h-dvh bg-dark" />}><EntryScreen /></Suspense>
}
