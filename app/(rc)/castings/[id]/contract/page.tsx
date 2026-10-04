'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import SignaturePad, { type SignaturePadHandle } from '@/components/rc/SignaturePad'
import { BackHeader, Button, Card, Empty, IconButton, PageLoading, Pill, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, fullName, parseDate } from '@/lib/rc/format'
import { jobTitle, stageOf } from '@/lib/rc/pipeline'

type ContractApp = {
  id: string; job_id: string; status: string; outcome: string | null
  contract_terms: string | null; contract_signed_at: string | null; contract_signature: string | null
  jobs: { project_role: string | null; project_in: string | null; job_title: string | null; production_company: string | null; company: string | null; is_side_hustle: boolean; salary: string | null; start_date: string | null; end_date: string | null; contract_dates: string | null; location: string | null; schedule: string | null } | null
}

function weeksBetween(a: string | null, b: string | null) {
  const s = parseDate(a), e = parseDate(b)
  if (!s || !e) return null
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (7 * 86_400_000)))
}

// Plain-language default when the caster hasn't attached their own agreement text
function defaultTerms(app: ContractApp, artist: string) {
  const j = app.jobs
  const production = j?.project_in || j?.production_company || 'the production'
  const producer = j?.production_company || j?.company || 'The Producer'
  const dates = j?.start_date ? `from ${fmtDate(j.start_date, { day: 'numeric', month: 'long', year: 'numeric' })}${j.end_date ? ' to ' + fmtDate(j.end_date, { day: 'numeric', month: 'long', year: 'numeric' }) : ''}` : j?.contract_dates || 'on the dates agreed'
  return [
    `1. Engagement. ${producer} engages ${artist} to perform the role of ${j?.project_role || j?.job_title || 'the agreed role'} in ${production}.`,
    `2. Term. The engagement runs ${dates}, unless ended earlier under clause 5.`,
    `3. Remuneration. The Producer will pay the Artist ${j?.salary || 'the agreed fee'}, paid weekly in arrears.`,
    `4. Usage. Work is for live performance only unless a separate recording or filming agreement is signed.`,
    `5. Notice. Either party may end the engagement with two weeks’ written notice once performances begin.`,
    `6. Conduct and safety. Both parties will follow the production’s safeguarding and health & safety policies.`,
  ].join('\n\n')
}

export default function ContractPage() {
  const { id: appId } = useParams<{ id: string }>()
  const me = useMe()
  const pad = useRef<SignaturePadHandle>(null)
  const [hasInk, setHasInk] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: app, loading, mutate } = useAsync(async () => {
    const { data } = await supabase.from('applications')
      .select('id, job_id, status, outcome, contract_terms, contract_signed_at, contract_signature, jobs(project_role, project_in, job_title, production_company, company, is_side_hustle, salary, start_date, end_date, contract_dates, location, schedule)')
      .eq('id', appId).eq('profile_id', me.id).maybeSingle()
    return data as unknown as ContractApp | null
  }, [appId, me.id])

  if (loading) return <><BackHeader title="Contract" /><PageLoading /></>
  if (!app) return <><BackHeader title="Contract" /><Empty icon="file" title="Contract not found" sub="It may have been withdrawn by the production." /></>

  const booked = stageOf({ status: app.status as never, outcome: app.outcome }) === 'booked'
  const j = app.jobs
  const artist = fullName(me.profile)
  const terms = app.contract_terms || defaultTerms(app, artist)
  const weeks = weeksBetween(j?.start_date ?? null, j?.end_date ?? null)
  const signed = !!app.contract_signed_at

  const sign = async () => {
    if (!pad.current || pad.current.isEmpty()) { toast('Add your signature first'); return }
    setSaving(true)
    const blob = await pad.current.toBlob()
    const path = me.id + '/' + app.job_id + '/contract-signature-' + Date.now() + '.png'
    const { error: upErr } = blob ? await supabase.storage.from('applications').upload(path, blob, { contentType: 'image/png' }) : { error: new Error('no signature') }
    if (upErr) { setSaving(false); toast('Couldn’t save your signature — try again'); return }
    const signedAt = new Date().toISOString()
    const { error } = await supabase.from('applications').update({ contract_signed_at: signedAt, contract_signature: path, updated_at: signedAt }).eq('id', app.id)
    setSaving(false)
    if (error) { toast('Couldn’t sign — try again'); return }
    mutate(a => a && { ...a, contract_signed_at: signedAt, contract_signature: path })
    toast('Signed — you’re booked')
  }

  return (
    <>
      <BackHeader title="Contract" right={<IconButton icon="download" label="Save as PDF" onClick={() => window.print()} />} />
      <div className="px-4 pb-10">
        <div className="rounded-[var(--radius)] bg-dark p-5 text-white">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/60">Engagement</p>
              <p className="mt-1 text-[20px] font-medium">{jobTitle(j)}</p>
              <p className="text-sm text-white/60">{[j?.project_role, j?.production_company || j?.company].filter(Boolean).join(' · ')}</p>
            </div>
            <Pill tone={signed ? 'green' : 'amber'}>{signed ? 'Signed' : booked ? 'Ready to sign' : 'Not ready'}</Pill>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {[['Fee', j?.salary || '—'], ['Engagement', weeks ? weeks + ' weeks' : '—'], ['Dates', j?.start_date ? fmtDate(j.start_date, { day: 'numeric', month: 'short' }) + (j.end_date ? ' – ' + fmtDate(j.end_date, { day: 'numeric', month: 'short' }) : '') : j?.contract_dates || '—'], ['Where', j?.location || '—']].map(([k, v]) => (
            <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-[17px] font-medium">{v}</p></Card>
          ))}
        </div>

        <div className="mt-4 rounded-[var(--radius)] bg-purple-tint p-5 text-purple-ink">
          <p className="text-[15px] font-medium">The essentials, in plain English</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[j?.salary ? `Paid ${j.salary}, weekly, straight to your account.` : 'Paid weekly, straight to your account.', 'Two weeks’ notice either side once the run begins.', 'Usage is live performance only — no filming without a new agreement.', 'Digs are your own — find them in the app.'].map(t => (
              <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0" />{t}</li>
            ))}
          </ul>
        </div>

        <div className="mb-3 mt-6 flex items-center justify-between"><h2 className="text-[18px]">Full agreement</h2></div>
        <Card className="max-h-60 overflow-y-auto whitespace-pre-line p-4 text-[13px] leading-relaxed text-muted">{terms}</Card>

        {booked && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Your signature</h2>
            <Card className="p-4">
              {signed ? (
                <p className="flex items-center gap-2 text-[15px] text-green-ink"><Icon name="check-circle" className="size-5" /> Signed {fmtDate(app.contract_signed_at, { day: 'numeric', month: 'long', year: 'numeric' })} by {artist}</p>
              ) : (
                <>
                  <SignaturePad ref={pad} onChange={setHasInk} />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="text-muted">{fmtDate(new Date(), { day: 'numeric', month: 'long', year: 'numeric' })}{me.profile?.location ? ' · ' + me.profile.location : ''}</span>
                    {hasInk && <button type="button" onClick={() => pad.current?.clear()} className="font-medium text-green-ink">Clear</button>}
                  </div>
                </>
              )}
            </Card>
            {!signed && <Button className="mt-5" size="lg" full icon="pen" onClick={sign} disabled={saving || !hasInk}>{saving ? 'Signing…' : 'Agree & sign'}</Button>}
            <p className="mt-3 text-center text-xs text-muted">A signed copy is kept with this booking for both sides.</p>
          </>
        )}
      </div>
    </>
  )
}
