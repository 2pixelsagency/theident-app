'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Avatar, Empty, IconButton, PageHeader, PageLoading, SearchField, TabChips, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName, initials, shortAgo } from '@/lib/rc/format'

type Filter = 'all' | 'casting' | 'cast'
type Thread = { key: string; href: string; name: string; avatar: string | null; preview: string; at: string | null; unread: number; kind: 'casting' | 'direct' | 'cast'; verified: boolean }

export default function ChatsPage() {
  const { id: me, role } = useMe()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')

  const { data: threads, loading } = useAsync(async () => {
    const [{ data: convos }, { data: memberships }] = await Promise.all([
      supabase.from('conversations').select('id, user_a, user_b, last_message, last_message_at').or(`user_a.eq.${me},user_b.eq.${me}`),
      supabase.from('cast_chat_members').select('chat_id, last_read_at, cast_chats(id, name, last_message, last_message_at)').eq('profile_id', me),
    ])
    const others = (convos || []).map(c => (c.user_a === me ? c.user_b : c.user_a))
    const [{ data: people }, { data: unread }] = await Promise.all([
      others.length ? supabase.from('profiles').select('id, first_name, last_name, picture_url, account_role, is_verified, company_name').in('id', others) : Promise.resolve({ data: [] as never[] }),
      convos?.length ? supabase.from('messages').select('conversation_id').eq('read', false).neq('sender_id', me).in('conversation_id', convos.map(c => c.id)) : Promise.resolve({ data: [] as never[] }),
    ])
    const byId = new Map((people || []).map(p => [p.id, p]))
    const unreadBy = new Map<string, number>()
    for (const u of (unread || []) as { conversation_id: string }[]) unreadBy.set(u.conversation_id, (unreadBy.get(u.conversation_id) || 0) + 1)

    const direct: Thread[] = (convos || []).map(c => {
      const p = byId.get(c.user_a === me ? c.user_b : c.user_a)
      const casting = role === 'caster' || p?.account_role === 'caster'
      return {
        key: 'c' + c.id, href: '/chats/' + c.id, name: p?.company_name && p.account_role === 'caster' ? p.company_name + ' — ' + (p.first_name || 'casting') : fullName(p),
        avatar: p?.picture_url ?? null, preview: c.last_message || 'Say hello', at: c.last_message_at, unread: unreadBy.get(c.id) || 0,
        kind: casting ? 'casting' : 'direct', verified: !!p?.is_verified,
      }
    })
    const cast: Thread[] = ((memberships || []) as unknown as { chat_id: string; last_read_at: string | null; cast_chats: { id: string; name: string; last_message: string | null; last_message_at: string | null } | null }[])
      .filter(m => m.cast_chats)
      .map(m => ({
        key: 'g' + m.chat_id, href: '/chats/cast/' + m.chat_id, name: m.cast_chats!.name, avatar: null, preview: m.cast_chats!.last_message || 'Chat created',
        at: m.cast_chats!.last_message_at, unread: m.cast_chats!.last_message_at && (!m.last_read_at || m.cast_chats!.last_message_at > m.last_read_at) ? 1 : 0,
        kind: 'cast' as const, verified: false,
      }))
    return [...direct, ...cast].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
  }, [me, role])

  const shown = useMemo(() => (threads || []).filter(t =>
    (filter === 'all' || (filter === 'cast' ? t.kind === 'cast' : t.kind === 'casting')) &&
    (!q.trim() || (t.name + ' ' + t.preview).toLowerCase().includes(q.toLowerCase()))), [threads, filter, q])

  return (
    <>
      <PageHeader title="Chats" right={<IconButton icon="pen" label="New cast chat" href="/chats/new" className="text-green-ink" />} />
      <div className="px-4 pb-8">
        <SearchField value={q} onChange={setQ} placeholder="Search messages…" />
        <div className="mt-3"><TabChips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'casting', label: 'Casting' }, { value: 'cast', label: 'Cast & crew' }]} /></div>
        {loading ? <PageLoading /> : shown.length === 0 ? (
          <Empty icon="chat" title={filter === 'cast' ? 'No cast chats yet' : 'No messages yet'} sub={filter === 'cast' ? 'Start a chat for your company, swings or department.' : 'Message someone from their profile — you’ll need to be connected first.'} />
        ) : (
          <ul className="mt-3 space-y-2">
            {shown.map(t => (
              <li key={t.key}>
                <Link href={t.href} className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface px-4 py-3 shadow-card">
                  {t.kind === 'cast'
                    ? <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-green text-[17px] font-medium text-white">{initials(t.name).slice(0, 1)}</span>
                    : <Avatar src={t.avatar} name={t.name} size={48} className={cx(t.kind === 'casting' && !t.avatar && 'bg-dark text-green')} />}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-[15px] font-medium">{t.name}</span>
                      {t.verified && <span className="size-3.5 shrink-0 rounded-full bg-green" title="Verified" />}
                    </span>
                    <span className={cx('block truncate text-[14px]', t.unread ? 'font-medium text-ink' : 'text-muted')}>{t.preview}</span>
                  </span>
                  <span className="flex flex-col items-end gap-1.5">
                    <span className="text-xs text-faint">{shortAgo(t.at)}</span>
                    {t.unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-green text-[11px] font-medium text-white">{t.unread}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
