import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import RolesCarousel from './RolesCarousel'
import HeroTalent from './HeroTalent'
import WorkedWith from './WorkedWith'
import { Container, Cta, SECTION, SectionHead } from './Chrome'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import JsonLd from './JsonLd'
import Faq from './Faq'
import { HOME_FAQ } from '@/lib/site/faq'
import { SITE_URL } from '@/lib/supabaseServer'

const STEPS = [
  { n: '01', title: 'Build your Ident', body: 'Headshots, showreel, credits, skills and CV — one profile that casting can trust.', tone: 'bg-surface', chip: 'Profile 100% complete', chipTone: 'bg-mint' },
  { n: '02', title: 'Find and apply', body: 'Roles from casting directors and the community, filtered to what fits you. Apply in a tap.', tone: 'bg-butter', chip: '3 new roles match you', chipTone: 'bg-surface' },
  { n: '03', title: 'Recall, pencil, book', body: 'Send self-tapes, join video-call recalls and sign your contract — all tracked for you.', tone: 'bg-forest text-white', chip: 'You’re booked!', chipTone: 'bg-lime text-ink' },
]

export default function MarketingHome() {
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Organization', '@id': SITE_URL + '/#org', name: 'The Ident', url: SITE_URL, logo: SITE_URL + '/icon-512.png', email: 'hello@theident.me', description: 'A casting app for performers and casting teams in the UK.' },
          { '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL, name: 'The Ident', publisher: { '@id': SITE_URL + '/#org' },
            potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: SITE_URL + '/people?q={search_term_string}' }, 'query-input': 'required name=search_term_string' } },
          { '@type': 'SoftwareApplication', name: 'The Ident', applicationCategory: 'BusinessApplication', operatingSystem: 'Web, iOS', url: SITE_URL,
            offers: [
              { '@type': 'Offer', name: 'Performer membership', price: (PLANS.performer.pence / 100).toFixed(2), priceCurrency: 'GBP', category: 'subscription' },
              { '@type': 'Offer', name: 'Casting membership', price: (PLANS.casting.pence / 100).toFixed(2), priceCurrency: 'GBP', category: 'subscription' },
            ] },
          { '@type': 'FAQPage', mainEntity: HOME_FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        ],
      }} />
      <HeroTalent />
      <WorkedWith />

      {/* ───── Roles carousel ───── */}
      <section className={'overflow-x-clip ' + SECTION}>
        <Container>
          <SectionHead eyebrow="Live now" title="Roles casting this week" sub="Real castings from casting directors, producers and the community — updated as they’re posted."
            action={<Link href="/jobs" className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-green-ink">All roles <Icon name="arrow-right" className="size-4" /></Link>} />
        </Container>
        <RolesCarousel />
      </section>

      {/* ───── Bento ───── */}
      <section className={'bg-surface ' + SECTION}>
        <Container>
          <SectionHead eyebrow="For performers" title={<>Everything between “I saw a casting” and <span className="text-green-ink">“I’m booked”.</span></>} />
          <div className="grid auto-rows-[minmax(220px,auto)] gap-4 md:grid-cols-6">
            {/* Pipeline */}
            <div className="flex flex-col justify-between overflow-hidden rounded-[16px] bg-forest p-7 text-white md:col-span-4 md:row-span-2">
              <div><p className="eyebrow text-[13px] font-semibold uppercase tracking-[0.1em] text-lime">Castings</p><p className="mt-3 max-w-[420px] text-[28px] font-semibold leading-tight">Every casting, from applied to booked, in one view.</p></div>
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

      {/* ───── FAQ (answer-engine friendly) ───── */}
      <section className={SECTION}>
        <Container className="grid gap-10 md:grid-cols-[minmax(240px,340px)_1fr] md:gap-16">
          <div className="md:sticky md:top-28 md:self-start">
            <p className="eyebrow text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">FAQ</p>
            <h2 className="mt-3 text-[34px] leading-[1.05] tracking-[-0.025em] md:text-[44px]">Good questions</h2>
          </div>
          <Faq items={HOME_FAQ} />
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
