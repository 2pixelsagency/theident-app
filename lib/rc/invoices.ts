import { supabase } from '@/lib/supabase'
import { PdfWriter, A4, downloadBytes, fileSafe } from './pdf'
import { fmtDate, money, toISODate } from './format'

export type InvoiceItem = { description: string; quantity: number; unit_price: number }
export type InvoiceStatus = 'draft' | 'sent' | 'paid'
export type Invoice = {
  id: string; number: string; status: InvoiceStatus
  client_name: string; client_email: string | null; client_address: string | null; from_details: string | null
  items: InvoiceItem[]; vat_rate: number; subtotal: number; total: number
  issue_date: string; due_date: string | null; notes: string | null
  sent_at: string | null; paid_at: string | null; payment_id: string | null; created_at: string
}

export const STATUS_META: Record<InvoiceStatus, { label: string; tone: 'neutral' | 'pencil' | 'green' }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  sent: { label: 'Sent', tone: 'pencil' },
  paid: { label: 'Paid', tone: 'green' },
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function totals(items: InvoiceItem[], vatRate: number) {
  const subtotal = round2(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0))
  const vat = round2(subtotal * (vatRate / 100))
  return { subtotal, vat, total: round2(subtotal + vat) }
}

export function isOverdue(inv: Pick<Invoice, 'status' | 'due_date'>) {
  return inv.status === 'sent' && !!inv.due_date && inv.due_date < toISODate(new Date())
}

// INV-0001, INV-0002 … per member
export async function nextInvoiceNumber(profileId: string) {
  const { data } = await supabase.from('invoices').select('number').eq('profile_id', profileId)
  const max = (data || []).reduce((m, r) => Math.max(m, parseInt(String(r.number).replace(/\D/g, ''), 10) || 0), 0)
  return 'INV-' + String(max + 1).padStart(4, '0')
}

export async function buildInvoicePdf(inv: Invoice) {
  const w = await PdfWriter.create()
  const t = totals(inv.items, Number(inv.vat_rate))
  const right = A4.w - w.margin

  // Title + number/dates
  const top = w.y
  w.text('Invoice', { font: w.display, size: 30, gap: 1 })
  w.at(inv.number, right, top - 18, { font: w.bold, size: 12, align: 'right' })
  w.at('Issued ' + fmtDate(inv.issue_date, { day: 'numeric', month: 'long', year: 'numeric' }), right, top - 34, { size: 9.5, color: w.c.muted, align: 'right' })
  if (inv.due_date) w.at('Due ' + fmtDate(inv.due_date, { day: 'numeric', month: 'long', year: 'numeric' }), right, top - 48, { size: 9.5, color: w.c.muted, align: 'right' })
  w.y = top - 64
  w.rule(w.c.green, 2)
  w.space(20)

  // From / Bill to columns
  const colW = (w.width - 24) / 2
  const colTop = w.y
  w.text('FROM', { font: w.bold, size: 8, color: w.c.muted, maxWidth: colW })
  w.space(2)
  w.text(inv.from_details || '', { size: 10, maxWidth: colW, gap: 1.4 })
  const leftEnd = w.y
  w.y = colTop
  const x2 = w.margin + colW + 24
  w.text('BILL TO', { font: w.bold, size: 8, color: w.c.muted, x: x2, maxWidth: colW })
  w.space(2)
  w.text(inv.client_name, { font: w.bold, size: 10, x: x2, maxWidth: colW })
  if (inv.client_address) w.text(inv.client_address, { size: 10, x: x2, maxWidth: colW, gap: 1.4 })
  if (inv.client_email) w.text(inv.client_email, { size: 10, x: x2, maxWidth: colW, color: w.c.muted })
  w.y = Math.min(w.y, leftEnd) - 26

  // Line items
  const cQty = right - 170, cPrice = right - 90
  const header = () => {
    w.page.drawRectangle({ x: w.margin, y: w.y - 22, width: w.width, height: 22, color: w.c.tint })
    w.at('DESCRIPTION', w.margin + 10, w.y - 14, { font: w.bold, size: 8, color: w.c.muted })
    w.at('QTY', cQty, w.y - 14, { font: w.bold, size: 8, color: w.c.muted, align: 'right' })
    w.at('PRICE', cPrice, w.y - 14, { font: w.bold, size: 8, color: w.c.muted, align: 'right' })
    w.at('AMOUNT', right - 10, w.y - 14, { font: w.bold, size: 8, color: w.c.muted, align: 'right' })
    w.y -= 26
  }
  header()
  for (const it of inv.items) {
    w.ensure(30)
    if (w.y > A4.h - w.margin - 5) header() // fresh page: repeat the column header
    const rowTop = w.y
    const used = w.text(it.description || '—', { size: 10, x: w.margin + 10, maxWidth: cQty - w.margin - 60 })
    const base = rowTop - 10 * 1.35 + 2.8
    w.at(String(Number(it.quantity) || 0), cQty, base, { size: 10, align: 'right' })
    w.at(money(Number(it.unit_price), { pence: true }), cPrice, base, { size: 10, align: 'right' })
    w.at(money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), { pence: true }), right - 10, base, { size: 10, align: 'right' })
    w.y = rowTop - Math.max(used, 14) - 8
    w.rule()
  }

  // Totals
  w.ensure(90)
  w.space(14)
  const line = (label: string, value: string, strong = false) => {
    w.y -= strong ? 22 : 16
    w.at(label, cPrice, w.y, { size: strong ? 11 : 10, font: strong ? w.bold : w.regular, color: strong ? w.c.ink : w.c.muted, align: 'right' })
    w.at(value, right - 10, w.y, { size: strong ? 13 : 10, font: strong ? w.bold : w.regular, align: 'right' })
  }
  line('Subtotal', money(t.subtotal, { pence: true }))
  if (Number(inv.vat_rate) > 0) line('VAT ' + Number(inv.vat_rate) + '%', money(t.vat, { pence: true }))
  line('Total due', money(t.total, { pence: true }), true)

  if (inv.notes) {
    w.space(30)
    w.ensure(40)
    w.text('PAYMENT DETAILS & NOTES', { font: w.bold, size: 8, color: w.c.muted })
    w.space(2)
    w.text(inv.notes, { size: 10, gap: 1.45 })
  }

  w.footer(inv.number + '  ·  Created with RoleCall')
  return w.bytes()
}

export async function downloadInvoice(inv: Invoice) {
  downloadBytes(await buildInvoicePdf(inv), fileSafe(inv.number + ' ' + inv.client_name) + '.pdf')
}

function toBase64(bytes: Uint8Array) {
  let s = ''
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(s)
}

// Emails the PDF to the client (server checks ownership, rate-limits and marks it sent)
export async function emailInvoice(inv: Invoice, message: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { ok: false, error: 'Please log in again' }
  const pdf = toBase64(await buildInvoicePdf(inv))
  const res = await fetch('/api/invoices/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
    body: JSON.stringify({ invoiceId: inv.id, pdf, message }),
  })
  const body = await res.json().catch(() => ({}))
  return res.ok ? { ok: true as const } : { ok: false as const, error: (body as { error?: string }).error || 'Couldn’t send the email' }
}
