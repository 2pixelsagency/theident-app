import FeaturePage from '@/components/site/FeaturePage'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import { PERFORMER_TESTIMONIALS } from '@/lib/site/testimonials'
import { ContractWidget, PipelineWidget, SelfTapeWidget } from '@/components/site/ShowcaseWidgets'

export const metadata = { alternates: { canonical: '/performers' }, title: 'For performers · The Ident', description: 'Find castings, apply with your reel, track recalls and bookings, and manage your career in one app.' }

export default function PerformersPage() {
  return (
    <FeaturePage eyebrow="For performers" title="Spend less time chasing castings and more time performing."
      intro={`Actors, dancers, singers and musicians use The Ident to find work, apply with their materials and keep their career moving. ${TRIAL_DAYS} days free, then ${price(PLANS.performer.pence)} a month.`}
      cta={{ href: '/start?role=performer', label: 'Start free trial' }}
      plan={{ dark: true, badge: `${TRIAL_DAYS} days free`, label: 'For actors, dancers and singers', name: 'Performer membership', line: 'Everything you need to find, apply for and book work — and we never take a cut.',
        value: price(PLANS.performer.pence), unit: '/month', small: `${TRIAL_DAYS} days free, then billed monthly · 0% commission`,
        cta: { href: '/start?role=performer', label: 'Start free trial' }, note: 'Cancel anytime', included: [...PLANS.performer.features, 'Keep 100% of every fee you book'] }}
      testimonials={PERFORMER_TESTIMONIALS}
      groups={[
        { title: 'Find and apply', features: [
          { icon: 'search', title: 'Every role, one board', body: 'Theatre, screen, commercials, dance and side hustles — from casting directors and the community.' },
          { icon: 'bell', title: 'Alerts that fit you', body: 'Get told when a role matches your skills, playing age and location.' },
          { icon: 'send', title: 'Apply with your reel', body: 'Your showreel, CV, headshots and self-tapes go with every application.' },
          { icon: 'shield-check', title: 'Fair pay badges', body: 'See at a glance which roles pay at or above the going rate.' },
          { icon: 'lock', title: 'NDAs built in', body: 'Sign confidentiality agreements right in the app when a production asks.' },
          { icon: 'bookmark', title: 'Save for later', body: 'Shortlist roles, park the maybes, and get reminded before they close.' },
        ] },
        { title: 'Track every casting', layout: 'tabs', features: [
          { icon: 'briefcase', title: 'Your castings pipeline', body: 'Applied, self-tape, recall, pencilled, booked — always know where you stand.', widget: <PipelineWidget /> },
          { icon: 'video', title: 'Send self-tapes', body: 'Upload tapes when casting asks, and join video-call recalls from the card.', widget: <SelfTapeWidget /> },
          { icon: 'pen', title: 'Sign contracts', body: 'Plain-English contracts you can read and sign on your phone.', widget: <ContractWidget /> },
        ] },
        { title: 'Stay on top of your career', layout: 'slider', features: [
          { icon: 'target', title: 'Goals', body: 'Set what you’re working towards — dance classes, a new showreel — and tick it off weekly.' },
          { icon: 'check-square', title: 'To-do list', body: 'Self-tapes due, contracts to sign, invoices to chase — in one list.' },
          { icon: 'chat', title: 'Cast chats', body: 'Company and rehearsal chats with an invite link for the whole cast.' },
          { icon: 'sparkle', title: 'Classes', body: 'Pass on a class space you can’t make, or find one going spare.' },
          { icon: 'house', title: 'Theatre digs', body: 'Places to stay near the stage door when you’re on tour.' },
          { icon: 'pound', title: 'Pay & tax', body: 'Log payments, send invoices and know what to put aside.' },
        ] },
      ]}
      closing="Build your profile once. Get seen by casting." />
  )
}
