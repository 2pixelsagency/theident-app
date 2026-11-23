'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Avatar, BackHeader, Button, Card, Empty, PageLoading, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { ProductionChatCard } from '@/components/rc/CastInvite'
import { fullName, toISODate } from '@/lib/rc/format'
import RecallForm, { type RecallPatch } from '@/components/rc/RecallForm'
import { CASTER_APP_SELECT, casterStage, setStage, stageNote, type CasterApp, type CasterStage } from '@/lib/rc/casting'
import { craftTag } from '@/lib/rc/talent'
import { jobTitle } from '@/lib/rc/pipeline'
import QuickReview, { Stars, videosOf, type AppFile, type Note } from '@/components/rc/QuickReview'

type Person = { first_name: string | null; last_name: string | null; picture_url: string | null; location: string | null; what_i_do: string | null; is_graduate: boolean; graduate_year: number | null }
type Row = CasterApp & { profiles: Person | null }
type Move = { ids: string[]; label: string; before: Row[] }

const STAGES: { key: Exclude<CasterStage, 'no'>; label: string }[] = [
  { key: 'review', label: 'To review' }, { key: 'shortlist', label: 'Shortlist' }, { key: 'recall', label: 'Recall' }, { key: 'booked', label: 'Booked' },
]

export default function CastingReviewPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const { id: uid } = useMe()
  const [stage, setStageTab] = useState<CasterStage>('review')
  const [view, setView] = useState<'grid' | 'deck'>('grid')
  const [selected, setSelected] = useState<string[]>([])
  const [lastMove, setLastMove] = useState<Move | null>(null)
  const [manage, setManage] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [recallFor, setRecallFor] = useState<string[] | null>(null)
  const [q, setQ] = useState('')
  const [onlyVideo, setOnlyVideo] = useState(false)
  const [minStars, setMinStars] = useState(0)
  const [sort, setSort] = useState<'newest' | 'rating'>('newest')
  const [review, setReview] = useState<{ rows: Row[]; index: number } | null>(null)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: job }, { data: apps }] = await Promise.all([
      supabase.from('jobs').select('id, project_in, project_role, job_title, is_side_hustle, production_company, application_deadline, created_by').eq('id', jobId).maybeSingle(),
      supabase.from('applications').select(CASTER_APP_SELECT + ', profiles(first_name, last_name, picture_url, location, what_i_do, is_graduate, graduate_year)').eq('job_id', jobId).order('created_at', { ascending: false }),
    ])
    const list = (apps || []) as unknown as Row[]
    const ids = list.map(a => a.id)
    const [{ data: files }, { data: notes }] = ids.length ? await Promise.all([
      supabase.from('application_files').select('application_id, file_url, file_type, file_name').in('application_id', ids),
      supabase.from('applicant_notes').select('application_id, rating, note').in('application_id', ids),
    ]) : [{ data: [] }, { data: [] }]
    const byApp = new Map<string, AppFile[]>()
    for (const f of (files || []) as AppFile[]) byApp.set(f.application_id, [...(byApp.get(f.application_id) || []), f])
    return { job, apps: list, files: byApp, notes: new Map(((notes || []) as Note[]).map(n => [n.application_id, n])) }
  }, [jobId])

  const counts = useMemo(() => {
    const c: Record<CasterStage, number> = { review: 0, shortlist: 0, recall: 0, booked: 0, no: 0 }
    for (const a of data?.apps || []) c[casterStage(a)]++
    return c
  }, [data])

  if (loading) return <><BackHeader title="Review" /><PageLoading /></>
  if (!data?.job || data.job.created_by !== uid) return <><BackHeader title="Review" /><Empty icon="lock" title="Only the poster can review submissions" /></>

  const { job, apps } = data
  const ratingOf = (id: string) => data.notes.get(id)?.rating || 0
  const hasVideo = (id: string) => videosOf(data.files.get(id) || []).length > 0
  const needle = q.trim().toLowerCase()
  const shown = apps
    .filter(a => casterStage(a) === stage)
    .filter(a => !needle || [fullName(a.profiles), a.profiles?.location, a.profiles?.what_i_do].join(' ').toLowerCase().includes(needle))
    .filter(a => !onlyVideo || hasVideo(a.id))
    .filter(a => ratingOf(a.id) >= minStars)
    .sort((a, b) => (sort === 'rating' ? ratingOf(b.id) - ratingOf(a.id) : 0) || b.created_at.localeCompare(a.created_at))
  const filtering = !!needle || onlyVideo || minStars > 0
  const title = jobTitle(job)

  const apply = async (ids: string[], patch: Partial<CasterApp> & { next_step_note?: string | null }, label: string) => {
    if (!ids.length) return
    const before = apps.filter(a => ids.includes(a.id))
    mutate(d => d && { ...d, apps: d.apps.map(a => ids.includes(a.id) ? { ...a, ...patch } : a) })
    setSelected([])
    const { error } = await supabase.from('applications').update(patch).in('id', ids)
    if (error) { toast('Couldn’t update — try again'); mutate(d => d && { ...d, apps: d.apps.map(a => before.find(b => b.id === a.id) || a) }); return }
    setLastMove({ ids, label, before })
  }

  const undo = async () => {
    if (!lastMove) return
    const prev = lastMove
    setLastMove(null)
    mutate(d => d && { ...d, apps: d.apps.map(a => prev.before.find(b => b.id === a.id) || a) })
    await Promise.all(prev.before.map(b => setStage(b.id, { status: b.status, outcome: b.outcome, shortlisted: b.shortlisted, due_at: b.due_at, recall_kind: b.recall_kind ?? null, meeting_url: b.meeting_url ?? null })))
  }

  const inAWeek = () => { const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(18, 0, 0, 0); return d.toISOString() }
  const shortlist = (ids: string[]) => apply(ids, { shortlisted: true }, 'moved to Shortlist')
  const requestTape = (ids: string[]) => apply(ids, { status: 'audition', shortlisted: true, due_at: inAWeek() }, 'asked for a self-tape')
  const moveToNo = (ids: string[]) => apply(ids, { outcome: 'declined' }, 'moved to No — they’ll get a kind “not this time” note')
  // Recall opens a sheet: another tape, a video call (with link) or in person
  const recall = (ids: string[]) => setRecallFor(ids)
  const sendRecall = async (patch: RecallPatch) => {
    const ids = recallFor || []
    setRecallFor(null)
    await apply(ids, patch, patch.recall_kind === 'self_tape' ? 'asked for another tape' : patch.recall_kind === 'video_call' ? 'sent a video call invite' : 'invited to recall')
  }
  const reviewActions = (id: string) => {
    const a = apps.find(x => x.id === id)
    const st = a ? casterStage(a) : 'review'
    const out: { label: string; icon: string; onClick: () => void; tone?: 'primary' | 'no' }[] = []
    if (st === 'review') out.push({ label: 'Shortlist', icon: 'heart', tone: 'primary', onClick: () => shortlist([id]) })
    if (st === 'review' || st === 'shortlist') out.push({ label: 'Self-tape', icon: 'video', onClick: () => requestTape([id]) })
    if (st === 'shortlist') out.push({ label: 'Recall', icon: 'calendar', tone: 'primary', onClick: () => recall([id]) })
    if (st !== 'no' && st !== 'booked') out.push({ label: 'No', icon: 'x', tone: 'no', onClick: () => moveToNo([id]) })
    return out
  }
  const nameOf = (ids: string[]) => ids.length === 1 ? fullName(apps.find(a => a.id === ids[0])?.profiles) : ids.length + ' people'

  const closeApplications = async () => {
    const y = new Date(); y.setDate(y.getDate() - 1)
    const { error } = await supabase.from('jobs').update({ application_deadline: toISODate(y) }).eq('id', job.id)
    setManage(false)
    toast(error ? 'Couldn’t close applications' : 'Applications closed')
  }

  return (
    <>
      <BackHeader title={job.project_in || title} right={<><button type="button" onClick={() => setManage(true)} aria-label="Manage posting" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-chip"><Icon name="more" /></button></>} />
      <div className="px-4 pb-28">
        <p className="-mt-1 mb-4 text-sm text-muted">{[job.project_in ? job.project_role : null, apps.length + ' applicant' + (apps.length === 1 ? '' : 's')].filter(Boolean).join(' · ')}</p>
        {/* Stage stepper */}
        <Card className="flex items-center px-1 py-4">
          {STAGES.map((s, i) => (
            <div key={s.key} className="flex flex-1 items-center">
              <button type="button" onClick={() => { setStageTab(s.key); setSelected([]) }} aria-pressed={stage === s.key}
                className={cx('flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1', stage === s.key ? 'text-ink' : 'text-faint')}>
                <span className={cx('text-[20px] title', stage === s.key && s.key !== 'review' && 'text-green-ink')}>{counts[s.key]}</span>
                <span className={cx('mt-0.5 text-[12px]', stage === s.key && 'border-b-2 border-green pb-0.5 font-semibold text-ink')}>{s.label}</span>
              </button>
              {i < STAGES.length - 1 && <Icon name="chevron-right" className="size-3.5 text-faint" />}
            </div>
          ))}
        </Card>

        {apps.length > 0 && <>
        <div className="mt-5 flex items-center gap-2">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search applicants" aria-label="Search applicants"
            className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-field px-4 text-[15px] outline-none focus:border-green focus:bg-surface" />
          <button type="button" onClick={() => setShowFilters(v => !v)} aria-pressed={showFilters || filtering} aria-label="Filters"
            className={cx('relative inline-flex size-11 shrink-0 items-center justify-center rounded-xl border', showFilters || filtering ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>
            <Icon name="filter" className="size-[18px]" />
          </button>
          <button type="button" onClick={() => setView(v => (v === 'grid' ? 'deck' : 'grid'))} aria-label={view === 'grid' ? 'Swipe through one by one' : 'Show as grid'}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface">
            <Icon name={view === 'grid' ? 'layers' : 'grid'} className="size-[18px]" />
          </button>
        </div>
        {(showFilters || filtering) && (
          <div className="scrollbar-none -mx-4 mt-2 flex gap-2 overflow-x-auto px-4">
            <FilterChip on={onlyVideo} onClick={() => setOnlyVideo(v => !v)} icon="play" label="Has reel or tape" />
            <FilterChip on={minStars === 3} onClick={() => setMinStars(v => (v === 3 ? 0 : 3))} icon="star" label="3★ +" />
            <FilterChip on={minStars === 4} onClick={() => setMinStars(v => (v === 4 ? 0 : 4))} icon="star" label="4★ +" />
            <FilterChip on={sort === 'rating'} onClick={() => setSort(v => (v === 'rating' ? 'newest' : 'rating'))} icon="trending" label="Top rated first" />
            {filtering && <button type="button" onClick={() => { setQ(''); setOnlyVideo(false); setMinStars(0) }} className="shrink-0 px-2 text-sm font-medium text-green-ink">Clear</button>}
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">{shown.length} {STAGES.find(x => x.key === stage)?.label.toLowerCase() || 'here'}{counts.no > 0 && <> · <button type="button" className="underline" onClick={() => setStageTab('no')}>{counts.no} no</button></>}</span>
          {view === 'grid' && shown.length > 0 && stage !== 'no' && stage !== 'booked' && (
            <button type="button" className="font-semibold text-green-ink" onClick={() => setSelected(selected.length ? [] : shown.map(x => x.id))}>{selected.length ? 'Clear selection' : 'Select all'}</button>
          )}
        </div>
        </>}

        {lastMove && (
          <div className="mt-3 flex items-center justify-between rounded-[var(--radius)] border border-line bg-surface px-4 py-3 text-sm shadow-card">
            <span><span className="font-medium">{nameOf(lastMove.ids)}</span> {lastMove.label}</span>
            <button type="button" onClick={undo} className="flex items-center gap-1 rounded-full bg-green-tint px-3 py-1.5 font-medium text-green-ink"><Icon name="chevron-left" className="size-4" /> Undo</button>
          </div>
        )}

        {shown.length === 0 ? (
          filtering
          ? <Empty icon="filter" title="No one matches these filters" sub="Clear a filter to see everyone in this stage." />
          : <Empty icon="users" title={stage === 'review' ? 'All caught up' : 'No one here yet'} sub={stage === 'review' ? 'New submissions land here.' : undefined} />
        ) : view === 'deck' ? (
          <Deck key={stage} rows={shown} onYes={id => (stage === 'review' ? shortlist([id]) : requestTape([id]))} onNo={id => moveToNo([id])} yesLabel={stage === 'review' ? 'Shortlist' : 'Self-tape'} />
        ) : (
          <>
            {selected.length > 0 && stage !== 'no' && stage !== 'booked' && (
              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:pl-[76px]">
                <div className="mx-auto max-w-[720px]">
                  <p className="mb-2 text-sm font-semibold">{selected.length} selected</p>
                  <div className="scrollbar-none flex gap-2 overflow-x-auto">
                    {stage === 'review' && <BulkChip icon="heart" label="Shortlist" onClick={() => shortlist(selected)} disabled={false} tone />}
                    {stage === 'shortlist' && <BulkChip icon="calendar" label="Recall" onClick={() => recall(selected)} disabled={false} tone />}
                    <BulkChip icon="video" label="Ask for self-tape" onClick={() => requestTape(selected)} disabled={false} />
                    <BulkChip icon="x" label="No" onClick={() => moveToNo(selected)} disabled={false} />
                  </div>
                </div>
              </div>
            )}
            <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {shown.map(a => {
                const on = selected.includes(a.id)
                const p = a.profiles
                return (
                  <li key={a.id} className={cx('relative overflow-hidden rounded-[var(--radius)] border-2 bg-surface shadow-card', on ? 'border-green' : 'border-transparent')}>
                    <button type="button" onClick={() => setReview({ rows: shown, index: shown.indexOf(a) })} className="block w-full text-left">
                      <span className="block aspect-[4/3.4] bg-chip">
                        {p?.picture_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={p.picture_url} alt={fullName(p) + ' headshot'} loading="lazy" className="size-full object-cover" />
                          : <span className="flex size-full items-center justify-center"><Avatar name={fullName(p)} size={56} /></span>}
                      </span>
                      <span className="block p-3">
                        <span className="block truncate text-sm font-medium">{fullName(p)}</span>
                        <span className="block truncate text-xs text-muted">{stage === 'review' ? [p?.location, p && craftTag(p)].filter(Boolean).join(' · ') : stageNote(a)}</span>
                        {ratingOf(a.id) > 0 && <span className="mt-1 block"><Stars value={ratingOf(a.id)} size="size-3.5" /></span>}
                      </span>
                    </button>
                    {hasVideo(a.id) && <span className="pointer-events-none absolute bottom-[4.25rem] right-2 inline-flex items-center gap-1 rounded-full bg-dark/70 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur"><Icon name="play" className="size-3 fill-current" /> Reel</span>}
                    {stage !== 'booked' && stage !== 'no' && (
                      <button type="button" aria-label={on ? 'Deselect' : 'Select'} aria-pressed={on} onClick={() => setSelected(l => on ? l.filter(x => x !== a.id) : [...l, a.id])}
                        className={cx('absolute left-2 top-2 flex size-7 items-center justify-center rounded-lg border-2', on ? 'border-green bg-green text-white' : 'border-white/90 bg-white/60')}>
                        {on && <Icon name="check" className="size-4" strokeWidth={2.6} />}
                      </button>
                    )}
                    {p?.is_graduate && <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-ink"><Icon name="graduation-cap" className="size-3" />Grad</span>}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <QuickReview rows={review?.rows || []} index={review?.index ?? null} files={data.files} notes={data.notes}
        onIndex={i => setReview(r => r && { ...r, index: i })} onClose={() => setReview(null)}
        onNote={n => mutate(d => d && { ...d, notes: new Map(d.notes).set(n.application_id, n) })} actions={reviewActions} />

      <Sheet open={!!recallFor} onClose={() => setRecallFor(null)} title={'Recall ' + (recallFor ? nameOf(recallFor) : '')}>
        {recallFor && <RecallForm key={recallFor.join()} who={recallFor.length === 1 ? (apps.find(a => a.id === recallFor[0])?.profiles?.first_name || 'them') : 'everyone'} onSubmit={sendRecall} />}
      </Sheet>
      <Sheet open={manage} onClose={() => setManage(false)} title="Manage posting">
        <div className="space-y-3">
          <ProductionChatCard jobId={job.id} canCreate title={job.project_in || title} />
          <Button variant="outline" full href={'/find/' + job.id}>View public listing</Button>
          <Button variant="outline" full onClick={closeApplications}>Close applications</Button>
        </div>
      </Sheet>
    </>
  )
}

function FilterChip({ on, onClick, icon, label }: { on: boolean; onClick: () => void; icon: string; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on}
      className={cx('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition', on ? 'border-forest bg-forest text-white' : 'border-line bg-surface')}>
      <Icon name={icon} className="size-3.5" /> {label}
    </button>
  )
}

function BulkChip({ icon, label, onClick, disabled, tone }: { icon: string; label: string; onClick: () => void; disabled: boolean; tone?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cx('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition disabled:opacity-50', tone ? 'border-transparent bg-green-tint text-green-ink' : 'border-line bg-surface')}>
      <Icon name={icon} className="size-4" /> {label}
    </button>
  )
}

// Swipeable deck of applicant cards: right = yes, left = no
function Deck({ rows: initial, onYes, onNo, yesLabel }: { rows: Row[]; onYes: (id: string) => void; onNo: (id: string) => void; yesLabel: string }) {
  // Snapshot the queue: decisions move people out of this stage, which would otherwise skip cards
  const [rows] = useState(initial)
  const [index, setIndex] = useState(0)
  const [dx, setDx] = useState(0)
  const start = useRef<number | null>(null)
  const row = rows[index]
  if (!row) return <Empty icon="check-circle" title="That’s everyone" sub="Switch back to the grid to see your decisions." />
  const p = row.profiles

  const decide = (yes: boolean) => {
    if (yes) onYes(row.id); else onNo(row.id)
    setDx(0)
    setIndex(i => i + 1)
  }

  return (
    <div className="mt-4">
      <div
        className="relative aspect-[3/4] touch-pan-y select-none overflow-hidden rounded-[10px] bg-dark text-white shadow-card transition-transform"
        style={{ transform: `translateX(${dx}px) rotate(${dx / 25}deg)` }}
        onPointerDown={e => { start.current = e.clientX }}
        onPointerMove={e => { if (start.current != null) setDx(e.clientX - start.current) }}
        onPointerUp={() => { start.current = null; if (Math.abs(dx) > 110) decide(dx > 0); else setDx(0) }}
        onPointerCancel={() => { start.current = null; setDx(0) }}
      >
        {p?.picture_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.picture_url} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center bg-hero"><Avatar name={fullName(p)} size={110} /></div>}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-dark to-transparent" />
        {dx > 40 && <span className="absolute left-5 top-5 rounded-lg border-2 border-green px-3 py-1 text-lg font-medium text-green">{yesLabel.toUpperCase()}</span>}
        {dx < -40 && <span className="absolute right-5 top-5 rounded-lg border-2 border-pink px-3 py-1 text-lg font-medium text-pink">NO</span>}
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-[26px] font-display">{fullName(p)}</p>
          <p className="text-sm text-white/75">{[p?.location, p && craftTag(p)].filter(Boolean).join(' · ')}</p>
          {row.cover_note && <p className="mt-2 line-clamp-2 text-sm text-white/85">“{row.cover_note}”</p>}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        <button type="button" onClick={() => decide(false)} aria-label="No" className="flex size-14 items-center justify-center rounded-full border border-line bg-surface text-red shadow-card"><Icon name="x" className="size-6" /></button>
        <Link href={'/talent/' + row.profile_id + '?app=' + row.id} className="flex h-12 items-center rounded-full border border-line bg-surface px-5 text-sm font-medium shadow-card">Open profile</Link>
        <button type="button" onClick={() => decide(true)} aria-label={yesLabel} className="flex size-14 items-center justify-center rounded-full bg-green text-white shadow-card"><Icon name="heart" className="size-6" /></button>
      </div>
      <p className="mt-3 text-center text-xs text-muted">{index + 1} of {rows.length} · swipe right to {yesLabel.toLowerCase()}, left for no</p>
    </div>
  )
}
