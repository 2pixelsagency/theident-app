import type { Tone } from '@/components/rc/ui'
import { toISODate } from './format'

// UK self-employed helpers. Estimates only — not tax advice (the UI says so).

export const SET_ASIDE_RATE = 0.2

export type Payment = { id: string; amount: number; payer: string | null; description: string | null; paid_on: string; job_id: string | null; set_aside: number; created_at: string }
export type Expense = { id: string; amount: number; description: string | null; category: string; receipt_url: string | null; expense_date: string; created_at: string }

// Tax year runs 6 April → 5 April
export function taxYear(d = new Date()) {
  const y = d.getMonth() > 3 || (d.getMonth() === 3 && d.getDate() >= 6) ? d.getFullYear() : d.getFullYear() - 1
  return { start: `${y}-04-06`, end: `${y + 1}-04-05`, label: `${String(y).slice(2)}/${String(y + 1).slice(2)}` }
}

export function inTaxYear(date: string, ty = taxYear()) {
  return date >= ty.start && date <= ty.end
}

// Income tax (rUK bands) + Class 4 NI on self-employed profit, 2026/27 thresholds
export function estimateTaxAndNI(profit: number) {
  const PA = 12_570, BASIC_TOP = 50_270, HIGHER_TOP = 125_140
  const allowance = profit > 100_000 ? Math.max(0, PA - (profit - 100_000) / 2) : PA
  const taxable = Math.max(0, profit - allowance)
  const basicBand = BASIC_TOP - PA
  const tax = Math.min(taxable, basicBand) * 0.2
    + Math.max(0, Math.min(taxable, HIGHER_TOP - allowance) - basicBand) * 0.4
    + Math.max(0, taxable - (HIGHER_TOP - allowance)) * 0.45
  const ni = Math.max(0, Math.min(profit, BASIC_TOP) - PA) * 0.06 + Math.max(0, profit - BASIC_TOP) * 0.02
  return Math.round(tax + ni)
}

export const EXPENSE_CATEGORIES: { value: string; label: string; icon: string; tone: Tone }[] = [
  { value: 'Travel', label: 'Travel', icon: 'hash', tone: 'neutral' },
  { value: 'Accommodation', label: 'Digs & accommodation', icon: 'house', tone: 'purple' },
  { value: 'Classes', label: 'Classes & training', icon: 'bulb', tone: 'pink' },
  { value: 'Equipment', label: 'Equipment & kit', icon: 'settings', tone: 'amber' },
  { value: 'Agent commission', label: 'Agent commission', icon: 'user', tone: 'neutral' },
  { value: 'Headshots', label: 'Headshots & reels', icon: 'camera', tone: 'green' },
  { value: 'Costumes', label: 'Costumes', icon: 'sparkle', tone: 'pink' },
  { value: 'Subscriptions', label: 'Subscriptions', icon: 'card', tone: 'pencil' },
  { value: 'Marketing', label: 'Marketing', icon: 'megaphone', tone: 'purple' },
  { value: 'Food', label: 'Food (on tour)', icon: 'receipt', tone: 'amber' },
  { value: 'Other', label: 'Other', icon: 'more', tone: 'neutral' },
]

export function categoryMeta(value: string) {
  return EXPENSE_CATEGORIES.find(c => c.value === value) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]
}

export type ReceiptGuess = { amount?: string; date?: string; description?: string; category?: string }

// On-device OCR (tesseract.js) to pre-fill an expense from a receipt photo
export async function scanReceipt(file: File): Promise<ReceiptGuess> {
  const { default: Tesseract } = await import('tesseract.js')
  const { data } = await Tesseract.recognize(file, 'eng')
  const text = data.text || ''
  const out: ReceiptGuess = {}
  const amounts = (text.match(/[£$]\s*(\d+[.,]\d{2})/g) || text.match(/\d+[.,]\d{2}/g) || []).map(a => parseFloat(a.replace(/[£$\s]/g, '').replace(',', '.'))).filter(n => !isNaN(n))
  if (amounts.length) out.amount = Math.max(...amounts).toFixed(2)
  const dm = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/)
  if (dm) {
    const year = dm[3].length === 2 ? '20' + dm[3] : dm[3]
    const iso = `${year}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}`
    if (!isNaN(new Date(iso).getTime()) && iso <= toISODate(new Date())) out.date = iso
  }
  const line = text.split('\n').map(l => l.trim()).find(l => l.length > 4 && !/^\d/.test(l) && !/total|subtotal|vat|tax|change|cash|card|visa|mastercard|receipt|thank/i.test(l))
  if (line) out.description = line.slice(0, 60)
  const t = text.toLowerCase()
  if (/uber|train|rail|bus|taxi|flight|parking|petrol|tfl/.test(t)) out.category = 'Travel'
  else if (/hotel|airbnb|accommodation|hostel|digs/.test(t)) out.category = 'Accommodation'
  else if (/class|lesson|workshop|studio|course/.test(t)) out.category = 'Classes'
  else if (/camera|lens|tripod|mic|light|shoes|kit/.test(t)) out.category = 'Equipment'
  else if (/coffee|cafe|restaurant|lunch|dinner|pret|greggs/.test(t)) out.category = 'Food'
  return out
}

export function toCSV(rows: (string | number | null)[][]) {
  return rows.map(r => r.map(v => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }).join(',')).join('\n')
}

export function downloadFile(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function exportLedger(payments: Payment[], expenses: Expense[], label: string) {
  const rows: (string | number | null)[][] = [['Date', 'Type', 'Category', 'Description', 'Amount (GBP)']]
  for (const p of payments) rows.push([p.paid_on, 'Income', '', [p.payer, p.description].filter(Boolean).join(' — '), Number(p.amount).toFixed(2)])
  for (const e of expenses) rows.push([e.expense_date, 'Expense', e.category, e.description, (-Number(e.amount)).toFixed(2)])
  rows.splice(1, rows.length - 1, ...rows.slice(1).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))
  downloadFile('rolecall-' + label.replace('/', '-') + '.csv', toCSV(rows))
}
