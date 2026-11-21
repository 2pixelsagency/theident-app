'use client'

import JobCard from '@/components/rc/JobCard'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, loadPosters, type Job } from '@/lib/rc/jobs'
import { toISODate } from '@/lib/rc/format'

// A live slice of the job board for the marketing homepage
export default function LiveRoles({ limit = 6 }: { limit?: number }) {
  const { data } = useAsync(async () => {
    const today = toISODate(new Date())
    const { data: jobs } = await supabase.from('jobs').select(JOB_SELECT).eq('is_published', true).eq('is_side_hustle', false)
      .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(limit)
    const list = (jobs || []) as unknown as Job[]
    return { jobs: list, posters: await loadPosters(list.map(j => j.created_by)) }
  }, [limit])
  if (!data) return <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[118px] animate-pulse rounded-[var(--radius)] bg-chip" />)}</div>
  return <ul className="grid gap-3 md:grid-cols-2">{data.jobs.map(j => <JobCard key={j.id} job={j} poster={data.posters.get(j.created_by || '')} href={'/jobs/' + j.id} />)}</ul>
}
