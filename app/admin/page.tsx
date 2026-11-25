'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Empty, PageLoading, Sheet, Toaster, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { fullName } from '@/lib/rc/format'
import { Claims, ShareCasting } from './ShareCasting'
import { AreaChart, BarChart, SplitBar } from './Charts'

type Tab = 'overview' | 'safety' | 'verify' | 'members' | 'jobs' | 'digs' | 'chats' | 'admins'
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
  const [tab, setTab] = useState<Tab>('overview')
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
  return <Shell tab={tab} setTab={setTab} thread={thread} setThread={setThread} />
}

type Stats = Record<string, number>
const NAV: { key: Tab; label: string; icon: string; sub: string; badge?: (s: Stats) => number; urgent?: (s: Stats) => boolean }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid', sub: 'How The Ident is doing today' },
  { key: 'safety', label: 'Safety', icon: 'shield', sub: 'Flagged messages and member reports', badge: s => (s.open_flags || 0) + (s.open_reports || 0), urgent: s => (s.high_flags || 0) > 0 },
  { key: 'verify', label: 'Verification', icon: 'shield-check', sub: 'Professional and graduate checks waiting for you' },
  { key: 'members', label: 'Members', icon: 'users', sub: 'Everyone on The Ident' },
  { key: 'jobs', label: 'Jobs', icon: 'briefcase', sub: 'Every listing, shared castings and claims', badge: s => s.claims_pending || 0 },
  { key: 'digs', label: 'Digs', icon: 'house', sub: 'Listings waiting for your OK', badge: s => s.digs_pending || 0 },
  { key: 'chats', label: 'Chats', icon: 'chat', sub: 'Read-only view of conversations' },
  { key: 'admins', label: 'Admins', icon: 'lock', sub: 'Who can open this dashboard' },
]

function Shell({ tab, setTab, thread, setThread }: { tab: Tab; setTab: (t: Tab) => void; thread: Thread | null; setThread: (t: Thread | null) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [email, setEmail] = useState('')
  const loadStats = useCallback(() => { supabase.rpc('admin_stats').then(({ data }) => setStats(((Array.isArray(data) ? data[0] : data) || {}) as Stats)) }, [])
   
  useEffect(() => { loadStats(); supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email || '')) }, [loadStats])
  const go = (t: Tab) => { setTab(t); loadStats(); window.scrollTo(0, 0) }
  const here = NAV.find(n => n.key === tab)!
  const badge = (n: (typeof NAV)[number]) => {
    const c = stats && n.badge ? n.badge(stats) : 0
    if (!c) return null
    return <span className={cx('ml-auto min-w-6 rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold', stats && n.urgent?.(stats) ? 'bg-red text-white' : 'bg-lime text-ink')}>{c}</span>
  }
  return (
    <div className="min-h-dvh bg-bg text-ink lg:grid lg:grid-cols-[256px_1fr]">
      {/* Sidebar (desktop) */}
      <div className="hidden bg-forest lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col px-4 py-6 text-white">
        <Link href="/home" className="flex items-center gap-2 px-2">
          <span className="font-display text-[22px] font-bold tracking-[-0.03em] text-lime">The Ident</span>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/80">Admin</span>
        </Link>
        <nav className="mt-8 space-y-1">
          {NAV.map(n => (
            <button key={n.key} type="button" onClick={() => go(n.key)} aria-current={tab === n.key ? 'page' : undefined}
              className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition', tab === n.key ? 'bg-white text-ink shadow-card' : 'text-white/75 hover:bg-white/10 hover:text-white')}>
              <Icon name={n.icon} className="size-[18px]" />{n.label}{badge(n)}
            </button>
          ))}
        </nav>
        <div className="mt-auto rounded-xl bg-white/5 p-3">
          <p className="truncate text-[12px] text-white/60">Signed in as</p>
          <p className="truncate text-[13px] font-medium">{email}</p>
          <Link href="/home" className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-lime"><Icon name="chevron-left" className="size-3.5" />Back to the app</Link>
        </div>
      </aside>
      </div>

      <div className="min-w-0">
        {/* Top bar (phones: brand + scrolling tabs) */}
        <header className="sticky top-0 z-30 bg-forest text-white lg:hidden">
          <div className="flex items-center gap-2 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
            <span className="font-display text-[19px] font-bold tracking-[-0.03em] text-lime">The Ident</span>
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]">Admin</span>
            <Link href="/home" className="ml-auto text-[12px] font-semibold text-white/80">Back to app</Link>
          </div>
          <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 pb-3">
            {NAV.map(n => (
              <button key={n.key} type="button" onClick={() => go(n.key)} aria-pressed={tab === n.key}
                className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold', tab === n.key ? 'bg-white text-ink' : 'bg-white/10 text-white/85')}>
                <Icon name={n.icon} className="size-4" />{n.label}{badge(n)}
              </button>
            ))}
          </nav>
        </header>

        <main className="mx-auto max-w-[1180px] px-4 pb-16 pt-6 lg:px-10 lg:pt-10">
          <div className="mb-6">
            <h1 className="text-[28px] lg:text-[34px]">{here.label}</h1>
            <p className="mt-1 text-[14px] text-muted">{here.sub}</p>
          </div>
          {tab === 'overview' && <Overview s={stats} go={go} />}
          {tab === 'safety' && <Safety open={setThread} />}
          {tab === 'verify' && <Verify />}
          {tab === 'members' && <Members />}
          {tab === 'jobs' && <Jobs />}
          {tab === 'digs' && <Digs />}
          {tab === 'chats' && <Chats open={setThread} />}
          {tab === 'admins' && <Admins />}
        </main>
      </div>
      <ThreadSheet thread={thread} onClose={() => setThread(null)} />
      <Toaster />
    </div>
  )
}

const CHIP: Record<string, string> = { forest: 'bg-forest text-lime', lime: 'bg-lime text-ink', mint: 'bg-mint text-ink', butter: 'bg-butter text-ink', blossom: 'bg-blossom text-ink', red: 'bg-red text-white' }
function Kpi({ label, value, icon, chip = 'mint', note, onClick }: { label: string; value: number | undefined; icon: string; chip?: keyof typeof CHIP; note?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={!onClick}
      className={cx('flex flex-col gap-3 rounded-[10px] border border-line bg-surface p-4 text-left shadow-card transition sm:flex-row sm:items-center sm:gap-4 sm:p-5', onClick && 'hover:-translate-y-0.5 hover:shadow-lg')}>
      <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl sm:size-12', CHIP[chip])}><Icon name={icon} className="size-[22px]" /></span>
      <span className="min-w-0">
        <span className="title block text-[28px] leading-none">{(value ?? 0).toLocaleString('en-GB')}</span>
        <span className="mt-1 block truncate text-[13px] text-muted">{label}</span>
        {note && <span className="mt-0.5 block text-[12px] font-semibold text-green-ink">{note}</span>}
      </span>
    </button>
  )
}

function Card({ title, sub, right, children, className }: { title: string; sub?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-[10px] border border-line bg-surface p-5 shadow-card lg:p-6', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div><h2 className="text-[18px]">{title}</h2>{sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}</div>
        {right}
      </div>
      {children}
    </section>
  )
}

type Day = { day: string; signups: number; applications: number; jobs: number; messages: number }
type RecentJob = { id: string; project_in: string | null; job_title: string | null; project_role: string | null; location: string | null; created_at: string; shared_by_ident: boolean }
function Overview({ s, go }: { s: Stats | null; go: (t: Tab) => void }) {
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [series, setSeries] = useState<Day[] | null>(null)
  const [recent, setRecent] = useState<{ people: Member[]; jobs: RecentJob[] } | null>(null)
  useEffect(() => { supabase.rpc('admin_timeseries', { days: range }).then(({ data }) => setSeries((data || []) as Day[])) }, [range])
  useEffect(() => {
    Promise.all([
      supabase.rpc('admin_members', { q: '', lim: 6 }),
      supabase.from('jobs').select('id, project_in, job_title, project_role, location, created_at, shared_by_ident').eq('is_demo', false).order('created_at', { ascending: false }).limit(5),
    ]).then(([m, j]) => setRecent({ people: ((m.data || []) as Member[]).filter(x => !x.is_demo), jobs: (j.data || []) as RecentJob[] }))
  }, [])
  if (!s) return <PageLoading />
  const sum = (k: keyof Omit<Day, 'day'>, from = 0) => (series || []).slice(from).reduce((t, d) => t + (d[k] as number), 0)
  const week = (k: keyof Omit<Day, 'day'>) => sum(k, Math.max(0, (series || []).length - 7))
  const todo = [
    s.high_flags > 0 && { t: 'safety' as Tab, label: s.high_flags + ' high-risk flag' + (s.high_flags > 1 ? 's' : ''), sub: 'Review now — may involve a young person', urgent: true },
    s.open_reports > 0 && { t: 'safety' as Tab, label: s.open_reports + ' member report' + (s.open_reports > 1 ? 's' : ''), sub: 'Someone asked for help' },
    s.open_flags - s.high_flags > 0 && { t: 'safety' as Tab, label: (s.open_flags - s.high_flags) + ' flagged message' + (s.open_flags - s.high_flags > 1 ? 's' : ''), sub: 'Automatic checks' },
    s.digs_pending > 0 && { t: 'digs' as Tab, label: s.digs_pending + ' digs to approve', sub: 'Hosts are waiting to go live' },
    s.claims_pending > 0 && { t: 'jobs' as Tab, label: s.claims_pending + ' listing claim' + (s.claims_pending > 1 ? 's' : ''), sub: 'Casting directors claiming shared jobs' },
  ].filter(Boolean) as { t: Tab; label: string; sub: string; urgent?: boolean }[]
  const rangeToggle = (
    <div className="flex rounded-full bg-chip p-1 text-[12px] font-semibold">
      {([7, 30, 90] as const).map(r => <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={cx('rounded-full px-3 py-1', range === r ? 'bg-surface shadow-card' : 'text-muted')}>{r}d</button>)}
    </div>
  )
  const when2 = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Kpi label="Members" value={s.members} icon="users" chip="forest" note={s.new_7d ? '+' + s.new_7d + ' this week' : undefined} onClick={() => go('members')} />
        <Kpi label="Live jobs" value={s.live_jobs} icon="briefcase" chip="lime" note={s.shared_jobs ? s.shared_jobs + ' shared castings' : undefined} onClick={() => go('jobs')} />
        <Kpi label="Applications (7d)" value={s.applications_7d} icon="send" chip="mint" />
      </div>

      {/* Needs you */}
      {todo.length ? (
        <section className="rounded-[10px] bg-forest p-5 text-white shadow-card lg:p-6">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-lime">Needs you</p>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {todo.map(x => (
              <button key={x.label} type="button" onClick={() => go(x.t)} className={cx('flex items-center gap-3 rounded-xl p-4 text-left transition hover:brightness-110', x.urgent ? 'bg-red' : 'bg-white/10')}>
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold">{x.label}</span><span className="block text-[12px] text-white/75">{x.sub}</span></span>
                <Icon name="arrow-right" className="size-4 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-3 rounded-[10px] border border-line bg-surface p-5 shadow-card">
          <span className="flex size-11 items-center justify-center rounded-xl bg-mint"><Icon name="shield-check" className="size-5" /></span>
          <span><span className="block font-semibold">All clear</span><span className="block text-[13px] text-muted">Nothing waiting on you right now.</span></span>
        </section>
      )}

      {/* Growth + split */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="New members" sub={series ? sum('signups') + ' joined in the last ' + range + ' days · ' + week('signups') + ' this week' : 'Loading…'} right={rangeToggle}>
          {series ? <AreaChart data={series.map(d => ({ day: d.day, value: d.signups }))} unit="new members" /> : <div className="h-48 animate-pulse rounded-xl bg-chip" />}
        </Card>
        <Card title="Who’s on The Ident" sub={(s.members || 0).toLocaleString('en-GB') + ' real members'}>
          <SplitBar parts={[{ label: 'Performers', value: s.performers || 0, color: '#2E8B6A' }, { label: 'Casting', value: s.casting || 0, color: '#C7608A' }]} />
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4 text-[13px]">
            <button type="button" onClick={() => go('safety')} className="rounded-xl bg-chip/60 p-3 text-left"><span className="title block text-[20px]">{s.open_flags}</span><span className="text-muted">Open flags</span></button>
            <button type="button" onClick={() => go('members')} className="rounded-xl bg-chip/60 p-3 text-left"><span className="title block text-[20px]">{s.suspended}</span><span className="text-muted">Suspended</span></button>
          </div>
        </Card>
      </div>

      {/* Activity + latest jobs */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Applications" sub={series ? sum('applications') + ' in the last ' + range + ' days · ' + sum('messages') + ' messages sent' : 'Loading…'} right={rangeToggle}>
          {series ? <BarChart data={series.map(d => ({ day: d.day, value: d.applications }))} unit="applications" /> : <div className="h-48 animate-pulse rounded-xl bg-chip" />}
        </Card>
        <Card title="Latest jobs" right={<button type="button" onClick={() => go('jobs')} className="text-[13px] font-semibold text-green-ink">See all</button>}>
          {!recent ? <div className="h-40 animate-pulse rounded-xl bg-chip" /> : recent.jobs.length === 0 ? <p className="text-sm text-muted">No real jobs yet.</p> : (
            <ul className="space-y-3">
              {recent.jobs.map(j => (
                <li key={j.id}><Link href={'/find/' + j.id} className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-butter"><Icon name={j.shared_by_ident ? 'share' : 'briefcase'} className="size-[18px]" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{[j.project_in || j.job_title, j.project_role].filter(Boolean).join(' — ')}</span><span className="block truncate text-[12px] text-muted">{j.location || 'Location TBC'}</span></span>
                  <span className="shrink-0 text-[12px] text-muted">{when2(j.created_at)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Latest sign-ups */}
      <Card title="Latest sign-ups" right={<button type="button" onClick={() => go('members')} className="text-[13px] font-semibold text-green-ink">See all</button>}>
        {!recent ? <div className="h-32 animate-pulse rounded-xl bg-chip" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead className="text-[12px] uppercase tracking-[0.06em] text-muted"><tr><th className="pb-2 font-medium">Member</th><th className="pb-2 font-medium">Role</th><th className="pb-2 font-medium">Joined</th><th className="pb-2 font-medium">Status</th></tr></thead>
              <tbody className="divide-y divide-line">
                {recent.people.map(m => (
                  <tr key={m.id}>
                    <td className="py-2.5"><Link href={'/talent/' + m.id} className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-full bg-mint text-[12px] font-semibold">{(m.first_name || m.email || '?').slice(0, 1).toUpperCase()}</span><span><span className="block font-semibold">{fullName(m) || '—'}</span><span className="block text-[12px] text-muted">{m.email}</span></span></Link></td>
                    <td className="py-2.5">{m.account_role === 'caster' ? 'Casting' : 'Performer'}</td>
                    <td className="py-2.5 text-muted">{when2(m.created_at)}</td>
                    <td className="py-2.5">{m.suspended ? <span className="rounded-full bg-red px-2 py-0.5 text-[11px] font-semibold text-white">Suspended</span> : m.email_verified ? <span className="rounded-full bg-mint px-2 py-0.5 text-[11px] font-semibold">Verified</span> : <span className="rounded-full bg-chip px-2 py-0.5 text-[11px]">Unverified</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
  const [sharing, setSharing] = useState(false)
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
      <Claims />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={hideDemo} onChange={e => setHideDemo(e.target.checked)} /> Hide demo jobs</label>
        <Button size="sm" icon="plus" onClick={() => setSharing(true)}>Share a casting</Button>
      </div>
      <ShareCasting open={sharing} onClose={() => setSharing(false)} onDone={load} />
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

// Verification queue: links, proofs and webmail confirmations that need a person to check
type VCheck = { id: string; profile_id: string; kind: string; method: string; status: string; email: string | null; link: string | null; evidence_path: string | null; created_at: string; profiles: { first_name: string | null; last_name: string | null; slug: string | null; graduate_school: string | null; graduate_year: number | null; account_role: string | null } | null }
function Verify() {
  const [rows, setRows] = useState<VCheck[] | null>(null)
  const load = useCallback(async () => {
    const { data } = await supabase.from('verification_checks').select('id, profile_id, kind, method, status, email, link, evidence_path, created_at, profiles(first_name, last_name, slug, graduate_school, graduate_year, account_role)').eq('status', 'pending').order('created_at')
    setRows((data || []) as unknown as VCheck[])
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])
  const decide = async (c: VCheck, approve: boolean) => {
    const { error } = await supabase.rpc('admin_decide_check', { p_id: c.id, p_approve: approve })
    if (error) { toast('Couldn’t save that'); return }
    toast(approve ? 'Approved' : 'Rejected'); load()
  }
  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from('verification').createSignedUrl(path, 300)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); else toast('Couldn’t open the file')
  }
  if (!rows) return <PageLoading />
  if (!rows.length) return <Empty icon="shield-check" title="Nothing to check" sub="New verification requests will appear here." />
  const how: Record<string, string> = { school_email: 'School email confirmed (not .ac.uk)', agent: 'Agent confirmed from a personal email', link: 'Professional profile link', evidence: 'Uploaded proof' }
  return (
    <ul className="space-y-3">
      {rows.map(c => {
        const p = c.profiles
        return (
          <li key={c.id} className="rounded-[18px] border border-line-soft bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{fullName(p) || 'Member'} <span className="ml-1 rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-strong">{c.kind === 'graduate' ? 'Graduate' : 'Professional'}</span></p>
                <p className="mt-0.5 text-[13px] text-muted">{how[c.method] || c.method}{c.kind === 'graduate' && p?.graduate_school ? ' · ' + p.graduate_school + (p.graduate_year ? ' ' + p.graduate_year : '') : ''}</p>
                {c.email && <p className="mt-1 text-[13px]">{c.email}</p>}
                {c.link && <a href={c.link} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-[13px] font-medium text-green-ink underline">{c.link}</a>}
                {c.evidence_path && <button type="button" onClick={() => openProof(c.evidence_path!)} className="mt-1 text-[13px] font-medium text-green-ink underline">Open uploaded proof</button>}
                {p?.slug && <Link href={'/talent/' + c.profile_id} className="mt-1 block text-[12px] text-muted underline">View their profile</Link>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => decide(c, false)}>Reject</Button>
                <Button size="sm" onClick={() => decide(c, true)}>Approve</Button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
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
