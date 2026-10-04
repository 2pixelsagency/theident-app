'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import LogMoneySheet from '@/components/rc/LogMoneySheet'
import { BackHeader, Button, Card, IconTile, PageLoading, Pill, Progress, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { signStorageUrls } from '@/lib/storage'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, money } from '@/lib/rc/format'
import { EXPENSE_CATEGORIES, SET_ASIDE_RATE, categoryMeta, estimateTaxAndNI, exportLedger, inTaxYear, taxYear, type Expense, type Payment } from '@/lib/rc/money'

export default function TaxPage() {
  const { id } = useMe()
  const ty = taxYear()
  const [adding, setAdding] = useState(false)
  const [openCat, setOpenCat] = useState<string | null>(null)
  const [receipts, setReceipts] = useState<Map<string, string>>(new Map())

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: payments }, { data: expenses }] = await Promise.all([
      supabase.from('payments').select('*').eq('profile_id', id).gte('paid_on', ty.start).lte('paid_on', ty.end),
      supabase.from('expenses').select('*').eq('profile_id', id).gte('expense_date', ty.start).lte('expense_date', ty.end).order('expense_date', { ascending: false }),
    ])
    return { payments: (payments || []) as Payment[], expenses: (expenses || []) as Expense[] }
  }, [id, ty.start, ty.end])

  if (loading || !data) return <><BackHeader title="Tax & expenses" /><PageLoading /></>
  const payments = data.payments.filter(p => inTaxYear(p.paid_on, ty))
  const expenses = data.expenses
  const income = payments.reduce((s, p) => s + Number(p.amount), 0)
  const allowable = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const profit = Math.max(0, income - allowable)
  const estimate = estimateTaxAndNI(profit)
  // Put 20% of profit by as you go (the personal allowance is annual, so a year-to-date estimate under-shoots)
  const suggested = Math.round(profit * SET_ASIDE_RATE)
  const setAside = payments.reduce((s, p) => s + Number(p.set_aside || 0), 0)
  const onTrack = suggested === 0 || setAside >= suggested * 0.9

  const byCat = EXPENSE_CATEGORIES.map(c => ({ ...c, total: expenses.filter(e => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0) }))
    .concat(expenses.some(e => !EXPENSE_CATEGORIES.some(c => c.value === e.category)) ? [{ ...categoryMeta('Other'), value: '__other', label: 'Uncategorised', total: expenses.filter(e => !EXPENSE_CATEGORIES.some(c => c.value === e.category)).reduce((s, e) => s + Number(e.amount), 0) }] : [])
    .filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  // How ready the return is: income logged, receipts kept, everything categorised
  const withReceipts = expenses.length ? expenses.filter(e => e.receipt_url).length / expenses.length : 1
  const categorised = expenses.length ? expenses.filter(e => e.category && e.category !== 'Other').length / expenses.length : 1
  const ready = Math.round(((payments.length ? 1 : 0) * 0.4 + withReceipts * 0.35 + categorised * 0.25) * 100)

  const openCategory = async (value: string) => {
    setOpenCat(value)
    const list = expenses.filter(e => (value === '__other' ? !EXPENSE_CATEGORIES.some(c => c.value === e.category) : e.category === value))
    const signed = await signStorageUrls('receipts', list.map(e => e.receipt_url))
    setReceipts(signed)
  }
  const catList = openCat ? expenses.filter(e => (openCat === '__other' ? !EXPENSE_CATEGORIES.some(c => c.value === e.category) : e.category === openCat)) : []

  const remove = async (e: Expense) => {
    if (!confirm('Delete this expense?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', e.id)
    if (error) { toast('Couldn’t delete'); return }
    mutate(d => d && { ...d, expenses: d.expenses.filter(x => x.id !== e.id) })
  }

  return (
    <>
      <BackHeader title="Tax & expenses" right={<span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">Tax year {ty.label}</span>} />
      <div className="px-4 pb-10 print:px-0">
        <div className="rounded-[var(--radius)] bg-dark p-5 text-white">
          <p className="text-[13px] font-medium text-white/60">Set aside for tax</p>
          <p className="mt-2 flex items-baseline gap-2"><span className="text-[40px] font-medium leading-none">{money(setAside)}</span><span className="text-sm text-white/60">of ~{money(suggested)} suggested</span></p>
          <Progress dark value={suggested ? (setAside / suggested) * 100 : 100} className="mt-4" />
          <p className="mt-3 text-[13px] text-white/70">{onTrack ? 'You’re on track' : 'A little behind'} — we put 20% aside each time you log pay.</p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {[['Income to date', money(income), ''], ['Allowable expenses', money(allowable), 'text-green-ink'], ['Taxable profit', money(profit), ''], ['Est. tax + NI so far', money(estimate), '']].map(([k, v, c]) => (
            <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className={cx('mt-1 text-[20px] font-medium', c)}>{v}</p></Card>
          ))}
        </div>

        <div className="mb-3 mt-6 flex items-center justify-between">
          <h2 className="text-[18px]">Allowable expenses</h2>
          <button type="button" onClick={() => setAdding(true)} className="text-sm font-medium text-green-ink">+ Add</button>
        </div>
        <Card className="divide-y divide-line overflow-hidden">
          {byCat.length === 0 ? <p className="p-4 text-sm text-muted">No expenses yet this tax year. Scan receipts as you go — travel, digs, classes and kit add up.</p> : byCat.map(c => (
            <button key={c.value} type="button" onClick={() => openCategory(c.value)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <IconTile icon={c.icon} tone={c.tone} />
              <span className="flex-1 text-[15px] font-medium">{c.label}</span>
              <span className="text-[15px] font-medium">{money(c.total)}</span>
            </button>
          ))}
        </Card>

        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between"><p className="text-[16px] font-medium">Your {ty.label} return</p><Pill tone="green">{ready}% ready</Pill></div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-green" style={{ width: ready + '%' }} /></div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button variant="dark" onClick={() => exportLedger(payments, expenses, ty.label)}>Export for accountant</Button>
            <Button variant="outline" onClick={() => window.print()}>Download summary</Button>
          </div>
        </Card>

        <Link href="/pay" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
          <IconTile icon="pound" tone="green" />
          <span className="flex-1"><span className="block text-[15px] font-medium">Pay &amp; earnings</span><span className="block text-[13px] text-muted">See every payment feeding these numbers</span></span>
          <Icon name="chevron-right" className="size-4 text-faint" />
        </Link>

        <p className="mt-4 text-center text-xs text-faint">Estimates only — not tax advice. Always check figures with HMRC or your accountant.</p>
      </div>

      <LogMoneySheet key={'add' + String(adding)} open={adding} onClose={() => setAdding(false)} uid={id} initial="expense"
        onSaved={r => mutate(d => d && (r.kind === 'payment' ? { ...d, payments: [r.row, ...d.payments] } : { ...d, expenses: [r.row, ...d.expenses] }))} />

      <Sheet open={!!openCat} onClose={() => setOpenCat(null)} title={openCat === '__other' ? 'Uncategorised' : categoryMeta(openCat || '').label}>
        <ul className="space-y-2">
          {catList.map(e => {
            const src = e.receipt_url ? receipts.get(e.receipt_url) || (/^https?:/.test(e.receipt_url) ? e.receipt_url : null) : null
            return (
              <li key={e.id}>
                <Card className="flex items-center gap-3 p-3">
                  {src
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <a href={src} target="_blank" rel="noopener noreferrer"><img src={src} alt="Receipt" className="size-12 rounded-lg object-cover" /></a>
                    : <span className="flex size-12 items-center justify-center rounded-lg bg-chip text-faint"><Icon name="receipt" /></span>}
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{e.description || categoryMeta(e.category).label}</span><span className="block text-[13px] text-muted">{fmtDate(e.expense_date)}{!e.receipt_url && ' · no receipt'}</span></span>
                  <span className="font-medium">{money(Number(e.amount), { pence: true })}</span>
                  <button type="button" aria-label="Delete expense" onClick={() => remove(e)} className="text-faint"><Icon name="x" className="size-4" /></button>
                </Card>
              </li>
            )
          })}
        </ul>
      </Sheet>
    </>
  )
}
