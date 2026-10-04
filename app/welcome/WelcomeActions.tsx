'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { supabase } from '@/lib/supabase'

type Provider = 'apple' | 'google'

export default function WelcomeActions() {
  const router = useRouter()
  const [pending, setPending] = useState<Provider | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Already signed in: skip the splash
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/home') })
  }, [router])

  const signInWith = async (provider: Provider) => {
    setPending(provider)
    setError(null)
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + '/start/finish' },
    })
    // On success the browser navigates away; only failures land here
    if (oauthErr) {
      setError('Couldn’t start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Please try again.')
      setPending(null)
    }
  }

  const outline = 'flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/25 bg-white/10 text-[15px] font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-60'

  return (
    <div>
      <Link href="/start" className="flex h-14 w-full items-center justify-center rounded-[14px] bg-green text-base font-medium text-white transition-opacity hover:opacity-90">
        Create account
      </Link>

      <div className="mt-3 flex gap-3">
        <button type="button" className={outline} onClick={() => signInWith('apple')} disabled={pending !== null}>
          <Icon name="apple" className="size-[18px]" />{pending === 'apple' ? 'Opening…' : 'Apple'}
        </button>
        <button type="button" className={outline} onClick={() => signInWith('google')} disabled={pending !== null}>
          <Icon name="google" className="size-[18px]" />{pending === 'google' ? 'Opening…' : 'Google'}
        </button>
      </div>

      {error && <p role="alert" className="mt-3 text-center text-sm text-pink">{error}</p>}
    </div>
  )
}
