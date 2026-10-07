'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import JobCard from '@/components/rc/JobCard'
import SwipeRow from '@/components/rc/SwipeRow'
import { Button, Chip, Empty, Field, PageHeader, PageLoading, SearchField, Segmented, Sheet, TabChips, Toggle, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, jobMatchesQuery, loadPosters, skillsOf, type Job } from '@/lib/rc/jobs'
import { NO_FILTERS, PAY_UNITS, ROLE_TYPES, activeCount, applyFilters, experienceOf, optionsFrom, typeOf, type JobFilters } from '@/lib/rc/jobFilters'
import { toISODate } from '@/lib/rc/format'

type Tab = 'roles' | 'side'
type View = 'all' | 'saved' | 'later'
type Sort = 'newest' | 'closing' | 'pay'
type List = 'saved' | 'later'

export default function FindPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { id } = useMe()
  const tab: Tab = params.get('tab') === 'side' ? 'side' : 'roles'
  const [q, setQ] = useState('')
  const [view, setView] = useState<View>('all')
  const [sort, setSort] = useState<Sort>('newest')
  const [filters, setFilters] = useState<JobFilters>(NO_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const { data, loading, mutate } = useAsync(async () => {
    const today = toISODate(new Date())
    const [{ data: jobs }, { data: lists }, { data: types }] = await Promise.all([
      supabase.from('jobs').select(JOB_SELECT).eq('is_published', true).eq('is_side_hustle', tab === 'side')
        .or('application_deadline.is.null,application_deadline.gte.' + today).order('created_at', { ascending: false }).limit(300),
      supabase.from('saved_jobs').select('job_id, list').eq('profile_id', id),
      supabase.from('production_types').select('name').order('name'),
    ])
    const list = (jobs || []) as unknown as Job[]
    const posters = await loadPosters(list.map(j => j.created_by))
    return {
      jobs: list, posters,
      lists: new Map((lists || []).map(s => [s.job_id as string, (s.list as List) || 'saved'])),
      productionTypes: (types || []).map(t => t.name as string),
    }
  }, [tab, id])

  const jobs = useMemo(() => data?.jobs || [], [data])
  const listOf = (jobId: string) => data?.lists.get(jobId)
  const savedCount = jobs.filter(j => listOf(j.id) === 'saved').length
  const laterCount = jobs.filter(j => listOf(j.id) === 'later').length

  const shown = useMemo(() => {
    let list = applyFilters(jobs.filter(j => jobMatchesQuery(j, q)), filters)
    list = list.filter(j => {
      const l = data?.lists.get(j.id)
      return view === 'all' ? l !== 'later' : l === view
    })
    if (sort === 'closing') list = [...list].sort((a, b) => (a.application_deadline || '9999').localeCompare(b.application_deadline || '9999'))
    if (sort === 'pay') list = [...list].sort((a, b) => Number(b.pay_amount || 0) - Number(a.pay_amount || 0))
    return list
  }, [jobs, data, q, filters, sort, view])

  // Filter choices come from what's actually listed (production types: the full list for roles)
  const options = useMemo(() => ({
    types: tab === 'side' ? optionsFrom(jobs, typeOf) : uniqueCaseless([...optionsFrom(jobs, typeOf, 50), ...(data?.productionTypes || [])]),
    experience: optionsFrom(jobs, experienceOf),
    commitment: optionsFrom(jobs, j => j.commitment_level),
    gender: optionsFrom(jobs, j => j.gender_requirement),
    skills: optionsFrom(jobs, skillsOf, 20),
    roleTypes: ROLE_TYPES.filter(r => tab === 'roles' || r.value === 'dancer' || r.value === 'presenter'),
  }), [jobs, data, tab])

  const active = activeCount(filters)
  const setF = <K extends keyof JobFilters>(k: K, v: JobFilters[K]) => setFilters(f => ({ ...f, [k]: v }))
  const toggleIn = (k: 'types' | 'roleTypes' | 'experience' | 'commitment' | 'gender' | 'skills', v: string) =>
    setFilters(f => ({ ...f, [k]: f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v] }))

  // Move a job between the feed, Saved and Later (null = back to the feed)
  const moveTo = async (jobId: string, list: List | null, msg?: string) => {
    const prev = data?.lists.get(jobId)
    mutate(d => { if (!d) return d; const m = new Map(d.lists); if (list) m.set(jobId, list); else m.delete(jobId); return { ...d, lists: m } })
    const { error } = !list
      ? await supabase.from('saved_jobs').delete().eq('profile_id', id).eq('job_id', jobId)
      : prev
        ? await supabase.from('saved_jobs').update({ list }).eq('profile_id', id).eq('job_id', jobId)
        : await supabase.from('saved_jobs').insert({ profile_id: id, job_id: jobId, list })
    if (error) {
      mutate(d => { if (!d) return d; const m = new Map(d.lists); if (prev) m.set(jobId, prev); else m.delete(jobId); return { ...d, lists: m } })
      toast('Couldn’t update that')
    } else if (msg) toast(msg)
  }

  const swipeFor = (j: Job) => {
    const l = listOf(j.id)
    const right = l === 'saved'
      ? { label: 'Unsave', icon: 'bookmark', tone: 'neutral' as const, run: () => moveTo(j.id, null, 'Removed from saved') }
      : { label: 'Save', icon: 'bookmark', tone: 'green' as const, run: () => moveTo(j.id, 'saved', 'Saved to your shortlist') }
    const left = l === 'later'
      ? { label: 'Back to feed', icon: 'arrow-right', tone: 'neutral' as const, run: () => moveTo(j.id, null, 'Back in your feed') }
      : { label: 'Later', icon: 'clock', tone: 'amber' as const, run: () => moveTo(j.id, 'later', 'Moved to Later') }
    return { right, left }
  }

  const setTab = (t: Tab) => { setFilters(NO_FILTERS); setView('all'); router.replace(t === 'side' ? '/find?tab=side' : '/find') }
  const quick: { label: string; on: boolean; toggle: () => void }[] = [
    { label: 'Paid', on: filters.paidOnly, toggle: () => setF('paidOnly', !filters.paidOnly) },
    { label: 'Fair pay', on: filters.fairOnly, toggle: () => setF('fairOnly', !filters.fairOnly) },
    { label: 'Closing this week', on: filters.closingWithin === 7, toggle: () => setF('closingWithin', filters.closingWithin === 7 ? 0 : 7) },
  ]
  const noun = tab === 'side' ? 'side hustles' : 'roles'

  return (
    <>
      <PageHeader title="Find jobs" />
      <div className="px-4 pb-24">
        <Segmented value={tab} onChange={setTab} options={[{ value: 'roles', label: 'Roles' }, { value: 'side', label: 'Side hustles' }]} />
        <div className="mt-4"><SearchField value={q} onChange={setQ} placeholder={tab === 'side' ? 'Teaching, promo, modelling, events…' : 'Search roles, skills, locations…'} /></div>

        <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip selected={active > 0} onClick={() => setShowFilters(true)}><Icon name="sliders" className="size-4" /> More filters{active > 0 ? ' · ' + active : ''}</Chip>
          {quick.map(c => <Chip key={c.label} selected={c.on} onClick={c.toggle}>{c.label}</Chip>)}
        </div>

        {tab === 'side' && view === 'all' && (
          <Link href="/postings/new?type=side" className="mt-4 flex items-center gap-3 rounded-[var(--radius)] bg-accent p-4 text-ink">
            <span className="flex size-11 items-center justify-center rounded-xl bg-surface/50"><Icon name="plus" className="size-5" /></span>
            <span className="flex-1">
              <span className="block text-[16px] font-medium">Post a side hustle</span>
              <span className="block text-[13px] text-ink/75">Hiring a teacher, dancer or helper? List it free.</span>
            </span>
            <Icon name="chevron-right" className="size-5" />
          </Link>
        )}

        <div className="mt-4">
          <TabChips value={view} onChange={setView} options={[
            { value: 'all', label: 'All' },
            { value: 'saved', label: 'Saved', count: savedCount },
            { value: 'later', label: 'Later', count: laterCount },
          ]} />
        </div>

        <div className="mb-3 mt-3 flex items-center justify-between text-sm">
          <span className="text-muted"><span className="font-medium text-ink">{shown.length.toLocaleString('en-GB')}</span> {noun}</span>
          <label className="relative flex items-center gap-1 font-medium text-green-ink">
            <select value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort" className="cursor-pointer appearance-none bg-transparent pr-4 outline-none">
              <option value="newest">Newest</option>
              <option value="closing">Closing soon</option>
              <option value="pay">Highest pay</option>
            </select>
            <Icon name="chevron-down" className="pointer-events-none absolute right-0 size-3.5" />
          </label>
        </div>
        {shown.length > 0 && <p className="-mt-1 mb-3 text-xs text-faint">Swipe right to save · left for later</p>}

        {loading ? <PageLoading /> : shown.length === 0 ? (
          <Empty icon={view === 'later' ? 'clock' : view === 'saved' ? 'bookmark' : 'search'}
            title={view === 'later' ? 'Nothing saved for later' : view === 'saved' ? 'No saved jobs yet' : 'No matches'}
            sub={view === 'later' ? 'Swipe a job left to park it here and come back to it.' : view === 'saved' ? 'Swipe a job right to add it to your shortlist.' : q || active ? 'Try a different search or clear your filters.' : 'New listings appear here as soon as they’re approved.'}
            action={active ? <Button size="sm" variant="outline" onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button> : undefined} />
        ) : (
          <ul className="space-y-3">
            {shown.map(j => {
              const { right, left } = swipeFor(j)
              return (
                <SwipeRow key={j.id} right={right} left={left}>
                  <JobCard bare job={j} poster={data?.posters.get(j.created_by || '')} saved={listOf(j.id) === 'saved'}
                    onToggleSave={() => (listOf(j.id) === 'saved' ? moveTo(j.id, null) : moveTo(j.id, 'saved', 'Saved'))} />
                </SwipeRow>
              )
            })}
          </ul>
        )}
      </div>

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="More filters">
        <div className="space-y-6">
          <Field label="Location" icon="pin" value={filters.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. London, Leeds, UK tour" />

          <ChipGroup title={tab === 'side' ? 'Category' : 'Production type'} values={options.types} selected={filters.types} onToggle={v => toggleIn('types', v)} />

          {options.roleTypes.length > 0 && (
            <div>
              <p className="mb-2 text-[13px] font-medium">Role type</p>
              <div className="flex flex-wrap gap-2">{options.roleTypes.map(r => <Chip key={r.value} selected={filters.roleTypes.includes(r.value)} onClick={() => toggleIn('roleTypes', r.value)}>{r.label}</Chip>)}</div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[13px] font-medium">Pay</p>
            <div className="flex flex-wrap gap-2">{PAY_UNITS.map(u => <Chip key={u.value} selected={filters.payUnit === u.value} onClick={() => setF('payUnit', u.value)}>{u.value ? 'Per ' + u.label.toLowerCase() : u.label}</Chip>)}</div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Min £" inputMode="decimal" value={filters.payMin} onChange={e => setF('payMin', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Any" />
              <Field label="Max £" inputMode="decimal" value={filters.payMax} onChange={e => setF('payMax', e.target.value.replace(/[^\d.]/g, ''))} placeholder="Any" />
            </div>
            <div className="mt-3 divide-y divide-line rounded-[var(--radius)] border border-line bg-surface">
              {([['paidOnly', 'Paid only', 'Hide unpaid and pay-unknown listings'], ['fairOnly', 'Fair pay only', 'At or above the industry minimum']] as const).map(([key, title, sub]) => (
                <div key={key} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1"><p className="text-[15px] font-medium">{title}</p><p className="text-[13px] text-muted">{sub}</p></div>
                  <Toggle checked={filters[key]} onChange={v => setF(key, v)} label={title} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium">Dates — starts between</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" type="date" value={filters.startFrom} onChange={e => setF('startFrom', e.target.value)} />
              <Field label="To" type="date" value={filters.startTo} onChange={e => setF('startTo', e.target.value)} />
            </div>
            <p className="mb-2 mt-4 text-[13px] font-medium">Applications close</p>
            <div className="flex flex-wrap gap-2">
              {[[0, 'Any time'], [7, 'This week'], [14, 'In 2 weeks'], [30, 'This month']].map(([d, l]) => <Chip key={d} selected={filters.closingWithin === d} onClick={() => setF('closingWithin', d as number)}>{l}</Chip>)}
            </div>
          </div>

          <ChipGroup title="Experience" values={options.experience} selected={filters.experience} onToggle={v => toggleIn('experience', v)} />
          <ChipGroup title="Commitment" values={options.commitment} selected={filters.commitment} onToggle={v => toggleIn('commitment', v)} />
          <ChipGroup title="Gender" values={options.gender} selected={filters.gender} onToggle={v => toggleIn('gender', v)} />
          <ChipGroup title="Skills" values={options.skills} selected={filters.skills} onToggle={v => toggleIn('skills', v)} />

          <div className="sticky -bottom-6 -mx-4 flex gap-3 border-t border-line bg-bg px-4 pb-6 pt-3">
            <Button variant="outline" className="flex-1" onClick={() => setFilters(NO_FILTERS)}>Clear all</Button>
            <Button className="flex-[2]" onClick={() => setShowFilters(false)}>Show {shown.length} {noun}</Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}

// "Feature film" and "Feature Film" are the same option
function uniqueCaseless(list: string[]) {
  const seen = new Set<string>()
  return list.filter(v => { const k = v.trim().toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

function ChipGroup({ title, values, selected, onToggle }: { title: string; values: string[]; selected: string[]; onToggle: (v: string) => void }) {
  if (!values.length) return null
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium">{title}</p>
      <div className="flex flex-wrap gap-2">{values.map(v => <Chip key={v} selected={selected.includes(v)} onClick={() => onToggle(v)}>{v}</Chip>)}</div>
    </div>
  )
}
