'use client'

import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { HomeHeader } from '@/components/rc/nav'
import WeekStrip from '@/components/rc/WeekStrip'
import { AvatarPile, Button, Card, Empty, PageLoading, Pill, Progress, SectionTitle, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { blockProgress, currentWeek, loadActiveBlock } from '@/lib/rc/blocks'
import { kindsByDay, loadDiary } from '@/lib/rc/diary'
import { daysUntil, fmtTimeOfDay, fullName, parseDate, toISODate, weekDays } from '@/lib/rc/format'
import { PIPELINE_SELECT, STAGE_META, jobSub, jobTitle, nextAction, stageOf, type PipelineApp } from '@/lib/rc/pipeline'

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

  const { block, apps, diary, live, todayShows, now } = data
  const active = apps.filter(a => a !== live && stageOf(a) !== 'closed').slice(0, live ? 1 : 2)
  const subline = live && live.jobs?.start_date && live.jobs.end_date
    ? contractWeekLine(live.jobs.start_date, live.jobs.end_date, now)
    : block ? `Week ${currentWeek(block)} of your Block` : undefined

  return (
    <>
      <HomeHeader subline={subline} />
      <div className="px-4">
        {live ? <LiveCard app={live} shows={todayShows} now={now} /> : (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button variant="dark" icon="search" href="/find">Find jobs</Button>
              <Button variant="outline" icon="plus" href="/postings/new?type=side">Post a job</Button>
            </div>
            <BlockCard block={block} />
          </>
        )}

        <SectionTitle title="Your roles" action="View all" href="/castings" />
        {active.length ? (
          <Card className="divide-y divide-line overflow-hidden">
            {active.map(a => {
              const meta = STAGE_META[stageOf(a)]
              return (
                <Link key={a.id} href={'/castings?focus=' + a.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{jobTitle(a.jobs)}</span>
                    <span className="block truncate text-[13px] text-muted">{nextAction(a)}</span>
                  </span>
                  <Pill tone={meta.tone}>{meta.label}</Pill>
                </Link>
              )
            })}
          </Card>
        ) : (
          <Card><Empty icon="briefcase" title="No roles in play yet" sub="Apply to a role and it’ll show up here as it moves from self-tape to booked." action={<Button size="sm" variant="dark" href="/find">Browse roles</Button>} /></Card>
        )}

        <SectionTitle title="This week" action="Diary" href="/diary" />
        <WeekStrip kinds={kindsByDay(diary)} />

        {!live && (
          <div className="mt-6 grid grid-cols-3 gap-3 pb-6">
            {[['calendar', 'Diary', '/diary'], ['grid', 'Blocks', '/blocks'], ['ticket', 'What’s on', '/whats-on']].map(([icon, label, href]) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-[var(--radius)] border border-line bg-surface py-4 text-[13px] shadow-card">
                <Icon name={icon} className="size-5 text-green-ink" />{label}
              </Link>
            ))}
          </div>
        )}
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
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted"><Icon name="grid" className="size-4" /> No active Block</p>
        <p className="mt-2 text-[18px] font-medium">Set a goal for the next few weeks</p>
        <p className="mt-1 text-sm text-muted">One goal, a few weekly actions. We’ll keep score.</p>
      </Link>
    )
  }
  const week = currentWeek(block)
  const pct = blockProgress(block)
  return (
    <Link href="/blocks" className="mt-4 block">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-muted"><span className="size-2 rounded-full bg-green" /> Active Block</p>
          <span className="text-sm text-muted">{pct}%</span>
        </div>
        <p className="mt-2 text-[20px] font-medium">{block.goal}</p>
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
      <p className="mt-2 text-[20px] font-medium">{jobTitle(j)}</p>
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
      <div className="px-4">
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="dark" icon="plus" href="/postings/new">Post a job</Button>
          <Button variant="outline" icon="users" href="/talent">Find talent</Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[[open.length, 'Open postings'], [applicants.length, 'Submissions'], [toReview.length, 'To review']].map(([n, label]) => (
            <Card key={label as string} className="p-4">
              <p className="text-[24px] font-medium leading-none">{n}</p>
              <p className="mt-1.5 text-xs text-muted">{label}</p>
            </Card>
          ))}
        </div>

        <SectionTitle title="Your postings" action="View all" href="/postings" />
        {postings.length ? (
          <Card className="divide-y divide-line overflow-hidden">
            {postings.slice(0, 3).map(p => {
              const subs = applicants.filter(a => a.job_id === p.id)
              return (
                <Link key={p.id} href={'/postings/' + p.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">{p.is_side_hustle ? p.job_title : [p.project_in, p.project_role].filter(Boolean).join(' — ')}</span>
                    <span className="block text-[13px] text-muted">{subs.length} submission{subs.length === 1 ? '' : 's'}</span>
                  </span>
                  <AvatarPile people={subs.map(s => ({ id: s.id, name: fullName(s.profiles), src: s.profiles?.picture_url }))} size={28} />
                  <Pill tone={p.is_published ? 'green' : 'amber'}>{p.is_published ? 'Open' : 'Pending'}</Pill>
                </Link>
              )
            })}
          </Card>
        ) : (
          <Card><Empty icon="megaphone" title="No postings yet" sub="Post a casting role or a side hustle and submissions will land here." action={<Button size="sm" variant="dark" href="/postings/new">Post a job</Button>} /></Card>
        )}

        <SectionTitle title="Latest submissions" />
        {applicants.length ? (
          <div className="grid grid-cols-2 gap-3 pb-6">
            {applicants.slice(0, 4).map(a => (
              <Link key={a.id} href={'/talent/' + a.profile_id + '?app=' + a.id} className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card">
                <div className={cx('aspect-[4/3] bg-chip bg-cover bg-center')} style={a.profiles?.picture_url ? { backgroundImage: `url(${a.profiles.picture_url})` } : undefined} />
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{fullName(a.profiles)}</p>
                  <p className="truncate text-xs text-muted">{[a.profiles?.location, a.profiles?.what_i_do?.split(',')[0]].filter(Boolean).join(' · ')}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : <p className="pb-6 text-sm text-muted">Nothing new yet.</p>}
      </div>
    </>
  )
}
