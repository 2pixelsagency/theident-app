'use client'

import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { HomeHeader } from '@/components/rc/nav'
import { VerifyBanner } from '@/components/rc/verify'
import { HomeCompleteness } from '@/components/rc/Completeness'
import TodoList from '@/components/rc/TodoList'
import LatestJobs from '@/components/rc/LatestJobs'
import HiringCard from '@/components/rc/HiringCard'
import WeekStrip from '@/components/rc/WeekStrip'
import { Button, Card, PageLoading, Pill, Progress, SectionTitle } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { blockProgress, currentWeek, loadActiveBlock } from '@/lib/rc/blocks'
import { kindsByDay, loadDiary } from '@/lib/rc/diary'
import { daysUntil, fmtTimeOfDay, parseDate, toISODate, weekDays } from '@/lib/rc/format'
import { PIPELINE_SELECT, jobSub, jobTitle, stageOf, type PipelineApp } from '@/lib/rc/pipeline'

export default function HomePage() {
  const { role } = useMe()
  return role === 'caster' ? <CasterHome /> : <PerformerHome />
}

/* ---------------- Performer ---------------- */

function PerformerHome() {
  const { id } = useMe()
  const { data, loading } = useAsync(async () => {
    const week = weekDays()
    const [blockRes, appsRes, diary] = await Promise.all([
      loadActiveBlock(id),
      supabase.from('applications').select(PIPELINE_SELECT).eq('profile_id', id).is('outcome', null).order('updated_at', { ascending: false }),
      loadDiary(id, week[0], week[6]),
    ])
    const apps = (appsRes.data || []) as unknown as PipelineApp[]
    const today = toISODate(new Date())
    const live = apps.find(a => stageOf(a) === 'booked' && a.jobs?.start_date && a.jobs.start_date <= today && (!a.jobs.end_date || a.jobs.end_date >= today)) || null
    let todayShows: { title: string; start_time: string | null; description: string | null }[] = []
    if (live) {
      const { data: cal } = await supabase.from('calendar_events').select('title, start_time, description').eq('profile_id', id).eq('start_date', today).order('start_time')
      todayShows = cal || []
    }
    return { ...blockRes, apps, diary, live, todayShows, now: Date.now() }
  }, [id])

  if (loading || !data) return <><HomeHeader /><PageLoading /></>

  const { block, diary, live, todayShows, now } = data
  const subline = live && live.jobs?.start_date && live.jobs.end_date
    ? contractWeekLine(live.jobs.start_date, live.jobs.end_date, now)
    : block ? `Week ${currentWeek(block)} of your goal` : undefined

  return (
    <>
      <HomeHeader subline={subline} />
      <VerifyBanner />
      <HomeCompleteness />
      <div className="rise-stagger px-4">
        {live && <LiveCard app={live} shows={todayShows} now={now} />}
        <HiringCard />
        <LatestJobs limit={3} />
        <TodoList compact />
        <BlockCard block={block} />
        <SectionTitle title="This week" action="Diary" href="/diary" />
        <WeekStrip kinds={kindsByDay(diary)} />
        <div className="h-6" />
      </div>
    </>
  )
}

function contractWeekLine(start: string, end: string, nowMs: number) {
  const s = parseDate(start)!, e = parseDate(end)!
  const total = Math.max(1, Math.ceil((e.getTime() - s.getTime() + 86_400_000) / (7 * 86_400_000)))
  const now = Math.min(total, Math.max(1, Math.floor((nowMs - s.getTime()) / (7 * 86_400_000)) + 1))
  return `Week ${now} of ${total} on contract`
}

function BlockCard({ block }: { block: Awaited<ReturnType<typeof loadActiveBlock>>['block'] }) {
  if (!block) {
    return (
      <Link href="/blocks/new" className="mt-4 block rounded-[var(--radius)] border border-dashed border-line bg-surface/60 p-5">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted"><Icon name="target" className="size-4" /> Your goals</p>
        <p className="mt-2 text-[18px] title">Create a showreel, take dance classes, sign with an agent…</p>
        <p className="mt-1 text-sm text-muted">Set a goal and a few things to do each week — we’ll keep score.</p>
      </Link>
    )
  }
  const week = currentWeek(block)
  const pct = blockProgress(block)
  return (
    <Link href="/blocks" className="mt-4 block">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted"><span className="size-2 rounded-full bg-green" /> Your goal</p>
          <span className="text-sm text-muted">{pct}%</span>
        </div>
        <p className="mt-2 text-[20px] title">{block.goal}</p>
        <Progress value={pct} className="mt-4" />
        <p className="mt-3 text-[13px] text-muted">Week {week} of {block.weeks}</p>
      </Card>
    </Link>
  )
}

function LiveCard({ app, shows, now }: { app: PipelineApp; shows: { title: string; start_time: string | null; description: string | null }[]; now: number }) {
  const j = app.jobs!
  const left = daysUntil(j.end_date)
  const start = parseDate(j.start_date)!, end = parseDate(j.end_date)
  const pct = end ? Math.round(((now - start.getTime()) / (end.getTime() - start.getTime())) * 100) : 0
  const weeksLeft = left != null ? Math.max(0, Math.ceil(left / 7)) : null
  const next = shows[0]
  return (
    <Card className="mt-4 p-5">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted"><span className="size-2 rounded-full bg-green" /> Currently on</p>
        <Pill tone="purple">Contract</Pill>
      </div>
      <p className="mt-2 text-[20px] title">{jobTitle(j)}</p>
      <p className="text-sm text-muted">{[jobSub(j), j.location].filter(Boolean).join(' · ')}</p>
      {end && <><Progress value={pct} className="mt-4" /><p className="mt-2 text-[13px] text-muted">{weeksLeft != null && (weeksLeft <= 1 ? 'Final week' : weeksLeft + ' weeks left')}</p></>}

      {next && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-chip/60 p-3">
          <span className="flex size-12 flex-col items-center justify-center rounded-lg bg-dark text-white">
            <span className="text-[9px] uppercase tracking-wider text-white/60">Today</span>
            <span className="text-sm font-medium">{fmtTimeOfDay(next.start_time) || '—'}</span>
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-medium">{next.title}</span>
            {next.description && <span className="block truncate text-[13px] text-muted">{next.description}</span>}
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-4 gap-2">
        {[['Schedule', '/castings/' + app.id + '/schedule'], ['Log pay', '/pay'], ['Cast chat', '/chats'], ['Digs', '/digs']].map(([label, href]) => (
          <Link key={label} href={href} className="rounded-xl bg-chip/60 py-2.5 text-center text-[13px] font-medium">{label}</Link>
        ))}
      </div>

      {weeksLeft != null && (
        <Link href="/find" className="mt-4 flex items-center justify-between rounded-xl bg-green px-4 py-3.5 text-white">
          <span>
            <span className="block text-[11px] uppercase tracking-[0.08em] text-white/75">{weeksLeft <= 1 ? 'Final week' : weeksLeft + ' weeks left'}</span>
            <span className="block text-[17px] font-medium">Line up what’s next</span>
          </span>
          <Icon name="arrow-right" className="size-5" />
        </Link>
      )}
    </Card>
  )
}

/* ---------------- Caster ---------------- */

type Posting = { id: string; project_role: string | null; project_in: string | null; job_title: string | null; is_side_hustle: boolean; is_published: boolean; application_deadline: string | null; created_at: string }
type Applicant = { id: string; job_id: string; profile_id: string; created_at: string; status: string; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null; location: string | null; what_i_do: string | null } | null }

function CasterHome() {
  const { id, profile } = useMe()
  const { data, loading } = useAsync(async () => {
    const { data: jobs } = await supabase.from('jobs').select('id, project_role, project_in, job_title, is_side_hustle, is_published, application_deadline, created_at').eq('created_by', id).order('created_at', { ascending: false })
    const postings = (jobs || []) as Posting[]
    let applicants: Applicant[] = []
    if (postings.length) {
      const { data: apps } = await supabase.from('applications').select('id, job_id, profile_id, created_at, status, profiles(first_name, last_name, picture_url, location, what_i_do)').in('job_id', postings.map(p => p.id)).order('created_at', { ascending: false })
      applicants = (apps || []) as unknown as Applicant[]
    }
    return { postings, applicants }
  }, [id])

  if (loading || !data) return <><HomeHeader /><PageLoading /></>
  const { postings, applicants } = data
  const open = postings.filter(p => p.is_published)
  const toReview = applicants.filter(a => a.status === 'submitted')
  const sub = profile?.company_name ? profile.company_name + ' · ' + open.length + ' open posting' + (open.length === 1 ? '' : 's') : undefined

  return (
    <>
      <HomeHeader subline={sub} />
      <VerifyBanner />
      <HomeCompleteness />
      <div className="rise-stagger px-4">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/postings" className="flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
            <span className="text-[26px] font-semibold leading-none">{toReview.length}</span>
            <span className="text-[13px] leading-tight text-muted">to review across {open.length} posting{open.length === 1 ? '' : 's'}</span>
          </Link>
          <Button variant="outline" icon="users" href="/talent" className="h-auto">Find talent</Button>
        </div>
        <LatestJobs limit={12} title="What’s happening" />
        <div className="h-6" />
      </div>
    </>
  )
}
