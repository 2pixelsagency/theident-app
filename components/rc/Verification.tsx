'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Button, Card, Field, cx, toast } from './ui'
import { supabase } from '@/lib/supabase'
import { GRADUATE_YEARS, PLANS, isRecentGraduate, price } from '@/lib/rc/plans'
import type { FullProfile } from '@/lib/rc/profile'

// Customise profile → Verification. Two badges:
//  Verified professional — booked through The Ident (automatic), your agent confirms by email, or we check a
//    Spotlight / IMDb / Equity link.
//  Verified graduate — your school email confirms it, or we check proof you upload. Unlocks the graduate price.
type Check = { id: string; kind: string; method: string; status: string; email: string | null; link: string | null; created_at: string }

export default function Verification({ uid, profile }: { uid: string; profile: FullProfile }) {
  const [checks, setChecks] = useState<Check[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [agentEmail, setAgentEmail] = useState('')
  const [link, setLink] = useState('')
  const [schoolEmail, setSchoolEmail] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = () => supabase.from('verification_checks').select('id, kind, method, status, email, link, created_at').eq('profile_id', uid).order('created_at', { ascending: false }).limit(10)
    .then(({ data }) => setChecks((data || []) as Check[]))
  useEffect(() => { load() }, [uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = async (body: Record<string, string>, key: string) => {
    setBusy(key)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/verification', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: JSON.stringify(body) }).catch(() => null)
    const j = res ? await res.json().catch(() => ({})) : {}
    setBusy(null)
    if (!res?.ok) { toast(j.error || 'Couldn’t send that — try again'); return false }
    toast(j.sent ? 'Email sent — they just need to tap the link' : j.already ? 'You’re already verified' : 'Sent — we’ll check it shortly')
    load()
    return true
  }

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.size > 10 * 1024 * 1024) { toast('That file is over 10 MB'); return }
    setBusy('evidence')
    const path = uid + '/grad-' + Date.now().toString(36) + '-' + f.name.replace(/[^\w.\-]+/g, '_')
    const { error } = await supabase.storage.from('verification').upload(path, f, { contentType: f.type })
    setBusy(null)
    if (error) { toast('Upload failed — try again'); return }
    send({ kind: 'graduate', method: 'evidence', evidence_path: path }, 'evidence')
  }

  const pending = (kind: string) => checks.find(c => c.kind === kind && (c.status === 'pending' || c.status === 'awaiting_email'))
  const proPending = pending('professional'), gradPending = pending('graduate')
  const recentGrad = isRecentGraduate(profile)

  return (
    <section id="verification" className="scroll-mt-4">
      <h2 className="text-[18px]">Verification</h2>
      <p className="mb-4 mt-1 text-[13px] text-muted">Badges that tell casting you’re a working professional. Everyone can still apply to roles without them.</p>

      <Card className="p-4">
        <Head on={!!profile.pro_verified} title="Verified professional" sub={profile.pro_verified ? profile.pro_verified_via || 'Verified' : 'Booked through The Ident? You’re verified automatically.'} />
        {!profile.pro_verified && (
          proPending ? <Waiting c={proPending} /> : (
            <div className="mt-4 space-y-4">
              <div>
                <p className="mb-2 text-[13px] font-medium">Ask your agent to confirm</p>
                <div className="flex gap-2">
                  <Field className="flex-1" type="email" inputMode="email" value={agentEmail} onChange={e => setAgentEmail(e.target.value)} placeholder="agent@agency.co.uk" />
                  <Button onClick={async () => { if (await send({ kind: 'professional', method: 'agent', email: agentEmail }, 'agent')) setAgentEmail('') }} disabled={busy !== null || !agentEmail.trim()}>{busy === 'agent' ? 'Sending…' : 'Send'}</Button>
                </div>
              </div>
              <div>
                <p className="mb-2 text-[13px] font-medium">Or send us a professional profile <span className="font-normal text-faint">· Spotlight, IMDb or Equity</span></p>
                <div className="flex gap-2">
                  <Field className="flex-1" type="url" inputMode="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://…" />
                  <Button variant="outline" onClick={async () => { if (await send({ kind: 'professional', method: 'link', link }, 'link')) setLink('') }} disabled={busy !== null || !link.trim()}>{busy === 'link' ? 'Sending…' : 'Submit'}</Button>
                </div>
              </div>
            </div>
          )
        )}
      </Card>

      {profile.is_graduate && (
        <Card className="mt-3 p-4">
          <Head on={!!profile.graduate_verified} title="Verified graduate"
            sub={profile.graduate_verified ? [profile.graduate_school, profile.graduate_year].filter(Boolean).join(' · ') || 'Verified'
              : recentGrad ? `Verify to get the graduate price: ${price(PLANS.graduate.pence)} a month instead of ${price(PLANS.performer.pence)}.` : 'Adds a verified graduate badge.'} />
          {!profile.graduate_verified && (
            gradPending ? <Waiting c={gradPending} /> : (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="mb-2 text-[13px] font-medium">Confirm with your school email</p>
                  <div className="flex gap-2">
                    <Field className="flex-1" type="email" inputMode="email" value={schoolEmail} onChange={e => setSchoolEmail(e.target.value)} placeholder="you@school.ac.uk" />
                    <Button onClick={async () => { if (await send({ kind: 'graduate', method: 'school_email', email: schoolEmail }, 'school')) setSchoolEmail('') }} disabled={busy !== null || !schoolEmail.trim()}>{busy === 'school' ? 'Sending…' : 'Send'}</Button>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[13px] font-medium">No school email any more? <span className="font-normal text-faint">· Upload a certificate, letter or student card</span></p>
                  <Button variant="outline" icon="upload" onClick={() => fileRef.current?.click()} disabled={busy !== null}>{busy === 'evidence' ? 'Uploading…' : 'Upload proof'}</Button>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={upload} />
                  <p className="mt-2 text-[12px] text-muted">Only our team sees it. The graduate price covers graduates from the last {GRADUATE_YEARS} years.</p>
                </div>
              </div>
            )
          )}
        </Card>
      )}
    </section>
  )
}

function Head({ on, title, sub }: { on: boolean; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-full', on ? 'bg-lime text-forest' : 'bg-chip text-muted')}><Icon name={on ? 'check' : 'shield-check'} strokeWidth={2} className="size-[18px]" /></span>
      <div className="min-w-0 flex-1"><p className="text-[15px] font-semibold">{title}</p><p className="text-[13px] text-muted">{sub}</p></div>
    </div>
  )
}

function Waiting({ c }: { c: Check }) {
  const what = c.status === 'awaiting_email' ? 'Waiting for ' + (c.email || 'them') + ' to tap the link in our email.' : 'With our team — we’ll let you know when it’s done.'
  return <p className="mt-3 flex items-center gap-2 rounded-[12px] bg-sand px-3 py-2.5 text-[13px] text-muted-strong"><Icon name="clock" className="size-4 shrink-0" />{what}</p>
}
