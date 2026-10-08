'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Old address kept for links already out there. Logging in happens on the photo entry screen;
// password resets have their own pages. Hash tokens from older reset emails are carried across.
export default function LoginRedirect() {
  const router = useRouter()
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    const side = q.get('side') === 'cast' || q.get('next') === '/postings' ? 'cast' : 'perform'
    if (q.get('reset')) router.replace('/reset-password' + window.location.hash)
    else if (q.get('forgot')) router.replace('/forgot-password?side=' + side)
    else router.replace('/welcome?side=' + side)
  }, [router])
  return <main className="min-h-dvh bg-bg" />
}
