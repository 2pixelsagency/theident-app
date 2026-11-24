import FeaturePage from '@/components/site/FeaturePage'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'
import { CASTING_TESTIMONIALS } from '@/lib/site/testimonials'
import { CompanyChatWidget, PencilWidget, RecallChoiceWidget } from '@/components/site/ShowcaseWidgets'

export const metadata = { alternates: { canonical: '/casting' }, title: 'For casting · The Ident', description: 'Post roles, review self-tapes inline, recall by tape or video call, and book your cast — all in one place.' }

export default function CastingPage() {
  return (
    <FeaturePage eyebrow="For casting teams" title="From breakdown to booked, without the email chains."
      intro={`Casting directors, producers and companies use The Ident to find and book performers. ${TRIAL_DAYS} days free, then ${price(PLANS.casting.pence)} a month.`}
      cta={{ href: '/start?role=caster', label: 'Start casting' }}
      plan={{ dark: true, badge: `${TRIAL_DAYS} days free`, label: 'For casting directors and producers', name: 'Casting membership', line: 'Post roles, watch tapes inline, recall your way and book your cast.',
        value: price(PLANS.casting.pence), unit: '/month', small: `${TRIAL_DAYS} days free, then billed monthly`,
        cta: { href: '/start?role=caster', label: 'Start casting' }, note: 'Cancel anytime', included: [...PLANS.casting.features, 'Recall by tape, video call or in person'] }}
      testimonials={CASTING_TESTIMONIALS}
      groups={[
        { title: 'Post and review', features: [
          { icon: 'megaphone', title: 'Post a role in minutes', body: 'Choose the materials you need — reel, self-tape, headshots, CV — and a closing date.' },
          { icon: 'play', title: 'Watch tapes inline', body: 'Reels and self-tapes play right in the applicant list. Rate and add private notes.' },
          { icon: 'layers', title: 'Swipe or grid', body: 'Swipe through applicants one by one, or select many and move them together.' },
          { icon: 'lock', title: 'NDAs', body: 'Require an NDA; performers sign before seeing sides or meeting the team.' },
          { icon: 'users', title: 'Search talent', body: 'Find performers by skill, playing age and location, and invite them to your role.' },
          { icon: 'shield-check', title: 'Verified casting badge', body: 'Show performers your posts are genuine.' },
        ] },
        { title: 'Recall and book', layout: 'tabs', features: [
          { icon: 'video', title: 'Recall your way', body: 'Ask for another tape, send a Zoom or Teams link, or book an in-person recall.', widget: <RecallChoiceWidget /> },
          { icon: 'clock', title: 'Pencil and book', body: 'Hold dates, send an offer, and issue a plain-English contract to sign.', widget: <PencilWidget /> },
          { icon: 'chat', title: 'Company chats', body: 'Spin up a chat for the whole company once you’ve cast.', widget: <CompanyChatWidget /> },
        ] },
      ]}
      closing="Your next cast is already on The Ident." />
  )
}
