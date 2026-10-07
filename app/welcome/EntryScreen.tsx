'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import type { Role } from '@/lib/rc/onboarding'

type Side = 'perform' | 'cast'

// One entry screen, two sides. The toggle swaps hero, copy and button targets in place.
const SIDES: Record<Side, { role: Role; label: string; hero: string; position: string; banner: string; title: [string, string]; sub: string; loginNext: string }> = {
  perform: {
    role: 'performer',
    label: 'Perform',
    hero: '/welcome-hero.webp',
    position: '54% center',
    banner: 'Get discovered faster',
    title: ['Your whole career,', 'in one place.'],
    sub: 'Find roles and side hustles, apply with your reel, and track every booking — all in one app.',
    loginNext: '/home',
  },
  cast: {
    role: 'caster',
    label: 'Cast',
    // Placeholder until a casting-room / audition shot is supplied
    hero: '/welcome-cast.webp',
    position: 'center 22%',
    banner: 'Casting a production?',
    title: ['Find your cast,', 'in one place.'],
    sub: 'Post roles, review self-tapes, and book talent — audition to offer, all in one app.',
    loginNext: '/postings',
  },
}
const ORDER: Side[] = ['perform', 'cast']
const EASE = 'duration-[400ms] ease-out'

export default function EntryScreen() {
  const router = useRouter()
  const [side, setSide] = useState<Side>('perform')
  const [broken, setBroken] = useState<Partial<Record<Side, boolean>>>({})
  const s = SIDES[side]

  // Already signed in: skip the entry screen
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/home') })
  }, [router])

  const start = (role: Role) => '/start?role=' + role

  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-dark text-white">
      {/* Full-bleed heroes, stacked and cross-faded; they run behind the notch */}
      {ORDER.map(k => (
        <div key={k} aria-hidden="true" className={cx('absolute inset-0 -z-20 transition-opacity', EASE, side === k ? 'opacity-100' : 'opacity-0')}>
          {broken[k]
            ? <div className="size-full bg-hero" />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={SIDES[k].hero} alt="" className="size-full object-cover" style={{ objectPosition: SIDES[k].position }}
                ref={el => { if (el?.complete && el.naturalWidth === 0) setBroken(b => (b[k] ? b : { ...b, [k]: true })) }} // failed before hydration
                onError={() => setBroken(b => ({ ...b, [k]: true }))} />}
        </div>
      ))}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-scrim" />

      <div className="mx-auto flex w-full max-w-[430px] flex-1 flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))]">
        {/* Audience-specific banner */}
        <div className="grid text-[13px]">
          {ORDER.map(k => (
            <p key={k} aria-hidden={side !== k} className={cx('flex items-center gap-2 transition-opacity [grid-area:1/1]', EASE, side === k ? 'opacity-100' : 'pointer-events-none opacity-0')}>
              <Icon name="sparkle" className="size-4 shrink-0 text-pink" />
              <span className="text-white/90">{SIDES[k].banner} — <Link href={start(SIDES[k].role)} tabIndex={side === k ? 0 : -1} className="font-medium text-white underline underline-offset-2">try RoleCall Pro</Link></span>
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
        <div className="mt-6 grid">
          {ORDER.map(k => (
            <div key={k} aria-hidden={side !== k} className={cx('transition-opacity [grid-area:1/1]', EASE, side === k ? 'opacity-100' : 'opacity-0')}>
              <h1 className="text-[36px] leading-[1.05] text-white">{SIDES[k].title[0]}<br />{SIDES[k].title[1]}</h1>
              <p className="mt-4 text-[16px] font-light leading-[1.55] text-white/85">{SIDES[k].sub}</p>
            </div>
          ))}
        </div>

        <Link href={start(s.role)} className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-[14px] bg-cta text-[17px] font-medium text-white shadow-cta transition active:scale-[0.99]">
          Get started <Icon name="arrow-right" className="size-5" />
        </Link>

        <p className="mt-5 text-center text-[15px] text-white/90">
          Already have an account?{' '}
          <Link href={'/login?next=' + encodeURIComponent(s.loginNext)} className="font-medium text-pink">Log in</Link>
        </p>
      </div>
    </main>
  )
}
