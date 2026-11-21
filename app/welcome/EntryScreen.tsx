'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { dashboardFor, startSignup, type Role } from '@/lib/rc/onboarding'
import { authRedirect } from '@/lib/rc/authRedirect'

type Side = 'perform' | 'cast'

// The log-in screen, with two sides. The Perform / Cast toggle is the user choosing their side:
// it swaps hero + copy in place and carries through to both Log in (→ that side's dashboard)
// and Sign up (→ straight into that side's questions, never asked again).
// Apple / Google buttons only once they're enabled in Supabase: set NEXT_PUBLIC_SOCIAL_LOGIN=apple,google
const SOCIAL = (process.env.NEXT_PUBLIC_SOCIAL_LOGIN || '').split(',').map(x => x.trim()).filter(Boolean)

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
// Pill slides over 400ms; hero photo, banner and copy cross-fade over ~280ms (both ease-out, no overshoot)
const SLIDE = 'duration-[400ms] ease-out'
const FADE = 'duration-[280ms] ease-out will-change-[opacity]'

export default function EntryScreen() {
  const router = useRouter()
  const [side, setSide] = useState<Side>(useSearchParams().get('side') === 'cast' ? 'cast' : 'perform')
  const [firstSide] = useState(side)
  const [broken, setBroken] = useState<Partial<Record<Side, boolean>>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState<'email' | 'apple' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [unconfirmed, setUnconfirmed] = useState(false)
  const s = SIDES[side]

  // Already signed in: skip the entry screen — unless this is a password-recovery link that fell back to the
  // site URL (e.g. the reset page isn't in Supabase's Redirect URLs yet): send it to the reset page instead.
  useEffect(() => {
    const recovery = /type=recovery/.test(window.location.hash) || new URLSearchParams(window.location.search).get('type') === 'recovery'
    if (recovery) { router.replace('/reset-password' + window.location.search + window.location.hash); return }
    const { data: sub } = supabase.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') router.replace('/reset-password') })
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/home') })
    return () => sub.subscription.unsubscribe()
  }, [router])

  const signUp = (role: Role) => router.push(startSignup(role))

  const logIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setUnconfirmed(false)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter a valid email address.'); return }
    setBusy('email')
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (err || !data.user) {
      setBusy(null)
      if (err?.status === 429) setError('Too many attempts — please wait a minute and try again.')
      else if (/not confirmed/i.test(err?.message || '') || err?.code === 'email_not_confirmed') { setUnconfirmed(true); setError('Confirm your email first — check your inbox for the link.') }
      else if (/invalid login credentials/i.test(err?.message || '') || err?.code === 'invalid_credentials') setError('That email and password don’t match. Try again or reset your password.')
      else setError('We couldn’t log you in just now. Check your connection and try again.')
      return
    }
    // Accounts are one type for good: log in to the side the account belongs to, whichever toggle was showing
    const { data: p } = await supabase.from('profiles').select('first_name, account_role').eq('id', data.user.id).maybeSingle()
    const side: Role = p?.account_role === 'caster' ? 'caster' : 'performer'
    // Never finished onboarding → pick up at question 1
    if (!p?.first_name) { startSignup(side); router.replace('/start/profile'); return }
    router.replace(dashboardFor(side))
  }

  const resendConfirm = async () => {
    const { error: err } = await supabase.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: authRedirect('/start/profile') } })
    setUnconfirmed(false)
    setError(err ? (err.status === 429 ? 'Please wait a minute before asking again.' : 'We couldn’t resend the email.') : 'Sent — check your inbox for the new link.')
  }

  const oauth = async (provider: 'apple' | 'google') => {
    setError(null)
    setBusy(provider)
    // The return URL must stay as allow-listed in Supabase; carry the chosen side in session storage
    try { sessionStorage.setItem('rc-side', s.role) } catch { /* private mode: lands on /home */ }
    const { error: err } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: authRedirect('/start/finish') } })
    if (err) { setError('Couldn’t start ' + (provider === 'apple' ? 'Apple' : 'Google') + ' sign-in. Please try again.'); setBusy(null) }
  }

  const glass = 'h-[52px] w-full rounded-[10px] border border-white/20 bg-white/10 px-4 text-[16px] text-white outline-none backdrop-blur-md transition placeholder:text-white/60 focus:border-white/50'
  const round = 'inline-flex size-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition active:scale-95 disabled:opacity-60'

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-dark text-white">
      {/* Full-bleed heroes, stacked and cross-faded; they run behind the notch */}
      {ORDER.map(k => (
        <div key={k} aria-hidden="true" className={cx('absolute inset-0 -z-20 transition-opacity', FADE, side === k ? 'opacity-100' : 'opacity-0')}>
          {broken[k]
            ? <div className="size-full bg-hero" />
            // next/image serves a resized WebP/AVIF instead of the full-size upload
            : <Image src={SIDES[k].hero} alt="" fill
                // Both heroes load up front so switching never shows a blank frame: the side shown first is preloaded
                // in <head>, the other downloads straight away at low priority instead of waiting until it's shown
                {...(k === firstSide ? { preload: true } : { loading: 'eager' as const, fetchPriority: 'low' as const })}
                sizes="(min-width: 640px) 640px, 100vw"
                className="object-cover" style={{ objectPosition: SIDES[k].position }} onError={() => setBroken(b => ({ ...b, [k]: true }))} />}
        </div>
      ))}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-scrim" />

      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        <div className="flex-1" />

        {/* Perform / Cast segmented toggle: the white pill slides, labels cross-fade */}
        <div role="group" aria-label="I want to" className="relative grid w-fit grid-cols-2 rounded-full border border-white/25 bg-white/15 p-1 backdrop-blur-md">
          <span aria-hidden="true" className={cx('absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-white transition-transform', SLIDE, side === 'cast' && 'translate-x-full')} />
          {ORDER.map(k => (
            <button key={k} type="button" aria-pressed={side === k} onClick={() => setSide(k)}
              className={cx('relative z-10 h-11 w-[124px] rounded-full text-[15px] font-medium transition-colors', SLIDE, side === k ? 'text-ink' : 'text-white')}>
              {SIDES[k].label}
            </button>
          ))}
        </div>

        {/* Headline + sub, cross-faded in one grid cell so the layout doesn't jump */}
        <div className="mt-5 grid">
          {ORDER.map(k => (
            <div key={k} aria-hidden={side !== k} className={cx('transition-opacity [grid-area:1/1]', FADE, side === k ? 'opacity-100' : 'opacity-0')}>
              <h1 className="text-[32px] leading-[1.05] text-white">{SIDES[k].title[0]}<br />{SIDES[k].title[1]}</h1>
              <p className="mt-3 text-[15px] font-light leading-[1.5] text-white/85">{SIDES[k].sub}</p>
            </div>
          ))}
        </div>

        {/* Log in over the photo */}
        <form onSubmit={logIn} className="mt-6 space-y-3">
          <input type="email" autoComplete="email" required aria-label="Email" placeholder="Email" value={email} onChange={e => { setEmail(e.target.value); setError(null) }} className={glass} />
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required aria-label="Password" placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setError(null) }} className={cx(glass, 'pr-16')} />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium text-white/75">{showPw ? 'Hide' : 'Show'}</button>
          </div>
          {error && <p role="alert" className="rounded-xl bg-blossom/95 px-3.5 py-2.5 text-[14px] text-ink">{error}{unconfirmed && <> <button type="button" onClick={resendConfirm} className="font-semibold underline">Resend the link</button></>}</p>}
          <button type="submit" disabled={busy !== null || !email || !password} className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-cta text-[17px] font-semibold text-ink shadow-cta transition active:scale-[0.99] disabled:opacity-70">
            {busy === 'email' ? 'Logging in…' : <>Log in <Icon name="arrow-right" className="size-5" /></>}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between">
          <Link href={'/forgot-password?side=' + side + (email ? '&email=' + encodeURIComponent(email.trim()) : '')} className="text-[13px] font-medium text-white/80">Forgot password?</Link>
          {SOCIAL.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-white/60">or</span>
              {SOCIAL.includes('apple') && <button type="button" aria-label="Continue with Apple" onClick={() => oauth('apple')} disabled={busy !== null} className={round}><Icon name="apple" className="size-5" /></button>}
              {SOCIAL.includes('google') && <button type="button" aria-label="Continue with Google" onClick={() => oauth('google')} disabled={busy !== null} className={round}><Icon name="google" className="size-5" /></button>}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-white/55"><span className="h-px flex-1 bg-white/25" />New here?<span className="h-px flex-1 bg-white/25" /></div>
        <button type="button" onClick={() => signUp(s.role)} className="mt-3 flex h-14 w-full items-center justify-center rounded-[10px] border border-white/40 bg-white/10 text-[16px] font-semibold text-white backdrop-blur-md transition active:scale-[0.99]">
          Create a {s.role === 'caster' ? 'casting' : 'performer'} account
        </button>
      </div>
    </main>
  )
}
