'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Field, Sheet, ToggleRow, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'

export const normaliseCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
export const inviteUrl = (code: string) => window.location.origin + '/join/' + code

// Everyone in the chat can share the link/code; admins can switch it off or reset it.
export function InviteSheet({ open, onClose, chatId, name, code, enabled, isAdmin, onChange }: {
  open: boolean; onClose: () => void; chatId: string; name: string; code: string; enabled: boolean; isAdmin: boolean
  onChange: (next: { invite_code: string; invite_enabled: boolean }) => void
}) {
  const [busy, setBusy] = useState(false)
  const url = inviteUrl(code)

  const share = async () => {
    const text = 'Join ' + name + ' on The Ident — code ' + code
    try {
      if (navigator.share) await navigator.share({ title: name, text, url })
      else { await navigator.clipboard.writeText(url); toast('Invite link copied') }
    } catch { /* dismissed */ }
  }
  const copyCode = async () => { await navigator.clipboard?.writeText(code).catch(() => {}); toast('Code copied') }

  const setEnabled = async (v: boolean) => {
    setBusy(true)
    const { error } = await supabase.from('cast_chats').update({ invite_enabled: v }).eq('id', chatId)
    setBusy(false)
    if (error) { toast('Couldn’t update the invite'); return }
    onChange({ invite_code: code, invite_enabled: v })
  }
  const reset = async () => {
    if (!confirm('Reset the invite? The old link and code stop working straight away.')) return
    setBusy(true)
    const { data, error } = await supabase.rpc('reset_cast_invite', { cid: chatId })
    setBusy(false)
    if (error || !data) { toast('Couldn’t reset the invite'); return }
    onChange({ invite_code: data as string, invite_enabled: true })
    toast('New invite ready — the old one no longer works')
  }

  return (
    <Sheet open={open} onClose={onClose} title="Invite to chat">
      <div className="space-y-4">
        {enabled ? (
          <>
            <p className="text-sm text-muted">Anyone with the link or code can join <span className="font-medium text-ink">{name}</span> — no need to connect first. Handy for the call sheet or the green room.</p>
            <button type="button" onClick={copyCode} aria-label={'Copy code ' + code}
              className="flex w-full flex-col items-center rounded-[var(--radius)] border border-line bg-field py-5">
              <span className="font-display text-[34px] font-bold tracking-[0.2em] text-ink">{code}</span>
              <span className="mt-1 flex items-center gap-1 text-xs text-muted"><Icon name="check-square" className="size-3.5" /> Tap to copy the code</span>
            </button>
            <p className="truncate rounded-xl bg-field px-3 py-2 text-center text-xs text-muted">{url}</p>
            <Button full icon="share" onClick={share}>Share invite link</Button>
          </>
        ) : (
          <p className="rounded-xl bg-field p-4 text-sm text-muted">{isAdmin ? 'The invite link is off. Turn it on to let people join with a link or code.' : 'An admin has switched the invite link off. Ask them to add people or turn it back on.'}</p>
        )}
        {isAdmin && (
          <div className="divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
            <ToggleRow title="Invite link on" sub="Members can share it" checked={enabled} onChange={v => !busy && setEnabled(v)} />
            <button type="button" disabled={busy} onClick={reset} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] font-medium">
              <Icon name="link" className="size-5 text-muted" /> Reset link and code
            </button>
          </div>
        )}
      </div>
    </Sheet>
  )
}

// "Join with a code" — typed in from a call sheet or read out on set
export function JoinCodeSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const go = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) return
    onClose()
    router.push('/join/' + code)
  }
  return (
    <Sheet open={open} onClose={onClose} title="Join with a code">
      <form onSubmit={go} className="space-y-4">
        <p className="text-sm text-muted">Enter the 6-letter code someone in the cast chat shared with you.</p>
        <Field label="Code" value={code} onChange={e => setCode(normaliseCode(e.target.value))} placeholder="ABC234" autoFocus autoCapitalize="characters" autoComplete="off"
          className="[&_input]:text-center [&_input]:font-display [&_input]:text-2xl [&_input]:tracking-[0.3em]" />
        <Button type="submit" full disabled={code.length !== 6}>Find chat</Button>
      </form>
    </Sheet>
  )
}

// "Cast chat · N people · Open" on a production page. The chat is created automatically on the
// first booking; before that the poster can start one early.
export function ProductionChatCard({ jobId, canCreate, title }: { jobId: string; canCreate?: boolean; title?: string }) {
  const router = useRouter()
  const [chat, setChat] = useState<{ id: string; n: number } | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    supabase.from('cast_chats').select('id, cast_chat_members(count)').eq('production_job_id', jobId).order('created_at').limit(1).maybeSingle()
      .then(({ data }) => { if (live) setChat(data ? { id: data.id, n: (data.cast_chat_members as unknown as { count: number }[])?.[0]?.count ?? 0 } : null) })
    return () => { live = false }
  }, [jobId])
  if (chat === undefined || (!chat && !canCreate)) return null

  const start = async () => {
    setBusy(true)
    const { data: { session } } = await supabase.auth.getSession()
    const uid = session?.user.id
    const { data, error } = uid ? await supabase.from('cast_chats').insert({ name: (title || 'Cast') + ' — company', created_by: uid, production_job_id: jobId, production_name: title ?? null }).select('id').single() : { data: null, error: true }
    if (error || !data || !uid) { setBusy(false); toast('Couldn’t start the chat'); return }
    await supabase.from('cast_chat_members').insert({ chat_id: data.id, profile_id: uid, role: 'admin' })
    router.push('/chats/cast/' + data.id + '?invite=1')
  }

  return (
    <button type="button" disabled={busy} onClick={() => (chat ? router.push('/chats/cast/' + chat.id) : start())}
      className="flex w-full items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-left shadow-card">
      <span className="flex size-10 items-center justify-center rounded-xl bg-forest text-lime"><Icon name="users" className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">Cast chat</span>
        <span className="block text-[13px] text-muted">{chat ? chat.n + (chat.n === 1 ? ' person' : ' people') + ' · booked cast join automatically' : 'Starts automatically when you book someone'}</span>
      </span>
      <span className="text-sm font-semibold text-green-ink">{chat ? 'Open' : busy ? 'Starting…' : 'Start now'}</span>
    </button>
  )
}
