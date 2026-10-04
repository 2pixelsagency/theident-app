// Transparent pay + the "Fair pay" badge.
//
// OWNER TO CONFIRM: the benchmark figures below are placeholders pitched at
// Equity's published minimums by sector and must be checked against the
// current Equity agreements before launch. They live here, in one place, so
// updating them is a one-line change.

export type PayUnit = 'hour' | 'day' | 'week' | 'month' | 'show' | 'shoot' | 'fee'

export const PAY_UNITS: { value: PayUnit; label: string; per: string }[] = [
  { value: 'hour', label: 'Hour', per: 'hour' },
  { value: 'day', label: 'Day', per: 'day' },
  { value: 'week', label: 'Week', per: 'week' },
  { value: 'month', label: 'Month', per: 'month' },
  { value: 'show', label: 'Show', per: 'show' },
  { value: 'shoot', label: 'Shoot', per: 'shoot' },
  { value: 'fee', label: 'Flat fee', per: 'fee' },
]

// National Living Wage (21+), from 1 April 2026. Used as the floor for side hustles.
export const MIN_HOURLY_WAGE = 12.71

// Side hustles below minimum wage can't be posted when this is on (positioning decision for the owner)
export const ENFORCE_MIN_WAGE_FOR_SIDE_HUSTLES = true

// Weekly-equivalent minimums by sector (placeholders — see note above)
const SECTOR_WEEKLY_MIN: Record<string, number> = {
  theatre: 600,
  dance: 600,
  screen: 750,      // TV / film, as 5 × day rate
  commercial: 1000, // as 5 × day rate
  voice: 750,
  other: 600,
}

function sectorFor(productionType: string | null | undefined) {
  const t = (productionType || '').toLowerCase()
  if (t.includes('theatre')) return 'theatre'
  if (t.includes('dance')) return 'dance'
  if (t.includes('commercial') || t.includes('music video')) return 'commercial'
  if (t.includes('voice')) return 'voice'
  if (t.includes('film') || t.includes('tv') || t.includes('digital') || t.includes('motion')) return 'screen'
  return 'other'
}

// Rough weekly equivalent for comparing different pay units
function weekly(amount: number, unit: PayUnit): number | null {
  switch (unit) {
    case 'hour': return amount * 37.5
    case 'day': return amount * 5
    case 'week': return amount
    case 'month': return (amount * 12) / 52
    case 'show': return amount * 8
    default: return null // shoot / flat fee: no fair comparison without hours
  }
}

export type PayJob = {
  is_side_hustle: boolean
  is_paid?: boolean | null
  pay_amount?: number | string | null
  pay_unit?: string | null
  salary?: string | null
  production_types?: { name: string } | null
}

export function payLabel(j: PayJob): string | null {
  if (j.is_paid === false) return 'Unpaid'
  const amt = j.pay_amount != null ? Number(j.pay_amount) : null
  if (amt != null && !isNaN(amt) && j.pay_unit) {
    const n = '£' + amt.toLocaleString('en-GB', { maximumFractionDigits: amt % 1 ? 2 : 0 })
    return j.pay_unit === 'fee' ? n + ' fee' : n + ' / ' + j.pay_unit
  }
  return j.salary || null
}

export type FairPay = 'fair' | 'below_min_wage' | 'below_benchmark' | null

export function fairPay(j: PayJob): FairPay {
  if (j.is_paid === false) return null
  const amt = j.pay_amount != null ? Number(j.pay_amount) : null
  const unit = j.pay_unit as PayUnit | null
  if (amt == null || isNaN(amt) || !unit) return null
  if (j.is_side_hustle) {
    const hourly = unit === 'hour' ? amt : unit === 'day' ? amt / 8 : null
    if (hourly == null) return null
    return hourly >= MIN_HOURLY_WAGE ? 'fair' : 'below_min_wage'
  }
  const w = weekly(amt, unit)
  if (w == null) return null
  return w >= SECTOR_WEEKLY_MIN[sectorFor(j.production_types?.name)] ? 'fair' : 'below_benchmark'
}

export function belowMinWage(isSideHustle: boolean, amount: number, unit: PayUnit) {
  if (!isSideHustle) return false
  const hourly = unit === 'hour' ? amount : unit === 'day' ? amount / 8 : null
  return hourly != null && hourly < MIN_HOURLY_WAGE
}
