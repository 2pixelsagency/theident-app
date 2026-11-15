'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Empty, PageLoading } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { normaliseCode } from '@/components/rc/CastInvite'

type Invite = { chat_id: string; name: string; production_name: string | null; members: number; enabled: boolean; already_member: boolean }

// Landing for a shared invite link / typed code. Signed-out visitors are sent to log in first and
// brought back here afterwards (MeProvider keeps the code as a pending join).
export default function JoinCastChatPage() {
  const router = useRouter()
  const code = normaliseCode(useParams<{ code: string }>().code || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { data: invite, loading } = useAsync(async () => {
    const { data } = await supabase.rpc('cast_chat_invite', { code })
    return ((data || []) as Invite[])[0] || null
  }, [code])

  if (loading) return <PageLoading />
  if (!invite) return <div className="pt-16"><Empty icon="link" title="That code doesn’t work" sub="Check the 6 letters with whoever shared it — the invite may have been reset." /></div>

  const join = async () => {
    setBusy(true); setError(null)
    const { data, error: err } = await supabase.rpc('join_cast_chat', { code })
    if (err || !data) {
      setBusy(false)
      setError(/invite_disabled/.test(err?.message || '') ? 'This invite has been switched off. Ask an admin to add you.' : 'Couldn’t join just now. Try again.')
      return
    }
    router.replace('/chats/cast/' + data)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <span className="flex size-20 items-center justify-center rounded-3xl bg-forest font-display text-3xl font-bold text-lime">{invite.name.slice(0, 1).toUpperCase()}</span>
      <p className="mt-6 text-sm text-muted">You’re invited to a cast chat</p>
      <h1 className="mt-1 font-display text-[28px] font-bold leading-tight">{invite.name}</h1>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Icon name="users" className="size-4" /> {invite.members} {invite.members === 1 ? 'person' : 'people'}{invite.production_name ? ' · ' + invite.production_name : ''}</p>
      <div className="mt-8 w-full max-w-sm space-y-3">
        {invite.already_member
          ? <Button full size="lg" onClick={() => router.replace('/chats/cast/' + invite.chat_id)}>Open chat</Button>
          : invite.enabled
            ? <Button full size="lg" disabled={busy} onClick={join}>{busy ? 'Joining…' : 'Join chat'}</Button>
            : <p className="rounded-xl bg-field p-4 text-sm text-muted">This invite has been switched off. Ask an admin in the chat to add you.</p>}
        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <Button full variant="ghost" href="/chats">Not now</Button>
      </div>
    </div>
  )
}
