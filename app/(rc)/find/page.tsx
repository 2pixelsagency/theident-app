'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import JobCard from '@/components/rc/JobCard'
import { Button, Chip, Empty, Field, PageHeader, PageLoading, SearchField, Segmented, Sheet, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, jobMatchesQuery, loadPosters, type Job } from '@/lib/rc/jobs'
import { fairPay } from '@/lib/rc/pay'
import { toISODate } from '@/lib/rc/format'

type Tab = 'roles' | 'side'
type Sort = 'newest' | 'closing' | 'pay'
type Filters = { location: string; categories: string[]; paidOnly: boolean; fairOnly: boolean; savedOnly: boolean }
const NO_FILTERS: Filters = { location: '', categories: [], paidOnly: false, fairOnly: false, savedOnly: false }

export default function FindPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { id } = useMe()
  const tab: Tab = params.get('tab') === 'side' ? 'side' : 'roles'
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const { data, loading, mutate } = useAsync(async () => {
    const today = toISODate(new Date())
    const [{ data: jobs }, { data: saved }] = await Promise.all([
      supabase.from('jobs').select(JOB_SELECT).eq('is_published', true).eq('is_side_hustle', tab === 'side')
        .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(200),
      supabase.from('saved_jobs').select('job_id').eq('profile_id', id),
    ])
    const list = (jobs || []) as unknown as Job[]
    const posters = await loadPosters(list.map(j => j.created_by))
    return { jobs: list, posters, saved: new Set((saved || []).map(s => s.job_id as string)) }
  }, [tab, id])

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const j of data?.jobs || []) { const c = tab === 'side' ? j.job_category : j.production_types?.name; if (c) set.add(c) }
    return Array.from(set).sort()
  }, [data, tab])

  const shown = useMemo(() => {
    let list = (data?.jobs || []).filter(j => jobMatchesQuery(j, q))
    if (filters.location.trim()) list = list.filter(j => (j.location || '').toLowerCase().includes(filters.location.trim().toLowerCase()))
    if (filters.categories.length) list = list.filter(j => filters.categories.includes((tab === 'side' ? j.job_category : j.production_types?.name) || ''))
    if (filters.paidOnly) list = list.filter(j => j.is_paid !== false && (j.pay_amount != null || !!j.salary))
    if (filters.fairOnly) list = list.filter(j => fairPay(j) === 'fair')
    if (filters.savedOnly) list = list.filter(j => data?.saved.has(j.id))
    if (sort === 'closing') list = [...list].sort((a, b) => (a.application_deadline || '9999').localeCompare(b.application_deadline || '9999'))
    if (sort === 'pay') list = [...list].sort((a, b) => Number(b.pay_amount || 0) - Number(a.pay_amount || 0))
    return list
  }, [data, q, filters, sort, tab])

  const activeFilters = (filters.location ? 1 : 0) + filters.categories.length + (filters.paidOnly ? 1 : 0) + (filters.fairOnly ? 1 : 0) + (filters.savedOnly ? 1 : 0)

  const toggleSave = async (jobId: string) => {
    const isSaved = data?.saved.has(jobId)
    mutate(d => { if (!d) return d; const s = new Set(d.saved); if (isSaved) s.delete(jobId); else s.add(jobId); return { ...d, saved: s } })
    const { error } = isSaved
      ? await supabase.from('saved_jobs').delete().eq('profile_id', id).eq('job_id', jobId)
      : await supabase.from('saved_jobs').insert({ profile_id: id, job_id: jobId })
    if (error) toast('Couldn’t update saved jobs')
    else if (!isSaved) toast('Saved')
  }

  const setTab = (t: Tab) => { setFilters(NO_FILTERS); router.replace(t === 'side' ? '/find?tab=side' : '/find') }

  return (
    <>
      <PageHeader title="Find jobs" />
      <div className="px-4 pb-24">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'roles', label: 'Roles' }, { value: 'side', label: 'Side hustles' }]} />
        <div className="mt-4"><SearchField value={q} onChange={setQ} placeholder={tab === 'side' ? 'Teaching, promo, modelling, events…' : 'Search roles, skills, locations…'} /></div>

        {tab === 'side' && (
          <Link href="/postings/new?type=side" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] bg-accent p-4 text-ink">
            <span className="flex size-11 items-center justify-center rounded-xl bg-surface/50"><Icon name="plus" className="size-5" /></span>
            <span className="flex-1">
              <span className="block text-[16px] font-medium">Post a side hustle</span>
              <span className="block text-[13px] text-ink/75">Hiring a teacher, dancer or helper? List it free.</span>
            </span>
            <Icon name="chevron-right" className="size-5" />
          </Link>
        )}

        <div className="mb-3 mt-4 flex items-center justify-between text-sm">
          <span className="text-muted"><span className="font-medium text-ink">{shown.length.toLocaleString('en-GB')}</span> {tab === 'side' ? 'side hustles' : 'roles'}</span>
          <label className="relative flex items-center gap-1 font-medium text-green-ink">
            <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort" className="cursor-pointer appearance-none bg-transparent pr-4 outline-none">
              <option value="newest">Newest</option>
              <option value="closing">Closing soon</option>
              <option value="pay">Highest pay</option>
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute right-0 size-3.5" />
          </label>
        </div>

        {loading ? <PageLoading /> : shown.length === 0 ? (
          <Empty icon="search" title="No matches" sub={q || activeFilters ? 'Try a different search or clear your filters.' : 'New listings appear here as soon as they’re approved.'}
            action={activeFilters ? <Button size="sm" variant="outline" onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button> : undefined} />
        ) : (
          <ul className="space-y-3">
            {shown.map(j => <JobCard key={j.id} job={j} poster={data?.posters.get(j.created_by || '')} saved={data?.saved.has(j.id)} onToggleSave={() => toggleSave(j.id)} />)}
          </ul>
        )}
      </div>

      <button type="button" onClick={() => setShowFilters(true)}
        className="fixed bottom-24 left-1/2 z-30 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-dark px-6 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)]">
        <Icon name="filter" className="size-[18px]" /> Filters
        {activeFilters > 0 && <span className="flex size-6 items-center justify-center rounded-full bg-green text-xs">{activeFilters}</span>}
      </button>

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <div className="space-y-5">
          <Field label="Location" icon="pin" value={filters.location} onChange={e => setFilters(f => ({ ...f, location: e.target.value }))} placeholder="e.g. London, Leeds, tour" />
          {categories.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium">{tab === 'side' ? 'Category' : 'Type'}</p>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => <Chip key={c} selected={filters.categories.includes(c)} onClick={() => setFilters(f => ({ ...f, categories: f.categories.includes(c) ? f.categories.filter(x => x !== c) : [...f.categories, c] }))}>{c}</Chip>)}
              </div>
            </div>
          )}
          <div className="divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
            {([['paidOnly', 'Paid only', 'Hide unpaid and pay-unknown listings'], ['fairOnly', 'Fair pay only', 'At or above the industry minimum'], ['savedOnly', 'Saved only', 'Just the ones you’ve bookmarked']] as const).map(([key, title, sub]) => (
              <div key={key} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1"><p className="text-[15px] font-medium">{title}</p><p className="text-[13px] text-muted">{sub}</p></div>
                <Toggle checked={filters[key]} onChange={v => setFilters(f => ({ ...f, [key]: v }))} label={title} />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className={cx('flex-1')} onClick={() => setFilters(NO_FILTERS)}>Clear</Button>
            <Button className="flex-[2]" onClick={() => setShowFilters(false)}>Show {shown.length} {tab === 'side' ? 'side hustles' : 'roles'}</Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
