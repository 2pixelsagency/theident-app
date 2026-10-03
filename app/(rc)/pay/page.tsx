'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import LogMoneySheet from '@/components/rc/LogMoneySheet'
import { BackHeader, Button, Card, Empty, PageLoading, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, money, parseDate, toISODate } from '@/lib/rc/format'
import { SET_ASIDE_RATE, categoryMeta, exportLedger, inTaxYear, taxYear, type Expense, type Payment } from '@/lib/rc/money'
import { jobTitle } from '@/lib/rc/pipeline'

type BookedJob = { id: string; title: string; start_date: string | null; end_date: string | null; weekly: number | null }

export default function PayPage() {
  const { id } = useMe()
  const [logging, setLogging] = useState(false)
  const ty = taxYear()

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: payments }, { data: expenses }, { data: booked }] = await Promise.all([
      supabase.from('payments').select('*').eq('profile_id', id).order('paid_on', { ascending: false }).limit(500),
      supabase.from('expenses').select('*').eq('profile_id', id).gte('expense_date', ty.start).order('expense_date', { ascending: false }),
      supabase.from('applications').select('jobs(id, project_in, project_role, job_title, is_side_hustle, production_company, start_date, end_date, pay_amount, pay_unit)').eq('profile_id', id).eq('status', 'booked'),
    ])
    const jobs: BookedJob[] = ((booked || []) as unknown as { jobs: (Parameters<typeof jobTitle>[0] & { id: string; start_date: string | null; end_date: string | null; pay_amount: number | null; pay_unit: string | null }) | null }[])
      .filter(b => b.jobs).map(b => ({ id: b.jobs!.id, title: jobTitle(b.jobs), start_date: b.jobs!.start_date, end_date: b.jobs!.end_date, weekly: b.jobs!.pay_unit === 'week' ? Number(b.jobs!.pay_amount) : null }))
    return { payments: (payments || []) as Payment[], expenses: (expenses || []) as Expense[], jobs }
  }, [id, ty.start])

  if (loading || !data) return <><BackHeader title="Pay & earnings" /><PageLoading /></>
  const { payments, expenses, jobs } = data
  const yearPayments = payments.filter(p => inTaxYear(p.paid_on, ty))
  const yearTotal = yearPayments.reduce((s, p) => s + Number(p.amount), 0)
  const yearExpenses = expenses.filter(e => inTaxYear(e.expense_date, ty)).reduce((s, e) => s + Number(e.amount), 0)
  const suggested = Math.round(Math.max(0, yearTotal - yearExpenses) * SET_ASIDE_RATE)
  const today = toISODate(new Date())

  // The contract you're on now (or most recently paid by)
  const current = jobs.find(j => j.start_date && j.start_date <= today && (!j.end_date || j.end_date >= today)) || jobs.find(j => payments.some(p => p.job_id === j.id)) || null
  const contractPaid = current ? payments.filter(p => p.job_id === current.id) : []
  const contractTotal = contractPaid.reduce((s, p) => s + Number(p.amount), 0)
  const contractWeeks = current?.start_date && current.end_date ? Math.max(1, Math.round((parseDate(current.end_date)!.getTime() - parseDate(current.start_date)!.getTime()) / (7 * 86_400_000))) : null

  const activity = [
    ...payments.slice(0, 30).map(p => ({ key: 'p' + p.id, date: p.paid_on, title: p.description || 'Payment', sub: [p.payer, fmtDate(p.paid_on, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · '), amount: Number(p.amount), icon: 'pound', tile: 'bg-green-tint text-green-ink' })),
    ...expenses.slice(0, 30).map(e => ({ key: 'e' + e.id, date: e.expense_date, title: e.description || categoryMeta(e.category).label, sub: 'Expense · deductible · ' + fmtDate(e.expense_date, { day: 'numeric', month: 'short' }), amount: -Number(e.amount), icon: categoryMeta(e.category).icon, tile: 'bg-red-tint text-red' })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)

  return (
    <>
      <BackHeader title="Pay & earnings" right={<span className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted">Tax year {ty.label}</span>} />
      <div className="px-4 pb-10">
        <div className="rounded-[var(--radius)] bg-dark p-5 text-white">
          <p className="text-[13px] font-medium text-white/60">{current ? 'Earned this contract · ' + current.title.split(' — ')[0] : 'Earned this tax year'}</p>
          <p className="mt-2 text-[40px] font-medium leading-none">{money(current ? contractTotal : yearTotal)}</p>
          <div className="mt-5 grid grid-cols-3 divide-x divide-white/15 text-sm">
            <div className="pr-3"><p className="text-xs text-white/55">{current?.weekly ? 'Weekly wage' : 'Payments'}</p><p className="mt-1 font-medium">{current?.weekly ? money(current.weekly) : yearPayments.length}</p></div>
            <div className="px-3"><p className="text-xs text-white/55">{current ? 'Weeks paid' : 'Expenses'}</p><p className="mt-1 font-medium">{current ? contractPaid.length + (contractWeeks ? ' of ' + contractWeeks : '') : money(yearExpenses)}</p></div>
            <div className="pl-3"><p className="text-xs text-white/55">Year total</p><p className="mt-1 font-medium">{money(yearTotal)}</p></div>
          </div>
        </div>

        <Link href="/tax" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] bg-purple-tint p-4 text-purple-ink">
          <span className="flex size-11 items-center justify-center rounded-xl bg-surface"><Icon name="card" /></span>
          <span className="flex-1"><span className="block text-[15px] font-medium">Set aside for tax</span><span className="block text-[13px]">We suggest ~{money(suggested)} put by so far (20%).</span></span>
          <Icon name="chevron-right" className="size-5" />
        </Link>

        <Button className="mt-4" size="lg" full icon="plus" onClick={() => setLogging(true)}>Log a payment or expense</Button>

        <div className="mb-3 mt-6 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">Recent activity</p>
          {activity.length > 0 && <button type="button" onClick={() => exportLedger(yearPayments, expenses, ty.label)} className="text-sm font-medium text-green-ink">Export CSV</button>}
        </div>
        {activity.length === 0 ? <Card><Empty icon="pound" title="Nothing logged yet" sub="Log each payment as it lands — we’ll keep a running total and put tax aside." /></Card> : (
          <ul className="space-y-2">
            {activity.map(a => (
              <li key={a.key}>
                <Card className="flex items-center gap-3 p-4">
                  <span className={cx('flex size-10 items-center justify-center rounded-xl', a.tile)}><Icon name={a.icon} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{a.title}</span><span className="block truncate text-[13px] text-muted">{a.sub}</span></span>
                  <span className={cx('text-[16px] font-medium', a.amount > 0 ? 'text-green-ink' : 'text-red')}>{money(a.amount, { sign: true })}</span>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <Link href="/tax" className="upload mt-4 flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-ink"><Icon name="check-square" /></span>
          <span className="flex-1"><span className="block text-[15px] font-medium">Open Tax &amp; expenses</span><span className="block text-[13px] text-muted">Self-assessment ready, receipts stored</span></span>
          <Icon name="chevron-right" className="size-4 text-faint" />
        </Link>
      </div>

      <LogMoneySheet key={String(logging)} open={logging} onClose={() => setLogging(false)} uid={id} jobs={jobs.map(j => ({ id: j.id, title: j.title }))}
        onSaved={r => mutate(d => d && (r.kind === 'payment' ? { ...d, payments: [r.row, ...d.payments] } : { ...d, expenses: [r.row, ...d.expenses] }))} />
    </>
  )
}
