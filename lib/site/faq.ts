import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

// Plain-language answers used on the page AND as FAQPage schema (answer engines quote these directly)
export const HOME_FAQ: [string, string][] = [
  ['What is The Ident?', 'The Ident is a casting app for performers and casting teams in the UK. Performers find castings, auditions and paid work, apply with their showreel and self-tapes, and track every recall and booking. Casting directors post roles, review tapes and book their cast in one place.'],
  ['How much does The Ident cost?', `Performers pay ${price(PLANS.performer.pence)} a month and casting teams pay ${price(PLANS.casting.pence)} a month, after a ${TRIAL_DAYS}-day free trial. Browsing the job board is free, and The Ident never takes commission on work you book.`],
  ['Who can use The Ident?', 'Actors, dancers, singers, musicians, presenters and voiceover artists aged 18 and over, plus casting directors, producers and companies hiring performers.'],
  ['How do casting directors find performers on The Ident?', 'Every performer has a profile with headshots, showreel, credits, skills, playing age and location. Casting teams search and filter talent, invite performers to a role, and recall them by self-tape, video call or in person.'],
  ['Can performers post jobs?', 'Yes. Performers can post roles and side hustles and review applicants. These are labelled “Community” on the job board so they’re easy to tell apart from roles posted by casting.'],
  ['Is my contact information public?', 'No. Your public profile shows your name, headshots, craft, location, bio, credits and skills — never your email, phone or agent contact details. You can hide your profile at any time.'],
]
