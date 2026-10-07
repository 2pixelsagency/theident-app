'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import CastingActionSheet from '@/components/rc/CastingActionSheet'
import ProfileView, { heroPrimary, heroRound, heroSecondary } from '@/components/rc/ProfileView'
import { Empty, PageLoading, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { CASTER_APP_SELECT, casterStage, nextStep, setStage, stageNote, type CasterApp } from '@/lib/rc/casting'
import { messageOrConnect } from '@/lib/rc/talent'
import { loadFullProfile } from '@/lib/rc/profile'
import { jobTitle } from '@/lib/rc/pipeline'

export default function TalentProfilePage() {
  const { id: talentId } = useParams<{ id: string }>()
  const appParam = useSearchParams().get('app')
  const router = useRouter()
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
    if (me.role === 'caster') {
      const { data: mine } = await supabase.from('jobs').select('id, project_in, project_role, job_title, is_side_hustle, production_company').eq('created_by', me.id).eq('is_published', true).order('created_at', { ascending: false })
      postings = (mine || []).map(j => ({ id: j.id, title: jobTitle(j) }))
      if (mine?.length) {
        const { data: a } = await supabase.from('applications').select(CASTER_APP_SELECT + ', jobs(project_in, project_role, job_title, is_side_hustle, production_company)').eq('profile_id', talentId).in('job_id', mine.map(j => j.id)).order('updated_at', { ascending: false })
        apps = (a || []) as unknown as typeof apps
      }
    }
    return { full, shortlists: (count as number | null) ?? 0, apps, postings }
  }, [talentId, me.id, me.role])

  if (loading) return <PageLoading />
  if (!data?.full.profile) return <div className="pt-16"><Empty icon="user" title="Profile not found" /></div>

  const { full, shortlists, apps, postings } = data
  const t = full.profile!
  const app = apps.find(a => a.id === appParam) || apps.find(a => !a.outcome) || null
  const step = nextStep(app)
  const name = fullName(t)
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


  const status = (app ? jobTitle(app.jobs) + ' · ' + stageNote(app) + (casterStage(app) === 'shortlist' && app.shortlisted ? ' · Shortlisted' : '') + ' · ' : '')
    + (shortlists > 0 ? 'On ' + shortlists + ' casting shortlist' + (shortlists === 1 ? '' : 's') + ' this week' : 'New on RoleCall')

  return (
    <>
      <ProfileView
        data={full}
        owner={isMe}
        onBack={() => (window.history.length > 1 ? router.back() : router.push('/talent'))}
        onShare={share}
        topRight={isCaster && !isMe && (
          <button type="button" aria-label={app?.shortlisted ? 'Remove from shortlist' : 'Add to shortlist'} aria-pressed={!!app?.shortlisted} onClick={toggleShortlist} className={cx(heroRound, app?.shortlisted && 'text-pink')}>
            <Icon name="star" className={cx('size-5', app?.shortlisted && 'fill-current')} />
          </button>
        )}
        actions={isMe
          ? <Link href="/me/edit" className={heroPrimary}><Icon name="pen" className="size-[18px]" /> Edit profile</Link>
          : <>
              {isCaster && (
                <button type="button" onClick={() => !step.done && setSheet(true)} disabled={step.done} className={heroPrimary}>
                  <Icon name={step.icon} className="size-[18px]" /> {step.label}
                </button>
              )}
              <button type="button" onClick={message} disabled={busy} className={heroSecondary}><Icon name="chat" className="size-[18px]" /> Message</button>
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
