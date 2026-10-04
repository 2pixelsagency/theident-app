'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { VerifiedTick } from '@/components/rc/JobCard'
import { AvatarPile, Button, Empty, PageHeader, PageLoading, Pill, TabChips, cx, type Tone } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { closesLabel, type Job } from '@/lib/rc/jobs'
import { fullName, toISODate } from '@/lib/rc/format'
import { jobTitle } from '@/lib/rc/pipeline'

type Status = 'open' | 'shortlisting' | 'closed' | 'pending'
type Row = Pick<Job, 'id' | 'is_side_hustle' | 'project_in' | 'project_role' | 'job_title' | 'production_company' | 'application_deadline' | 'end_date' | 'is_published' | 'created_at' | 'production_types'>
type Sub = { id: string; job_id: string; shortlisted: boolean; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null } | null }

const STATUS: Record<Status, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'green' },
  shortlisting: { label: 'Shortlisting', tone: 'pencil' },
  closed: { label: 'Closed', tone: 'neutral' },
  pending: { label: 'Pending review', tone: 'amber' },
}

function statusOf(j: Row, today: string): Status {
  if (!j.is_published) return 'pending'
  if (j.end_date && j.end_date < today) return 'closed'
  if (j.application_deadline && j.application_deadline < today) return 'shortlisting'
  return 'open'
}

export default function PostingsPage() {
  const { id, profile } = useMe()
  const [tab, setTab] = useState<'open' | 'shortlisting' | 'closed'>('open')
  const today = toISODate(new Date())

  const { data, loading } = useAsync(async () => {
    const { data: jobs } = await supabase.from('jobs').select('id, is_side_hustle, project_in, project_role, job_title, production_company, application_deadline, end_date, is_published, created_at, production_types(name)').eq('created_by', id).order('created_at', { ascending: false })
    const rows = (jobs || []) as unknown as Row[]
    let subs: Sub[] = []
    if (rows.length) {
      const { data: a } = await supabase.from('applications').select('id, job_id, shortlisted, profiles(first_name, last_name, picture_url)').in('job_id', rows.map(r => r.id)).is('outcome', null)
      subs = (a || []) as unknown as Sub[]
    }
    return { rows, subs }
  }, [id])

  const grouped = useMemo(() => {
    const g: Record<'open' | 'shortlisting' | 'closed', Row[]> = { open: [], shortlisting: [], closed: [] }
    for (const r of data?.rows || []) {
      const s = statusOf(r, today)
      g[s === 'pending' ? 'open' : s].push(r)
    }
    return g
  }, [data, today])

  return (
    <>
      <PageHeader title="Your postings" />
      <div className="px-4 pb-8">
        <Button variant="dark" size="lg" full icon="plus" href="/postings/new">Post a job</Button>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Link href="/postings/new" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-medium"><span className="size-2 rounded-full bg-green" /> Casting role</Link>
          <Link href="/postings/new?type=side" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-sm font-medium"><span className="size-2 rounded-full bg-purple" /> Side hustle</Link>
        </div>

        <div className="mt-5"><TabChips value={tab} onChange={setTab} options={[{ value: 'open', label: 'Open', count: grouped.open.length }, { value: 'shortlisting', label: 'Shortlisting', count: grouped.shortlisting.length }, { value: 'closed', label: 'Closed', count: grouped.closed.length }]} /></div>

        {loading ? <PageLoading /> : grouped[tab].length === 0 ? (
          <Empty icon="megaphone" title={tab === 'open' ? 'Nothing open right now' : 'Nothing here'} sub={tab === 'open' ? 'Post a casting role or side hustle — submissions land here.' : undefined} />
        ) : (
          <ul className="mt-3 space-y-3">
            {grouped[tab].map(j => {
              const st = statusOf(j, today)
              const subs = (data?.subs || []).filter(s => s.job_id === j.id)
              const closes = closesLabel(j as Job)
              return (
                <li key={j.id}>
                  <Link href={'/postings/' + j.id} className={cx('block rounded-[var(--radius)] border border-line p-4 shadow-card', st === 'closed' ? 'bg-surface/50 text-faint' : 'bg-surface')}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[17px] font-medium">{jobTitle(j)} {profile?.is_verified && !j.is_side_hustle && st !== 'closed' && <VerifiedTick />}</p>
                        <p className="text-[13px] text-muted">{[j.is_side_hustle ? 'Side hustle' : j.production_types?.name, st === 'closed' ? 'cast complete' : closes?.toLowerCase()].filter(Boolean).join(' · ')}</p>
                      </div>
                      <Pill tone={STATUS[st].tone}>{STATUS[st].label}</Pill>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <p><span className="text-[30px] font-medium leading-none">{subs.length}</span> <span className="text-sm text-muted">submission{subs.length === 1 ? '' : 's'}</span></p>
                      <span className="flex items-center gap-2">
                        <AvatarPile people={subs.map(s => ({ id: s.id, name: fullName(s.profiles), src: s.profiles?.picture_url }))} />
                        <Icon name="chevron-right" className="size-4 text-faint" />
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

