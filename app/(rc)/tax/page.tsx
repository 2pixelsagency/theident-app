'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import LogMoneySheet from '@/components/rc/LogMoneySheet'
import { BackHeader, PageLoading, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { signStorageUrls } from '@/lib/storage'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, money } from '@/lib/rc/format'
import { EXPENSE_CATEGORIES, SET_ASIDE_RATE, categoryMeta, estimateTaxAndNI, exportLedger, taxYear, type Expense, type Payment } from '@/lib/rc/money'

// Tax & expenses: a clear money desk — a summary up top, Income / Expenses tabs with big action tiles,
// a tax-year switcher and a clean Date · Who · Amount table (tap a row for details).
type Invoice = { id: string; number: string | null; client_name: string | null; total: number; issue_date: string | null; due_date: string | null; status: string }

const yearsBack = (n: number) => Array.from({ length: n }, (_, i) => taxYear(new Date(new Date().getFullYear() - i, new Date().getMonth(), new Date().getDate())))

export default function TaxPage() {
  const { id } = useMe()
  const years = yearsBack(4)
  const [ty, setTy] = useState(years[0])
  const [tab, setTab] = useState<'income' | 'expenses'>('income')
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'owed'>('all')
  const [adding, setAdding] = useState<'payment' | 'expense' | null>(null)
  const [report, setReport] = useState(false)
  const [open, setOpen] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<string | null>(null)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: payments }, { data: expenses }, { data: invoices }] = await Promise.all([
      supabase.from('payments').select('*').eq('profile_id', id).gte('paid_on', ty.start).lte('paid_on', ty.end).order('paid_on', { ascending: false }),
      supabase.from('expenses').select('*').eq('profile_id', id).gte('expense_date', ty.start).lte('expense_date', ty.end).order('expense_date', { ascending: false }),
      supabase.from('invoices').select('id, number, client_name, total, issue_date, due_date, status').eq('profile_id', id).eq('status', 'sent').order('issue_date', { ascending: false }),
    ])
    return { payments: (payments || []) as Payment[], expenses: (expenses || []) as Expense[], owed: (invoices || []) as Invoice[] }
  }, [id, ty.start, ty.end])

  if (loading || !data) return <><BackHeader title="Tax & expenses" /><PageLoading /></>
  const { payments, expenses, owed } = data
  const income = payments.reduce((s, p) => s + Number(p.amount), 0)
  const allowable = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const profit = Math.max(0, income - allowable)
  const estimate = estimateTaxAndNI(profit)
  const suggested = Math.round(profit * SET_ASIDE_RATE)
  const setAside = payments.reduce((s, p) => s + Number(p.set_aside || 0), 0)
  const owedTotal = owed.reduce((s, i) => s + Number(i.total), 0)

  // Income rows: money received, plus invoices still owed
  const incomeRows = [
    ...(paidFilter !== 'owed' ? payments.map(p => ({ key: 'p' + p.id, date: p.paid_on, who: p.payer || p.description || 'Payment', amount: Number(p.amount), owed: false, payment: p as Payment | null, invoice: null as Invoice | null })) : []),
    ...(paidFilter !== 'paid' ? owed.map(i => ({ key: 'i' + i.id, date: i.issue_date || '', who: i.client_name || 'Invoice ' + (i.number || ''), amount: Number(i.total), owed: true, payment: null, invoice: i })) : []),
  ].sort((a, b) => b.date.localeCompare(a.date))

  const byCat = EXPENSE_CATEGORIES.map(c => ({ ...c, total: expenses.filter(e => e.category === c.value).reduce((s, e) => s + Number(e.amount), 0) })).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  const removeExpense = async (e: Expense) => {
    if (!confirm('Delete this expense?')) return
    const { error } = await supabase.from('expenses').delete().eq('id', e.id)
    if (error) { toast('Couldn’t delete'); return }
    mutate(d => d && { ...d, expenses: d.expenses.filter(x => x.id !== e.id) }); setOpen(null)
  }
  const removePayment = async (p: Payment) => {
    if (!confirm('Delete this payment?')) return
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) { toast('Couldn’t delete'); return }
    mutate(d => d && { ...d, payments: d.payments.filter(x => x.id !== p.id) }); setOpen(null)
  }
  const toggleExpense = async (e: Expense) => {
    const key = 'e' + e.id
    setReceipt(null)
    setOpen(o => (o === key ? null : key))
    if (e.receipt_url && open !== key) {
      const signed = await signStorageUrls('receipts', [e.receipt_url])
      setReceipt(signed.get(e.receipt_url) || (/^https?:/.test(e.receipt_url) ? e.receipt_url : null))
    }
  }

  return (
    <>
      <BackHeader title="Tax & expenses" />
      <div className="px-4 pb-12 print:px-0">
        {/* Summary */}
        <div className="rounded-[24px] bg-forest p-5 text-bg">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-on-dark-muted">Tax year {ty.label}</p>
            <YearPicker years={years} value={ty} onChange={setTy} dark />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Income" value={money(income)} />
            <Stat label="Expenses" value={money(allowable)} />
            <Stat label="Taxable profit" value={money(profit)} />
            <Stat label="Est. tax + NI" value={money(estimate)} accent />
          </div>
          <div className="mt-4 rounded-[16px] bg-forest-raised px-4 py-3">
            <div className="flex items-baseline justify-between gap-3"><p className="text-[13px] text-on-dark-muted">Set aside so far</p><p className="font-display text-[20px] font-bold">{money(setAside)} <span className="text-[13px] font-normal text-on-dark-muted">of ~{money(suggested)}</span></p></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-lime" style={{ width: Math.min(100, suggested ? (setAside / suggested) * 100 : 100) + '%' }} /></div>
          </div>
        </div>

        {/* Income | Expenses */}
        <div role="tablist" className="mt-5 grid grid-cols-2 rounded-full bg-sand-2 p-1">
          {(['income', 'expenses'] as const).map(t => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setOpen(null) }}
              className={cx('h-10 rounded-full text-[14px] font-semibold capitalize transition-colors', tab === t ? 'bg-forest text-bg' : 'text-muted-strong')}>{t}</button>
          ))}
        </div>

        {tab === 'income' ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <Tile primary icon="plus" label="Record income" onClick={() => setAdding('payment')} />
              <Tile icon="receipt" label="Invoices" href="/pay/invoices" />
              <Tile icon="clock" label="What am I owed?" onClick={() => setPaidFilter('owed')} badge={owed.length ? money(owedTotal) : undefined} />
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[13px] text-muted">{incomeRows.length} {incomeRows.length === 1 ? 'entry' : 'entries'}</p>
              <div className="flex overflow-hidden rounded-[12px] border border-line bg-surface text-[13px] font-semibold">
                {(['all', 'paid', 'owed'] as const).map(f => (
                  <button key={f} type="button" onClick={() => setPaidFilter(f)} aria-pressed={paidFilter === f}
                    className={cx('px-3 py-2 transition-colors', paidFilter === f ? 'bg-forest text-bg' : f === 'paid' ? 'text-green-ink' : f === 'owed' ? 'text-red' : 'text-muted-strong')}>
                    {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Not paid'}
                  </button>
                ))}
              </div>
            </div>
            <Table head={['Date', 'From', 'Amount']} empty={paidFilter === 'owed' ? 'Nothing owed — every invoice is paid.' : 'No income logged for ' + ty.label + ' yet.'}>
              {incomeRows.map(r => (
                <Row key={r.key} open={open === r.key} onToggle={() => setOpen(o => (o === r.key ? null : r.key))}
                  date={r.date} who={r.who} amount={money(r.amount, { pence: true })} tone={r.owed ? 'owed' : 'paid'}>
                  {r.payment && <>
                    <Detail k="Description" v={r.payment.description} />
                    <Detail k="Set aside for tax" v={money(Number(r.payment.set_aside || 0), { pence: true })} />
                    <button type="button" onClick={() => removePayment(r.payment!)} className="mt-2 text-[13px] font-semibold text-red">Delete payment</button>
                  </>}
                  {r.invoice && <>
                    <Detail k="Invoice" v={r.invoice.number} />
                    <Detail k="Due" v={r.invoice.due_date ? fmtDate(r.invoice.due_date) : null} />
                    <Link href="/pay/invoices" className="mt-2 inline-block text-[13px] font-semibold text-green-ink">Open invoices →</Link>
                  </>}
                </Row>
              ))}
            </Table>
          </>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-3 gap-2.5">
              <Tile primary icon="plus" label="Add expense" onClick={() => setAdding('expense')} />
              <Tile icon="trending" label="Expense report" onClick={() => setReport(true)} />
              <Tile icon="download" label="Export CSV" onClick={() => exportLedger(payments, expenses, ty.label)} />
            </div>
            <Table head={['Date', 'What', 'Amount']} empty={'No expenses for ' + ty.label + ' yet. Travel, digs, classes, headshots and kit all add up.'}>
              {expenses.map(e => (
                <Row key={e.id} open={open === 'e' + e.id} onToggle={() => toggleExpense(e)}
                  date={e.expense_date} who={e.description || categoryMeta(e.category).label} amount={money(Number(e.amount), { pence: true })}>
                  <Detail k="Category" v={categoryMeta(e.category).label} />
                  {receipt ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <a href={receipt} target="_blank" rel="noopener noreferrer"><img src={receipt} alt="Receipt" className="mt-2 h-24 rounded-[10px] object-cover" /></a>
                  ) : <Detail k="Receipt" v={e.receipt_url ? 'Loading…' : 'None — keep receipts for HMRC'} />}
                  <button type="button" onClick={() => removeExpense(e)} className="mt-2 text-[13px] font-semibold text-red">Delete expense</button>
                </Row>
              ))}
            </Table>
          </>
        )}

        {/* Tools */}
        <h2 className="mb-3 mt-8 text-[18px]">Tools</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ToolCard icon="check-square" title="Do I need to file?" body="Check in two minutes whether you need a Self Assessment return." cta="Check on GOV.UK" href="https://www.gov.uk/check-if-you-need-tax-return" external />
          <ToolCard dark icon="receipt" title="Create an invoice" body="A clean, ready-to-send invoice in your name. Mark it paid when the money lands." cta="Open invoices" href="/pay/invoices" />
          <ToolCard icon="download" title="Export for your accountant" body={'Every payment and expense for ' + ty.label + ' as a spreadsheet.'} cta="Download CSV" onClick={() => exportLedger(payments, expenses, ty.label)} />
          <ToolCard icon="card" title="Pay & earnings" body="Every payment, your current contract and what to set aside." cta="Open" href="/pay" />
        </div>

        <p className="mt-6 text-center text-xs text-faint">Estimates only — not tax advice. Check figures with HMRC or your accountant.</p>
      </div>

      {adding && <LogMoneySheet key={adding} open onClose={() => setAdding(null)} uid={id} initial={adding}
        onSaved={r => mutate(d => d && (r.kind === 'payment' ? { ...d, payments: [r.row, ...d.payments] } : { ...d, expenses: [r.row, ...d.expenses] }))} />}

      <Sheet open={report} onClose={() => setReport(false)} title={'Expense report · ' + ty.label}>
        {byCat.length === 0 ? <p className="text-sm text-muted">No expenses yet this tax year.</p> : (
          <div className="space-y-3">
            {byCat.map(c => (
              <div key={c.value}>
                <div className="flex items-baseline justify-between text-[15px]"><span className="font-medium">{c.label}</span><span className="font-semibold">{money(c.total, { pence: true })}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-chip"><div className="h-full rounded-full bg-forest" style={{ width: (c.total / allowable) * 100 + '%' }} /></div>
              </div>
            ))}
            <div className="flex items-baseline justify-between border-t border-line pt-3 text-[15px]"><span className="font-semibold">Total</span><span className="font-display text-[20px] font-bold">{money(allowable, { pence: true })}</span></div>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-[12px] text-on-dark-muted">{label}</p><p className={cx('mt-0.5 font-display text-[24px] font-bold leading-tight', accent && 'text-lime')}>{value}</p></div>
}

function YearPicker({ years, value, onChange, dark }: { years: ReturnType<typeof taxYear>[]; value: ReturnType<typeof taxYear>; onChange: (y: ReturnType<typeof taxYear>) => void; dark?: boolean }) {
  return (
    <label className={cx('relative inline-flex items-center gap-1.5 rounded-[12px] border px-3 py-1.5 text-[14px] font-semibold', dark ? 'border-white/20 bg-white/10 text-bg' : 'border-line bg-surface')}>
      <select aria-label="Tax year" value={value.start} onChange={e => onChange(years.find(y => y.start === e.target.value)!)} className="appearance-none bg-transparent pr-4 outline-none">
        {years.map(y => <option key={y.start} value={y.start} className="text-ink">20{y.label}</option>)}
      </select>
      <Icon name="chevron-down" className="pointer-events-none absolute right-2 size-3.5" />
    </label>
  )
}

function Tile({ icon, label, primary, onClick, href, badge }: { icon: string; label: string; primary?: boolean; onClick?: () => void; href?: string; badge?: string }) {
  const cls = cx('relative flex min-h-[92px] flex-col items-center justify-center gap-2 rounded-[18px] px-2 py-3 text-center text-[13px] font-semibold leading-tight transition-colors',
    primary ? 'bg-forest text-bg hover:bg-forest-raised' : 'border border-line bg-surface text-ink shadow-card hover:border-forest')
  const inner = <><Icon name={icon} strokeWidth={2} className="size-6" />{label}{badge && <span className="absolute right-2 top-2 rounded-full bg-red px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>}</>
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>
}

function Table({ head, empty, children }: { head: string[]; empty: string; children: React.ReactNode }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children
  const none = Array.isArray(rows) && rows.length === 0
  return (
    <div className="mt-3 overflow-hidden rounded-[20px] border border-line-soft bg-surface shadow-card">
      <div className="grid grid-cols-[64px_1fr_auto_28px] gap-3 border-b border-line-soft px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
        <span>{head[0]}</span><span>{head[1]}</span><span className="text-right">{head[2]}</span><span />
      </div>
      {none ? <p className="px-4 py-6 text-center text-[14px] text-muted">{empty}</p> : <ul className="divide-y divide-line-soft">{rows}</ul>}
    </div>
  )
}

function Row({ date, who, amount, tone, open, onToggle, children }: { date: string; who: string; amount: string; tone?: 'paid' | 'owed'; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} className="grid w-full grid-cols-[64px_1fr_auto_28px] items-center gap-3 px-4 py-3.5 text-left">
        <span className="text-[14px] font-medium text-muted-strong">{date ? fmtDate(date, { day: 'numeric', month: 'short' }) : '—'}</span>
        <span className="min-w-0 truncate text-[15px] font-semibold">{who}</span>
        <span className={cx('text-right text-[15px] font-bold tabular-nums', tone === 'owed' ? 'text-red' : tone === 'paid' ? 'text-green-ink' : 'text-ink')}>{amount}</span>
        <span className={cx('flex size-7 items-center justify-center rounded-[9px] transition-colors', open ? 'bg-forest text-lime' : 'bg-chip text-muted')}><Icon name="chevron-down" strokeWidth={2.4} className={cx('size-3.5 transition-transform', open && 'rotate-180')} /></span>
      </button>
      {open && <div className="animate-[rc-step-in_200ms_ease-out] bg-sand px-4 py-3">{children}</div>}
    </li>
  )
}

function Detail({ k, v }: { k: string; v: string | null | undefined }) {
  if (!v) return null
  return <p className="text-[13px]"><span className="text-muted">{k}: </span><span className="font-medium">{v}</span></p>
}

function ToolCard({ icon, title, body, cta, href, onClick, dark, external }: { icon: string; title: string; body: string; cta: string; href?: string; onClick?: () => void; dark?: boolean; external?: boolean }) {
  const cls = cx('group flex h-full flex-col rounded-[22px] p-5 text-left transition-colors', dark ? 'bg-forest text-bg' : 'border border-line bg-surface hover:border-forest')
  const inner = (
    <>
      <span className={cx('flex size-11 items-center justify-center rounded-[14px]', dark ? 'bg-forest-raised text-lime' : 'bg-lime text-forest')}><Icon name={icon} strokeWidth={2} className="size-5" /></span>
      <span className="mt-4 font-display text-[19px] font-bold leading-tight">{title}</span>
      <span className={cx('mt-1.5 flex-1 text-[14px] leading-relaxed', dark ? 'text-on-dark-muted' : 'text-muted-strong')}>{body}</span>
      <span className={cx('mt-4 inline-flex items-center gap-1.5 text-[14px] font-semibold', dark ? 'text-lime' : 'text-green-ink')}>{cta} <Icon name="arrow-right" strokeWidth={2} className="cta-arrow size-4" /></span>
    </>
  )
  if (href) return external ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a> : <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls}>{inner}</button>
}
