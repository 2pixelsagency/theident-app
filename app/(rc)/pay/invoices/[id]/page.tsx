'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Field, PageLoading, Pill, Sheet, StickyActions, TextArea, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName, money, toISODate } from '@/lib/rc/format'
import { STATUS_META, isOverdue, nextInvoiceNumber, totals, type Invoice } from '@/lib/rc/invoices'

type ItemDraft = { description: string; quantity: string; unit_price: string }
type Draft = {
  number: string; client_name: string; client_email: string; client_address: string; from_details: string
  items: ItemDraft[]; vat: boolean; issue_date: string; due_date: string; notes: string
}

const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return toISODate(d) }

export default function InvoiceEditorPage() {
  const { id: param } = useParams<{ id: string }>()
  const me = useMe()
  const isNew = param === 'new'

  const { data, loading, mutate } = useAsync(async (): Promise<{ invoice: Invoice | null; defaults: Draft | null }> => {
    if (!isNew) {
      const { data } = await supabase.from('invoices').select('*').eq('id', param).maybeSingle()
      return { invoice: data as Invoice | null, defaults: null }
    }
    // New invoice: carry over your details and payment notes from the last one
    const [{ data: last }, number] = await Promise.all([
      supabase.from('invoices').select('from_details, notes').eq('profile_id', me.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      nextInvoiceNumber(me.id),
    ])
    const defaults: Draft = {
      number, client_name: '', client_email: '', client_address: '',
      from_details: last?.from_details || [fullName(me.profile), me.email].filter(Boolean).join('\n'),
      items: [{ description: '', quantity: '1', unit_price: '' }], vat: false,
      issue_date: toISODate(new Date()), due_date: plusDays(30), notes: last?.notes || '',
    }
    return { invoice: null, defaults }
  }, [param, me.id])

  if (loading || !data) return <><BackHeader title="Invoice" back="/pay/invoices" /><PageLoading /></>
  if (!isNew && !data.invoice) return <><BackHeader title="Invoice" back="/pay/invoices" /><p className="px-4 pt-10 text-center text-muted">Invoice not found.</p></>

  const inv = data.invoice
  const initial: Draft = inv ? {
    number: inv.number, client_name: inv.client_name, client_email: inv.client_email || '', client_address: inv.client_address || '', from_details: inv.from_details || '',
    items: (inv.items.length ? inv.items : [{ description: '', quantity: 1, unit_price: 0 }]).map(i => ({ description: i.description, quantity: String(i.quantity), unit_price: String(i.unit_price) })),
    vat: Number(inv.vat_rate) > 0, issue_date: inv.issue_date, due_date: inv.due_date || '', notes: inv.notes || '',
  } : data.defaults!

  return <Editor key={inv?.id || 'new'} initial={initial} invoice={inv} profileId={me.id} onSaved={i => mutate(d => d && { ...d, invoice: i })} />
}

function Editor({ initial, invoice, profileId, onSaved }: { initial: Draft; invoice: Invoice | null; profileId: string; onSaved: (i: Invoice) => void }) {
  const router = useRouter()
  const [d, setD] = useState<Draft>(initial)
  const [busy, setBusy] = useState<null | 'save' | 'pdf' | 'email' | 'paid' | 'delete'>(null)
  const [emailing, setEmailing] = useState(false)
  const [message, setMessage] = useState('')
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }))
  const setItem = (i: number, patch: Partial<ItemDraft>) => setD(p => ({ ...p, items: p.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }))

  const items = d.items.map(i => ({ description: i.description.trim(), quantity: Number(i.quantity) || 0, unit_price: Number(i.unit_price) || 0 })).filter(i => i.description || i.unit_price)
  const vatRate = d.vat ? 20 : 0
  const t = totals(items, vatRate)
  const status = invoice?.status || 'draft'

  // Insert or update, returning the saved row
  const save = async (quiet = false): Promise<Invoice | null> => {
    if (!d.client_name.trim()) { toast('Add who the invoice is for'); return null }
    if (!items.length) { toast('Add at least one line'); return null }
    const row = {
      number: d.number.trim() || 'INV', client_name: d.client_name.trim(), client_email: d.client_email.trim() || null, client_address: d.client_address.trim() || null,
      from_details: d.from_details.trim() || null, items, vat_rate: vatRate, subtotal: t.subtotal, total: t.total,
      issue_date: d.issue_date || toISODate(new Date()), due_date: d.due_date || null, notes: d.notes.trim() || null,
    }
    setBusy(b => b ?? 'save')
    const q = invoice
      ? supabase.from('invoices').update(row).eq('id', invoice.id).select('*').single()
      : supabase.from('invoices').insert({ ...row, profile_id: profileId }).select('*').single()
    const { data: saved, error } = await q
    setBusy(null)
    if (error || !saved) { toast(error?.code === '23505' ? 'You already have an invoice numbered ' + row.number : 'Couldn’t save the invoice'); return null }
    if (!quiet) toast('Saved')
    if (!invoice) router.replace('/pay/invoices/' + saved.id)
    else onSaved(saved as Invoice)
    return saved as Invoice
  }

  const pdf = async () => {
    const saved = await save(true)
    if (!saved) return
    setBusy('pdf')
    try { const { downloadInvoice } = await import('@/lib/rc/invoices'); await downloadInvoice(saved) } catch { toast('Couldn’t create the PDF') }
    setBusy(null)
  }

  const openEmail = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.client_email.trim())) { toast('Add your client’s email first'); return }
    setEmailing(true)
  }

  const send = async () => {
    const saved = await save(true)
    if (!saved) return
    setBusy('email')
    const { emailInvoice } = await import('@/lib/rc/invoices')
    const res = await emailInvoice(saved, message)
    setBusy(null)
    if (!res.ok) { toast(res.error); return }
    setEmailing(false)
    onSaved({ ...saved, status: saved.status === 'draft' ? 'sent' : saved.status, sent_at: new Date().toISOString() })
    toast('Invoice sent to ' + saved.client_email)
  }

  // Paid → also logged as a payment in Pay & earnings (and removed again if undone)
  const togglePaid = async () => {
    const saved = invoice || (await save(true))
    if (!saved) return
    setBusy('paid')
    if (saved.status !== 'paid') {
      const { data: pay, error } = await supabase.from('payments').insert({ profile_id: profileId, amount: Number(saved.total), payer: saved.client_name, description: 'Invoice ' + saved.number, paid_on: toISODate(new Date()) }).select('id').single()
      if (error) { setBusy(null); toast('Couldn’t log the payment'); return }
      const { data: upd } = await supabase.from('invoices').update({ status: 'paid', paid_at: new Date().toISOString(), payment_id: pay.id }).eq('id', saved.id).select('*').single()
      if (upd) onSaved(upd as Invoice)
      toast('Marked as paid · added to Pay & earnings')
    } else {
      if (saved.payment_id) await supabase.from('payments').delete().eq('id', saved.payment_id)
      const { data: upd } = await supabase.from('invoices').update({ status: saved.sent_at ? 'sent' : 'draft', paid_at: null, payment_id: null }).eq('id', saved.id).select('*').single()
      if (upd) onSaved(upd as Invoice)
      toast('Marked as unpaid')
    }
    setBusy(null)
  }

  const remove = async () => {
    if (!invoice || !confirm('Delete invoice ' + invoice.number + '?')) return
    setBusy('delete')
    const { error } = await supabase.from('invoices').delete().eq('id', invoice.id)
    if (error) { setBusy(null); toast('Couldn’t delete'); return }
    router.replace('/pay/invoices')
  }

  const late = invoice && isOverdue(invoice)

  return (
    <>
      <BackHeader title={invoice ? invoice.number : 'New invoice'} back="/pay/invoices"
        right={invoice && (late ? <Pill tone="amber">Overdue</Pill> : <Pill tone={STATUS_META[status].tone}>{STATUS_META[status].label}</Pill>)} />
      <div className="space-y-5 px-4 pb-6">
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">Bill to</p>
          <Field label="Client or company" value={d.client_name} onChange={e => set('client_name', e.target.value)} placeholder="e.g. Seaside Productions Ltd" />
          <Field label="Client email" type="email" inputMode="email" value={d.client_email} onChange={e => set('client_email', e.target.value)} placeholder="accounts@example.com" />
          <TextArea label="Client address (optional)" rows={2} value={d.client_address} onChange={e => set('client_address', e.target.value)} />
        </section>

        <section>
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-muted">Work</p>
          <div className="space-y-3">
            {d.items.map((it, i) => (
              <Card key={i} className="space-y-3 p-3">
                <div className="flex items-start gap-2">
                  <Field className="flex-1" label={'Line ' + (i + 1)} value={it.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="e.g. Rehearsal week 1 — ensemble" />
                  {d.items.length > 1 && <button type="button" aria-label="Remove line" onClick={() => set('items', d.items.filter((_, j) => j !== i))} className="mt-7 inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="x" className="size-4" /></button>}
                </div>
                <div className="grid grid-cols-[1fr_1.4fr_1.2fr] items-end gap-2">
                  <Field label="Qty" inputMode="decimal" value={it.quantity} onChange={e => setItem(i, { quantity: e.target.value.replace(/[^\d.]/g, '') })} />
                  <Field label="Price (£)" inputMode="decimal" value={it.unit_price} onChange={e => setItem(i, { unit_price: e.target.value.replace(/[^\d.]/g, '') })} placeholder="0.00" />
                  <p className="pb-3 text-right text-[15px] font-medium">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0), { pence: true })}</p>
                </div>
              </Card>
            ))}
          </div>
          <button type="button" onClick={() => set('items', [...d.items, { description: '', quantity: '1', unit_price: '' }])} className="upload mt-3 flex h-11 w-full items-center justify-center gap-2 text-sm font-medium"><Icon name="plus" className="size-4" /> Add a line</button>
        </section>

        <Card className="divide-y divide-line">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1"><p className="text-[15px] font-medium">Add VAT (20%)</p><p className="text-[13px] text-muted">Only if you’re VAT registered</p></div>
            <Toggle checked={d.vat} onChange={v => set('vat', v)} label="Add VAT" />
          </div>
          <div className="space-y-1.5 px-4 py-3.5 text-[15px]">
            <p className="flex justify-between text-muted"><span>Subtotal</span><span>{money(t.subtotal, { pence: true })}</span></p>
            {d.vat && <p className="flex justify-between text-muted"><span>VAT 20%</span><span>{money(t.vat, { pence: true })}</span></p>}
            <p className="flex justify-between text-[17px] font-medium"><span>Total</span><span>{money(t.total, { pence: true })}</span></p>
          </div>
        </Card>

        <section className="grid grid-cols-2 gap-3">
          <Field label="Issue date" type="date" value={d.issue_date} onChange={e => set('issue_date', e.target.value)} />
          <Field label="Due date" type="date" value={d.due_date} onChange={e => set('due_date', e.target.value)} />
          <Field className="col-span-2" label="Invoice number" value={d.number} onChange={e => set('number', e.target.value)} />
        </section>

        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">From</p>
          <TextArea label="Your name, address & contact" rows={3} value={d.from_details} onChange={e => set('from_details', e.target.value)} />
          <TextArea label="Payment details & notes" rows={3} value={d.notes} onChange={e => set('notes', e.target.value)} placeholder={'Bank: …\nSort code: …  Account: …\nUTR (optional)'} />
          <p className="text-xs text-muted">Saved for your next invoice. Only you and the people you send it to see these.</p>
        </section>

        {invoice && (
          <div className="flex items-center justify-between pt-1">
            <button type="button" onClick={togglePaid} disabled={busy !== null} className="inline-flex items-center gap-2 text-sm font-medium text-green-ink"><Icon name="check-circle" className="size-4" />{status === 'paid' ? 'Mark as unpaid' : 'Mark as paid'}</button>
            <button type="button" onClick={remove} disabled={busy !== null} className="text-sm font-medium text-red">Delete</button>
          </div>
        )}

        <StickyActions>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" icon="download" onClick={pdf} disabled={busy !== null}>{busy === 'pdf' ? 'Creating…' : 'PDF'}</Button>
            <Button variant="outline" className="flex-1" onClick={() => save()} disabled={busy !== null}>{busy === 'save' ? 'Saving…' : 'Save'}</Button>
            <Button className="flex-[1.4]" icon="send" onClick={openEmail} disabled={busy !== null}>{invoice?.sent_at ? 'Resend' : 'Email'}</Button>
          </div>
        </StickyActions>
      </div>

      <Sheet open={emailing} onClose={() => setEmailing(false)} title="Email invoice">
        <p className="text-[15px]">To <span className="font-medium">{d.client_email}</span> with <span className="font-medium">{d.number}.pdf</span> attached ({money(t.total, { pence: true })}).</p>
        <p className="mt-1 text-[13px] text-muted">Replies come straight to your email.</p>
        <TextArea className="mt-4" label="Message (optional)" rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Thanks for having me on the job — invoice attached." />
        <Button className="mt-4" size="lg" full icon="send" onClick={send} disabled={busy !== null}>{busy === 'email' ? 'Sending…' : 'Send invoice'}</Button>
      </Sheet>
    </>
  )
}
