import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import WelcomeActions from './WelcomeActions'

export const metadata: Metadata = {
  title: 'Welcome · RoleCall',
}

const HIGHLIGHTS = ['Verified jobs', 'Self-tape & sign', 'Side hustles']

export default function WelcomePage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] text-white bg-hero">
      {/* Soft brand-colour glows (solid colours, blurred — not gradients) */}
      <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-16 -z-10 size-72 rounded-full bg-purple opacity-45 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[52%] -z-10 size-64 rounded-full bg-pink opacity-25 blur-3xl" />

      <div className="mx-auto flex w-full max-w-[390px] flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center pb-10 pt-24">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-green">
              <Icon name="check" className="size-6 text-white" strokeWidth={2} />
            </span>
            <span className="font-display text-[30px] leading-none tracking-[-0.02em]">RoleCall</span>
          </div>

          <h1 className="text-[28px] text-white">
            Your whole career,
            <br />
            in one place.
          </h1>

          <p className="mt-4 text-[15px] font-light leading-[1.6] text-white/80">
            Find roles, land the gig, track your work and keep building — all between jobs and on them.
          </p>

          <ul className="mt-7 grid grid-cols-3 gap-3">
            {HIGHLIGHTS.map(item => (
              <li key={item} className="flex items-start gap-2 text-[13px] leading-snug text-white/85">
                <Icon name="check" className="mt-0.5 size-3.5 shrink-0 text-green" strokeWidth={2} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <WelcomeActions />

        <p className="mt-6 text-center text-[15px] text-white/90">
          Already have an account?{' '}
          <Link href="/login" className="text-blue">Log in</Link>
        </p>

        <p className="mt-6 text-center text-xs font-light text-white/55">
          By continuing you agree to our Terms &amp; Privacy Policy.
        </p>
      </div>
    </main>
  )
}
