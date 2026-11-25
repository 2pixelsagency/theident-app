// Membership plans — the only place prices and the trial length live. No free tier.
export const TRIAL_DAYS = 7 // set to 0 to charge straight away
export const PLANS = {
  performer: {
    name: 'Performer', pence: 399,
    features: ['Apply to roles with your reel, CV and self-tapes', 'Your profile in casting’s talent search', 'Castings, recalls and bookings in one place', 'Goals, to-do list, diary and cast chats', 'Pay, invoices and tax tools'],
  },
  // Everything in Performer, at a lower price for recent graduates (see isRecentGraduate)
  graduate: {
    name: 'Graduate', pence: 199,
    features: ['Apply to roles with your reel, CV and self-tapes', 'Your profile in casting’s talent search', 'Castings, recalls and bookings in one place', 'Goals, to-do list, diary and cast chats', 'Pay, invoices and tax tools'],
  },
  casting: {
    name: 'Casting', pence: 1099,
    features: ['Post roles and review applicants', 'Watch reels and self-tapes inline, rate and shortlist', 'Search and invite talent', 'Cast chats for your company', 'Verified casting badge'],
  },
} as const
export type PlanKind = keyof typeof PLANS
export const planFor = (role: string | null | undefined): PlanKind => (role === 'caster' ? 'casting' : 'performer')

// Graduate price: performers who graduated (drama, dance or music school) this year or in the last 2 years
export const GRADUATE_YEARS = 2
type GradFields = { is_graduate?: boolean | null; graduate_year?: number | null; graduate_verified?: boolean | null }
export function isRecentGraduate(p: GradFields | null | undefined) {
  const y = new Date().getFullYear()
  return !!p?.is_graduate && !!p.graduate_year && p.graduate_year >= y - GRADUATE_YEARS && p.graduate_year <= y + 1
}
// The graduate price needs a verified graduation (school email or proof checked by us)
export const planForProfile = (role: string | null | undefined, p?: GradFields | null): PlanKind =>
  role === 'caster' ? 'casting' : isRecentGraduate(p) && p?.graduate_verified ? 'graduate' : 'performer'
export const price = (pence: number) => '£' + (pence / 100).toFixed(2)

type PlanFields = { is_demo?: boolean; plan_status?: string | null; plan_period_end?: string | null; plan_grace_until?: string | null }
export function hasPlan(p: PlanFields | null | undefined, isAdmin = false) {
  if (!p) return true // still loading — don't flash the paywall
  if (isAdmin || p.is_demo) return true
  const now = Date.now()
  if (p.plan_grace_until && new Date(p.plan_grace_until).getTime() > now) return true
  return ['active', 'trialing', 'past_due'].includes(p.plan_status || '') && (!p.plan_period_end || new Date(p.plan_period_end).getTime() > now)
}
