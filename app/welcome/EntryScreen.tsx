'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import LogoMark from '@/components/LogoMark'
import { cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { dashboardFor, startSignup, type Role } from '@/lib/rc/onboarding'
import { authRedirect } from '@/lib/rc/authRedirect'

type Side = 'perform' | 'cast'

// The log-in screen: a clean centred form on Paper (photo heroes set aside for now). The Perform / Cast
// toggle is the user choosing their side: it swaps the copy in place and carries through to both Log in (→ that side's dashboard)
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

  const field = 'h-12 w-full rounded-[14px] border border-line-strong bg-surface px-4 text-[16px] text-ink outline-none transition placeholder:text-faint focus:border-forest focus:ring-2 focus:ring-lime/50'
  const outline = 'flex h-12 w-full items-center justify-center gap-2 rounded-full border border-line-strong bg-surface text-[15px] font-semibold text-ink transition-colors hover:border-forest disabled:opacity-60'

  return (
    <main className="relative isolate flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bg px-6 py-[max(32px,env(safe-area-inset-top))] text-ink">
      {/* Faint frame lines around the form, fading out at the ends (the photo heroes are set aside for now) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 hidden sm:block">
        <span className="absolute left-1/2 top-0 h-full w-px -translate-x-[240px] bg-gradient-to-b from-transparent via-surface to-transparent" />
        <span className="absolute left-1/2 top-0 h-full w-px translate-x-[240px] bg-gradient-to-b from-transparent via-surface to-transparent" />
        <span className="absolute left-0 top-[12%] h-px w-full bg-gradient-to-r from-transparent via-surface to-transparent" />
        <span className="absolute bottom-[12%] left-0 h-px w-full bg-gradient-to-r from-transparent via-surface to-transparent" />
      </div>

      <div className="flex w-full max-w-[400px] flex-col items-center">
        <Link href="https://www.theident.me/" aria-label="The Ident" className="flex items-center gap-2 font-display text-[22px] font-bold tracking-[-0.03em] text-forest">
          <LogoMark className="size-5" />The Ident
        </Link>

        {/* Perform / Cast: the side carries through to Log in and Sign up */}
        <div role="group" aria-label="I want to" className="relative mt-8 grid w-fit grid-cols-2 rounded-full bg-sand-2 p-1">
          <span aria-hidden="true" className={cx('absolute bottom-1 left-1 top-1 w-[calc(50%-4px)] rounded-full bg-forest transition-transform', SLIDE, side === 'cast' && 'translate-x-full')} />
          {ORDER.map(k => (
            <button key={k} type="button" aria-pressed={side === k} onClick={() => setSide(k)}
              className={cx('relative z-10 h-10 w-[120px] rounded-full text-[14px] font-semibold transition-colors', SLIDE, side === k ? 'text-bg' : 'text-muted-strong')}>
              {SIDES[k].label}
            </button>
          ))}
        </div>

        <div className="mt-6 grid w-full text-center">
          {ORDER.map(k => (
            <div key={k} aria-hidden={side !== k} className={cx('transition-opacity [grid-area:1/1]', FADE, side === k ? 'opacity-100' : 'opacity-0')}>
              <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">Welcome back</h1>
              <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-[1.6] text-muted-strong">{SIDES[k].sub}</p>
            </div>
          ))}
        </div>

        {SOCIAL.length > 0 && (
          <div className="mt-7 w-full space-y-2.5">
            {SOCIAL.includes('google') && <button type="button" onClick={() => oauth('google')} disabled={busy !== null} className={outline}><Icon name="google" className="size-5" />Continue with Google</button>}
            {SOCIAL.includes('apple') && <button type="button" onClick={() => oauth('apple')} disabled={busy !== null} className={outline}><Icon name="apple" className="size-5" />Continue with Apple</button>}
            <div className="flex items-center gap-3 pt-2 text-[13px] text-muted"><span className="h-px flex-1 bg-line-strong" />or<span className="h-px flex-1 bg-line-strong" /></div>
          </div>
        )}

        <form onSubmit={logIn} className={cx('w-full space-y-3', SOCIAL.length ? 'mt-4' : 'mt-7')}>
          <input type="email" autoComplete="email" required aria-label="Email" placeholder="Email address" value={email} onChange={e => { setEmail(e.target.value); setError(null) }} className={field} />
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} autoComplete="current-password" required aria-label="Password" placeholder="Password" value={password} onChange={e => { setPassword(e.target.value); setError(null) }} className={cx(field, 'pr-12')} />
            <button type="button" onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'} aria-pressed={showPw}
              className={cx('absolute right-3 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors', showPw ? 'text-forest' : 'text-muted hover:text-ink')}>
              <Icon name="eye" strokeWidth={2} className="size-[18px]" />
            </button>
          </div>
          {error && <p role="alert" className="rounded-[12px] bg-blossom px-3.5 py-2.5 text-[13px] text-ink">{error}{unconfirmed && <> <button type="button" onClick={resendConfirm} className="font-semibold underline">Resend the link</button></>}</p>}
          <button type="submit" disabled={busy !== null || !email || !password} className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-forest text-[15px] font-semibold text-bg transition-colors hover:bg-lime hover:text-ink active:scale-[0.99] disabled:opacity-60">
            {busy === 'email' ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <Link href={'/forgot-password?side=' + side + (email ? '&email=' + encodeURIComponent(email.trim()) : '')}
          className="mt-4 text-[13px] font-medium text-ink underline decoration-lime decoration-dotted decoration-2 underline-offset-4 hover:decoration-forest">Forgot password</Link>

        <div className="mt-8 flex w-full items-center gap-3 text-[12px] uppercase tracking-[0.12em] text-muted"><span className="h-px flex-1 bg-line-strong" />New here?<span className="h-px flex-1 bg-line-strong" /></div>
        <button type="button" onClick={() => signUp(s.role)} className={cx(outline, 'mt-4')}>
          Create a {s.role === 'caster' ? 'casting' : 'performer'} account
        </button>
      </div>
    </main>
  )
}
