'use client'

import { Fragment, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Bubble, Composer, DayDivider, dayLabel, useStickToBottom } from '@/components/rc/chat'
import { Avatar, Button, Empty, PageLoading, Sheet, toast } from '@/components/rc/ui'
import { ReportSheet, SafetyNote, blockUser, unblockUser, type ReportTarget } from '@/components/rc/Safety'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'

type Msg = { id: string; sender_id: string; body: string; read: boolean; created_at: string }

export default function ThreadPage() {
  const { id: convoId } = useParams<{ id: string }>()
  const router = useRouter()
  const { id: me, refresh } = useMe()
  const [menu, setMenu] = useState(false)
  const [picked, setPicked] = useState<Msg | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)

  const { data, loading, mutate } = useAsync(async () => {
    const { data: convo } = await supabase.from('conversations').select('id, user_a, user_b').eq('id', convoId).maybeSingle()
    if (!convo) return null
    const otherId = convo.user_a === me ? convo.user_b : convo.user_a
    const [{ data: other }, { data: msgs }, { data: blocked }] = await Promise.all([
      supabase.from('profiles').select('id, first_name, last_name, picture_url, last_active, account_role, company_name').eq('id', otherId).maybeSingle(),
      supabase.from('messages').select('id, sender_id, body, read, created_at').eq('conversation_id', convoId).order('created_at').limit(500),
      supabase.from('user_blocks').select('blocked_id').eq('blocker_id', me).eq('blocked_id', otherId).maybeSingle(),
    ])
    const activeRecently = !!other?.last_active && Date.now() - Date.parse(other.last_active) < 15 * 60_000
    return { other, otherId, messages: (msgs || []) as Msg[], activeRecently, blocked: !!blocked }
  }, [convoId, me])

  // Mark incoming as read, then refresh the unread badge
  useEffect(() => {
    if (!data?.messages.some(m => !m.read && m.sender_id !== me)) return
    supabase.from('messages').update({ read: true }).eq('conversation_id', convoId).neq('sender_id', me).eq('read', false).then(() => refresh())
  }, [data, convoId, me, refresh])

  // Live updates
  useEffect(() => {
    const channel = supabase.channel('thread-' + convoId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'conversation_id=eq.' + convoId }, payload => {
        const m = payload.new as Msg
        mutate(d => d && (d.messages.some(x => x.id === m.id) ? d : { ...d, messages: [...d.messages, m] }))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [convoId, mutate])

  const end = useStickToBottom(data?.messages.length || 0)

  if (loading) return <PageLoading />
  if (!data) return <div className="pt-16"><Empty icon="chat" title="Conversation not found" /></div>
  const { other, otherId, messages, activeRecently, blocked } = data
  const name = other?.account_role === 'caster' && other.company_name ? other.company_name : fullName(other)

  const send = async (body: string) => {
    const { data: m, error } = await supabase.from('messages').insert({ conversation_id: convoId, sender_id: me, body }).select('id, sender_id, body, read, created_at').single()
    if (error || !m) { toast(blocked ? 'You’ve blocked ' + name + ' — unblock them to message' : 'Message didn’t send'); return false }
    mutate(d => d && (d.messages.some(x => x.id === m.id) ? d : { ...d, messages: [...d.messages, m as Msg] }))
    return true
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-surface/95 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <button type="button" aria-label="Back" onClick={() => router.push('/chats')} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-chip"><Icon name="chevron-left" className="size-6" /></button>
        <Link href={other ? '/talent/' + other.id : '#'} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar src={other?.picture_url} name={name} size={40} />
          <span className="min-w-0">
            <span className="block truncate text-[16px] font-medium">{name}</span>
            <span className="block text-xs text-green-ink">{activeRecently ? 'Active now' : 'View profile'}</span>
          </span>
        </Link>
        <button type="button" aria-label="Safety options" onClick={() => setMenu(true)} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="more" /></button>
      </header>

      <div className="flex-1 space-y-2 px-4 py-2">
        <SafetyNote />
        {messages.length === 0 && <p className="py-10 text-center text-sm text-muted">Say hello to {other?.first_name || name}.</p>}
        {messages.map((m, i) => {
          const showDay = i === 0 || m.created_at.slice(0, 10) !== messages[i - 1].created_at.slice(0, 10)
          const lastMine = m.sender_id === me && !messages.slice(i + 1).some(x => x.sender_id === me)
          return (
            <Fragment key={m.id}>
              {showDay && <DayDivider label={dayLabel(m.created_at)} />}
              {m.sender_id === me
                ? <Bubble mine body={m.body} at={m.created_at} read={lastMine && m.read} />
                : <button type="button" className="block w-full text-left" onClick={() => setPicked(m)} aria-label="Message options"><Bubble mine={false} body={m.body} at={m.created_at} /></button>}
            </Fragment>
          )
        })}
        <div ref={end} />
      </div>

      {blocked
        ? <div className="sticky bottom-0 border-t border-line bg-surface px-4 py-4 text-center text-sm text-muted">You’ve blocked {name}. <button type="button" className="font-semibold text-green-ink" onClick={async () => { if (await unblockUser(otherId)) mutate(d => d && { ...d, blocked: false }) }}>Unblock</button></div>
        : <Composer placeholder={'Message ' + (other?.first_name || name) + '…'} onSend={send} />}

      <Sheet open={menu} onClose={() => setMenu(false)} title={name}>
        <div className="space-y-2">
          <Button full variant="outline" icon="alert" onClick={() => { setMenu(false); setReport({ type: 'profile', id: otherId, profileId: otherId, label: name }) }}>Report {other?.first_name || name}</Button>
          {blocked
            ? <Button full variant="outline" onClick={async () => { setMenu(false); if (await unblockUser(otherId)) mutate(d => d && { ...d, blocked: false }) }}>Unblock</Button>
            : <Button full variant="outline" icon="x" className="text-red" onClick={async () => { setMenu(false); if (await blockUser(otherId, name)) mutate(d => d && { ...d, blocked: true }) }}>Block {other?.first_name || name}</Button>}
        </div>
      </Sheet>
      <Sheet open={!!picked} onClose={() => setPicked(null)} title="Message">
        {picked && (
          <div className="space-y-3">
            <p className="rounded-xl bg-field p-3 text-sm">{picked.body}</p>
            <Button full variant="outline" icon="alert" onClick={() => { setReport({ type: 'message', id: picked.id, profileId: picked.sender_id, snapshot: picked.body, label: 'message' }); setPicked(null) }}>Report this message</Button>
          </div>
        )}
      </Sheet>
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </div>
  )
}
