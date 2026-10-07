'use client'

import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { FairPayBadge, VerifiedTick } from '@/components/rc/JobCard'
import { Avatar, Button, Card, Empty, PageLoading, Pill, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { JOB_SELECT, closesLabel, lengthLabel, loadPosters, posterName, skillsOf, type Job } from '@/lib/rc/jobs'
import { ago, fmtDate } from '@/lib/rc/format'
import { payLabel } from '@/lib/rc/pay'
import { STAGE_META, jobTitle, stageOf } from '@/lib/rc/pipeline'

const MATERIAL: Record<string, { icon: string; label: string }> = {
  showreel: { icon: 'video', label: 'Showreel' },
  self_tape: { icon: 'play', label: 'Self-tape' },
  headshots: { icon: 'image', label: 'Headshots' },
  cv: { icon: 'file', label: 'CV' },
}

export default function JobDetailPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const router = useRouter()
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
  if (!data) return <div className="pt-16"><Empty icon="briefcase" title="This listing isn’t available" sub="It may have closed or been removed." action={<Button size="sm" variant="dark" href="/find">Back to Find</Button>} /></div>

  const { job: j, poster, saved, app, posted } = data
  const pay = payLabel(j)
  const length = lengthLabel(j)
  const closes = closesLabel(j)
  const skills = skillsOf(j)
  const mine = j.created_by === me.id
  const materials = (j.submit_materials || ['showreel']).filter(m => MATERIAL[m])
  const lookingFor = [j.age_range && 'Playing age ' + j.age_range, j.gender_requirement, ...skills].filter(Boolean) as string[]
  const tiles = ([
    [j.is_side_hustle ? 'Category' : 'Contract', j.is_side_hustle ? j.job_category : [j.production_types?.name, length].filter(Boolean).join(' · ')],
    [j.is_side_hustle ? 'When' : 'Where', j.is_side_hustle ? j.schedule || j.commitment_level : j.location],
    ['Starts', j.start_date ? fmtDate(j.start_date, { month: 'short', year: 'numeric' }) : j.contract_dates],
    ['Closes', closes ? closes.replace('Closes ', '') : 'Open'],
  ] as const).filter(([, v]) => !!v)

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
          <button type="button" aria-label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push('/find'))} className={roundBtn}><Icon name="chevron-left" /></button>
          <div className="flex gap-2">
            <button type="button" aria-label={saved ? 'Remove from saved' : 'Save job'} aria-pressed={saved} onClick={toggleSave} className={cx(roundBtn, saved && 'text-green')}><Icon name="bookmark" className={cx('size-5', saved && 'fill-current')} /></button>
            <button type="button" aria-label="Share" onClick={share} className={roundBtn}><Icon name="share" className="size-5" /></button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-32">
        <h1 className="mt-5 flex items-center gap-2 text-[24px]">{jobTitle(j)} {poster?.is_verified && <VerifiedTick className="size-5" />}</h1>
        <p className="mt-1 text-sm text-muted">{posterName(j, poster)} · posted {ago(j.created_at)}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {pay && <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">{pay}</span>}
          {length && <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">{length}</span>}
          {j.location && <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] font-medium">{j.location}</span>}
          <FairPayBadge job={j} />
        </div>

        {tiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {tiles.map(([k, v]) => <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-[15px] font-medium">{v}</p></Card>)}
          </div>
        )}

        {(j.description || j.short_summary) && (
          <>
            <h2 className="mb-2 mt-6 text-[18px]">The brief</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{j.description || j.short_summary}</p>
          </>
        )}

        {lookingFor.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Who they’re looking for</h2>
            <div className="flex flex-wrap gap-2">{lookingFor.map(t => <span key={t} className="rounded-full bg-green-tint px-3 py-1.5 text-[13px] text-green-ink">{t}</span>)}</div>
            {j.appearance_notes && <p className="mt-3 text-sm text-muted">{j.appearance_notes}</p>}
          </>
        )}

        {!j.is_side_hustle && materials.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">What to submit</h2>
            <div className="grid grid-cols-2 gap-3">
              {materials.map(m => <Card key={m} className="flex items-center gap-2 px-4 py-3 text-sm font-medium"><Icon name={MATERIAL[m].icon} className="size-[18px]" />{MATERIAL[m].label}</Card>)}
            </div>
            {j.requires_nda && <p className="mt-3 flex items-center gap-2 text-sm text-muted"><Icon name="lock" className="size-4" /> You’ll sign an NDA when you apply</p>}
          </>
        )}

        <Card className="mt-6 flex items-center gap-3 p-4">
          <Avatar src={poster?.picture_url} name={posterName(j, poster)} size={48} className="rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[15px] font-medium">{posterName(j, poster)} {poster?.is_verified && <VerifiedTick className="size-4" />}</p>
            <p className="text-[13px] text-muted">{poster?.is_verified ? 'Verified employer' : 'Community post'} · {posted} role{posted === 1 ? '' : 's'} posted</p>
          </div>
        </Card>
        {!poster?.is_verified && j.is_side_hustle && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-tint px-4 py-3 text-[13px] text-amber"><Icon name="alert" className="mt-0.5 size-4 shrink-0" /> Community post — not a verified employer. Meet somewhere public and never pay to apply.</p>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] md:max-w-[640px] lg:left-64 lg:max-w-[720px] gap-3 border-t border-line bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
        <button type="button" onClick={toggleSave} aria-label={saved ? 'Remove from saved' : 'Save job'} className={cx('inline-flex size-14 shrink-0 items-center justify-center rounded-[14px] border border-line', saved && 'text-green')}>
          <Icon name="bookmark" className={cx('size-5', saved && 'fill-current')} />
        </button>
        {mine ? <Button size="lg" variant="dark" className="flex-1" href={'/postings/' + j.id}>Review submissions</Button>
          : app ? (
            <Button size="lg" variant="outline" className="flex-1" href={'/castings?focus=' + app.id}>
              <Pill tone={STAGE_META[stageOf({ status: app.status as never, outcome: app.outcome })].tone}>{STAGE_META[stageOf({ status: app.status as never, outcome: app.outcome })].label}</Pill> Track application
            </Button>
          ) : closes === 'Closed' ? <Button size="lg" variant="outline" className="flex-1" disabled>Applications closed</Button>
          : <Button size="lg" className="flex-1" trailingIcon="arrow-right" onClick={apply}>{j.is_side_hustle ? 'I’m interested' : 'Apply now'}</Button>}
      </div>
    </>
  )
}
