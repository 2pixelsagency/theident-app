'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Avatar, BackHeader, Button, Card, Empty, Field, ListRow, PageLoading, SearchField, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { jobTitle } from '@/lib/rc/pipeline'

type Person = { id: string; first_name: string | null; last_name: string | null; picture_url: string | null; what_i_do: string | null; note?: string }
type Production = { id: string; title: string }

export default function NewCastChatPage() {
  const router = useRouter()
  const existingChat = useSearchParams().get('chat')
  const { id: me, role } = useMe()
  const [name, setName] = useState('')
  const [production, setProduction] = useState<Production | null>(null)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [q, setQ] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, loading } = useAsync(async () => {
    // Candidates: accepted connections, plus (for casters) people in their castings
    const { data: conns } = await supabase.from('connections').select('requester_id, receiver_id').eq('status', 'accepted').or(`requester_id.eq.${me},receiver_id.eq.${me}`)
    const ids = new Set((conns || []).map(c => (c.requester_id === me ? c.receiver_id : c.requester_id)))
    const notes = new Map<string, string>()
    let productions: Production[] = []
    if (role === 'caster') {
      const { data: jobs } = await supabase.from('jobs').select('id, project_in, project_role, job_title, is_side_hustle, production_company').eq('created_by', me).order('created_at', { ascending: false })
      productions = (jobs || []).map(j => ({ id: j.id, title: jobTitle(j) }))
      if (jobs?.length) {
        const { data: apps } = await supabase.from('applications').select('profile_id, status, job_id').in('job_id', jobs.map(j => j.id)).in('status', ['callback', 'offer', 'booked']).is('outcome', null)
        for (const a of apps || []) { ids.add(a.profile_id); notes.set(a.profile_id, a.status === 'booked' ? 'in this company' : 'in your casting') }
      }
    } else {
      const { data: booked } = await supabase.from('applications').select('jobs(id, project_in, project_role, job_title, is_side_hustle, production_company)').eq('profile_id', me).eq('status', 'booked')
      productions = ((booked || []) as unknown as { jobs: Parameters<typeof jobTitle>[0] & { id: string } }[]).filter(b => b.jobs).map(b => ({ id: b.jobs.id, title: jobTitle(b.jobs) }))
    }
    let alreadyIn = new Set<string>()
    if (existingChat) {
      const { data: members } = await supabase.from('cast_chat_members').select('profile_id').eq('chat_id', existingChat)
      alreadyIn = new Set((members || []).map(m => m.profile_id))
    }
    ids.delete(me)
    const list = ids.size ? (await supabase.from('profiles').select('id, first_name, last_name, picture_url, what_i_do').in('id', Array.from(ids))).data || [] : []
    return { people: (list as Person[]).filter(p => !alreadyIn.has(p.id)).map(p => ({ ...p, note: notes.get(p.id) })), productions }
  }, [me, role, existingChat])

  const shown = useMemo(() => (data?.people || []).filter(p => !q.trim() || fullName(p).toLowerCase().includes(q.toLowerCase())), [data, q])
  const pickedPeople = (data?.people || []).filter(p => picked.includes(p.id))
  const toggle = (id: string) => setPicked(l => l.includes(id) ? l.filter(x => x !== id) : [...l, id])

  const create = async () => {
    if (!existingChat && !name.trim()) { toast('Name your chat'); return }
    setSaving(true)
    let chatId = existingChat
    if (!chatId) {
      const { data: chat, error } = await supabase.from('cast_chats').insert({ name: name.trim(), created_by: me, production_job_id: production?.id ?? null, production_name: production?.title ?? null }).select('id').single()
      if (error || !chat) { setSaving(false); toast('Couldn’t create the chat'); return }
      chatId = chat.id
      await supabase.from('cast_chat_members').insert({ chat_id: chatId, profile_id: me, role: 'admin' })
    }
    if (picked.length) {
      const { error } = await supabase.from('cast_chat_members').insert(picked.map(profile_id => ({ chat_id: chatId!, profile_id })))
      if (error) { setSaving(false); toast('Some invites didn’t go through'); return }
    }
    router.replace('/chats/cast/' + chatId)
  }

  return (
    <>
      <BackHeader title={existingChat ? 'Add people' : 'New cast chat'} />
      <div className="px-4 pb-10">
        {!existingChat && (
          <>
            <div className="flex items-start gap-3">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-green text-white"><Icon name="users" className="size-6" /></span>
              <Field className="flex-1" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Coastlines — company" aria-label="Chat name" hint="Name your chat — cast, department or whole company." />
            </div>
            <Card className="mt-4">
              <ListRow icon="briefcase" title="Link a production" sub={production?.title || (data?.productions.length ? 'Optional' : 'No productions yet')} onClick={() => data?.productions.length && setPicking(true)} />
            </Card>
          </>
        )}

        {pickedPeople.length > 0 && (
          <>
            <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-[0.08em] text-muted">Invited · {pickedPeople.length}</p>
            <div className="scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4">
              {pickedPeople.map(p => (
                <button key={p.id} type="button" onClick={() => toggle(p.id)} className="flex w-14 shrink-0 flex-col items-center gap-1 text-center text-xs text-muted">
                  <Avatar src={p.picture_url} name={fullName(p)} size={52} />
                  <span className="w-full truncate">{p.first_name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="mt-5"><SearchField value={q} onChange={setQ} placeholder="Search cast & connections…" /></div>
        {loading ? <PageLoading /> : shown.length === 0 ? (
          <Empty icon="users" title="No one to add yet" sub="Connect with people from their profiles, then add them to cast chats." />
        ) : (
          <Card className="mt-3 divide-y divide-line overflow-hidden">
            {shown.map(p => {
              const on = picked.includes(p.id)
              return (
                <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={on} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                  <Avatar src={p.picture_url} name={fullName(p)} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{fullName(p)}</span>
                    <span className="block truncate text-[13px] text-muted">{[p.what_i_do?.split(',')[0], p.note].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className={cx('flex size-7 items-center justify-center rounded-full border-2', on ? 'border-green bg-green text-white' : 'border-line')}>{on && <Icon name="check" className="size-4" strokeWidth={2.6} />}</span>
                </button>
              )
            })}
          </Card>
        )}

        <Button className="mt-6" size="lg" full trailingIcon="arrow-right" onClick={create} disabled={saving || (!!existingChat && !picked.length)}>
          {saving ? 'Saving…' : existingChat ? 'Add ' + picked.length : 'Create chat' + (picked.length ? ' & invite ' + picked.length : '')}
        </Button>
      </div>

      <Sheet open={picking} onClose={() => setPicking(false)} title="Link a production">
        <Card className="divide-y divide-line overflow-hidden">
          {(data?.productions || []).map(p => <ListRow key={p.id} icon="briefcase" title={p.title} onClick={() => { setProduction(p); if (!name) setName(p.title.split(' — ')[0] + ' — company'); setPicking(false) }} chevron={false} />)}
          {production && <ListRow icon="x" title="Don’t link a production" onClick={() => { setProduction(null); setPicking(false) }} chevron={false} />}
        </Card>
      </Sheet>
    </>
  )
}
