'use client'

import { Fragment, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Bubble, Composer, DayDivider, dayLabel, useStickToBottom } from '@/components/rc/chat'
import { Button, Empty, PageLoading, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtTime, fullName, initials } from '@/lib/rc/format'

type Msg = { id: string; sender_id: string; channel: string; body: string; is_pinned: boolean; created_at: string }
type Member = { profile_id: string; role: string; title: string | null; profiles: { first_name: string | null; last_name: string | null } | null }

const TILE = ['bg-purple-tint text-purple-ink', 'bg-green-tint text-green-ink', 'bg-pink-tint text-purple-ink', 'bg-amber-tint text-amber', 'bg-pencil-tint text-pencil']

export default function CastChatPage() {
  const { id: chatId } = useParams<{ id: string }>()
  const router = useRouter()
  const { id: me } = useMe()
  const [channel, setChannel] = useState('company')
  const [selected, setSelected] = useState<Msg | null>(null)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: chat }, { data: members }, { data: msgs }] = await Promise.all([
      supabase.from('cast_chats').select('id, name, production_name, channels, created_by').eq('id', chatId).maybeSingle(),
      supabase.from('cast_chat_members').select('profile_id, role, title, profiles(first_name, last_name)').eq('chat_id', chatId),
      supabase.from('cast_chat_messages').select('id, sender_id, channel, body, is_pinned, created_at').eq('chat_id', chatId).order('created_at').limit(800),
    ])
    supabase.from('cast_chat_members').update({ last_read_at: new Date().toISOString() }).eq('chat_id', chatId).eq('profile_id', me).then(() => {})
    return { chat, members: (members || []) as unknown as Member[], messages: (msgs || []) as Msg[] }
  }, [chatId, me])

  useEffect(() => {
    const ch = supabase.channel('cast-' + chatId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cast_chat_messages', filter: 'chat_id=eq.' + chatId }, payload => {
        const m = payload.new as Msg
        mutate(d => d && (d.messages.some(x => x.id === m.id) ? d : { ...d, messages: [...d.messages, m] }))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [chatId, mutate])

  const inChannel = (data?.messages || []).filter(m => m.channel === channel)
  const end = useStickToBottom(inChannel.length)

  if (loading) return <PageLoading />
  if (!data?.chat) return <div className="pt-16"><Empty icon="users" title="Chat not found" sub="You may have left, or it was removed." /></div>

  const { chat, members, messages } = data
  const memberById = new Map(members.map(m => [m.profile_id, m]))
  const isAdmin = memberById.get(me)?.role === 'admin'
  const pinned = [...messages].reverse().find(m => m.channel === channel && m.is_pinned)
  const colourFor = (id: string) => TILE[Math.abs([...id].reduce((h, c) => h + c.charCodeAt(0), 0)) % TILE.length]

  const send = async (body: string) => {
    const { data: m, error } = await supabase.from('cast_chat_messages').insert({ chat_id: chatId, sender_id: me, channel, body }).select('id, sender_id, channel, body, is_pinned, created_at').single()
    if (error || !m) { toast('Message didn’t send'); return false }
    mutate(d => d && (d.messages.some(x => x.id === m.id) ? d : { ...d, messages: [...d.messages, m as Msg] }))
    return true
  }

  const togglePin = async (m: Msg) => {
    const { error } = await supabase.from('cast_chat_messages').update({ is_pinned: !m.is_pinned }).eq('id', m.id)
    setSelected(null)
    if (error) { toast('Couldn’t update the pin'); return }
    mutate(d => d && { ...d, messages: d.messages.map(x => x.id === m.id ? { ...x, is_pinned: !m.is_pinned } : x) })
  }

  const leave = async () => {
    if (!confirm('Leave ' + chat.name + '?')) return
    await supabase.from('cast_chat_members').delete().eq('chat_id', chatId).eq('profile_id', me)
    router.replace('/chats')
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Back" onClick={() => router.push('/chats')} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-chip"><Icon name="chevron-left" className="size-6" /></button>
          <span className="flex size-11 items-center justify-center rounded-xl bg-green text-[17px] font-medium text-white">{initials(chat.name).slice(0, 1)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[16px] font-medium">{chat.name}</span>
            <span className="block text-xs text-green-ink">{members.length} member{members.length === 1 ? '' : 's'}{chat.production_name ? ' · ' + chat.production_name : ''}</span>
          </span>
          {isAdmin
            ? <button type="button" aria-label="Add people" onClick={() => router.push('/chats/new?chat=' + chatId)} className="inline-flex size-10 items-center justify-center rounded-full text-green-ink hover:bg-chip"><Icon name="user-plus" /></button>
            : <button type="button" aria-label="Leave chat" onClick={leave} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="logout" className="size-5" /></button>}
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {chat.channels.map((c: string) => (
            <button key={c} type="button" onClick={() => setChannel(c)} aria-pressed={channel === c}
              className={cx('h-9 shrink-0 rounded-full border px-4 text-sm font-medium', channel === c ? 'border-dark bg-dark text-white' : 'border-line bg-surface')}># {c}</button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-3 px-4 py-2">
        {pinned && (
          <div className="mt-2 rounded-[var(--radius)] border border-amber/30 bg-amber-tint p-4">
            <p className="flex items-center gap-1.5 text-xs font-medium text-amber"><Icon name="pin" className="size-3.5" /> Pinned · {fullName(memberById.get(pinned.sender_id)?.profiles)}</p>
            <p className="mt-1 text-[15px]">{pinned.body}</p>
          </div>
        )}
        {inChannel.length === 0 && <p className="py-10 text-center text-sm text-muted">No messages in #{channel} yet.</p>}
        {inChannel.map((m, i) => {
          const mine = m.sender_id === me
          const who = memberById.get(m.sender_id)
          const name = fullName(who?.profiles)
          const showDay = i === 0 || m.created_at.slice(0, 10) !== inChannel[i - 1].created_at.slice(0, 10)
          return (
            <Fragment key={m.id}>
              {showDay && <DayDivider label={dayLabel(m.created_at)} />}
              {mine ? (
                <button type="button" className="block w-full text-left" onClick={() => isAdmin && setSelected(m)}><Bubble mine body={m.body} at={m.created_at} /></button>
              ) : (
                <button type="button" onClick={() => isAdmin && setSelected(m)} className="flex w-full gap-2.5 text-left">
                  <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-medium', colourFor(m.sender_id))}>{initials(name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-1 block text-xs text-muted">{[name.split(' ')[0] + (name.split(' ')[1] ? ' ' + name.split(' ')[1][0] : ''), who?.title, fmtTime(m.created_at)].filter(Boolean).join(' · ')}</span>
                    <Bubble mine={false} body={m.body} at={m.created_at} />
                  </span>
                </button>
              )}
            </Fragment>
          )
        })}
        <div ref={end} />
      </div>

      <Composer placeholder={'Message #' + channel + '…'} onSend={send} />

      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Message">
        {selected && (
          <div className="space-y-3">
            <p className="rounded-xl bg-field p-3 text-sm">{selected.body}</p>
            <Button full variant="outline" icon="pin" onClick={() => togglePin(selected)}>{selected.is_pinned ? 'Unpin' : 'Pin to #' + selected.channel}</Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
