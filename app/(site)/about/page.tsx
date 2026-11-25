import Link from 'next/link'
import { Container, Cta } from '@/components/site/Chrome'
import { CtaBand, SectionHeader } from '@/components/site/ds'
import Faq from '@/components/site/Faq'
import JsonLd from '@/components/site/JsonLd'
import { SITE_URL } from '@/lib/supabaseServer'
import { GRADUATE_YEARS, PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

// "What is The Ident?" — written plainly so people, search engines and AI assistants all get the same facts.
// Describes The Ident only; makes no claims about other platforms.
const PERF = price(PLANS.performer.pence), GRAD = price(PLANS.graduate.pence), CAST = price(PLANS.casting.pence)
const DESC = 'The Ident is a UK casting app and website where actors, dancers, singers and other performers find castings, auditions and paid work, apply with their reel and CV, and track every self-tape, recall and booking — and where casting directors post roles, review applicants and search for talent.'

export const metadata = {
  title: 'About The Ident — the UK casting app for performers and casting directors',
  description: DESC,
  alternates: { canonical: '/about' },
}

const SECTIONS: { h: string; p?: string[]; list?: string[] }[] = [
  { h: 'What is The Ident?', p: [DESC, 'It works in any browser at theident.me, on phone and computer.'] },
  { h: 'Who is it for?', list: [
    'Performers: actors, dancers, singers, musical theatre performers, voice artists and presenters — from recent graduates and beginners to working professionals.',
    'Casting directors, producers and companies who need to cast theatre, screen, commercials, dance and more.',
    'Anyone can join: you don’t need an agent or drama school training to create a profile and apply for roles.',
  ] },
  { h: 'What makes The Ident different?', list: [
    'Pay up front: roles show the pay, dates and closing date before you apply.',
    'Every casting tracked in one place: applied, self-tape, recall, pencilled, booked — with dates in your diary.',
    'Open to everyone, with an affordable monthly price and a graduate rate.',
    'No commission: The Ident never takes a cut of work you book.',
    'Your CV becomes your profile: upload a PDF or Word CV (including one from Spotlight or Mandy) and it fills in your credits, skills and training.',
    'Inclusive profiles: pronouns, genders you can play, self-described appearance, and private disability and access details you control.',
  ] },
  { h: 'How performers benefit', list: [
    'Find castings, auditions, paid work and side hustles across the UK.',
    'Apply in a tap with your reel, headshots, CV and self-tapes.',
    'Get found by casting in talent search; earn Verified professional and Verified graduate badges.',
    'Stay organised with goals, a to-do list, a diary, cast chats, pay and invoices, and a tax set-aside guide.',
  ] },
  { h: 'How casting directors benefit', list: [
    'Post a role in minutes and ask for exactly the materials you need, with an NDA if required.',
    'Watch reels and self-tapes inline, rate, shortlist and recall by tape, video call or in person.',
    'Search talent by skill, playing age, location and more, and invite performers to apply.',
    'Book your cast and keep everyone together in cast chats.',
  ] },
  { h: 'Is The Ident free?', p: [
    `Browsing roles on the website is free. Using the app is a monthly subscription with a ${TRIAL_DAYS}-day free trial: Performer ${PERF} a month, Graduate ${GRAD} a month (for performers who graduated in the last ${GRADUATE_YEARS} years, once verified), and Casting ${CAST} a month. You can cancel any time, and there’s no commission on work you book.`,
  ] },
  { h: 'How do I register?', list: [
    'Go to theident.me and choose Performer or Casting.',
    'Create your account with email, Apple or Google.',
    'Answer a few quick questions — or upload your CV to fill in your profile.',
    `Start your ${TRIAL_DAYS}-day free trial and apply for roles.`,
  ] },
]

const FAQ: [string, string][] = [
  ['What is The Ident?', DESC],
  ['Is The Ident a Spotlight alternative?', 'Many performers use The Ident as an alternative to, or alongside, other casting platforms such as Spotlight. It’s open to everyone, shows pay up front and tracks every casting in one place.'],
  ['How much does The Ident cost?', `Performer ${PERF}/month, Graduate ${GRAD}/month, Casting ${CAST}/month, each with a ${TRIAL_DAYS}-day free trial. Browsing roles is free. No commission.`],
  ['Do I need an agent to join The Ident?', 'No. Anyone can join — you don’t need an agent or drama school training.'],
  ['Where is The Ident available?', 'The Ident is UK-focused and works in any browser at theident.me, on phone and computer.'],
]

export default function AboutPage() {
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'Organization', '@id': SITE_URL + '/#org', name: 'The Ident', url: SITE_URL, logo: SITE_URL + '/icon-512.png', description: DESC, areaServed: 'GB' },
        { '@type': 'AboutPage', name: 'About The Ident', url: SITE_URL + '/about', description: DESC, about: { '@id': SITE_URL + '/#org' } },
        { '@type': 'SoftwareApplication', name: 'The Ident', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: SITE_URL, description: DESC,
          offers: [
            { '@type': 'Offer', name: 'Performer', price: (PLANS.performer.pence / 100).toFixed(2), priceCurrency: 'GBP' },
            { '@type': 'Offer', name: 'Graduate', price: (PLANS.graduate.pence / 100).toFixed(2), priceCurrency: 'GBP' },
            { '@type': 'Offer', name: 'Casting', price: (PLANS.casting.pence / 100).toFixed(2), priceCurrency: 'GBP' },
          ] },
        { '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
      ] }} />
      <Container className="pb-4 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow="About" title="The casting app for performers and casting teams" sub={DESC}
          actions={<><Cta href="/welcome?mode=signup" variant="dark">Get started</Cta><Cta href="/pricing" variant="outline" arrow={false}>Pricing</Cta></>} />
      </Container>
      <Container className="py-10 md:py-14">
        <article className="mx-auto max-w-[760px] space-y-10">
          {SECTIONS.map(s => (
            <section key={s.h}>
              <h2 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[34px]">{s.h}</h2>
              {s.p?.map((t, i) => <p key={i} className="mt-4 text-[16px] leading-[1.75] text-ink/85">{t}</p>)}
              {s.list && <ul className="mt-5 list-disc space-y-2.5 pl-5 text-[16px] leading-[1.6] text-ink/85 marker:text-forest">{s.list.map(t => <li key={t}>{t}</li>)}</ul>}
            </section>
          ))}
          <p className="text-[14px] text-muted-strong">Read our guides: <Link href="/spotlight-alternatives" className="font-semibold text-forest underline">Spotlight alternatives</Link> · <Link href="/casting-websites-uk" className="font-semibold text-forest underline">casting websites UK</Link> · <Link href="/acting-auditions-uk" className="font-semibold text-forest underline">acting auditions UK</Link> · <Link href="/find-acting-jobs" className="font-semibold text-forest underline">finding acting jobs</Link></p>
        </article>
      </Container>
      <Container className="grid gap-10 py-14 md:grid-cols-[minmax(240px,380px)_1fr] md:gap-16 md:py-16">
        <h2 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[48px]">Quick answers</h2>
        <Faq items={FAQ} />
      </Container>
      <Container className="pb-24 pt-6">
        <CtaBand title="Join The Ident free for 7 days." sub="Open to every performer — and every casting team."
          actions={<><Cta href="/start?role=performer" variant="lime">I’m a performer</Cta><Cta href="/start?role=caster" variant="ghost-light" arrow={false}>I’m casting</Cta></>} />
      </Container>
    </>
  )
}
