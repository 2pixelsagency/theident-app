// Profile boost plans. Prices live here only — the server picks the plan by id, never trusting a client price.
export const BOOST_PLANS = [
  { id: 'week', days: 7, pence: 499, label: '7 days', blurb: 'Great before a big casting week' },
  { id: 'month', days: 30, pence: 1499, label: '30 days', blurb: 'Best value — stay at the top all month' },
] as const
export type BoostPlanId = (typeof BOOST_PLANS)[number]['id']
export const planById = (id: string) => BOOST_PLANS.find(p => p.id === id)
export const gbp = (pence: number) => '£' + (pence / 100).toFixed(2)
export const isBoosted = (until?: string | null) => !!until && new Date(until).getTime() > Date.now()
export const daysLeft = (until?: string | null) => (until ? Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 864e5)) : 0)
