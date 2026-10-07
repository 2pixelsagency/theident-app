'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Empty, PageLoading, Pill, TabChips } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, money } from '@/lib/rc/format'
import { STATUS_META, isOverdue, type Invoice } from '@/lib/rc/invoices'

type Tab = 'all' | 'unpaid' | 'paid' | 'draft'

export default function InvoicesPage() {
  const { id } = useMe()
  const [tab, setTab] = useState<Tab>('all')
  const { data, loading } = useAsync(async () => {
    const { data } = await supabase.from('invoices').select('*').eq('profile_id', id).order('created_at', { ascending: false })
    return (data || []) as Invoice[]
  }, [id])

  if (loading || !data) return <><BackHeader title="Invoices" back="/pay" /><PageLoading /></>
  const unpaid = data.filter(i => i.status === 'sent')
  const outstanding = unpaid.reduce((s, i) => s + Number(i.total), 0)
  const overdue = unpaid.filter(isOverdue)
  const paidTotal = data.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0)
  const shown = data.filter(i => tab === 'all' || (tab === 'unpaid' ? i.status === 'sent' : i.status === tab))

  return (
    <>
      <BackHeader title="Invoices" back="/pay" right={<Button size="sm" icon="plus" href="/pay/invoices/new">New</Button>} />
      <div className="px-4 pb-10">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius)] bg-dark p-4 text-white">
            <p className="text-xs text-white/60">Outstanding</p>
            <p className="mt-1 text-[26px] font-medium leading-tight">{money(outstanding)}</p>
            <p className="mt-1 text-xs text-white/60">{unpaid.length} unpaid{overdue.length ? ' · ' + overdue.length + ' overdue' : ''}</p>
          </div>
          <Card className="p-4">
            <p className="text-xs text-muted">Paid</p>
            <p className="mt-1 text-[26px] font-medium leading-tight">{money(paidTotal)}</p>
            <p className="mt-1 text-xs text-muted">Logged in Pay &amp; earnings</p>
          </Card>
        </div>

        <div className="mt-5">
          <TabChips value={tab} onChange={setTab} options={[
            { value: 'all', label: 'All', count: data.length },
            { value: 'unpaid', label: 'Unpaid', count: unpaid.length },
            { value: 'paid', label: 'Paid' },
            { value: 'draft', label: 'Drafts' },
          ]} />
        </div>

        {shown.length === 0 ? (
          <Card className="mt-3"><Empty icon="receipt" title={data.length ? 'Nothing here' : 'No invoices yet'} sub="Create an invoice, download it as a PDF or email it straight to your client." action={<Button href="/pay/invoices/new" icon="plus">New invoice</Button>} /></Card>
        ) : (
          <Card className="mt-3 divide-y divide-line overflow-hidden">
            {shown.map(i => {
              const late = isOverdue(i)
              return (
                <Link key={i.id} href={'/pay/invoices/' + i.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-chip"><Icon name="receipt" className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{i.client_name || 'No client yet'}</span>
                    <span className="block text-[13px] text-muted">{i.number} · {i.due_date ? 'Due ' + fmtDate(i.due_date, { day: 'numeric', month: 'short' }) : fmtDate(i.issue_date, { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-[15px] font-medium">{money(Number(i.total), { pence: true })}</span>
                    {late ? <Pill tone="amber">Overdue</Pill> : <Pill tone={STATUS_META[i.status].tone}>{STATUS_META[i.status].label}</Pill>}
                  </span>
                </Link>
              )
            })}
          </Card>
        )}
      </div>
    </>
  )
}
