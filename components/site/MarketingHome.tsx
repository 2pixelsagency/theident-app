import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import Typewriter from '@/components/rc/Typewriter'
import Marquee from './Marquee'
import RolesCarousel from './RolesCarousel'
import HeadshotWave from './HeadshotWave'
import { Container, Cta, SECTION, SectionHead } from './Chrome'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

const KINDS = ['West End', 'Musical theatre', 'TV drama', 'Feature film', 'Commercials', 'Dance', 'Music videos', 'UK tours', 'Panto', 'Cruise ships', 'Voice over', 'Short film', 'Theme parks', 'Corporate']
const STEPS = [
  { n: '01', title: 'Build your Ident', body: 'Headshots, showreel, credits, skills and CV — one profile that casting can trust.', tone: 'bg-surface', chip: 'Profile 100% complete', chipTone: 'bg-mint' },
  { n: '02', title: 'Find and apply', body: 'Roles from casting directors and the community, filtered to what fits you. Apply in a tap.', tone: 'bg-butter', chip: '3 new roles match you', chipTone: 'bg-surface' },
  { n: '03', title: 'Recall, pencil, book', body: 'Send self-tapes, join video-call recalls and sign your contract — all tracked for you.', tone: 'bg-forest text-white', chip: 'You’re booked!', chipTone: 'bg-lime text-ink' },
]

function Pill({ children, tone }: { children: React.ReactNode; tone: string }) {
  return <span className={'rounded-full px-2.5 py-1 text-[12px] font-semibold ' + tone}>{children}</span>
}

export default function MarketingHome() {
  return (
    <>
      {/* ───── Hero ───── */}
      <section className="relative overflow-hidden bg-glow">
        <Container className="grid items-center gap-14 pb-20 pt-32 md:grid-cols-[1.1fr_1fr] md:pb-28 md:pt-40">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface/80 px-3 py-1.5 text-[13px] font-medium shadow-card backdrop-blur">
              <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-green" /></span>
              Live castings, updated daily
            </p>
            <h1 className="mt-6 min-h-[3.2em] text-[46px] leading-[1.02] tracking-[-0.03em] md:min-h-[2.15em] md:text-[68px]">
              <Typewriter text="The home of casting for " words={['performers', 'actors', 'dancers', 'singers', 'casting teams']} />
            </h1>
            <p className="rise mt-5 max-w-[520px] text-[18px] leading-relaxed text-muted" style={{ '--d': '700ms' } as React.CSSProperties}>Find castings, auditions and paid work. Apply with your reel, track every recall, and keep your career moving — in one app.</p>
            <div className="rise mt-9 flex flex-wrap gap-3" style={{ '--d': '850ms' } as React.CSSProperties}>
              <Cta href="/start?role=performer">Start {TRIAL_DAYS}-day free trial</Cta>
              <Cta href="/jobs" variant="outline">Browse live roles</Cta>
            </div>
            <p className="rise mt-5 text-[13px] text-muted" style={{ '--d': '950ms' } as React.CSSProperties}>Performers {price(PLANS.performer.pence)}/mo · Casting {price(PLANS.casting.pence)}/mo · No commission, ever</p>
          </div>

          {/* Stacked product cards */}
          <div aria-hidden className="rise relative mx-auto h-[500px] w-full max-w-[440px]" style={{ '--d': '300ms' } as React.CSSProperties}>
            <div className="absolute inset-x-8 top-0 rotate-[-4deg] rounded-[16px] bg-butter p-5 shadow-card">
              <p className="text-[12px] font-semibold text-ink/60">Self-tape requested</p><p className="mt-1 font-semibold">The Glass Orchard — Nell</p>
            </div>
            <div className="absolute inset-x-4 top-[78px] rotate-[3deg] rounded-[16px] bg-mint p-5 shadow-card">
              <p className="text-[12px] font-semibold text-ink/60">Video call recall</p><p className="mt-1 font-semibold">Harbour Lights — Tue 14:00</p>
            </div>
            <div className="absolute inset-x-0 top-[156px] rounded-[16px] bg-forest p-6 text-white shadow-[0_30px_60px_-30px_rgb(18_49_39/0.7)]">
              <p className="text-[13px] font-medium text-lime">Week 3 of your goal</p>
              <p className="mt-1 font-display text-[30px] font-bold">Hi, Ava</p>
              <div className="mt-5 space-y-2.5">
                {[['Pulse — UK arena tour', 'Booked', 'bg-lime text-ink'], ['Paper Crowns — Grace', 'Pencilled', 'bg-white/15 text-white'], ['Brew & Co. — Barista', 'Applied', 'bg-white/10 text-white/80']].map(([t, s, tone]) => (
                  <div key={t} className="flex items-center justify-between gap-3 rounded-[12px] bg-white/[0.07] p-3.5 ring-1 ring-white/10">
                    <span className="truncate text-[14px] font-semibold">{t}</span><Pill tone={tone}>{s}</Pill>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-2 bottom-2 rounded-[12px] bg-surface px-4 py-3 shadow-card ring-1 ring-line md:-right-6">
              <p className="text-[12px] text-muted">This tax year</p><p className="font-display text-[22px] font-bold">£14,280</p>
            </div>
          </div>
        </Container>
      </section>

      {/* ───── Marquee ───── */}
      <section className="border-y border-line bg-surface py-6">
        <Marquee speed={45} items={KINDS.map(k => (
          <span key={k} className="inline-flex items-center gap-3 px-3 text-[15px] font-medium text-muted"><span className="size-1.5 rounded-full bg-lime ring-2 ring-forest/10" />{k}</span>
        ))} />
      </section>

      {/* ───── Headshot wave ───── */}
      <section className="overflow-clip pt-20 md:pt-28">
        <Container><SectionHead center eyebrow="On The Ident" title="Performers, ready for their next role" sub="Actors, dancers, singers and musicians build their profile once and get seen by casting." /></Container>
        <HeadshotWave />
      </section>

      {/* ───── Roles carousel ───── */}
      <section className={SECTION}>
        <Container>
          <SectionHead eyebrow="Live now" title="Roles casting this week" sub="Real castings from casting directors, producers and the community — updated as they’re posted."
            action={<Link href="/jobs" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-green-ink">All roles <Icon name="arrow-right" className="size-4" /></Link>} />
          <RolesCarousel />
        </Container>
      </section>

      {/* ───── Bento ───── */}
      <section className={'bg-surface ' + SECTION}>
        <Container>
          <SectionHead eyebrow="For performers" title={<>Everything between “I saw a casting” and <span className="text-green-ink">“I’m booked”.</span></>} />
          <div className="grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
            {/* Pipeline */}
            <div className="flex flex-col justify-between overflow-hidden rounded-[16px] bg-forest p-7 text-white md:col-span-4 md:row-span-2">
              <div><p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-lime">Castings</p><p className="mt-3 max-w-[420px] text-[28px] font-semibold leading-tight">Every casting, from applied to booked, in one view.</p></div>
              <div className="mt-8 space-y-2.5">
                {[['The Glass Orchard — Nell (lead)', 'Send your self-tape by Fri', 'bg-butter text-ink'], ['Harbour Lights — Young witness', 'Video call · Tue 14:00', 'bg-mint text-ink'], ['Pulse — UK arena tour', 'Booked · sign your contract', 'bg-lime text-ink']].map(([t, s, tone]) => (
                  <div key={t} className="flex items-center justify-between gap-4 rounded-[12px] bg-white/[0.06] px-4 py-3 ring-1 ring-white/10">
                    <span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{t}</span><span className="block text-[13px] text-white/60">{s}</span></span>
                    <span className={'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ' + tone}>{s.split(' ')[0] === 'Send' ? 'Self-tape' : s.split(' ')[0] === 'Video' ? 'Recall' : 'Booked'}</span>
                  </div>
                ))}
              </div>
              <div className="mt-8 grid gap-2.5 sm:grid-cols-4">
                {[['Applied', '6', 'bg-white/10'], ['Self-tape', '2', 'bg-butter text-ink'], ['Recall', '1', 'bg-mint text-ink'], ['Booked', '1', 'bg-lime text-ink']].map(([l, n, tone]) => (
                  <div key={l} className={'rounded-[12px] p-4 ' + tone}><p className="font-display text-[34px] font-bold leading-none">{n}</p><p className="mt-2 text-[13px] font-medium opacity-80">{l}</p></div>
                ))}
              </div>
            </div>
            {/* Apply */}
            <div className="rounded-[16px] bg-lime p-7 md:col-span-2">
              <Icon name="send" className="size-6" />
              <p className="mt-5 text-[20px] font-semibold leading-tight">Apply in a tap</p>
              <p className="mt-2 text-[15px] text-ink/70">Reel, CV and self-tape go with every application.</p>
            </div>
            {/* Goals */}
            <div className="rounded-[16px] border border-line bg-bg p-7 md:col-span-2">
              <Icon name="target" className="size-6 text-green-ink" />
              <p className="mt-5 text-[20px] font-semibold leading-tight">Goals that stick</p>
              <div className="mt-4 space-y-2">
                {[['Dance class ×2', 100], ['New showreel', 60], ['Update headshots', 30]].map(([l, v]) => (
                  <div key={l as string}><div className="flex justify-between text-[13px]"><span>{l}</span><span className="text-muted">{v}%</span></div><div className="mt-1 h-1.5 rounded-full bg-chip"><div className="h-full rounded-full bg-green" style={{ width: v + '%' }} /></div></div>
                ))}
              </div>
            </div>
            {/* Chats */}
            <div className="rounded-[16px] border border-line bg-bg p-7 md:col-span-3">
              <Icon name="chat" className="size-6 text-green-ink" />
              <p className="mt-5 text-[20px] font-semibold leading-tight">Cast chats</p>
              <div className="mt-4 space-y-2 text-[14px]">
                <p className="w-fit rounded-[12px] rounded-bl-[4px] bg-surface px-3.5 py-2 shadow-card">Call is 10am, Studio 2 🎭</p>
                <p className="ml-auto w-fit rounded-[12px] rounded-br-[4px] bg-forest px-3.5 py-2 text-white">See you all there!</p>
              </div>
            </div>
            {/* Classes & digs */}
            <div className="rounded-[16px] bg-blossom p-7 md:col-span-3">
              <Icon name="sparkle" className="size-6" />
              <p className="mt-5 text-[20px] font-semibold leading-tight">Classes &amp; digs</p>
              <p className="mt-2 text-[15px] text-ink/70">Grab a spare space at a sold-out class, or find digs by the stage door on tour.</p>
            </div>
            {/* Pay */}
            <div className="flex items-center justify-between gap-6 rounded-[16px] border border-line bg-bg p-7 md:col-span-6">
              <div><Icon name="pound" className="size-6 text-green-ink" /><p className="mt-4 text-[20px] font-semibold">Pay &amp; tax, sorted</p><p className="mt-1 max-w-[460px] text-[15px] text-muted">Log payments, send invoices and see what to put aside for self-assessment.</p></div>
              <div className="hidden text-right sm:block"><p className="text-[13px] text-muted">Suggested set-aside</p><p className="font-display text-[36px] font-bold">£2,856</p></div>
            </div>
          </div>
          <div className="mt-10"><Cta href="/performers" variant="dark">Everything for performers</Cta></div>
        </Container>
      </section>

      {/* ───── Stacking cards ───── */}
      <section className={SECTION}>
        <Container>
          <SectionHead eyebrow="How it works" title="Three steps to your next job" />
          <ol className="relative">
            {STEPS.map((s, i) => (
              <li key={s.n} className="sticky pb-6" style={{ top: 96 + i * 28 }}>
                <div className={'grid min-h-[300px] gap-8 rounded-[16px] border border-line/60 p-8 shadow-[0_24px_50px_-30px_rgb(18_49_39/0.45)] md:grid-cols-[1fr_1.2fr] md:p-12 ' + s.tone}>
                  <div>
                    <p className="font-display text-[64px] font-bold leading-none opacity-30">{s.n}</p>
                    <p className="mt-6 text-[28px] font-semibold leading-tight md:text-[34px]">{s.title}</p>
                  </div>
                  <div className="flex flex-col justify-between gap-6">
                    <p className="text-[18px] leading-relaxed opacity-80">{s.body}</p>
                    <span className={'w-fit rounded-full px-4 py-2 text-[14px] font-semibold shadow-card ' + s.chipTone}>{s.chip}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* ───── Casting ───── */}
      <section className={'bg-forest text-white ' + SECTION}>
        <Container>
          <SectionHead light eyebrow="For casting teams" title="Cast faster, with every tape in one place." sub="Post a role, watch self-tapes inline, recall by tape, video call or in person — and book, without a single email chain."
            action={<div className="flex flex-wrap gap-3"><Cta href="/start?role=caster">Start casting</Cta><Cta href="/casting" variant="ghost-light">How it works</Cta></div>} />
          <div className="grid gap-4 md:grid-cols-4">
            {[['megaphone', 'Post in minutes', 'Ask for exactly the materials you need, add an NDA, set a closing date.'], ['play', 'Tapes inline', 'Watch reels and self-tapes, rate, shortlist and swipe through applicants.'], ['video', 'Recall your way', 'Another tape, a Zoom link, or in person — your call.'], ['users', 'Search talent', 'Find performers by skill, playing age and place, and invite them.']].map(([icon, t, b]) => (
              <div key={t} className="rounded-[16px] bg-white/[0.06] p-6 ring-1 ring-white/10 transition hover:bg-white/[0.09]">
                <span className="flex size-11 items-center justify-center rounded-[10px] bg-lime text-ink"><Icon name={icon} className="size-5" /></span>
                <p className="mt-5 text-[18px] font-semibold">{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-white/70">{b}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ───── Final CTA ───── */}
      <section className={SECTION}>
        <Container>
          <div className="relative overflow-hidden rounded-[16px] bg-lime px-8 py-16 text-center md:py-20">
            <h2 className="mx-auto max-w-[720px] text-[36px] leading-[1.05] tracking-[-0.02em] md:text-[52px]">Your next role is already on The Ident.</h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[17px] text-ink/70">Try everything free for {TRIAL_DAYS} days. {price(PLANS.performer.pence)} a month after that — less than a coffee.</p>
            <div className="mt-9 flex flex-wrap justify-center gap-3"><Cta href="/start?role=performer" variant="dark">Start free trial</Cta><Cta href="/pricing" variant="outline">See pricing</Cta></div>
          </div>
        </Container>
      </section>
    </>
  )
}
