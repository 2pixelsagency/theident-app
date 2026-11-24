import Link from 'next/link'
import { cx, FeatureCard, FloatFrame, IconBadge, Panel } from './parts'
import DiaryToggle from './DiaryToggle'
import Replay from '../Replay'
import type { Application, CastingItem, CastingStatus, Diary, Goal, Stat } from './types'

const Tag = ({ children }: { children: React.ReactNode }) => <span className="rounded-[10px] bg-sand-2 px-3 py-1.5 text-[14px] font-medium text-muted-strong">{children}</span>
const Name = ({ children }: { children: React.ReactNode }) => <span className="font-display text-[20px] font-bold">{children}</span>

const STATUS: Record<CastingStatus, [string, string]> = { 'self-tape': ['Self-tape', 'bg-butter'], recall: ['Recall', 'bg-mint'], booked: ['Booked', 'bg-lime'] }

export function TrackerCard({ castings }: { castings: CastingItem[] }) {
  return (
    <FeatureCard size="lg" title="Know where every role stands"
      body="Self-tape deadlines, recall times and contracts to sign — sorted by what needs you next, so nothing slips."
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <IconBadge tone="bg-lime"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M3 9h18M8 14h4" /></svg></IconBadge>
            <Name>Tracker</Name><Tag>Live</Tag>
          </div>
        </div>
      }>
      <Panel size="lg" background="var(--panel-forest)" stripes="dark">
        <FloatFrame size="lg" onDark>
          <div className="flex flex-col gap-1 px-4 pb-3.5 pt-[18px] sm:px-[22px] sm:pt-[22px]">
            <div className="hiw-item mb-2 flex items-baseline justify-between">
              <span className="whitespace-nowrap font-display text-[20px] font-bold sm:text-[24px]">Your castings</span>
              <span className="whitespace-nowrap text-[13px] text-muted">This week</span>
            </div>
            <ul>
              {castings.map((c, i) => (
                <li key={c.title} style={{ '--i': i + 1 } as React.CSSProperties} className="hiw-item flex items-center justify-between gap-3 border-t border-line-soft py-3">
                  <div className="min-w-0"><p className="truncate text-[15px] font-semibold">{c.title}</p><p className="truncate text-[13px] text-muted">{c.detail}</p></div>
                  <span className={cx('shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold', STATUS[c.status][1])}>{STATUS[c.status][0]}</span>
                </li>
              ))}
            </ul>
          </div>
        </FloatFrame>
        <div className="hiw-pop absolute bottom-[22px] right-[22px] hidden items-center gap-2.5 rounded-[18px] bg-surface py-2.5 pl-2.5 pr-4 text-ink shadow-[0_16px_32px_-12px_rgb(0_0_0/0.45)] sm:flex">
          <span className="flex size-8 items-center justify-center rounded-[10px] bg-lime"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span>
          <span className="text-[14px] font-semibold">You’re booked!</span>
        </div>
      </Panel>
    </FeatureCard>
  )
}

const ATTACH_ICON: Record<Application['attachments'][number]['kind'], React.ReactNode> = {
  reel: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" style={{ fill: 'var(--forest)' }}><path d="M7 5v14l12-7z" /></svg>,
  cv: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z" /><path d="M14 3v6h6" /></svg>,
  tape: <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2"><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3" /></svg>,
}

export function QuickApplyCard({ application, sendHref = '/start?role=performer' }: { application: Application; sendHref?: string }) {
  return (
    <FeatureCard size="lg" title="Apply in a tap"
      body="Your reel, CV and self-tape go with every application — straight to the casting director, no email chains."
      header={
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <IconBadge tone="bg-forest"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--lime)' }} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg></IconBadge>
            <Name>Quick apply</Name><Tag>New</Tag>
          </div>
        </div>
      }>
      <Panel size="lg" background="var(--panel-lime)" stripes="light">
        <FloatFrame size="lg">
          <div className="flex flex-col gap-3.5 p-4 sm:p-[22px]">
            <div className="hiw-item flex items-center gap-3">
              <span className="w-[34px] shrink-0 text-[15px] text-muted">To:</span>
              <span className="inline-flex min-w-0 items-center gap-2 rounded-[12px] border border-line-strong py-1.5 pl-1.5 pr-3 text-[15px] font-medium">
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded-full bg-blossom text-[11px] font-bold">{application.to.initials}</span><span className="truncate">{application.to.name}</span>
              </span>
            </div>
            <div style={{ '--i': 1 } as React.CSSProperties} className="hiw-item flex items-center gap-3">
              <span className="w-[34px] shrink-0 text-[15px] text-muted">Role:</span>
              <span className="truncate text-[15px] font-semibold">{application.role}</span>
            </div>
            <div className="h-px bg-line-soft" />
            <ul className="flex flex-wrap gap-2">
              {application.attachments.map((a, i) => <li key={a.label} style={{ '--i': i + 2 } as React.CSSProperties} className="hiw-item inline-flex items-center gap-1.5 rounded-[10px] bg-bg px-3 py-2 text-[13px] font-medium">{ATTACH_ICON[a.kind]}{a.label}</li>)}
            </ul>
            <Link href={sendHref} style={{ '--i': 5 } as React.CSSProperties} className="hiw-item flex min-h-12 items-center justify-center gap-2 rounded-[14px] bg-forest text-[16px] font-semibold text-bg transition-colors duration-300 hover:bg-ink">Send application</Link>
          </div>
        </FloatFrame>
      </Panel>
    </FeatureCard>
  )
}

export function GoalsCard({ goals }: { goals: Goal[] }) {
  return (
    <FeatureCard size="sm" title="Goals that stick" body="Set classes, reels and headshots as goals and watch your profile get stronger."
      header={<div className="flex items-center justify-between">
        <IconBadge tone="bg-blossom"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" style={{ fill: 'var(--forest)' }} /></svg></IconBadge>
      </div>}>
      <Panel size="sm" background="var(--panel-butter)" stripes="light">
        <FloatFrame size="sm">
          <ul className="flex flex-col gap-3">
            {goals.map((g, i) => (
              <li key={g.label} style={{ '--i': i } as React.CSSProperties} className="hiw-item">
                <div className="mb-1.5 flex justify-between text-[14px]"><span className="font-medium">{g.label}</span><span className="text-muted">{g.percent}%</span></div>
                <div className="h-2 rounded-full bg-line-soft" role="progressbar" aria-label={g.label} aria-valuenow={g.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="hiw-grow h-2 rounded-full bg-forest" style={{ width: g.percent + '%', animationDelay: 300 + i * 120 + 'ms' }} />
                </div>
              </li>
            ))}
          </ul>
        </FloatFrame>
      </Panel>
    </FeatureCard>
  )
}

export function DiaryCard({ diary }: { diary: Diary }) {
  return (
    <FeatureCard size="sm" title="Your diary, your rules" body="Show casters when you’re free, and only get roles that fit your week."
      header={<div className="flex items-center justify-between">
        <IconBadge tone="bg-mint"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg></IconBadge>
      </div>}>
      <Panel size="sm" background="var(--panel-mint)" stripes="light">
        <FloatFrame size="sm">
          <div className="flex flex-col gap-3">
            <div className="hiw-item"><DiaryToggle initial={diary.openToTours} /></div>
            <ul className="flex flex-col gap-3">
              {diary.days.map((d, i) => (
                <li key={d.day} style={{ '--i': i + 1 } as React.CSSProperties} className="hiw-item flex items-center gap-3">
                  <span className={cx('flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold', d.free ? 'bg-forest text-lime' : 'bg-line-soft text-muted')}>{d.day}</span>
                  <span className={cx('text-[16px]', d.free ? 'font-semibold' : 'text-muted')}>{d.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </FloatFrame>
      </Panel>
    </FeatureCard>
  )
}

const STAT_TONE: Record<Stat['tone'], string> = { raised: 'bg-forest-raised text-bg', butter: 'bg-butter text-ink', mint: 'bg-mint text-ink', lime: 'bg-lime text-ink' }

export function StatsCard({ stats }: { stats: Stat[] }) {
  return (
    <FeatureCard size="sm" dark title="Your month at a glance" body="See what’s working — and where to push next."
      header={<div className="flex items-center justify-between">
        <IconBadge tone="bg-lime"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--forest)' }} strokeWidth="2.2" strokeLinecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg></IconBadge>
      </div>}>
      <dl className="mt-3 grid h-[280px] grid-cols-2 gap-2.5">
        <Replay>
        {stats.map((s, i) => (
          <div key={s.label} style={{ '--i': i } as React.CSSProperties} className={cx('hiw-tile flex flex-col-reverse justify-between rounded-[18px] p-[18px]', STAT_TONE[s.tone])}>
            <dt className="text-[15px] font-medium">{s.label}</dt>
            <dd className="font-display text-[44px] font-extrabold leading-none">{s.value}</dd>
          </div>
        ))}
        </Replay>
      </dl>
    </FeatureCard>
  )
}
