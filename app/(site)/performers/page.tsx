import FeaturePage from '@/components/site/FeaturePage'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

export const metadata = { title: 'For performers · The Ident', description: 'Find castings, apply with your reel, track recalls and bookings, and manage your career in one app.' }

export default function PerformersPage() {
  return (
    <FeaturePage eyebrow="For performers" title="Spend less time chasing castings and more time performing."
      intro={`Actors, dancers, singers and musicians use The Ident to find work, apply with their materials and keep their career moving. ${TRIAL_DAYS} days free, then ${price(PLANS.performer.pence)} a month.`}
      cta={{ href: '/start?role=performer', label: 'Start free trial' }}
      facts={[[price(PLANS.performer.pence), 'a month, after your trial'], [TRIAL_DAYS + ' days', 'free to try everything'], ['0%', 'commission on work you book']]}
      groups={[
        { title: 'Find and apply', features: [
          { icon: 'search', title: 'Every role, one board', body: 'Theatre, screen, commercials, dance and side hustles — from casting directors and the community.' },
          { icon: 'bell', title: 'Alerts that fit you', body: 'Get told when a role matches your skills, playing age and location.' },
          { icon: 'send', title: 'Apply with your reel', body: 'Your showreel, CV, headshots and self-tapes go with every application.' },
          { icon: 'shield-check', title: 'Fair pay badges', body: 'See at a glance which roles pay at or above the going rate.' },
          { icon: 'lock', title: 'NDAs built in', body: 'Sign confidentiality agreements right in the app when a production asks.' },
          { icon: 'bookmark', title: 'Save for later', body: 'Shortlist roles, park the maybes, and get reminded before they close.' },
        ] },
        { title: 'Track every casting', features: [
          { icon: 'briefcase', title: 'Your castings pipeline', body: 'Applied, self-tape, recall, pencilled, booked — always know where you stand.' },
          { icon: 'video', title: 'Send self-tapes', body: 'Upload tapes when casting asks, and join video-call recalls from the card.' },
          { icon: 'pen', title: 'Sign contracts', body: 'Plain-English contracts you can read and sign on your phone.' },
        ] },
        { title: 'Stay on top of your career', features: [
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
