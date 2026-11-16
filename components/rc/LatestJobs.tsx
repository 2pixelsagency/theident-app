'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import JobCard from '@/components/rc/JobCard'
import { Empty } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, loadPosters, type Job } from '@/lib/rc/jobs'
import { toISODate } from '@/lib/rc/format'

// "What's happening": every live role, newest first, updating as new ones are published
export default function LatestJobs({ limit = 6, title = 'Latest jobs' }: { limit?: number; title?: string }) {
  const { data, loading, mutate } = useAsync(async () => {
    const today = toISODate(new Date())
    const [{ data: jobs }, { count }] = await Promise.all([
      supabase.from('jobs').select(JOB_SELECT).eq('is_published', true).or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(limit),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('is_published', true).or('application_deadline.is.null,application_deadline.gte.' + today),
    ])
    const list = (jobs || []) as unknown as Job[]
    return { jobs: list, total: count || list.length, posters: await loadPosters(list.map(j => j.created_by)), fresh: new Set<string>() }
  }, [limit])

  useEffect(() => {
    const ch = supabase.channel('latest-jobs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, async payload => {
        const row = payload.new as { id?: string; is_published?: boolean }
        if (!row?.id || !row.is_published) return
        const { data: job } = await supabase.from('jobs').select(JOB_SELECT).eq('id', row.id).maybeSingle()
        if (!job) return
        const j = job as unknown as Job
        const posters = await loadPosters([j.created_by])
        mutate(d => d && d.jobs.some(x => x.id === j.id) ? d : d && {
          ...d, jobs: [j, ...d.jobs].slice(0, limit), total: d.total + 1,
          posters: new Map([...d.posters, ...posters]), fresh: new Set([...d.fresh, j.id]),
        })
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [limit, mutate])

  return (
    <section>
      <div className="mb-3 mt-6 flex items-end justify-between">
        <h2 className="flex items-center gap-2 text-[18px]">
          {title}
          <span className="inline-flex items-center gap-1 rounded-full bg-lime/60 px-2 py-0.5 text-[11px] font-semibold text-ink"><span className="size-1.5 animate-pulse rounded-full bg-forest" /> Live</span>
        </h2>
        <Link href="/find" className="text-sm font-semibold text-green-ink">{data ? 'All ' + data.total : 'See all'}</Link>
      </div>
      {loading || !data ? <div className="h-40 animate-pulse rounded-[var(--radius)] bg-chip" /> : data.jobs.length === 0 ? (
        <Empty icon="briefcase" title="No live roles right now" sub="New roles appear here the moment they’re posted." />
      ) : (
        <ul className="space-y-3">
          {data.jobs.map(j => (
            <div key={j.id} className={data.fresh.has(j.id) ? 'animate-[rc-step-in_.4s_ease-out]' : undefined}>
              <JobCard job={j} poster={data.posters.get(j.created_by || '')} />
            </div>
          ))}
        </ul>
      )}
    </section>
  )
}
