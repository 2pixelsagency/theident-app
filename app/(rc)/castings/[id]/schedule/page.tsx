'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Card, Empty, IconButton, PageLoading, cx } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtTimeOfDay, toISODate, weekDays } from '@/lib/rc/format'

type Entry = { id: string; title: string; description: string | null; start_date: string; start_time: string | null; location: string | null; event_type: string | null }

// This week on a contract: one card per day from the performer's diary entries
export default function SchedulePage() {
  const { id: appId } = useParams<{ id: string }>()
  const { id } = useMe()
  const days = weekDays()
  const { data, loading } = useAsync(async () => {
    const { data: app } = await supabase.from('applications').select('job_id, jobs(project_in, project_role, production_company, location)').eq('id', appId).eq('profile_id', id).maybeSingle()
    const nextWeekEnd = new Date(days[6]); nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)
    const { data: cal } = await supabase.from('calendar_events').select('id, title, description, start_date, start_time, location, event_type')
      .eq('profile_id', id).gte('start_date', toISODate(days[0])).lte('start_date', toISODate(nextWeekEnd)).order('start_date').order('start_time')
    return { app: app as unknown as { job_id: string; jobs: { project_in: string | null; project_role: string | null; production_company: string | null; location: string | null } | null } | null, cal: (cal || []) as Entry[] }
  }, [appId, id])

  if (loading || !data) return <><BackHeader title="Schedule" /><PageLoading /></>
  const job = data.app?.jobs
  const thisWeek = data.cal.filter(e => e.start_date <= toISODate(days[6]))
  const venue = thisWeek.find(e => e.location)?.location || job?.location || ''
  const nextWeek = data.cal.find(e => e.start_date > toISODate(days[6]) && e.location && e.location !== venue)
  const today = toISODate(new Date())

  return (
    <>
      <BackHeader title="Schedule" right={<IconButton icon="plus" label="Add to diary" href="/diary" />} />
      <div className="px-4 pb-8">
        <div className="rounded-[var(--radius)] bg-dark p-5 text-white">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-white/60">This week · {job?.project_in || job?.production_company || 'Your contract'}</p>
          <p className="mt-1 text-[20px] font-medium">{venue || 'Venue to be confirmed'}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={venue ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(venue) : undefined} target="_blank" rel="noopener noreferrer"
              className={cx('flex h-11 items-center justify-center gap-2 rounded-xl bg-green text-sm font-medium', !venue && 'pointer-events-none opacity-50')}>
              <Icon name="pin" className="size-[18px]" /> Directions
            </a>
            <Link href="/digs" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-dark-2 text-sm font-medium"><Icon name="house" className="size-[18px]" /> Find digs</Link>
          </div>
        </div>

        {thisWeek.length === 0 ? (
          <Card className="mt-4"><Empty icon="calendar" title="No calls in your diary this week" sub="Add shows, rehearsals and travel days to your diary and they’ll appear here." /></Card>
        ) : (
          <ul className="mt-4 space-y-3">
            {days.map(d => {
              const key = toISODate(d)
              const entries = thisWeek.filter(e => e.start_date === key)
              const isToday = key === today
              const off = entries.length === 0
              return (
                <li key={key} className={cx('flex items-center gap-4 rounded-[var(--radius)] p-4', off ? 'border border-dashed border-line text-faint' : 'border bg-surface shadow-card', isToday ? 'border-2 border-green' : !off && 'border-line')}>
                  <span className="w-10 text-center">
                    <span className={cx('block text-[11px] uppercase', isToday ? 'font-medium text-green-ink' : 'text-faint')}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                    <span className="block text-[20px] font-medium">{d.getDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    {off ? <span className="text-[15px]">Day off</span> : (
                      <>
                        <span className="block truncate text-[15px] font-medium text-ink">{entries.map(e => e.title + (e.start_time ? ' · ' + fmtTimeOfDay(e.start_time) : '')).join(' · ')}</span>
                        <span className="block truncate text-[13px] text-muted">{entries[0].description || entries[0].location || ''}</span>
                      </>
                    )}
                  </span>
                  {isToday && <span className="rounded-md bg-green-tint px-2 py-1 text-[11px] font-medium uppercase text-green-ink">Today</span>}
                </li>
              )
            })}
          </ul>
        )}

        {nextWeek?.location && (
          <Link href="/digs" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-tint text-purple-ink"><Icon name="pin" /></span>
            <span className="flex-1"><span className="block text-[15px] font-medium">Next week · {nextWeek.location}</span><span className="block text-[13px] text-muted">Book your digs early</span></span>
            <Icon name="chevron-right" className="size-4 text-faint" />
          </Link>
        )}
      </div>
    </>
  )
}
