'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Card, Empty, PageLoading, TabChips, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { ago, toISODate } from '@/lib/rc/format'

type Notif = { id: string; type: string; title: string; body: string | null; data: { url?: string } | null; read: boolean; created_at: string }
type Filter = 'all' | 'roles' | 'messages'

// Icon + tint per notification, guessing the stage from the title for pipeline updates
function look(n: Notif): { icon: string; tile: string } {
  const t = n.title.toLowerCase()
  if (n.type === 'message') return { icon: 'chat', tile: 'bg-green-tint/60 text-ink' }
  if (n.type === 'connection') return { icon: 'user-plus', tile: 'bg-purple-tint text-purple-ink' }
  if (t.includes('self-tape') || t.includes('invited')) return { icon: 'video', tile: 'bg-amber-tint text-amber' }
  if (t.includes('recall')) return { icon: 'calendar', tile: 'bg-green-tint text-green-ink' }
  if (t.includes('pencil')) return { icon: 'clock', tile: 'bg-pencil-tint text-pencil' }
  if (t.includes('booked')) return { icon: 'pen', tile: 'bg-green text-white' }
  if (n.type === 'application') return { icon: 'users', tile: 'bg-green-tint/60 text-ink' }
  if (n.type === 'job_match') return { icon: 'sparkle', tile: 'bg-purple-tint text-purple-ink' }
  return { icon: 'bell', tile: 'bg-chip text-muted' }
}

export default function InboxPage() {
  const router = useRouter()
  const { id: me, refresh } = useMe()
  const [filter, setFilter] = useState<Filter>('all')
  const { data: items, loading, mutate } = useAsync(async () => {
    const { data } = await supabase.from('notifications').select('id, type, title, body, data, read, created_at').eq('profile_id', me).order('created_at', { ascending: false }).limit(150)
    return (data || []) as Notif[]
  }, [me])

  const shown = useMemo(() => (items || []).filter(n => filter === 'all' || (filter === 'messages' ? n.type === 'message' : ['application', 'job_match'].includes(n.type))), [items, filter])
  const today = toISODate(new Date())
  const groups = [
    { label: 'Today', rows: shown.filter(n => n.created_at.slice(0, 10) === today) },
    { label: 'Earlier', rows: shown.filter(n => n.created_at.slice(0, 10) !== today) },
  ].filter(g => g.rows.length)

  const markAll = async () => {
    mutate(l => l?.map(n => ({ ...n, read: true })))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('profile_id', me).eq('read', false)
    if (error) toast('Couldn’t mark as read'); else refresh()
  }

  const open = async (n: Notif) => {
    if (!n.read) {
      mutate(l => l?.map(x => x.id === n.id ? { ...x, read: true } : x))
      supabase.from('notifications').update({ read: true }).eq('id', n.id).then(() => refresh())
    }
    // Old notifications point at legacy routes; send them to the new screens
    const url = (n.data?.url || '').replace(/^\/messages\//, '/chats/').replace(/^\/my-jobs$/, '/postings').replace(/^\/jobs\//, '/find/')
    if (url) router.push(url)
  }

  return (
    <>
      <BackHeader title="Notifications" right={(items || []).some(n => !n.read) ? <button type="button" onClick={markAll} className="text-sm font-medium text-green-ink">Mark all read</button> : undefined} />
      <div className="px-4 pb-8">
        <TabChips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'roles', label: 'Roles' }, { value: 'messages', label: 'Messages' }]} />
        {loading ? <PageLoading /> : groups.length === 0 ? <Empty icon="bell" title="You’re all caught up" sub="Recalls, self-tape requests, bookings and messages show up here." /> : groups.map(g => (
          <section key={g.label}>
            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-[0.08em] text-muted">{g.label}</p>
            <ul className="space-y-2">
              {g.rows.map(n => {
                const l = look(n)
                return (
                  <li key={n.id}>
                    <button type="button" onClick={() => open(n)} className="block w-full text-left">
                      <Card className="flex items-start gap-3 p-4">
                        <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', l.tile)}><Icon name={l.icon} /></span>
                        <span className="min-w-0 flex-1">
                          <span className={cx('block text-[15px]', !n.read && 'font-medium')}>{n.title}{n.body && n.type !== 'message' ? ' — ' : ''}{n.type !== 'message' && <span className="font-normal">{n.body}</span>}</span>
                          {n.type === 'message' && n.body && <span className="block truncate text-sm text-ink/80">{n.body}</span>}
                          <span className="mt-0.5 block text-[13px] text-muted">{ago(n.created_at)}</span>
                        </span>
                        {!n.read && <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-green" aria-label="Unread" />}
                      </Card>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>
    </>
  )
}
