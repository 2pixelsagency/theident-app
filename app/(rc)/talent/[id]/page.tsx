'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import CastingActionSheet from '@/components/rc/CastingActionSheet'
import ProfileView, { heroPrimary, heroRound, heroSecondary } from '@/components/rc/ProfileView'
import { Empty, PageLoading, cx, toast, useGoBack } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { CASTER_APP_SELECT, casterStage, nextStep, setStage, stageNote, type CasterApp } from '@/lib/rc/casting'
import { messageOrConnect } from '@/lib/rc/talent'
import { loadFullProfile, profilePath } from '@/lib/rc/profile'
import { jobTitle } from '@/lib/rc/pipeline'

export default function TalentProfilePage() {
  const { id: talentId } = useParams<{ id: string }>()
  const appParam = useSearchParams().get('app')
  const router = useRouter()
  const goBack = useGoBack('/talent')
  const me = useMe()
  const [sheet, setSheet] = useState(false)
  const [busy, setBusy] = useState(false)

  const { data, loading, mutate } = useAsync(async () => {
    const [full, { data: count }] = await Promise.all([
      loadFullProfile(talentId, talentId === me.id),
      supabase.rpc('shortlist_count', { pid: talentId }),
    ])
    // Casting relationship with this person across my postings
    let apps: (CasterApp & { jobs: { project_in: string | null; project_role: string | null; job_title: string | null; is_side_hustle: boolean; production_company: string | null } | null })[] = []
    let postings: { id: string; title: string }[] = []
    // Anyone who has posted a job can cast it — performers included
    {
      const { data: mine } = await supabase.from('jobs').select('id, project_in, project_role, job_title, is_side_hustle, production_company').eq('created_by', me.id).eq('is_published', true).order('created_at', { ascending: false })
      postings = (mine || []).map(j => ({ id: j.id, title: jobTitle(j) }))
      if (mine?.length) {
        const { data: a } = await supabase.from('applications').select(CASTER_APP_SELECT + ', jobs(project_in, project_role, job_title, is_side_hustle, production_company)').eq('profile_id', talentId).in('job_id', mine.map(j => j.id)).order('updated_at', { ascending: false })
        apps = (a || []) as unknown as typeof apps
      }
    }
    // Count the view (not your own)
    if (talentId !== me.id) supabase.from('profile_views').insert({ profile_id: talentId, viewer_id: me.id }).then(() => {}, () => {})
    // My connection with this person (if any)
    const { data: conn } = await supabase.from('connections').select('id, status, requester_id')
      .or(`and(requester_id.eq.${me.id},receiver_id.eq.${talentId}),and(requester_id.eq.${talentId},receiver_id.eq.${me.id})`).maybeSingle()
    return { full, shortlists: (count as number | null) ?? 0, apps, postings, conn: conn as { id: string; status: string; requester_id: string } | null }
  }, [talentId, me.id])

  if (loading) return <PageLoading />
  if (!data?.full.profile) return <div className="pt-16"><Empty icon="user" title="Profile not found" /></div>

  const { full, shortlists, apps, postings, conn } = data
  const t = full.profile!
  const app = apps.find(a => a.id === appParam) || apps.find(a => !a.outcome) || null
  const step = nextStep(app)
  const name = fullName(t)
  const isCaster = me.role === 'caster' || postings.length > 0
  const isMe = me.id === t.id

  const message = async () => {
    setBusy(true)
    const res = await messageOrConnect(me.id, t.id)
    setBusy(false)
    if (res.conversationId) router.push('/chats/' + res.conversationId)
    else if (res.requested) toast('Connection request sent — you can message once ' + (t.first_name || 'they') + ' accepts')
    else toast('Couldn’t start a chat')
  }

  // Connect → Requested (tap to cancel) · Accept when they asked first · Connected
  const connState = !conn ? 'none' : conn.status === 'accepted' ? 'connected' : conn.requester_id === me.id ? 'requested' : 'incoming'
  const connect = async () => {
    setBusy(true)
    if (connState === 'none') {
      const { data: row, error } = await supabase.from('connections').insert({ requester_id: me.id, receiver_id: t.id, status: 'pending' }).select('id, status, requester_id').single()
      if (error || !row) toast('Couldn’t send the request'); else { mutate(d => d && { ...d, conn: row }); toast('Request sent to ' + (t.first_name || 'them')) }
    } else if (connState === 'incoming') {
      const { error } = await supabase.from('connections').update({ status: 'accepted' }).eq('id', conn!.id)
      if (error) toast('Couldn’t accept'); else { mutate(d => d && d.conn ? { ...d, conn: { ...d.conn, status: 'accepted' } } : d); toast('You’re now connected') }
    } else if (connState === 'requested' && confirm('Cancel your connection request?')) {
      const { error } = await supabase.from('connections').delete().eq('id', conn!.id)
      if (error) toast('Couldn’t cancel'); else mutate(d => d && { ...d, conn: null })
    }
    setBusy(false)
  }
  const connLabel = { none: 'Connect', requested: 'Requested', incoming: 'Accept', connected: 'Connected' }[connState]
  const connIcon = { none: 'user-plus', requested: 'clock', incoming: 'check', connected: 'check' }[connState]

  const toggleShortlist = async () => {
    if (!app) { setSheet(true); return }
    const on = !app.shortlisted
    const error = await setStage(app.id, { shortlisted: on })
    if (error) { toast('Couldn’t update the shortlist'); return }
    mutate(d => d && { ...d, apps: d.apps.map(a => a.id === app.id ? { ...a, shortlisted: on } : a) })
    toast(on ? 'Added to shortlist' : 'Removed from shortlist')
  }

  const share = async () => {
    const url = t.slug ? window.location.origin + profilePath(t) : window.location.href
    try { if (navigator.share) await navigator.share({ title: name, url }); else { await navigator.clipboard.writeText(url); toast('Link copied') } } catch { /* dismissed */ }
  }


  const status = (app ? jobTitle(app.jobs) + ' · ' + stageNote(app) + (casterStage(app) === 'shortlist' && app.shortlisted ? ' · Shortlisted' : '') + ' · ' : '')
    + (shortlists > 0 ? 'On ' + shortlists + ' casting shortlist' + (shortlists === 1 ? '' : 's') + ' this week' : 'New on The Ident')

  return (
    <>
      <ProfileView
        signedIn
        data={full}
        owner={isMe}
        onBack={goBack}
        onShare={share}
        topRight={isCaster && !isMe && t.account_role !== 'caster' && (
          <button type="button" aria-label={app?.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} aria-pressed={!!app?.shortlisted} onClick={toggleShortlist} className={cx(heroRound, app?.shortlisted && 'text-pink')}>
            <Icon name="star" className={cx('size-5', app?.shortlisted && 'fill-current')} />
          </button>
        )}
        actions={isMe
          ? <Link href="/me/edit" className={heroPrimary}><Icon name="pen" className="size-[18px]" /> Edit profile</Link>
          : <>
              {isCaster && t.account_role !== 'caster' ? (
                <button type="button" onClick={() => !step.done && setSheet(true)} disabled={step.done} className={heroPrimary}>
                  <Icon name={step.icon} className="size-[18px]" /> {step.label}
                </button>
              ) : (
                <button type="button" onClick={connect} disabled={busy || connState === 'connected'} className={connState === 'none' || connState === 'incoming' ? heroPrimary : heroSecondary}>
                  <Icon name={connIcon} className="size-[18px]" /> {connLabel}
                </button>
              )}
              <button type="button" onClick={message} disabled={busy} className={heroSecondary}><Icon name="chat" className="size-[18px]" /> Message</button>
              {isCaster && t.account_role !== 'caster' && (
                <button type="button" onClick={connect} disabled={busy || connState === 'connected'} aria-label={connLabel} title={connLabel} className={cx(heroSecondary, '!w-auto !flex-none px-4')}>
                  <Icon name={connIcon} className="size-[18px]" />
                </button>
              )}
            </>}
        statusLine={status}
      />

      {isCaster && !isMe && (
        <CastingActionSheet key={(app?.id || 'new') + step.label} open={sheet} onClose={() => setSheet(false)} step={step} app={app} profileId={t.id} talentName={name} postings={postings}
          onDone={u => mutate(d => d && { ...d, apps: d.apps.some(a => a.id === u.id) ? d.apps.map(a => a.id === u.id ? { ...a, ...u } : a) : [{ ...(u as CasterApp), jobs: null, cover_note: null, created_at: new Date().toISOString(), due_at: null, held_from: null, held_to: null }, ...d.apps] })} />
      )}
    </>
  )
}
