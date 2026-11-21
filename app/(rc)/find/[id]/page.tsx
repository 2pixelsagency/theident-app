'use client'

import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Empty, PageLoading, Pill, cx, toast, useGoBack } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, closesLabel, loadPosters, type Job } from '@/lib/rc/jobs'
import { STAGE_META, jobTitle, stageOf } from '@/lib/rc/pipeline'
import JobBody from '@/components/rc/JobBody'


export default function JobDetailPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const router = useRouter()
  const goBack = useGoBack('/find')
  const me = useMe()

  const { data, loading, mutate } = useAsync(async () => {
    const { data: job } = await supabase.from('jobs').select(JOB_SELECT).eq('id', jobId).maybeSingle()
    if (!job) return null
    const j = job as unknown as Job
    const [posters, { data: saved }, { data: app }, { count: posted }] = await Promise.all([
      loadPosters([j.created_by]),
      supabase.from('saved_jobs').select('job_id, list').eq('profile_id', me.id).eq('job_id', jobId).maybeSingle(),
      supabase.from('applications').select('id, status, outcome').eq('job_id', jobId).eq('profile_id', me.id).maybeSingle(),
      j.created_by ? supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('created_by', j.created_by).eq('is_published', true) : Promise.resolve({ count: 0 }),
    ])
    return { job: j, poster: posters.get(j.created_by || ''), saved: saved?.list === 'saved', app: app as { id: string; status: string; outcome: string | null } | null, posted: posted || 0 }
  }, [jobId, me.id])

  if (loading) return <PageLoading />
  if (!data) return <><BackHeader title="Job" back="/find" /><div className="pt-10"><Empty icon="briefcase" title="This listing isn’t available" sub="It may have closed or been removed." action={<Button size="sm" variant="dark" href="/find">Back to Find</Button>} /></div></>

  const { job: j, poster, saved, app, posted } = data
  const closes = closesLabel(j)
  const mine = j.created_by === me.id

  const toggleSave = async () => {
    mutate(d => d && { ...d, saved: !saved })
    const { error } = saved
      ? await supabase.from('saved_jobs').delete().eq('profile_id', me.id).eq('job_id', j.id)
      : await supabase.from('saved_jobs').upsert({ profile_id: me.id, job_id: j.id, list: 'saved' }, { onConflict: 'profile_id,job_id' })
    if (error) { mutate(d => d && { ...d, saved }); toast('Couldn’t update saved jobs') }
  }

  const share = async () => {
    const url = window.location.href
    try {
      if (navigator.share) await navigator.share({ title: jobTitle(j), url })
      else { await navigator.clipboard.writeText(url); toast('Link copied') }
    } catch { /* share sheet dismissed */ }
  }

  const apply = () => {
    if (j.application_method === 'email' && j.application_email) { window.location.href = 'mailto:' + j.application_email + '?subject=' + encodeURIComponent('Application: ' + jobTitle(j)); return }
    if (j.application_method === 'link' && j.submission_link) { window.open(j.submission_link, '_blank', 'noopener'); return }
    router.push('/find/' + j.id + '/apply')
  }

  const roundBtn = 'inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card'

  return (
    <>
      <div className="relative h-40 bg-hero">
        <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
          <button type="button" aria-label="Back" onClick={goBack} className={roundBtn}><Icon name="chevron-left" /></button>
          <div className="flex gap-2">
            <button type="button" aria-label={saved ? 'Remove from saved' : 'Save job'} aria-pressed={saved} onClick={toggleSave} className={cx(roundBtn, saved && 'text-green')}><Icon name="bookmark" className={cx('size-5', saved && 'fill-current')} /></button>
            <button type="button" aria-label="Share" onClick={share} className={roundBtn}><Icon name="share" className="size-5" /></button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-32">
        <JobBody j={j} poster={poster} posted={posted} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] md:max-w-[640px] lg:left-[76px] lg:max-w-[760px] gap-3 border-t border-line bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={toggleSave} aria-label={saved ? 'Remove from saved' : 'Save job'} className={cx('inline-flex size-14 shrink-0 items-center justify-center rounded-[10px] border border-line', saved && 'text-green')}>
          <Icon name="bookmark" className={cx('size-5', saved && 'fill-current')} />
        </button>
        {mine ? <Button size="lg" variant="dark" className="flex-1" href={'/postings/' + j.id}>Review submissions</Button>
          : app ? (
            <Button size="lg" variant="outline" className="flex-1" href={'/castings?focus=' + app.id}>
              <Pill tone={STAGE_META[stageOf({ status: app.status as never, outcome: app.outcome })].tone}>{STAGE_META[stageOf({ status: app.status as never, outcome: app.outcome })].label}</Pill> Track application
            </Button>
          ) : j.is_demo && !me.profile?.is_demo ? <Button size="lg" variant="outline" className="flex-1" disabled>Demo listing</Button>
          : closes === 'Closed' ? <Button size="lg" variant="outline" className="flex-1" disabled>Applications closed</Button>
          : <Button size="lg" className="flex-1" trailingIcon="arrow-right" onClick={apply}>{j.is_side_hustle ? 'I’m interested' : 'Apply now'}</Button>}
      </div>
    </>
  )
}
