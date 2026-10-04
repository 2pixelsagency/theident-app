// Shared display helpers (en-GB, GBP)

const DAY = 86_400_000

export function toISODate(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null
  // Plain dates are local calendar days, not UTC midnights
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s)
  return isNaN(d.getTime()) ? null : d
}

export function fmtDate(s: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const d = s instanceof Date ? s : parseDate(s)
  return d ? d.toLocaleDateString('en-GB', opts) : ''
}

export function fmtTime(s: string | Date | null | undefined) {
  const d = s instanceof Date ? s : parseDate(s)
  return d ? d.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' }).replace(' ', '') : ''
}

export function fmtTimeOfDay(t: string | null | undefined) {
  return t ? t.slice(0, 5) : ''
}

export function fmtRange(from: string | null | undefined, to: string | null | undefined) {
  const a = parseDate(from), b = parseDate(to)
  if (!a) return ''
  if (!b || a.getTime() === b.getTime()) return fmtDate(a, { day: 'numeric', month: 'short' })
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${fmtDate(b, { day: 'numeric', month: 'short' })}`
  return `${fmtDate(a, { day: 'numeric', month: 'short' })} – ${fmtDate(b, { day: 'numeric', month: 'short' })}`
}

export function ago(s: string | null | undefined) {
  const d = parseDate(s)
  if (!d) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.round(hrs / 24)
  if (days < 7) return days + (days === 1 ? ' day ago' : ' days ago')
  return fmtDate(d, { day: 'numeric', month: 'short' })
}

export function shortAgo(s: string | null | undefined) {
  const d = parseDate(s)
  if (!d) return ''
  const mins = Math.round((Date.now() - d.getTime()) / 60000)
  if (mins < 60) return Math.max(1, mins) + 'm'
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return hrs + 'h'
  if (hrs < 24 * 7) return d.toLocaleDateString('en-GB', { weekday: 'short' })
  return fmtDate(d, { day: 'numeric', month: 'short' })
}

export function daysUntil(s: string | null | undefined) {
  const d = parseDate(s)
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const that = new Date(d); that.setHours(0, 0, 0, 0)
  return Math.round((that.getTime() - today.getTime()) / DAY)
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function money(n: number | null | undefined, opts: { pence?: boolean; sign?: boolean } = {}) {
  if (n == null || isNaN(n)) return '£0'
  const abs = Math.abs(n)
  const s = '£' + abs.toLocaleString('en-GB', { minimumFractionDigits: opts.pence ? 2 : 0, maximumFractionDigits: opts.pence ? 2 : 0 })
  if (!opts.sign) return n < 0 ? '-' + s : s
  return (n < 0 ? '-' : '+') + s
}

// Monday-start week containing `d`
export function weekDays(d = new Date()) {
  const start = new Date(d); start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => { const x = new Date(start); x.setDate(start.getDate() + i); return x })
}

export function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined) {
  return [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unnamed'
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('')
}
