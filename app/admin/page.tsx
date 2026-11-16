'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Empty, PageLoading, Sheet, Toaster, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { fullName } from '@/lib/rc/format'

type Tab = 'overview' | 'safety' | 'members' | 'jobs' | 'digs' | 'chats' | 'admins'
type Person = { id: string; first_name: string | null; last_name: string | null; company_name?: string | null; picture_url?: string | null }
type Flag = { id: string; source: 'message' | 'cast_message'; message_id: string; thread_id: string; sender_id: string | null; body: string; categories: string[]; severity: 'low' | 'medium' | 'high'; minor_involved: boolean; status: string; created_at: string }
type Report = { id: string; reporter_id: string; target_type: string; target_id: string; reported_profile_id: string | null; reason: string; details: string | null; snapshot: string | null; status: string; created_at: string }
type Member = { id: string; email: string | null; first_name: string | null; last_name: string | null; account_role: string | null; created_at: string; last_active: string | null; email_verified: boolean; is_demo: boolean; is_minor: boolean; suspended: boolean; reports: number; flags: number }
type Thread = { kind: 'message' | 'cast_message'; id: string; title: string; highlight?: string }

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—')
const CAT: Record<string, string> = { off_platform: 'Off-platform contact', money: 'Money / payment', sexual: 'Sexual content', grooming: 'Grooming language' }
const REASON: Record<string, string> = { harassment: 'Harassment', inappropriate: 'Inappropriate / sexual', underage: 'Young person at risk', scam: 'Scam / money', off_platform: 'Pushing off-platform', fake: 'Fake', other: 'Other' }
const SEV = { high: 'bg-red text-white', medium: 'bg-butter text-ink', low: 'bg-chip text-ink' }

async function namesFor(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])]
  if (!unique.length) return new Map<string, Person>()
  const { data } = await supabase.from('profiles').select('id, first_name, last_name, company_name, picture_url').in('id', unique)
  return new Map(((data || []) as Person[]).map(p => [p.id, p]))
}
const nameOf = (p?: Person | null) => (p ? fullName(p) || p.company_name || 'Member' : 'Unknown')

async function suspend(profileId: string, label: string) {
  const days = prompt('Suspend ' + label + ' for how many days? Leave empty for indefinitely.', '7')
  if (days === null) return false
  const reason = prompt('Reason (kept on record):', 'Safeguarding concern') || null
  const until = days.trim() ? new Date(Date.now() + Number(days) * 864e5).toISOString() : null
  const { data: { session } } = await supabase.auth.getSession()
  const { error } = await supabase.from('suspensions').upsert({ profile_id: profileId, reason, until, created_by: session?.user.id })
  toast(error ? 'Couldn’t suspend' : label + ' suspended')
  return !error
}
async function unsuspend(profileId: string) {
  const { error } = await supabase.from('suspensions').delete().eq('profile_id', profileId)
  toast(error ? 'Couldn’t lift the suspension' : 'Suspension lifted')
  return !error
}

export default function AdminPage() {
  const router = useRouter()
  const [ok, setOk] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('safety')
  const [thread, setThread] = useState<Thread | null>(null)

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { try { localStorage.setItem('ident.pendingNext', '/admin') } catch { /* */ } router.replace('/welcome'); return }
      const { data } = await supabase.rpc('is_admin')
      setOk(!!data)
    })()
  }, [router])

  if (ok === null) return <PageLoading />
  if (!ok) return <div className="pt-24"><Empty icon="lock" title="Admins only" sub="This area is for The Ident’s team." action={<Button size="sm" variant="dark" href="/home">Back to the app</Button>} /></div>

  const TABS: [Tab, string, string][] = [['overview', 'Overview', 'grid'], ['safety', 'Safety', 'shield'], ['members', 'Members', 'users'], ['jobs', 'Jobs', 'briefcase'], ['digs', 'Digs', 'house'], ['chats', 'Chats', 'chat'], ['admins', 'Admins', 'lock']]
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center gap-3 px-4 pt-[env(safe-area-inset-top)]">
          <Link href="/home" className="py-3 font-display text-[20px] font-bold tracking-[-0.03em]">The Ident</Link>
          <span className="rounded-full bg-forest px-2 py-0.5 text-[11px] font-semibold text-lime">Admin</span>
        </div>
        <nav className="scrollbar-none mx-auto flex max-w-[1100px] gap-1 overflow-x-auto px-3 pb-2">
          {TABS.map(([k, label, icon]) => (
            <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k}
              className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium', tab === k ? 'bg-forest text-white' : 'text-muted hover:bg-chip')}>
              <Icon name={icon} className="size-4" />{label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-4">
        {tab === 'overview' && <Overview go={setTab} />}
        {tab === 'safety' && <Safety open={setThread} />}
        {tab === 'members' && <Members />}
        {tab === 'jobs' && <Jobs />}
        {tab === 'digs' && <Digs />}
        {tab === 'chats' && <Chats open={setThread} />}
        {tab === 'admins' && <Admins />}
      </main>
      <ThreadSheet thread={thread} onClose={() => setThread(null)} />
      <Toaster />
    </div>
  )
}

function Overview({ go }: { go: (t: Tab) => void }) {
  const [s, setS] = useState<Record<string, number> | null>(null)
  useEffect(() => { supabase.rpc('admin_stats').then(({ data }) => setS(data as Record<string, number>)) }, [])
  if (!s) return <PageLoading />
  const tiles: [string, number, Tab?, boolean?][] = [
    ['High-risk flags', s.high_flags, 'safety', s.high_flags > 0], ['Open flags', s.open_flags, 'safety'], ['Open reports', s.open_reports, 'safety', s.open_reports > 0],
    ['Members', s.members, 'members'], ['Performers', s.performers, 'members'], ['Casting', s.casting, 'members'], ['New this week', s.new_7d, 'members'],
    ['Live jobs', s.live_jobs, 'jobs'], ['Applications (7d)', s.applications_7d], ['Messages (7d)', s.messages_7d, 'chats'], ['Suspended', s.suspended, 'members'], ['Demo accounts', s.demo_accounts],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tiles.map(([label, n, t, alert]) => (
        <button key={label} type="button" onClick={() => t && go(t)} className={cx('rounded-[var(--radius)] border p-4 text-left shadow-card', alert ? 'border-red/40 bg-red-tint' : 'border-line bg-surface')}>
          <p className="text-[28px] font-semibold leading-none">{n ?? 0}</p>
          <p className="mt-1.5 text-[13px] text-muted">{label}</p>
        </button>
      ))}
    </div>
  )
}

function Safety({ open }: { open: (t: Thread) => void }) {
  const [status, setStatus] = useState<'open' | 'actioned' | 'dismissed'>('open')
  const [data, setData] = useState<{ flags: Flag[]; reports: Report[]; people: Map<string, Person> } | null>(null)
  const load = useCallback(async () => {
    const [{ data: flags }, { data: reports }] = await Promise.all([
      supabase.from('moderation_flags').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100),
      supabase.from('reports').select('*').eq('status', status).order('created_at', { ascending: false }).limit(100),
    ])
    const f = (flags || []) as Flag[], r = (reports || []) as Report[]
    const sevRank = { high: 0, medium: 1, low: 2 }
    f.sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || b.created_at.localeCompare(a.created_at))
    setData({ flags: f, reports: r, people: await namesFor([...f.map(x => x.sender_id), ...r.flatMap(x => [x.reporter_id, x.reported_profile_id])]) })
  }, [status])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
  useEffect(() => { load() }, [load])

  const resolve = async (table: 'moderation_flags' | 'reports', id: string, next: 'actioned' | 'dismissed') => {
    const { data: { session } } = await supabase.auth.getSession()
    const { error } = await supabase.from(table).update({ status: next, resolved_by: session?.user.id, resolved_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast('Couldn’t update'); return }
    toast(next === 'dismissed' ? 'Dismissed' : 'Marked as actioned'); load()
  }
  const removeMessage = async (source: string, id: string) => {
    if (!confirm('Delete this message for everyone?')) return false
    const { error } = await supabase.from(source === 'message' ? 'messages' : 'cast_chat_messages').delete().eq('id', id)
    toast(error ? 'Couldn’t delete' : 'Message removed'); return !error
  }

  if (!data) return <PageLoading />
  const { flags, reports, people } = data
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['open', 'actioned', 'dismissed'] as const).map(s => <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={cx('h-9 rounded-full border px-4 text-sm font-medium capitalize', status === s ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>{s}</button>)}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[18px]">Auto-flagged messages <span className="text-muted">· {flags.length}</span></h2>
          {flags.length === 0 ? <Empty icon="shield-check" title="Nothing flagged" sub="Messages that look risky land here automatically." /> : (
            <ul className="space-y-3">
              {flags.map(f => (
                <li key={f.id} className={cx('rounded-[var(--radius)] border bg-surface p-4 shadow-card', f.severity === 'high' ? 'border-red/50' : 'border-line')}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold uppercase', SEV[f.severity])}>{f.severity}</span>
                    {f.minor_involved && <span className="rounded-full bg-red-tint px-2 py-0.5 text-[11px] font-semibold text-red">Under-18 in chat</span>}
                    {f.categories.map(c => <span key={c} className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-medium">{CAT[c] || c}</span>)}
                    <span className="ml-auto text-xs text-muted">{when(f.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-field p-3 text-sm">{f.body}</p>
                  <p className="mt-2 text-[13px] text-muted">From <Link className="font-medium text-ink underline" href={'/talent/' + f.sender_id}>{nameOf(people.get(f.sender_id || ''))}</Link> · {f.source === 'message' ? 'direct message' : 'cast chat'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" icon="chat" onClick={() => open({ kind: f.source, id: f.thread_id, title: 'Conversation', highlight: f.message_id })}>View chat</Button>
                    {status === 'open' && <>
                      <Button size="sm" variant="outline" onClick={() => resolve('moderation_flags', f.id, 'dismissed')}>Dismiss</Button>
                      <Button size="sm" variant="outline" className="text-red" onClick={async () => { if (await removeMessage(f.source, f.message_id)) resolve('moderation_flags', f.id, 'actioned') }}>Remove message</Button>
                      {f.sender_id && <Button size="sm" variant="dark" onClick={async () => { if (await suspend(f.sender_id!, nameOf(people.get(f.sender_id!)))) resolve('moderation_flags', f.id, 'actioned') }}>Suspend sender</Button>}
                    </>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-3 text-[18px]">Reports from members <span className="text-muted">· {reports.length}</span></h2>
          {reports.length === 0 ? <Empty icon="alert" title="No reports" sub="When someone taps Report, it lands here." /> : (
            <ul className="space-y-3">
              {reports.map(r => (
                <li key={r.id} className={cx('rounded-[var(--radius)] border bg-surface p-4 shadow-card', r.reason === 'underage' || r.reason === 'inappropriate' ? 'border-red/50' : 'border-line')}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-bold', r.reason === 'underage' || r.reason === 'inappropriate' ? 'bg-red text-white' : 'bg-butter text-ink')}>{REASON[r.reason] || r.reason}</span>
                    <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-medium">{r.target_type.replace('_', ' ')}</span>
                    <span className="ml-auto text-xs text-muted">{when(r.created_at)}</span>
                  </div>
                  {r.snapshot && <p className="mt-2 whitespace-pre-line rounded-xl bg-field p-3 text-sm">{r.snapshot}</p>}
                  {r.details && <p className="mt-2 text-sm">“{r.details}”</p>}
                  <p className="mt-2 text-[13px] text-muted">
                    {r.reported_profile_id && <>About <Link className="font-medium text-ink underline" href={'/talent/' + r.reported_profile_id}>{nameOf(people.get(r.reported_profile_id))}</Link> · </>}
                    Reported by {nameOf(people.get(r.reporter_id))}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.target_type === 'job' && <Button size="sm" variant="outline" href={'/find/' + r.target_id}>View job</Button>}
                    {status === 'open' && <>
                      <Button size="sm" variant="outline" onClick={() => resolve('reports', r.id, 'dismissed')}>Dismiss</Button>
                      {(r.target_type === 'message' || r.target_type === 'cast_message') && <Button size="sm" variant="outline" className="text-red" onClick={async () => { if (await removeMessage(r.target_type, r.target_id)) resolve('reports', r.id, 'actioned') }}>Remove message</Button>}
                      {r.reported_profile_id && <Button size="sm" variant="dark" onClick={async () => { if (await suspend(r.reported_profile_id!, nameOf(people.get(r.reported_profile_id!)))) resolve('reports', r.id, 'actioned') }}>Suspend</Button>}
                      <Button size="sm" variant="outline" onClick={() => resolve('reports', r.id, 'actioned')}>Mark handled</Button>
                    </>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Members() {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<Member[] | null>(null)
  const load = useCallback(async (term: string) => {
    const { data } = await supabase.rpc('admin_members', { q: term, lim: 100 })
    setRows((data || []) as Member[])
  }, [])
  useEffect(() => { const t = setTimeout(() => load(q.trim()), 250); return () => clearTimeout(t) }, [q, load])
  return (
    <div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, email or company…" aria-label="Search members" className="mb-4 h-11 w-full rounded-xl border border-line bg-surface px-4 text-[15px] outline-none focus:border-green" />
      {!rows ? <PageLoading /> : (
        <div className="overflow-x-auto rounded-[var(--radius)] border border-line bg-surface">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-chip/50 text-[12px] uppercase tracking-[0.06em] text-muted"><tr><th className="px-4 py-2.5">Member</th><th className="px-3">Role</th><th className="px-3">Joined</th><th className="px-3">Last active</th><th className="px-3">Safety</th><th className="px-3" /></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-2.5"><Link href={'/talent/' + m.id} className="font-medium hover:underline">{fullName(m) || '—'}</Link><span className="block text-xs text-muted">{m.email}</span></td>
                  <td className="px-3">{m.account_role === 'caster' ? 'Casting' : 'Performer'}</td>
                  <td className="px-3 text-muted">{when(m.created_at)}</td>
                  <td className="px-3 text-muted">{when(m.last_active)}</td>
                  <td className="px-3">
                    <span className="flex flex-wrap gap-1">
                      {m.suspended && <span className="rounded-full bg-red px-2 py-0.5 text-[11px] font-semibold text-white">Suspended</span>}
                      {m.is_minor && <span className="rounded-full bg-red-tint px-2 py-0.5 text-[11px] font-semibold text-red">Under 18</span>}
                      {m.reports > 0 && <span className="rounded-full bg-butter px-2 py-0.5 text-[11px] font-semibold">{m.reports} report{m.reports > 1 ? 's' : ''}</span>}
                      {m.flags > 0 && <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold">{m.flags} flag{m.flags > 1 ? 's' : ''}</span>}
                      {m.is_demo && <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold">Demo</span>}
                      {!m.email_verified && <span className="rounded-full bg-chip px-2 py-0.5 text-[11px]">Unverified</span>}
                    </span>
                  </td>
                  <td className="px-3 text-right">
                    {m.suspended
                      ? <button type="button" className="text-sm font-semibold text-green-ink" onClick={async () => { if (await unsuspend(m.id)) load(q.trim()) }}>Lift</button>
                      : <button type="button" className="text-sm font-semibold text-red" onClick={async () => { if (await suspend(m.id, fullName(m) || m.email || 'member')) load(q.trim()) }}>Suspend</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

type AdminJob = { id: string; project_in: string | null; project_role: string | null; job_title: string | null; is_published: boolean; is_demo: boolean; created_at: string; created_by: string | null; location: string | null }
function Jobs() {
  const [rows, setRows] = useState<{ jobs: AdminJob[]; people: Map<string, Person> } | null>(null)
  const [hideDemo, setHideDemo] = useState(true)
  const load = useCallback(async () => {
    let q = supabase.from('jobs').select('id, project_in, project_role, job_title, is_published, is_demo, created_at, created_by, location').order('created_at', { ascending: false }).limit(200)
    if (hideDemo) q = q.eq('is_demo', false)
    const { data } = await q
    const jobs = (data || []) as AdminJob[]
    setRows({ jobs, people: await namesFor(jobs.map(j => j.created_by)) })
  }, [hideDemo])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
  useEffect(() => { load() }, [load])
  const toggle = async (j: AdminJob) => {
    const { error } = await supabase.from('jobs').update({ is_published: !j.is_published }).eq('id', j.id)
    toast(error ? 'Couldn’t update' : j.is_published ? 'Unpublished' : 'Published'); load()
  }
  return (
    <div>
      <label className="mb-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={hideDemo} onChange={e => setHideDemo(e.target.checked)} /> Hide demo jobs</label>
      {!rows ? <PageLoading /> : rows.jobs.length === 0 ? <Empty icon="briefcase" title="No jobs" /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
          {rows.jobs.map(j => (
            <li key={j.id} className="flex items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1">
                <Link href={'/find/' + j.id} className="block truncate font-medium hover:underline">{[j.project_in || j.job_title, j.project_role].filter(Boolean).join(' — ')}</Link>
                <span className="block text-xs text-muted">{nameOf(rows.people.get(j.created_by || ''))} · {j.location || '—'} · {when(j.created_at)}{j.is_demo ? ' · Demo' : ''}</span>
              </span>
              <span className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', j.is_published ? 'bg-mint' : 'bg-chip')}>{j.is_published ? 'Live' : 'Hidden'}</span>
              <button type="button" onClick={() => toggle(j)} className="text-sm font-semibold text-green-ink">{j.is_published ? 'Unpublish' : 'Publish'}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type AdminDig = { id: string; title: string; city: string; area: string | null; near_venue: string | null; price_per_week: number | null; description: string | null; images: string[]; image_url: string | null; owner_id: string | null; host_name: string | null; review_status: string; is_published: boolean; created_at: string; updated_at: string }
function Digs() {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rows, setRows] = useState<{ digs: AdminDig[]; people: Map<string, Person> } | null>(null)
  const load = useCallback(async () => {
    const { data } = await supabase.from('digs').select('id, title, city, area, near_venue, price_per_week, description, images, image_url, owner_id, host_name, review_status, is_published, created_at, updated_at').eq('review_status', status).order('updated_at', { ascending: false }).limit(100)
    const digs = (data || []) as AdminDig[]
    setRows({ digs, people: await namesFor(digs.map(d => d.owner_id)) })
  }, [status])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
  useEffect(() => { load() }, [load])
  const decide = async (d: AdminDig, ok: boolean) => {
    const note = ok ? null : prompt('What needs changing? (the host sees this)', 'Please add a clear photo of the room and the nearest theatre.')
    if (!ok && note === null) return
    const { error } = await supabase.from('digs').update({ review_status: ok ? 'approved' : 'rejected', is_published: ok, review_note: note }).eq('id', d.id)
    toast(error ? 'Couldn’t update' : ok ? 'Live' : 'Sent back to the host'); load()
  }
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map(s => <button key={s} type="button" onClick={() => setStatus(s)} aria-pressed={status === s} className={cx('h-9 rounded-full border px-4 text-sm font-medium capitalize', status === s ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>{s === 'pending' ? 'To check' : s}</button>)}
      </div>
      {!rows ? <PageLoading /> : rows.digs.length === 0 ? <Empty icon="house" title={status === 'pending' ? 'Nothing to check' : 'None'} sub="New and edited digs listings wait here until you approve them." /> : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {rows.digs.map(d => (
            <li key={d.id} className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card">
              <div className="flex gap-1 overflow-x-auto bg-chip p-1">
                {(d.images?.length ? d.images : d.image_url ? [d.image_url] : []).map(u => <a key={u} href={u} target="_blank" rel="noopener noreferrer" className="block h-24 w-32 shrink-0 rounded-lg bg-cover bg-center" style={{ backgroundImage: `url(${u})` }} />)}
                {!d.images?.length && !d.image_url && <span className="p-3 text-xs text-muted">No photos</span>}
              </div>
              <div className="p-4">
                <p className="font-semibold">{d.title} {d.price_per_week != null && <span className="font-normal text-muted">· £{Number(d.price_per_week)}/week</span>}</p>
                <p className="text-[13px] text-muted">{[d.area, d.city].filter(Boolean).join(', ')}{d.near_venue ? ' · near ' + d.near_venue : ''} · by {d.owner_id ? <Link className="underline" href={'/talent/' + d.owner_id}>{nameOf(rows.people.get(d.owner_id))}</Link> : 'The Ident'} · {when(d.updated_at)}</p>
                {d.description && <p className="mt-2 whitespace-pre-line text-sm">{d.description}</p>}
                <div className="mt-3 flex gap-2">
                  {status !== 'approved' && <Button size="sm" onClick={() => decide(d, true)}>Approve</Button>}
                  {status !== 'rejected' && <Button size="sm" variant="outline" className="text-red" onClick={() => decide(d, false)}>{status === 'approved' ? 'Take down' : 'Needs changes'}</Button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

type Convo = { id: string; user_a: string; user_b: string; last_message: string | null; last_message_at: string | null }
type CastChat = { id: string; name: string; production_name: string | null; last_message: string | null; last_message_at: string | null }
function Chats({ open }: { open: (t: Thread) => void }) {
  const [data, setData] = useState<{ convos: Convo[]; cast: CastChat[]; people: Map<string, Person> } | null>(null)
  useEffect(() => {
    (async () => {
      const [{ data: convos }, { data: cast }] = await Promise.all([
        supabase.from('conversations').select('id, user_a, user_b, last_message, last_message_at').order('last_message_at', { ascending: false, nullsFirst: false }).limit(60),
        supabase.from('cast_chats').select('id, name, production_name, last_message, last_message_at').order('last_message_at', { ascending: false, nullsFirst: false }).limit(60),
      ])
      const c = (convos || []) as Convo[]
      setData({ convos: c, cast: (cast || []) as CastChat[], people: await namesFor(c.flatMap(x => [x.user_a, x.user_b])) })
    })()
  }, [])
  if (!data) return <PageLoading />
  const row = (key: string, title: string, sub: string | null, at: string | null, onClick: () => void) => (
    <li key={key}><button type="button" onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-chip/40">
      <span className="min-w-0 flex-1"><span className="block truncate font-medium">{title}</span><span className="block truncate text-xs text-muted">{sub || 'No messages yet'}</span></span>
      <span className="shrink-0 text-xs text-muted">{when(at)}</span>
    </button></li>
  )
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section><h2 className="mb-3 text-[18px]">Direct messages</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
          {data.convos.map(c => row(c.id, nameOf(data.people.get(c.user_a)) + ' ↔ ' + nameOf(data.people.get(c.user_b)), c.last_message, c.last_message_at, () => open({ kind: 'message', id: c.id, title: nameOf(data.people.get(c.user_a)) + ' ↔ ' + nameOf(data.people.get(c.user_b)) })))}
        </ul>
      </section>
      <section><h2 className="mb-3 text-[18px]">Cast chats</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
          {data.cast.map(c => row(c.id, c.name, c.last_message, c.last_message_at, () => open({ kind: 'cast_message', id: c.id, title: c.name })))}
        </ul>
      </section>
    </div>
  )
}

type Line = { id: string; sender_id: string; body: string; created_at: string; channel?: string }
function ThreadSheet({ thread, onClose }: { thread: Thread | null; onClose: () => void }) {
  const [lines, setLines] = useState<{ key: string; rows: Line[]; people: Map<string, Person> } | null>(null)
  const key = thread ? thread.kind + thread.id : ''
  useEffect(() => {
    if (!thread) return
    let live = true
    ;(async () => {
      const { data } = thread.kind === 'message'
        ? await supabase.from('messages').select('id, sender_id, body, created_at').eq('conversation_id', thread.id).order('created_at').limit(500)
        : await supabase.from('cast_chat_messages').select('id, sender_id, body, created_at, channel').eq('chat_id', thread.id).order('created_at').limit(500)
      const rows = (data || []) as Line[]
      const people = await namesFor(rows.map(r => r.sender_id))
      if (live) setLines({ key: thread.kind + thread.id, rows, people })
    })()
    return () => { live = false }
  }, [thread])
  const shown = lines && lines.key === key ? lines : null
  const remove = async (id: string) => {
    if (!thread || !confirm('Delete this message for everyone?')) return
    const { error } = await supabase.from(thread.kind === 'message' ? 'messages' : 'cast_chat_messages').delete().eq('id', id)
    if (error) { toast('Couldn’t delete'); return }
    setLines(l => l && { ...l, rows: l.rows.filter(r => r.id !== id) }); toast('Message removed')
  }
  const senders = useMemo(() => shown ? [...new Set(shown.rows.map(r => r.sender_id))] : [], [shown])
  return (
    <Sheet open={!!thread} onClose={onClose} title={thread?.title || ''}>
      {!shown ? <PageLoading /> : shown.rows.length === 0 ? <p className="text-sm text-muted">No messages.</p> : (
        <div className="space-y-2">
          <p className="text-xs text-muted">Read-only admin view · {shown.rows.length} messages</p>
          {shown.rows.map(r => (
            <div key={r.id} className={cx('group rounded-xl p-3 text-sm', r.id === thread?.highlight ? 'bg-red-tint ring-2 ring-red/40' : senders.indexOf(r.sender_id) % 2 ? 'bg-mint/40' : 'bg-field')}>
              <p className="flex items-center gap-2 text-xs text-muted"><span className="font-semibold text-ink">{nameOf(shown.people.get(r.sender_id))}</span>{r.channel && <span>#{r.channel}</span>}<span>{when(r.created_at)}</span>
                <button type="button" onClick={() => remove(r.id)} className="ml-auto font-semibold text-red opacity-70 hover:opacity-100">Remove</button></p>
              <p className="mt-1 whitespace-pre-line">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  )
}

function TestEmail() {
  const [busy, setBusy] = useState<string | null>(null)
  const send = async (variant: 'performer' | 'casting') => {
    setBusy(variant)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/admin/test-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (session?.access_token || '') }, body: JSON.stringify({ variant }) })
    const out = await res.json().catch(() => ({}))
    setBusy(null)
    toast(res.ok ? 'Sent to ' + out.to + ' — check your inbox (and spam)' : 'Couldn’t send: ' + (out.error || res.status))
  }
  return (
    <div className="mb-6 rounded-[var(--radius)] border border-line bg-surface p-4">
      <p className="font-semibold">Test emails</p>
      <p className="mt-0.5 text-sm text-muted">Send the welcome email to yourself to see what new members get.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => send('performer')} disabled={!!busy}>{busy === 'performer' ? 'Sending…' : 'Send me the performer welcome'}</Button>
        <Button size="sm" variant="outline" onClick={() => send('casting')} disabled={!!busy}>{busy === 'casting' ? 'Sending…' : 'Casting version'}</Button>
      </div>
    </div>
  )
}

function Admins() {
  const [rows, setRows] = useState<{ email: string; added_at: string }[] | null>(null)
  const [email, setEmail] = useState('')
  const load = useCallback(async () => { const { data } = await supabase.from('admin_emails').select('email, added_at').order('added_at'); setRows(data || []) }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect -- async load
  useEffect(() => { load() }, [load])
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const v = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast('Enter a valid email'); return }
    const { error } = await supabase.from('admin_emails').insert({ email: v })
    if (error) { toast('Couldn’t add'); return }
    setEmail(''); toast(v + ' is now an admin'); load()
  }
  const remove = async (v: string) => {
    if ((rows?.length || 0) <= 1) { toast('Keep at least one admin'); return }
    if (!confirm('Remove ' + v + ' as an admin?')) return
    const { error } = await supabase.from('admin_emails').delete().eq('email', v)
    toast(error ? 'Couldn’t remove' : 'Removed'); load()
  }
  return (
    <div className="max-w-[560px]">
      <p className="mb-3 text-sm text-muted">Anyone who signs in with one of these emails can open this dashboard. Change them any time.</p>
      {!rows ? <PageLoading /> : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius)] border border-line bg-surface">
          {rows.map(r => <li key={r.email} className="flex items-center gap-3 px-4 py-3"><span className="flex-1 font-medium">{r.email}</span><button type="button" onClick={() => remove(r.email)} className="text-sm font-semibold text-red">Remove</button></li>)}
        </ul>
      )}
      <TestEmail />
      <form onSubmit={add} className="mt-4 flex gap-2">
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="name@example.com" aria-label="Admin email" className="h-11 flex-1 rounded-xl border border-line bg-surface px-4 outline-none focus:border-green" />
        <Button type="submit">Add admin</Button>
      </form>
    </div>
  )
}
