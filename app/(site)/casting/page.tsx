import FeaturePage from '@/components/site/FeaturePage'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

export const metadata = { alternates: { canonical: '/casting' }, title: 'For casting · The Ident', description: 'Post roles, review self-tapes inline, recall by tape or video call, and book your cast — all in one place.' }

export default function CastingPage() {
  return (
    <FeaturePage eyebrow="For casting teams" title="From breakdown to booked, without the email chains."
      intro={`Casting directors, producers and companies use The Ident to find and book performers. ${TRIAL_DAYS} days free, then ${price(PLANS.casting.pence)} a month.`}
      cta={{ href: '/start?role=caster', label: 'Start casting' }}
      facts={[[price(PLANS.casting.pence), 'a month, after your trial'], [TRIAL_DAYS + ' days', 'free to post and review'], ['3 ways', 'to recall: tape, call or in person']]}
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
