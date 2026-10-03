'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import CastingActionSheet from '@/components/rc/CastingActionSheet'
import { Avatar, Card, Empty, PageLoading, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { CASTER_APP_SELECT, casterStage, nextStep, setStage, stageNote, type CasterApp } from '@/lib/rc/casting'
import { TALENT_SELECT, craftTag, graduateLabel, messageOrConnect, playingAge, type Talent } from '@/lib/rc/talent'
import { jobTitle } from '@/lib/rc/pipeline'

type Reel = { id: string; label: string | null; url: string }
type Credit = { id: string; title: string | null; role: string | null; year: number | null; production_company: string | null; director: string | null }

export default function TalentProfilePage() {
  const { id: talentId } = useParams<{ id: string }>()
  const appParam = useSearchParams().get('app')
  const router = useRouter()
  const me = useMe()
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: t }, { data: reels }, { data: skills }, { data: credits }, { data: count }] = await Promise.all([
      supabase.from('profiles').select(TALENT_SELECT).eq('id', talentId).maybeSingle(),
      supabase.from('reels').select('id, label, url').eq('profile_id', talentId).order('sort_order'),
      supabase.from('profile_skills').select('skills(name)').eq('profile_id', talentId),
      supabase.from('credits').select('id, title, role, year, production_company, director').eq('profile_id', talentId).order('year', { ascending: false }).limit(6),
      supabase.rpc('shortlist_count', { pid: talentId }),
    ])
    // Casting relationship with this person across my postings
    let apps: (CasterApp & { jobs: { project_in: string | null; project_role: string | null; job_title: string | null; is_side_hustle: boolean; production_company: string | null } | null })[] = []
    let postings: { id: string; title: string }[] = []
    if (me.role === 'caster') {
      const { data: mine } = await supabase.from('jobs').select('id, project_in, project_role, job_title, is_side_hustle, production_company').eq('created_by', me.id).eq('is_published', true).order('created_at', { ascending: false })
      postings = (mine || []).map(j => ({ id: j.id, title: jobTitle(j) }))
      if (mine?.length) {
        const { data: a } = await supabase.from('applications').select(CASTER_APP_SELECT + ', jobs(project_in, project_role, job_title, is_side_hustle, production_company)').eq('profile_id', talentId).in('job_id', mine.map(j => j.id)).order('updated_at', { ascending: false })
        apps = (a || []) as unknown as typeof apps
      }
    }
    return {
      talent: t as Talent | null,
      reels: (reels || []) as Reel[],
      skills: (skills || []).map(s => (s as unknown as { skills: { name: string } | null }).skills?.name).filter((s): s is string => !!s),
      credits: (credits || []) as Credit[],
      shortlists: (count as number | null) ?? 0,
      apps,
      postings,
    }
  }, [talentId, me.id, me.role])

  if (loading) return <PageLoading />
  if (!data?.talent) return <div className="pt-16"><Empty icon="user" title="Profile not found" /></div>

  const { talent: t, reels, skills, credits, shortlists, apps, postings } = data
  const app = apps.find(a => a.id === appParam) || apps.find(a => !a.outcome) || null
  const step = nextStep(app)
  const name = fullName(t)
  const craft = craftTag(t)
  const grad = graduateLabel(t)
  const facts = [playingAge(t) && 'Playing age ' + playingAge(t), t.height, t.location].filter(Boolean).join(' · ')
  const isCaster = me.role === 'caster'
  const isMe = me.id === t.id

  const message = async () => {
    setBusy(true)
    const res = await messageOrConnect(me.id, t.id)
    setBusy(false)
    if (res.conversationId) router.push('/chats/' + res.conversationId)
    else if (res.requested) toast('Connection request sent — you can message once ' + (t.first_name || 'they') + ' accepts')
    else toast('Couldn’t start a chat')
  }

  const toggleShortlist = async () => {
    if (!app) { setSheet(true); return }
    const on = !app.shortlisted
    const error = await setStage(app.id, { shortlisted: on })
    if (error) { toast('Couldn’t update the shortlist'); return }
    mutate(d => d && { ...d, apps: d.apps.map(a => a.id === app.id ? { ...a, shortlisted: on } : a) })
    toast(on ? 'Added to shortlist' : 'Removed from shortlist')
  }

  const share = async () => {
    const url = t.slug ? window.location.origin + '/' + t.slug : window.location.href
    try { if (navigator.share) await navigator.share({ title: name, url }); else { await navigator.clipboard.writeText(url); toast('Link copied') } } catch { /* dismissed */ }
  }

  const roundBtn = 'inline-flex size-10 items-center justify-center rounded-full bg-dark/45 text-white backdrop-blur'

  return (
    <>
      {/* Immersive full-bleed card */}
      <section className="relative h-[86dvh] min-h-[560px] overflow-hidden bg-dark text-white">
        {t.picture_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={t.picture_url} alt={name} className="absolute inset-0 size-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center bg-hero"><Avatar name={name} size={140} /></div>}
        {/* dark bottom scrim so overlaid text stays legible */}
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-dark via-dark/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
          <button type="button" aria-label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push('/talent'))} className={roundBtn}><Icon name="chevron-left" /></button>
          <div className="flex gap-2">
            <button type="button" aria-label="Share profile" onClick={share} className={roundBtn}><Icon name="share" className="size-5" /></button>
            {isCaster && !isMe && (
              <button type="button" aria-label={app?.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} aria-pressed={!!app?.shortlisted} onClick={toggleShortlist} className={cx(roundBtn, app?.shortlisted && 'text-pink')}>
                <Icon name="star" className={cx('size-5', app?.shortlisted && 'fill-current')} />
              </button>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-6">
          <div className="flex flex-wrap gap-2">
            {t.availability_status === 'available' && <span className="inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em]"><span className="size-1.5 rounded-full bg-white" /> Open to work</span>}
            {craft && <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] backdrop-blur">{craft}</span>}
            {grad && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-ink"><Icon name="graduation-cap" className="size-3.5" />{grad}</span>}
          </div>
          <h1 className="mt-3 text-[34px] text-white">{name}</h1>
          {facts && <p className="mt-1 text-sm text-white/80">{facts}</p>}

          {!isMe && (
            <div className="mt-5 flex gap-3">
              {isCaster && (
                <button type="button" onClick={() => !step.done && setSheet(true)} disabled={step.done}
                  className="flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-[14px] bg-bg text-[15px] font-medium text-ink">
                  <Icon name={step.icon} className="size-[18px]" /> {step.label}
                </button>
              )}
              <button type="button" onClick={message} disabled={busy}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/25 bg-white/10 text-[15px] font-medium backdrop-blur">
                <Icon name="chat" className="size-[18px]" /> Message
              </button>
            </div>
          )}
          {isMe && <Link href="/me/edit" className="mt-5 flex h-12 items-center justify-center rounded-[14px] bg-bg text-[15px] font-medium text-ink">Edit profile</Link>}
          <p className="mt-3 text-xs text-white/65">
            {app ? jobTitle(app.jobs) + ' · ' + stageNote(app) + (casterStage(app) === 'shortlist' && app.shortlisted ? ' · Shortlisted' : '') + ' · ' : ''}
            {shortlists > 0 ? 'On ' + shortlists + ' casting shortlist' + (shortlists === 1 ? '' : 's') + ' this week' : 'New on RoleCall'}
          </p>
        </div>
      </section>

      <div className="px-4 pb-10">
        {reels.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Showreel &amp; tapes</h2>
            <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">
              {reels.map(r => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/10] w-[46%] shrink-0 overflow-hidden rounded-[var(--radius)] bg-dark bg-cover bg-center" style={t.picture_url ? { backgroundImage: `url(${t.picture_url})` } : undefined}>
                  <span className="absolute inset-0 bg-dark/35" />
                  <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name="play" className="size-4 fill-current" /></span>
                  <span className="absolute bottom-2 left-3 text-xs font-medium text-white">{r.label || 'Showreel'}</span>
                </a>
              ))}
            </div>
          </>
        )}

        {(t.bio || t.summary) && (
          <>
            <h2 className="mb-2 mt-6 text-[18px]">About</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{t.bio || t.summary}</p>
          </>
        )}

        {skills.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Skills</h2>
            <div className="flex flex-wrap gap-2">{skills.map(s => <span key={s} className="rounded-full bg-green-tint px-3 py-1.5 text-[13px] text-green-ink">{s}</span>)}</div>
          </>
        )}

        {credits.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Recent credits</h2>
            <Card className="divide-y divide-line overflow-hidden">
              {credits.map(c => (
                <div key={c.id} className="flex items-start gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{[c.title, c.role].filter(Boolean).join(' — ')}</p>
                    <p className="text-[13px] text-muted">{[c.production_company, c.director && 'dir. ' + c.director].filter(Boolean).join(' · ')}</p>
                  </div>
                  {c.year && <span className="text-sm text-faint">{c.year}</span>}
                </div>
              ))}
            </Card>
          </>
        )}

        {!reels.length && !t.bio && !t.summary && !skills.length && !credits.length && <p className="mt-6 text-center text-sm text-muted">{t.first_name || 'They'} haven’t added more to their profile yet.</p>}
      </div>

      {isCaster && !isMe && (
        <CastingActionSheet key={(app?.id || 'new') + step.label} open={sheet} onClose={() => setSheet(false)} step={step} app={app} profileId={t.id} talentName={name} postings={postings}
          onDone={u => mutate(d => d && { ...d, apps: d.apps.some(a => a.id === u.id) ? d.apps.map(a => a.id === u.id ? { ...a, ...u } : a) : [{ ...(u as CasterApp), jobs: null, cover_note: null, created_at: new Date().toISOString(), due_at: null, held_from: null, held_to: null }, ...d.apps] })} />
      )}
    </>
  )
}
