'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import JobBody from '@/components/rc/JobBody'
import { Button, Empty, PageLoading, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, closesLabel, loadPosters, type Job } from '@/lib/rc/jobs'
import { jobTitle } from '@/lib/rc/pipeline'
import { PENDING_NEXT_KEY } from '@/lib/rc/me'
import { PublicTopBar } from '@/components/rc/PublicBoard'

// A listing anyone can open (shared links, the public board). Members are sent to the in-app version.
export default function PublicJobPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) router.replace('/find/' + id) })
  }, [id, router])

  const { data, loading } = useAsync(async () => {
    const { data: job } = await supabase.from('jobs').select(JOB_SELECT).eq('id', id).eq('is_published', true).maybeSingle()
    if (!job) return null
    const j = job as unknown as Job
    const [posters, { count }] = await Promise.all([
      loadPosters([j.created_by]),
      j.created_by ? supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('created_by', j.created_by).eq('is_published', true) : Promise.resolve({ count: 0 }),
    ])
    return { j, poster: posters.get(j.created_by || ''), posted: count || 0 }
  }, [id])

  const apply = () => {
    try { localStorage.setItem(PENDING_NEXT_KEY, '/find/' + id) } catch { /* private mode */ }
    router.push('/welcome?side=perform')
  }
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: data ? jobTitle(data.j) : 'The Ident', url: window.location.href })
      else { await navigator.clipboard.writeText(window.location.href); toast('Link copied') }
    } catch { /* dismissed */ }
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <PublicTopBar />
      <div className="mx-auto max-w-[720px] px-4 pb-32">
        <div className="mt-2 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-green-ink"><Icon name="chevron-left" className="size-4" /> All roles</Link>
          <button type="button" onClick={share} aria-label="Share" className="inline-flex size-10 items-center justify-center rounded-full hover:bg-chip"><Icon name="share" className="size-5" /></button>
        </div>
        {loading ? <PageLoading /> : !data ? (
          <div className="pt-12"><Empty icon="briefcase" title="This listing isn’t available" sub="It may have closed or been removed." action={<Button size="sm" variant="dark" href="/">See all roles</Button>} /></div>
        ) : <JobBody j={data.j} poster={data.poster} posted={data.posted} />}
      </div>
      {data && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto flex max-w-[720px] items-center gap-3">
            <p className="hidden flex-1 text-sm text-muted sm:block">Free for performers. Apply with your profile in two taps.</p>
            {closesLabel(data.j) === 'Closed'
              ? <Button size="lg" variant="outline" className="flex-1 sm:flex-none" disabled>Applications closed</Button>
              : <Button size="lg" className="flex-1 sm:flex-none" trailingIcon="arrow-right" onClick={apply}>{data.j.is_side_hustle ? 'I’m interested' : 'Apply on The Ident'}</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
