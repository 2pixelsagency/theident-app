import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import Typewriter from '@/components/rc/Typewriter'
import LiveRoles from './LiveRoles'
import { Cta, Eyebrow } from './Chrome'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

const PERFORMER = [
  { icon: 'send', title: 'Apply in a tap', body: 'Your reel, CV and self-tapes go with every application — no more re-sending files.' },
  { icon: 'briefcase', title: 'Every casting in one place', body: 'Applied, self-tape, recall, pencilled, booked. Know exactly where you stand.' },
  { icon: 'target', title: 'Goals & to-do', body: 'Set what you’re working towards — classes, showreel, headshots — and tick it off each week.' },
  { icon: 'chat', title: 'Cast chats', body: 'Company and rehearsal chats for every show, with an invite link for the whole cast.' },
  { icon: 'house', title: 'Digs & classes', body: 'Theatre digs near the stage door, and spare class spaces passed on by other performers.' },
  { icon: 'pound', title: 'Pay & tax', body: 'Log payments, send invoices and know what to set aside for self-assessment.' },
]
const CASTING = [
  { icon: 'megaphone', title: 'Post a role in minutes', body: 'Ask for exactly the materials you need, add an NDA, set a closing date.' },
  { icon: 'play', title: 'Review tapes inline', body: 'Watch reels and self-tapes, rate, shortlist and swipe through applicants.' },
  { icon: 'video', title: 'Recall your way', body: 'Ask for another tape, send a Zoom link, or book an in-person recall.' },
  { icon: 'users', title: 'Search talent', body: 'Find performers by skill, playing age and location — and invite them to your role.' },
]
const STEPS = [
  ['Build your profile once', 'Headshots, showreel, credits, skills and CV — your Ident is your casting card.'],
  ['Find and apply', 'Roles from casting directors and the community, filtered to what fits you.'],
  ['Get cast', 'Self-tapes, recalls, pencils and contracts — all tracked in the app.'],
]

export default function MarketingHome() {
  return (
    <>
      {/* Hero */}
      <section className="bg-glow">
        <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 pb-16 pt-14 md:grid-cols-[1.15fr_1fr] md:pt-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-[13px] font-medium shadow-card"><span className="size-2 rounded-full bg-lime ring-2 ring-forest/15" /> For performers &amp; casting teams</p>
            <h1 className="mt-5 min-h-[3.2em] text-[44px] leading-[1.04] md:min-h-[2.2em] md:text-[60px]">
              <Typewriter text="The home of casting for " words={['performers', 'actors', 'dancers', 'singers', 'casting teams']} />
            </h1>
            <p className="rise mt-4 max-w-[520px] text-[18px] text-muted" style={{ '--d': '700ms' } as React.CSSProperties}>Find castings, auditions and paid work. Apply with your reel, track every recall, and stay on top of your career — all in one app.</p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ '--d': '850ms' } as React.CSSProperties}>
              <Cta href="/start?role=performer">Start your {TRIAL_DAYS}-day free trial</Cta>
              <Cta href="/jobs" variant="outline">Browse live roles</Cta>
            </div>
            <p className="rise mt-4 text-[13px] text-muted" style={{ '--d': '950ms' } as React.CSSProperties}>Performers {price(PLANS.performer.pence)}/month · Casting {price(PLANS.casting.pence)}/month · cancel any time</p>
          </div>
          {/* Product glimpse */}
          <div aria-hidden className="rise relative mx-auto w-full max-w-[420px]" style={{ '--d': '300ms' } as React.CSSProperties}>
            <div className="rounded-[16px] bg-forest p-6 text-white shadow-[0_30px_60px_-30px_rgb(18_49_39/0.6)]">
              <p className="text-[13px] font-medium text-lime">Week 3 of your goal</p>
              <p className="mt-2 font-display text-[28px] font-bold">Hi, Ava</p>
              <div className="mt-5 space-y-3">
                {[['The Glass Orchard — Nell', 'Self-tape due Fri', 'bg-butter'], ['Harbour Lights — Witness', 'Video call · Tue 14:00', 'bg-mint'], ['Pulse — UK arena tour', 'Booked', 'bg-lime']].map(([t, s, tone]) => (
                  <div key={t} className="flex items-center justify-between gap-3 rounded-[12px] bg-white p-3.5 text-ink">
                    <span className="min-w-0"><span className="block truncate text-[14px] font-semibold">{t}</span><span className="block text-[12px] text-muted">{s}</span></span>
                    <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ' + tone}>{s.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-14 -left-8 hidden rounded-[12px] bg-surface p-4 shadow-card sm:block">
              <p className="text-[12px] text-muted">New role near you</p>
              <p className="text-[15px] font-semibold">Mrs Doubtfire — Swing</p>
              <p className="text-[12px] font-medium text-green-ink">£700 / week · Fair pay</p>
            </div>
          </div>
        </div>
      </section>

      {/* Live roles */}
      <section className="mx-auto max-w-[1180px] px-5 py-16">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div><Eyebrow>Live now</Eyebrow><h2 className="mt-2 text-[32px] leading-tight md:text-[40px]">Roles casting this week</h2></div>
          <Link href="/jobs" className="inline-flex items-center gap-1 text-[15px] font-semibold text-green-ink">See every role <Icon name="arrow-right" className="size-4" /></Link>
        </div>
        <LiveRoles />
      </section>

      {/* Performers */}
      <section className="bg-surface">
        <div className="mx-auto max-w-[1180px] px-5 py-16">
          <Eyebrow>For performers</Eyebrow>
          <h2 className="mt-2 max-w-[700px] text-[32px] leading-tight md:text-[40px]">Everything between “I saw a casting” and “I’m booked”.</h2>
          <div className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {PERFORMER.map(f => (
              <div key={f.title}>
                <span className="flex size-11 items-center justify-center rounded-[10px] bg-mint text-green-ink"><Icon name={f.icon} className="size-5" /></span>
                <p className="mt-4 text-[18px] font-semibold">{f.title}</p>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10"><Cta href="/performers" variant="dark">More for performers</Cta></div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-[1180px] px-5 py-16">
        <Eyebrow>How it works</Eyebrow>
        <h2 className="mt-2 text-[32px] leading-tight md:text-[40px]">Three steps to your next job</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="rounded-[var(--radius)] border border-line bg-surface p-6 shadow-card">
              <span className="font-display text-[40px] font-bold leading-none text-lime [-webkit-text-stroke:1px_var(--forest)]">{i + 1}</span>
              <p className="mt-4 text-[18px] font-semibold">{t}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Casting */}
      <section className="bg-forest text-white">
        <div className="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-lime">For casting teams</p>
            <h2 className="mt-2 text-[32px] leading-tight text-white md:text-[40px]">Cast faster, with every tape in one place.</h2>
            <p className="mt-4 max-w-[440px] text-[16px] text-white/70">Post a role, watch self-tapes inline, recall by tape, video call or in person, and book — without a single email chain.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Cta href="/start?role=caster">Start casting</Cta><Cta href="/casting" variant="ghost-light">How it works</Cta></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {CASTING.map(f => (
              <div key={f.title} className="rounded-[var(--radius)] bg-white/[0.06] p-5 ring-1 ring-white/10">
                <Icon name={f.icon} className="size-5 text-lime" />
                <p className="mt-3 text-[17px] font-semibold">{f.title}</p>
                <p className="mt-1 text-[14px] leading-relaxed text-white/70">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1180px] px-5 py-20 text-center">
        <h2 className="mx-auto max-w-[680px] text-[34px] leading-tight md:text-[44px]">Your next role is already on The Ident.</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-[17px] text-muted">Try everything free for {TRIAL_DAYS} days. {price(PLANS.performer.pence)} a month after that — less than a coffee.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3"><Cta href="/start?role=performer">Start free trial</Cta><Cta href="/pricing" variant="outline">See pricing</Cta></div>
      </section>
    </>
  )
}
