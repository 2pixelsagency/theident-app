import FeaturePage from '@/components/site/FeaturePage'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

export const metadata = { alternates: { canonical: '/casting' }, title: 'For casting · The Ident', description: 'Post roles, review self-tapes inline, recall by tape or video call, and book your cast — all in one place.' }

export default function CastingPage() {
  return (
    <FeaturePage eyebrow="For casting teams" title="From breakdown to booked, without the email chains."
      intro={`Casting directors, producers and companies use The Ident to find and book performers. ${TRIAL_DAYS} days free, then ${price(PLANS.casting.pence)} a month.`}
      cta={{ href: '/start?role=caster', label: 'Start casting' }}
      plans={[
        { label: 'For casting teams', name: 'Casting membership', line: 'Post roles, review tapes and book your cast in one place.', value: price(PLANS.casting.pence), unit: '/month', small: `After your ${TRIAL_DAYS}-day free trial`,
          cta: { href: '/start?role=caster', label: 'Start casting' }, note: 'Cancel anytime', included: PLANS.casting.features },
        { label: 'Try it first', name: 'Free trial', line: 'Post a role and review real applicants before you pay.', value: TRIAL_DAYS + ' days', unit: 'free', small: 'We’ll remind you before it ends',
          cta: { href: '/start?role=caster', label: 'Post your first role' }, note: 'Cancel any time in Settings', dark: true, badge: 'Start here',
          included: ['Post roles with an NDA if you need one', 'Watch reels and self-tapes inline', 'Shortlist and recall', 'Message applicants'] },
        { label: 'Recalls', name: 'Recall your way', line: 'Ask for another tape, send a video-call link, or meet in person.', value: '3 ways', unit: 'to recall',
          cta: { href: '/pricing', label: 'See pricing' }, included: ['Another self-tape', 'Video call with a join link', 'In person, with time and place'] },
      ]}
      groups={[
        { title: 'Post and review', features: [
          { icon: 'megaphone', title: 'Post a role in minutes', body: 'Choose the materials you need — reel, self-tape, headshots, CV — and a closing date.' },
          { icon: 'play', title: 'Watch tapes inline', body: 'Reels and self-tapes play right in the applicant list. Rate and add private notes.' },
          { icon: 'layers', title: 'Swipe or grid', body: 'Swipe through applicants one by one, or select many and move them together.' },
          { icon: 'lock', title: 'NDAs', body: 'Require an NDA; performers sign before seeing sides or meeting the team.' },
          { icon: 'users', title: 'Search talent', body: 'Find performers by skill, playing age and location, and invite them to your role.' },
          { icon: 'shield-check', title: 'Verified casting badge', body: 'Show performers your posts are genuine.' },
        ] },
        { title: 'Recall and book', features: [
          { icon: 'video', title: 'Recall your way', body: 'Ask for another tape, send a Zoom or Teams link, or book an in-person recall.' },
          { icon: 'clock', title: 'Pencil and book', body: 'Hold dates, send an offer, and issue a plain-English contract to sign.' },
          { icon: 'chat', title: 'Company chats', body: 'Spin up a chat for the whole company once you’ve cast.' },
        ] },
      ]}
      closing="Your next cast is already on The Ident." />
  )
}
