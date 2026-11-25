'use client'

import { Fragment, useEffect, useRef, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Bubble, Composer, DayDivider, dayLabel, useStickToBottom } from '@/components/rc/chat'
import { Avatar, BackArrow, Button, Empty, PageLoading, Sheet, cx, toast, useGoBack } from '@/components/rc/ui'
import { InviteSheet } from '@/components/rc/CastInvite'
import { CreateSheet, EventCard, PollCard, uploadChatPhoto, type EventMeta, type PollMeta, type Rsvp, type Vote } from '@/components/rc/CastChatExtras'
import { ReportSheet, SafetyNote, type ReportTarget } from '@/components/rc/Safety'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtTime, fullName, initials } from '@/lib/rc/format'

type Msg = { id: string; sender_id: string; channel: string; body: string; is_pinned: boolean; created_at: string; kind?: string; meta?: unknown }
const MSG_COLS = 'id, sender_id, channel, body, is_pinned, created_at, kind, meta'
type Member = { profile_id: string; role: string; title: string | null; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null } | null }


export default function CastChatPage() {
  const { id: chatId } = useParams<{ id: string }>()
  const router = useRouter()
  const goBack = useGoBack('/chats')
  const { id: me } = useMe()
  const [channel, setChannel] = useState('company')
  const [selected, setSelected] = useState<Msg | null>(null)
  const [report, setReport] = useState<ReportTarget | null>(null)
  const [create, setCreate] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)
  const [sheet, setSheet] = useState<'invite' | 'members' | null>(useSearchParams().get('invite') ? 'invite' : null)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: chat }, { data: members }, { data: msgs }] = await Promise.all([
      supabase.from('cast_chats').select('id, name, production_name, channels, created_by, invite_code, invite_enabled, photo_url').eq('id', chatId).maybeSingle(),
      supabase.from('cast_chat_members').select('profile_id, role, title, profiles(first_name, last_name, picture_url)').eq('chat_id', chatId),
      supabase.from('cast_chat_messages').select(MSG_COLS).eq('chat_id', chatId).order('created_at').limit(800),
    ])
    const ids = ((msgs || []) as Msg[]).filter(m => m.kind === 'poll' || m.kind === 'event').map(m => m.id)
    const [{ data: votes }, { data: rsvps }] = ids.length ? await Promise.all([
      supabase.from('cast_chat_votes').select('message_id, profile_id, option').in('message_id', ids),
      supabase.from('cast_chat_rsvps').select('message_id, profile_id, response').in('message_id', ids),
    ]) : [{ data: [] }, { data: [] }]
    supabase.from('cast_chat_members').update({ last_read_at: new Date().toISOString() }).eq('chat_id', chatId).eq('profile_id', me).then(() => {})
    return { chat, members: (members || []) as unknown as Member[], messages: (msgs || []) as Msg[], votes: (votes || []) as Vote[], rsvps: (rsvps || []) as Rsvp[] }
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

  const send = async (body: string, extra?: { kind: 'poll' | 'event'; meta: PollMeta | EventMeta }) => {
    const { data: m, error } = await supabase.from('cast_chat_messages').insert({ chat_id: chatId, sender_id: me, channel, body, ...(extra || {}) }).select(MSG_COLS).single()
    if (error || !m) { toast('Message didn’t send'); return false }
    mutate(d => d && (d.messages.some(x => x.id === m.id) ? d : { ...d, messages: [...d.messages, m as Msg] }))
    return true
  }

  // Polls: one vote each, tap again to take it back
  const vote = async (m: Msg, option: number | null) => {
    mutate(d => d && { ...d, votes: [...d.votes.filter(v => !(v.message_id === m.id && v.profile_id === me)), ...(option === null ? [] : [{ message_id: m.id, profile_id: me, option }])] })
    const { error } = option === null
      ? await supabase.from('cast_chat_votes').delete().eq('message_id', m.id).eq('profile_id', me)
      : await supabase.from('cast_chat_votes').upsert({ message_id: m.id, profile_id: me, option })
    if (error) toast('Couldn’t save your vote')
  }
  // Events: Going adds it to your Diary (and removes it if you change your mind)
  const rsvp = async (m: Msg, response: Rsvp['response']) => {
    const e = m.meta as EventMeta
    mutate(d => d && { ...d, rsvps: [...d.rsvps.filter(r => !(r.message_id === m.id && r.profile_id === me)), { message_id: m.id, profile_id: me, response }] })
    const { error } = await supabase.from('cast_chat_rsvps').upsert({ message_id: m.id, profile_id: me, response })
    if (error) { toast('Couldn’t save that'); return }
    const marker = 'cast-chat:' + m.id
    await supabase.from('calendar_events').delete().eq('profile_id', me).eq('description', marker)
    if (response === 'going') {
      const { error: e2 } = await supabase.from('calendar_events').insert({ profile_id: me, title: e.title + ' · ' + chat.name, event_type: 'social', start_date: e.date, start_time: e.time || null, all_day: !e.time, location: e.location || null, description: marker })
      toast(e2 ? 'You’re going — couldn’t add it to your Diary' : 'You’re going — added to your Diary')
    }
  }
  const changePhoto = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0]
    ev.target.value = ''
    if (!f) return
    const url = await uploadChatPhoto(me, chatId, f)
    if (!url) { toast('Couldn’t change the photo'); return }
    mutate(d => d?.chat ? { ...d, chat: { ...d.chat, photo_url: url } } : d)
    toast('Chat photo updated')
  }
  const firstName = (id: string) => (memberById.get(id)?.profiles?.first_name || 'Someone')
  const special = (m: Msg) => m.kind === 'poll'
    ? <PollCard id={m.id} meta={m.meta as PollMeta} votes={data.votes.filter(v => v.message_id === m.id)} me={me} onVote={o => vote(m, o)} />
    : m.kind === 'event' ? <EventCard meta={m.meta as EventMeta} rsvps={data.rsvps.filter(r => r.message_id === m.id)} me={me} onRsvp={r => rsvp(m, r)} names={firstName} /> : null

  const togglePin = async (m: Msg) => {
    const { error } = await supabase.from('cast_chat_messages').update({ is_pinned: !m.is_pinned }).eq('id', m.id)
    setSelected(null)
    if (error) { toast('Couldn’t update the pin'); return }
    mutate(d => d && { ...d, messages: d.messages.map(x => x.id === m.id ? { ...x, is_pinned: !m.is_pinned } : x) })
  }

  const admins = members.filter(m => m.role === 'admin').length
  const leave = async () => {
    if (isAdmin && admins === 1 && members.length > 1) { toast('Make someone else an admin before you leave'); return }
    if (!confirm('Leave ' + chat.name + '? You can rejoin with an invite.')) return
    const { error } = await supabase.from('cast_chat_members').delete().eq('chat_id', chatId).eq('profile_id', me)
    if (error) { toast('Couldn’t leave just now'); return }
    router.replace('/chats')
  }

  const remove = async (m: Member) => {
    if (!confirm('Remove ' + fullName(m.profiles) + ' from ' + chat.name + '?')) return
    const { error } = await supabase.from('cast_chat_members').delete().eq('chat_id', chatId).eq('profile_id', m.profile_id)
    if (error) { toast('Couldn’t remove them'); return }
    mutate(d => d && { ...d, members: d.members.filter(x => x.profile_id !== m.profile_id) })
  }

  const makeAdmin = async (m: Member) => {
    const { error } = await supabase.from('cast_chat_members').update({ role: 'admin' }).eq('chat_id', chatId).eq('profile_id', m.profile_id)
    if (error) { toast('Couldn’t update their role'); return }
    mutate(d => d && { ...d, members: d.members.map(x => x.profile_id === m.profile_id ? { ...x, role: 'admin' } : x) })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center gap-3">
          <BackArrow onBack={goBack} />
          <button type="button" onClick={() => (isAdmin ? photoRef.current?.click() : setSheet('members'))} aria-label={isAdmin ? 'Change chat photo' : 'Chat members'} className="relative shrink-0 rounded-full">
            {chat.photo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={chat.photo_url} alt="" className="size-11 rounded-full object-cover" />
              : <span className="flex size-11 items-center justify-center rounded-full bg-green text-[17px] font-medium text-white">{initials(chat.name).slice(0, 1)}</span>}
            {isAdmin && <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-surface text-ink shadow-card"><Icon name="camera" className="size-3" /></span>}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={changePhoto} />
          <button type="button" onClick={() => setSheet('members')} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[16px] font-medium">{chat.name}</span>
            <span className="block text-xs text-green-ink">{members.length} {members.length === 1 ? 'person' : 'people'}{chat.production_name ? ' · ' + chat.production_name : ''}</span>
          </button>
          <button type="button" aria-label="Invite people" onClick={() => setSheet('invite')} className="inline-flex size-10 items-center justify-center rounded-full text-green-ink hover:bg-chip"><Icon name="user-plus" /></button>
          <button type="button" aria-label="Members" onClick={() => setSheet('members')} className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="users" className="size-5" /></button>
        </div>
        <div className="scrollbar-none mt-3 flex gap-2 overflow-x-auto">
          {chat.channels.map((c: string) => (
            <button key={c} type="button" onClick={() => setChannel(c)} aria-pressed={channel === c}
              className={cx('h-9 shrink-0 rounded-full border px-4 text-sm font-medium', channel === c ? 'border-dark bg-dark text-white' : 'border-line bg-surface')}># {c}</button>
          ))}
        </div>
      </header>

      <div className="flex-1 space-y-3 px-4 py-2">
        <SafetyNote cast />
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
                special(m) ? <div className="ml-auto max-w-[88%]">{special(m)}</div>
                : <button type="button" className="block w-full text-left" onClick={() => isAdmin && setSelected(m)}><Bubble mine body={m.body} at={m.created_at} /></button>
              ) : (
                <div className="flex w-full gap-2.5 text-left">
                  {/* Their profile photo (tap to open their profile) */}
                  <button type="button" aria-label={'View ' + (name || 'profile')} onClick={() => router.push('/talent/' + m.sender_id)} className="shrink-0 self-start rounded-full">
                    <Avatar src={who?.profiles?.picture_url} name={name} size={36} />
                  </button>
                  {special(m) ? (
                    <div className="min-w-0 flex-1">
                      <span className="mb-1 block text-xs text-muted">{[name.split(' ')[0], who?.title, fmtTime(m.created_at)].filter(Boolean).join(' · ')}</span>
                      {special(m)}
                    </div>
                  ) : (
                  <button type="button" onClick={() => setSelected(m)} className="min-w-0 flex-1 text-left">
                    <span className="mb-1 block text-xs text-muted">{[name.split(' ')[0] + (name.split(' ')[1] ? ' ' + name.split(' ')[1][0] : ''), who?.title, fmtTime(m.created_at)].filter(Boolean).join(' · ')}</span>
                    <Bubble mine={false} body={m.body} at={m.created_at} />
                  </button>
                  )}
                </div>
              )}
            </Fragment>
          )
        })}
        <div ref={end} />
      </div>

      <Composer placeholder={'Message #' + channel + '…'} onSend={body => send(body)} onExtra={() => setCreate(true)} />
      <CreateSheet open={create} onClose={() => setCreate(false)} onCreate={(kind, meta, body) => send(body, { kind, meta })} />

      <InviteSheet open={sheet === 'invite'} onClose={() => setSheet(null)} chatId={chatId} name={chat.name} code={chat.invite_code} enabled={chat.invite_enabled} isAdmin={isAdmin}
        onChange={next => mutate(d => (d?.chat ? { ...d, chat: { ...d.chat, ...next } } : d))} />

      <Sheet open={sheet === 'members'} onClose={() => setSheet(null)} title={members.length + (members.length === 1 ? ' person' : ' people')}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" icon="link" onClick={() => setSheet('invite')}>Invite link</Button>
            {isAdmin ? <Button variant="outline" icon="user-plus" onClick={() => router.push('/chats/new?chat=' + chatId)}>Add connections</Button>
              : <Button variant="outline" icon="logout" onClick={leave}>Leave chat</Button>}
          </div>
          <ul className="divide-y divide-line">
            {members.map(m => (
              <li key={m.profile_id} className="flex items-center gap-3 py-2.5">
                <button type="button" aria-label={'View ' + fullName(m.profiles)} onClick={() => router.push(m.profile_id === me ? '/me' : '/talent/' + m.profile_id)} className="shrink-0 rounded-full"><Avatar src={m.profiles?.picture_url} name={fullName(m.profiles)} size={36} /></button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{fullName(m.profiles)}{m.profile_id === me ? ' (you)' : ''}</span>
                  <span className="block text-xs text-muted">{[m.role === 'admin' ? 'Admin' : null, m.title].filter(Boolean).join(' · ') || 'Member'}</span>
                </span>
                {isAdmin && m.profile_id !== me && (<>
                  {m.role !== 'admin' && <button type="button" onClick={() => makeAdmin(m)} className="text-xs font-semibold text-green-ink">Make admin</button>}
                  <button type="button" onClick={() => remove(m)} className="ml-2 text-xs font-semibold text-red">Remove</button>
                </>)}
              </li>
            ))}
          </ul>
          {isAdmin && <Button full variant="ghost" icon="logout" onClick={leave}>Leave chat</Button>}
        </div>
      </Sheet>

      <ReportSheet target={report} onClose={() => setReport(null)} />
      <Sheet open={!!selected} onClose={() => setSelected(null)} title="Message">
        {selected && (
          <div className="space-y-3">
            <p className="rounded-xl bg-field p-3 text-sm">{selected.body}</p>
            {isAdmin && <Button full variant="outline" icon="pin" onClick={() => togglePin(selected)}>{selected.is_pinned ? 'Unpin' : 'Pin to #' + selected.channel}</Button>}
            {selected.sender_id !== me && <Button full variant="outline" icon="alert" onClick={() => { setReport({ type: 'cast_message', id: selected.id, profileId: selected.sender_id, snapshot: selected.body, label: 'message' }); setSelected(null) }}>Report this message</Button>}
          </div>
        )}
      </Sheet>
    </div>
  )
}
