'use client'

import { useRef, useState } from 'react'
import Icon from './Icon'
import { Button, Chip, Field, Segmented, Sheet, UploadTile, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { EXPENSE_CATEGORIES, SET_ASIDE_RATE, scanReceipt, type Expense, type Payment } from '@/lib/rc/money'
import { money, toISODate } from '@/lib/rc/format'

type Kind = 'payment' | 'expense'
const stamp = () => Date.now().toString(36)

// Log a payment (income) or an expense (with optional receipt photo + OCR pre-fill)
export default function LogMoneySheet({ open, onClose, uid, initial = 'payment', jobs = [], onSaved }: {
  open: boolean
  onClose: () => void
  uid: string
  initial?: Kind
  jobs?: { id: string; title: string }[]
  onSaved: (row: { kind: 'payment'; row: Payment } | { kind: 'expense'; row: Expense }) => void
}) {
  const [kind, setKind] = useState<Kind>(initial)
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState('')
  const [date, setDate] = useState(toISODate(new Date()))
  const [jobId, setJobId] = useState<string | null>(jobs[0]?.id ?? null)
  const [category, setCategory] = useState('Travel')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const value = parseFloat(amount)

  const pickReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setReceipt(f)
    setPreview(URL.createObjectURL(f))
    setScanning(true)
    try {
      const g = await scanReceipt(f)
      if (g.amount && !amount) setAmount(g.amount)
      if (g.date) setDate(g.date)
      if (g.description && !label) setLabel(g.description)
      if (g.category) setCategory(g.category)
      toast('Receipt scanned — check the details')
    } catch { toast('Couldn’t read that receipt — fill it in by hand') }
    setScanning(false)
  }

  const save = async () => {
    if (isNaN(value) || value <= 0) { toast('Enter an amount'); return }
    setSaving(true)
    if (kind === 'payment') {
      const set_aside = Math.round(value * SET_ASIDE_RATE * 100) / 100
      const job = jobs.find(j => j.id === jobId)
      const { data, error } = await supabase.from('payments').insert({ profile_id: uid, amount: value, payer: job?.title.split(' — ')[0] || null, description: label.trim() || null, paid_on: date, job_id: jobId, set_aside }).select('*').single()
      setSaving(false)
      if (error || !data) { toast('Couldn’t log that payment'); return }
      toast('Logged ' + money(value) + ' · ' + money(set_aside) + ' set aside for tax')
      onSaved({ kind: 'payment', row: data as Payment })
    } else {
      let receipt_url: string | null = null
      if (receipt) {
        // Private bucket: store the path, view via signed URL
        const path = uid + '/' + stamp() + '-receipt.' + (receipt.name.split('.').pop() || 'jpg')
        const { error: upErr } = await supabase.storage.from('receipts').upload(path, receipt, { contentType: receipt.type })
        if (upErr) { setSaving(false); toast('Couldn’t upload the receipt'); return }
        receipt_url = path
      }
      const { data, error } = await supabase.from('expenses').insert({ profile_id: uid, amount: value, description: label.trim() || null, category, receipt_url, expense_date: date }).select('*').single()
      setSaving(false)
      if (error || !data) { toast('Couldn’t log that expense'); return }
      toast('Expense added')
      onSaved({ kind: 'expense', row: data as Expense })
    }
    setAmount(''); setLabel(''); setReceipt(null); setPreview(null)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Log money">
      <div className="space-y-4">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'payment', label: 'Payment in' }, { value: 'expense', label: 'Expense' }]} />
        <Field label="Amount (£)" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} placeholder="0.00" autoFocus />
        {kind === 'payment' ? (
          <>
            {jobs.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-medium">From</p>
                <div className="flex flex-wrap gap-2">
                  {jobs.map(j => <Chip key={j.id} selected={jobId === j.id} onClick={() => setJobId(j.id)}>{j.title}</Chip>)}
                  <Chip selected={jobId === null} onClick={() => setJobId(null)}>Other</Chip>
                </div>
              </div>
            )}
            <Field label="Description" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Weekly wage · wk 10" />
            {!isNaN(value) && value > 0 && <p className="flex items-center gap-2 rounded-xl bg-purple-tint px-3 py-2.5 text-sm text-purple-ink"><Icon name="card" className="size-4" /> We’ll put {money(value * SET_ASIDE_RATE, { pence: true })} aside for tax</p>}
          </>
        ) : (
          <>
            {preview
              // eslint-disable-next-line @next/next/no-img-element
              ? <div className="flex items-center gap-3"><img src={preview} alt="Receipt" className="size-16 rounded-xl object-cover" /><span className="text-sm text-muted">{scanning ? 'Scanning receipt…' : 'Receipt attached'}</span><button type="button" onClick={() => { setReceipt(null); setPreview(null) }} className="ml-auto text-sm text-muted">Remove</button></div>
              : <UploadTile icon="camera" title="Scan a receipt" sub="We’ll fill in the amount, date and category" onClick={() => fileRef.current?.click()} />}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={pickReceipt} />
            <Field label="What for" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Train · home → Leeds" />
            <div>
              <p className="mb-2 text-[13px] font-medium">Category</p>
              <div className="flex flex-wrap gap-2">{EXPENSE_CATEGORIES.map(c => <Chip key={c.value} selected={category === c.value} onClick={() => setCategory(c.value)}>{c.label}</Chip>)}</div>
            </div>
          </>
        )}
        <Field label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
        <Button full size="lg" onClick={save} disabled={saving || scanning}>{saving ? 'Saving…' : kind === 'payment' ? 'Log payment' : 'Add expense'}</Button>
      </div>
    </Sheet>
  )
}
