'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { dashboardFor, startSignup, switchSide, type Role } from '@/lib/rc/onboarding'

type Side = 'perform' | 'cast'

// The log-in screen, with two sides. The Perform / Cast toggle is the user choosing their side:
// it swaps hero + copy in place and carries through to both Log in (→ that side's dashboard)
// and Sign up (→ straight into that side's questions, never asked again).
const SIDES: Record<Side, { role: Role; label: string; hero: string; position: string; banner: string; title: [string, string]; sub: string }> = {
  perform: {
    role: 'performer',
    label: 'Perform',
    hero: '/welcome-hero.webp',
    position: '54% center',
    banner: 'Get discovered faster',
    title: ['Your whole career,', 'in one place.'],
    sub: 'Find roles and side hustles, apply with your reel, and track every booking — all in one app.',
  },
  cast: {
    role: 'caster',
    label: 'Cast',
    // Placeholder portrait until a casting-room / audition shot is supplied
    hero: '/casting-hero.png',
    position: 'center 22%',
    banner: 'Casting a production?',
    title: ['Find your cast,', 'in one place.'],
    sub: 'Post roles, review self-tapes, and book talent — audition to offer, all in one app.',
  },
}
const ORDER: Side[] = ['perform', 'cast']
const EASE = 'duration-[400ms] ease-out'

export default function EntryScreen() {
  const router = useRouter()
  const [side, setSide] = useState<Side>(useSearchParams().get('side') === 'cast' ? 'cast' : 'perform')
  const [broken, setBroken] = useState<Partial<Record<Side, boolean>>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState<'email' | 'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const s = SIDES[side]

  // Already signed in: skip the entry screen
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/home') })
  }, [router])

  const signUp = (role: Role) => router.push(startSignup(role))

  const logIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy('email')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err || !data.user) {
      setError(err?.message === 'Invalid login credentials' ? 'That email and password don’t match. Try again or reset your password.' : err?.message || 'Couldn’t log in')
      setBusy(null)
      return
    }
    await switchSide(data.user.id, s.role)
    router.replace(dashboardFor(s.role))
  }

  const oauth = async (provider: 'apple' | 'google') => {
    setError(null)
    setBusy(provider)
    // The return URL must stay as allow-listed in Supabase; carry the chosen side in session storage
    try { sessionStorage.setItem('rc-side', s.role) } catch { /* private mode: lands on /home */ }
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin + '/start/finish' } })
    if (err) { setError('Couldn’t start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Please try again.'); setBusy(null) }
  }

  const glass = 'h-[52px] w-full rounded-[14px] border border-white/20 bg-white/10 px-4 text-[16px] text-white outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/50'
  const round = 'inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition active:scale-95 disabled:opacity-60'

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-dark text-white">
      {/* Full-bleed heroes, stacked and cross-faded; they run behind the notch */}
      {ORDER.map(k => (
        <div key={k} aria-hidden="true" className={cx('absolute inset-0 -z-20 transition-opacity', EASE, side === k ? 'opacity-100' : 'opacity-0')}>
          {broken[k]
            ? <div className="size-full bg-hero" />
            // next/image serves a resized WebP/AVIF instead of the full-size upload
            : <Image src={SIDES[k].hero} alt="" fill priority={k === 'perform'} sizes="(min-width: 640px) 640px, 100vw"
                className="object-cover" style={{ objectPosition: SIDES[k].position }} onError={() => setBroken(b => ({ ...b, [k]: true }))} />}
        </div>
      ))}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-scrim" />

      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        {/* Audience-specific banner */}
        <div className="grid text-[13px]">
          {ORDER.map(k => (
            <p key={k} aria-hidden={side !== k} className={cx('flex items-center gap-2 transition-opacity [grid-area:1/1]', EASE, side === k ? 'opacity-100' : 'pointer-events-none opacity-0')}>
              <Icon name="sparkle" className="size-4 shrink-0 text-pink" />
              <span className="text-white/90">{SIDES[k].banner} — <button type="button" onClick={() => signUp(SIDES[k].role)} tabIndex={side === k ? 0 : -1} className="font-medium text-white underline underline-offset-2">try RoleCall Pro</button></span>
            </p>
          ))}
        </div>

        <div className="flex-1" />

        {/* Perform / Cast segmented toggle: the white pill slides, labels cross-fade */}
        <div role="group" aria-label="I want to" className="relative grid w-fit grid-cols-2 rounded-full border border-white/25 bg-white/15 p-1 backdrop-blur-md">
          <span aria-hidden="true" className={cx('absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white transition-transform', EASE, side === 'cast' && 'translate-x-full')} />
          {ORDER.map(k => (
            <button key={k} type="button" aria-pressed={side === k} onClick={() => setSide(k)}
              className={cx('relative z-10 h-11 w-[124px] rounded-full text-[15px] font-medium transition-colors', EASE, side === k ? 'text-ink' : 'text-white')}>
              {SIDES[k].label}
            </button>
          ))}
        </div>

        {/* Headline + sub, cross-faded in one grid cell so the layout doesn't jump */}
        <div className="mt-5 grid">
          {ORDER.map(k => (
            <div key={k} aria-hidden={side !== k} className={cx('transition-opacity [grid-area:1/1]', EASE, side === k ? 'opacity-100' : 'opacity-0')}>
              <h1 className="text-[32px] leading-[1.05] text-white">{SIDES[k].title[0]}<br />{SIDES[k].title[1]}</h1>
              <p className="mt-3 text-[15px] font-light leading-[1.5] text-white/85">{SIDES[k].sub}</p>
            </div>
          ))}
        </div>

        {/* Log in over the photo */}
        <form onSubmit={logIn} className="mt-6 space-y-3">
          <input type="email" autoComplete="email" required aria-label="Email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className={glass} />
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required aria-label="Password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className={cx(glass, 'pr-16')} />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-white/75">{showPw ? 'Hide' : 'Show'}</button>
          </div>
          {error && <p role="alert" className="text-sm text-pink">{error}</p>}
          <button type="submit" disabled={busy !== null || !email || !password} className="flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-cta text-[17px] font-medium text-white shadow-cta transition active:scale-[0.99] disabled:opacity-70">
            {busy === 'email' ? 'Logging in…' : <>Continue <Icon name="arrow-right" className="size-5" /></>}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between">
          <Link href={'/login?forgot=1&side=' + side} className="text-[13px] font-medium text-white/80">Forgot password?</Link>
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-white/60">or</span>
            <button type="button" aria-label="Continue with Apple" onClick={() => oauth('apple')} disabled={busy !== null} className={round}><Icon name="apple" className="size-5" /></button>
            <button type="button" aria-label="Continue with Google" onClick={() => oauth('google')} disabled={busy !== null} className={round}><Icon name="google" className="size-5" /></button>
          </div>
        </div>

        <p className="mt-5 text-center text-[15px] text-white/90">
          New to RoleCall?{' '}
          <button type="button" onClick={() => signUp(s.role)} className="font-medium text-pink">Sign up</button>
        </p>
      </div>
    </main>
  )
}
