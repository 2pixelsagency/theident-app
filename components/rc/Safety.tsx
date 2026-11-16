'use client'

import { useState } from 'react'
import Icon from '@/components/rc/Icon'
import { Button, Sheet, TextArea, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'

export type ReportTarget = { type: 'profile' | 'message' | 'cast_message' | 'job'; id: string; profileId?: string | null; snapshot?: string | null; label: string }

const REASONS: { key: string; label: string; sub: string }[] = [
  { key: 'harassment', label: 'Harassment or bullying', sub: 'Abusive, threatening or hateful' },
  { key: 'inappropriate', label: 'Inappropriate or sexual', sub: 'Unwanted sexual content or requests' },
  { key: 'underage', label: 'Concern about a young person', sub: 'Someone under 18 may be at risk' },
  { key: 'scam', label: 'Scam or asking for money', sub: 'Fees to audition, payment details, fake jobs' },
  { key: 'off_platform', label: 'Pushing to talk elsewhere', sub: 'Pressure to move to WhatsApp, Snapchat, DMs' },
  { key: 'fake', label: 'Fake profile or job', sub: 'Pretending to be someone else' },
  { key: 'other', label: 'Something else', sub: '' },
]

// Report anything; it goes to The Ident's safety team (admin queue)
export function ReportSheet({ target, onClose }: { target: ReportTarget | null; onClose: () => void }) {
  const [reason, setReason] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const close = () => { setReason(null); setDetails(''); onClose() }
  const send = async () => {
    if (!target || !reason) return
    setBusy(true)
    const { error } = await supabase.from('reports').insert({
      target_type: target.type, target_id: target.id, reported_profile_id: target.profileId || null,
      reason, details: details.trim() || null, snapshot: target.snapshot?.slice(0, 2000) || null,
    })
    setBusy(false)
    if (error) { toast('Couldn’t send your report — try again'); return }
    toast('Thanks — our safety team will review this')
    close()
  }
  return (
    <Sheet open={!!target} onClose={close} title={'Report ' + (target?.label || '')}>
      <div className="space-y-3">
        <p className="text-sm text-muted">Reports are private — they won’t know it was you. If someone is in immediate danger, call 999.</p>
        <div className="space-y-2">
          {REASONS.map(r => (
            <button key={r.key} type="button" onClick={() => setReason(r.key)} aria-pressed={reason === r.key}
              className={cx('flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left', reason === r.key ? 'border-forest bg-forest/5' : 'border-line')}>
              <span className={cx('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2', reason === r.key ? 'border-forest bg-forest' : 'border-line')}>{reason === r.key && <span className="size-2 rounded-full bg-lime" />}</span>
              <span><span className="block text-[15px] font-medium">{r.label}</span>{r.sub && <span className="block text-[13px] text-muted">{r.sub}</span>}</span>
            </button>
          ))}
        </div>
        <TextArea value={details} onChange={e => setDetails(e.target.value)} placeholder="Anything else we should know? (optional)" aria-label="Details" maxLength={2000} />
        <Button full onClick={send} disabled={!reason || busy}>{busy ? 'Sending…' : 'Send report'}</Button>
      </div>
    </Sheet>
  )
}

export async function blockUser(profileId: string, name: string) {
  if (!confirm('Block ' + name + '? They won’t be able to message you, and you won’t see their messages.')) return false
  const { error } = await supabase.from('user_blocks').insert({ blocked_id: profileId })
  if (error && error.code !== '23505') { toast('Couldn’t block them'); return false }
  toast(name + ' is blocked')
  return true
}
export async function unblockUser(profileId: string) {
  const { error } = await supabase.from('user_blocks').delete().eq('blocked_id', profileId)
  if (error) { toast('Couldn’t unblock'); return false }
  toast('Unblocked')
  return true
}

// Quiet reminder at the top of chats
export function SafetyNote({ cast }: { cast?: boolean }) {
  return (
    <p className="mx-auto my-3 flex max-w-[420px] items-start gap-2 rounded-xl bg-mint/60 px-3 py-2 text-[12px] leading-snug text-ink/80">
      <Icon name="shield-check" className="mt-0.5 size-4 shrink-0 text-green-ink" />
      <span>{cast ? 'Be kind — this chat is for the company.' : 'Keep chats on The Ident.'} Real casting never asks you to pay to audition, send personal photos or meet alone. Tap a message to report it.</span>
    </p>
  )
}
