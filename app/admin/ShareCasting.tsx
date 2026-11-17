'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button, Field, Sheet, TextArea, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { fullName } from '@/lib/rc/format'

// Pull the obvious bits out of a pasted casting call; the admin checks and edits everything before publishing
function guess(text: string) {
  const urls = text.match(/https?:\/\/[^\s)]+/g) || []
  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0] || ''
  const pay = text.match(/£\s?(\d[\d,]*(?:\.\d{2})?)\s*(?:\/|per|a)?\s*(day|week|hour|show|performance|job)?/i)
  const handle = text.match(/(?:^|\s)@([a-z0-9._]{2,30})/i)?.[1] || ''
  const closing = text.match(/(?:deadline|closes?|closing|apply by|submissions? by)[:\s]+([^\n.]{3,30})/i)?.[1] || ''
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return {
    apply: urls.find(u => !/instagram\.com/.test(u)) || '',
    email, pay: pay ? pay[1].replace(/,/g, '') : '', unit: (pay?.[2] || 'day').toLowerCase().replace(/performance|show/, 'show'),
    handle, closingNote: closing, title: (lines[0] || '').replace(/^[^a-z0-9]+/i, '').slice(0, 80),
  }
}

export function ShareCasting({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [types, setTypes] = useState<{ id: number; name: string }[]>([])
  const [paste, setPaste] = useState('')
  const [f, setF] = useState({ project: '', role: '', type: '', location: '', pay: '', unit: 'day', closes: '', apply: '', email: '', handle: '', url: '', description: '', side: false })
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))
  useEffect(() => { supabase.from('production_types').select('id, name').order('name').then(({ data }) => setTypes(data || [])) }, [])

  const fill = () => {
    const g = guess(paste)
    setF(x => ({ ...x, project: x.project || g.title, pay: x.pay || g.pay, unit: g.pay ? g.unit : x.unit, apply: x.apply || g.apply, email: x.email || g.email, handle: x.handle || g.handle, description: x.description || paste.trim() }))
    toast('Filled what we could — check every field')
  }
  const publish = async () => {
    if (!f.project.trim() || !f.description.trim()) { toast('Add a title and the brief'); return }
    if (!f.apply.trim() && !f.email.trim()) { toast('Add where people apply (link or email)'); return }
    if (!f.closes) { toast('Add a closing date so it disappears when it’s over'); return }
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from('jobs').insert({
      created_by: session?.user.id, is_published: true, shared_by_ident: true, is_side_hustle: f.side,
      project_in: f.side ? null : f.project.trim(), job_title: f.side ? f.project.trim() : null, project_role: f.role.trim() || null,
      production_type_id: f.type ? Number(f.type) : null, location: f.location.trim() || null,
      is_paid: !!f.pay, pay_amount: f.pay ? Number(f.pay) : null, pay_unit: f.pay ? f.unit : null, pay_currency: 'GBP',
      application_deadline: f.closes, description: f.description.trim(), short_summary: f.description.trim().split('\n')[0].slice(0, 160),
      application_method: f.apply.trim() ? 'link' : 'email', submission_link: f.apply.trim() || null, application_email: f.email.trim() || null,
      source_handle: f.handle.trim().replace(/^@/, '') || null, source_url: f.url.trim() || null, submit_materials: [],
    })
    setBusy(false)
    if (error) { toast('Couldn’t publish: ' + error.message); return }
    toast('Published — it’s on the job board now')
    setPaste(''); setF({ project: '', role: '', type: '', location: '', pay: '', unit: 'day', closes: '', apply: '', email: '', handle: '', url: '', description: '', side: false })
    onDone(); onClose()
  }
  return (
    <Sheet open={open} onClose={onClose} title="Share a casting">
      <div className="space-y-3">
        <p className="text-[13px] text-muted">Paste a casting call (e.g. an Instagram caption), tap <b>Fill from paste</b>, then check every field. It’s credited and linked back, and applications go to the original link or email. Share only with the poster’s OK.</p>
        <TextArea label="Paste the casting" value={paste} onChange={e => setPaste(e.target.value)} placeholder="Paste the caption or message here…" />
        <Button size="sm" variant="outline" onClick={fill} disabled={!paste.trim()}>Fill from paste</Button>
        <div className="flex gap-2">
          {[['Casting role', false], ['Side hustle', true]].map(([l, v]) => <button key={String(l)} type="button" onClick={() => set('side', v as boolean)} aria-pressed={f.side === v} className={cx('h-9 flex-1 rounded-full border text-sm font-medium', f.side === v ? 'border-forest bg-forest text-white' : 'border-line')}>{l}</button>)}
        </div>
        <Field label={f.side ? 'Job title' : 'Production / project'} value={f.project} onChange={e => set('project', e.target.value)} />
        {!f.side && <Field label="Role(s)" value={f.role} onChange={e => set('role', e.target.value)} placeholder="e.g. Ensemble, Lead (female, 25–35)" />}
        {!f.side && (
          <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Type</span>
            <select value={f.type} onChange={e => set('type', e.target.value)} className="h-12 w-full rounded-xl border border-line bg-field px-3">
              <option value="">Choose…</option>{types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        )}
        <Field label="Location" value={f.location} onChange={e => set('location', e.target.value)} placeholder="London, UK" />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Pay (£, blank if unpaid)" inputMode="decimal" value={f.pay} onChange={e => set('pay', e.target.value.replace(/[^\d.]/g, ''))} />
          <label className="block"><span className="mb-1.5 block text-[13px] font-medium">Per</span>
            <select value={f.unit} onChange={e => set('unit', e.target.value)} className="h-12 w-full rounded-xl border border-line bg-field px-3">{['day', 'week', 'hour', 'show', 'job'].map(u => <option key={u}>{u}</option>)}</select>
          </label>
        </div>
        <Field label="Closing date" type="date" value={f.closes} onChange={e => set('closes', e.target.value)} />
        <Field label="Apply link" type="url" value={f.apply} onChange={e => set('apply', e.target.value)} placeholder="https://…" />
        <Field label="…or apply email" type="email" value={f.email} onChange={e => set('email', e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Credit (Instagram handle)" value={f.handle} onChange={e => set('handle', e.target.value)} placeholder="@castingaccount" />
          <Field label="Original post URL" type="url" value={f.url} onChange={e => set('url', e.target.value)} placeholder="https://instagram.com/p/…" />
        </div>
        <TextArea label="The brief (as performers will see it)" value={f.description} onChange={e => set('description', e.target.value)} />
        <Button full size="lg" onClick={publish} disabled={busy}>{busy ? 'Publishing…' : 'Publish to the job board'}</Button>
      </div>
    </Sheet>
  )
}

type Claim = { id: string; job_id: string; profile_id: string; note: string | null; created_at: string; jobs: { project_in: string | null; job_title: string | null; project_role: string | null } | null; profiles: { first_name: string | null; last_name: string | null; company_name: string | null } | null }
export function Claims() {
  const [rows, setRows] = useState<Claim[] | null>(null)
  const load = () => supabase.from('job_claims').select('id, job_id, profile_id, note, created_at, jobs(project_in, job_title, project_role), profiles(first_name, last_name, company_name)').eq('status', 'pending').order('created_at').then(({ data }) => setRows((data || []) as unknown as Claim[]))
   
  useEffect(() => { load() }, [])
  if (!rows?.length) return null
  const decide = async (c: Claim, ok: boolean) => {
    const { error } = ok ? await supabase.rpc('approve_job_claim', { claim: c.id }) : await supabase.from('job_claims').update({ status: 'rejected' }).eq('id', c.id)
    toast(error ? 'Couldn’t update' : ok ? 'Handed over' : 'Declined'); load()
  }
  return (
    <div className="mb-5 rounded-[var(--radius)] border border-butter bg-butter/30 p-4">
      <p className="font-semibold">Claims to check · {rows.length}</p>
      <ul className="mt-2 space-y-2">
        {rows.map(c => (
          <li key={c.id} className="rounded-xl bg-surface p-3 text-sm">
            <p><Link href={'/talent/' + c.profile_id} className="font-semibold underline">{fullName(c.profiles) || c.profiles?.company_name || 'Member'}</Link> claims <Link href={'/find/' + c.job_id} className="font-semibold underline">{[c.jobs?.project_in || c.jobs?.job_title, c.jobs?.project_role].filter(Boolean).join(' — ')}</Link></p>
            {c.note && <p className="mt-1 text-muted">“{c.note}”</p>}
            <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => decide(c, true)}>Hand it over</Button><Button size="sm" variant="outline" onClick={() => decide(c, false)}>Decline</Button></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
