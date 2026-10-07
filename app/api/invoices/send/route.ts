import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const DAILY_LIMIT = 20
const MAX_PDF_BYTES = 3 * 1024 * 1024

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const gbp = (n: number) => '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Emails one of the signed-in member's own invoices (PDF built in the app) to the client on it.
// Everything is read through the member's own session, so RLS guarantees ownership.
export async function POST(req: NextRequest) {
  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  if (!jwt) return NextResponse.json({ error: 'Please log in again' }, { status: 401 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: 'Bearer ' + jwt } },
    auth: { persistSession: false },
  })
  const { data: { user } } = await db.auth.getUser(jwt)
  if (!user?.email) return NextResponse.json({ error: 'Please log in again' }, { status: 401 })

  let body: { invoiceId?: string; pdf?: string; message?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }) }
  if (!body.invoiceId || typeof body.pdf !== 'string') return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { data: inv } = await db.from('invoices').select('id, number, status, client_name, client_email, total, due_date').eq('id', body.invoiceId).maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  const to = (inv.client_email || '').trim()
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(to)) return NextResponse.json({ error: 'Add a valid client email first' }, { status: 400 })

  const since = new Date(Date.now() - 86_400_000).toISOString()
  const { count } = await db.from('invoices').select('id', { count: 'exact', head: true }).gte('sent_at', since)
  if ((count || 0) >= DAILY_LIMIT) return NextResponse.json({ error: 'You’ve sent a lot of invoices today — try again tomorrow' }, { status: 429 })

  const pdf = Buffer.from(body.pdf, 'base64')
  if (pdf.length > MAX_PDF_BYTES || pdf.subarray(0, 5).toString() !== '%PDF-') return NextResponse.json({ error: 'The invoice PDF couldn’t be attached' }, { status: 400 })

  const { data: me } = await db.from('profiles').select('first_name, last_name').eq('id', user.id).maybeSingle()
  const sender = [me?.first_name, me?.last_name].filter(Boolean).join(' ') || 'A RoleCall member'
  const message = (body.message || '').slice(0, 1000).trim()
  const due = inv.due_date ? new Date(inv.due_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null

  const html =
    '<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a;padding:24px;">' +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Hi ' + esc(inv.client_name || 'there') + ',</p>' +
    (message ? '<p style="font-size:15px;line-height:1.6;margin:0 0 16px;white-space:pre-line;">' + esc(message) + '</p>' : '') +
    '<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Please find invoice <strong>' + esc(inv.number) + '</strong> for <strong>' + gbp(Number(inv.total)) + '</strong> attached' + (due ? ', due ' + esc(due) : '') + '.</p>' +
    '<p style="font-size:15px;line-height:1.6;margin:0;">Thanks,<br>' + esc(sender) + '</p>' +
    '<p style="font-size:12px;color:#6e6a62;margin:28px 0 0;">Sent with RoleCall. Reply to this email to contact ' + esc(sender) + ' directly.</p>' +
    '</div>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'RoleCall Invoices <notifications@theident.me>',
      to,
      reply_to: user.email,
      subject: 'Invoice ' + inv.number + ' from ' + sender,
      html,
      attachments: [{ filename: (inv.number + '.pdf').replace(/[^\w.\-]/g, '_'), content: body.pdf }],
    }),
  })
  if (!res.ok) return NextResponse.json({ error: 'The email couldn’t be sent — try again' }, { status: 502 })

  await db.from('invoices').update({ sent_at: new Date().toISOString(), ...(inv.status === 'draft' ? { status: 'sent' } : {}) }).eq('id', inv.id)
  return NextResponse.json({ ok: true })
}
