'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Card, Empty, PageLoading, Pill, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, fmtTimeOfDay } from '@/lib/rc/format'
import { EVENT_SELECT, priceLabel, timeLabel, typeMeta, whereLabel, type RCEvent } from '@/lib/rc/events'

export default function EventDetailPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const router = useRouter()
  const { id: me } = useMe()
  const [busy, setBusy] = useState(false)

  const { data, loading, mutate } = useAsync(async () => {
    const [{ data: ev }, { data: rsvp }, { data: going }] = await Promise.all([
      supabase.from('events').select(EVENT_SELECT).eq('id', eventId).maybeSingle(),
      supabase.from('event_rsvps').select('status').eq('event_id', eventId).eq('profile_id', me).maybeSingle(),
      supabase.rpc('event_going_count', { eid: eventId }),
    ])
    return { ev: ev as RCEvent | null, rsvp: (rsvp?.status as string | undefined) ?? null, going: (going as number | null) ?? 0 }
  }, [eventId, me])

  if (loading) return <PageLoading />
  if (!data?.ev) return <div className="pt-16"><Empty icon="ticket" title="Event not found" sub="It may have been cancelled or isn’t live yet." action={<Button size="sm" variant="dark" href="/whats-on">Back to What’s on</Button>} /></div>

  const { ev: e, rsvp, going } = data
  const t = typeMeta(e.event_type)
  const host = e.created_by === me
  const spotsLeft = e.capacity ? Math.max(0, e.capacity - going) : null
  const full = spotsLeft === 0 && rsvp !== 'going'
  const cancelled = e.status === 'cancelled'

  const setRsvp = async (status: 'going' | 'interested' | null) => {
    setBusy(true)
    const { error } = status
      ? await supabase.from('event_rsvps').upsert({ event_id: e.id, profile_id: me, status }, { onConflict: 'event_id,profile_id' })
      : await supabase.from('event_rsvps').delete().eq('event_id', e.id).eq('profile_id', me)
    setBusy(false)
    if (error) { toast('Couldn’t update your RSVP'); return }
    const delta = (status === 'going' ? 1 : 0) - (rsvp === 'going' ? 1 : 0)
    mutate(d => d && { ...d, rsvp: status, going: d.going + delta })
    if (status === 'going') {
      toast('You’re going — added to your diary')
      await supabase.from('calendar_events').insert({ profile_id: me, title: e.title, event_type: e.event_type, start_date: e.start_date, end_date: e.end_date, start_time: e.start_time, all_day: !e.start_time, location: whereLabel(e), status: 'confirmed', description: e.host_name ? 'with ' + e.host_name : null })
    }
  }

  const cancelEvent = async () => {
    if (!confirm('Cancel this event? Anyone going will see it as cancelled.')) return
    const { error } = await supabase.from('events').update({ status: 'cancelled' }).eq('id', e.id)
    if (error) toast('Couldn’t cancel'); else mutate(d => d && { ...d, ev: { ...d.ev!, status: 'cancelled' } })
  }

  const share = async () => {
    try { if (navigator.share) await navigator.share({ title: e.title, url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); toast('Link copied') } } catch { /* dismissed */ }
  }

  const round = 'inline-flex size-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-card'

  return (
    <>
      <div className="relative h-52 bg-hero bg-cover bg-center" style={e.cover_image_url ? { backgroundImage: `url(${e.cover_image_url})` } : undefined}>
        <div className="flex items-center justify-between px-4 pt-[max(16px,env(safe-area-inset-top))]">
          <button type="button" aria-label="Back" onClick={() => (window.history.length > 1 ? router.back() : router.push('/whats-on'))} className={round}><Icon name="chevron-left" /></button>
          <button type="button" aria-label="Share" onClick={share} className={round}><Icon name="share" className="size-5" /></button>
        </div>
      </div>

      <div className="px-4 pb-32">
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Pill tone={t.tone} className="uppercase tracking-wide">{t.label}</Pill>
          {e.is_featured && <Pill tone="purple"><Icon name="star" className="size-3 fill-current" /> Featured</Pill>}
          {cancelled && <Pill tone="red">Cancelled</Pill>}
          {host && !cancelled && <Pill tone={e.is_published ? 'green' : 'amber'}>{e.is_published ? 'Live' : 'Pending review'}</Pill>}
        </div>
        <h1 className="mt-3 text-[26px]">{e.title}</h1>
        {e.host_name && <p className="mt-1 text-sm text-muted">Hosted by {e.host_name}</p>}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ['Date', fmtDate(e.start_date, { weekday: 'short', day: 'numeric', month: 'long' }) + (e.end_date && e.end_date !== e.start_date ? ' – ' + fmtDate(e.end_date, { day: 'numeric', month: 'short' }) : '')],
            ['Time', e.start_time ? timeLabel(e) + (e.end_time ? '–' + fmtTimeOfDay(e.end_time) : '') : 'All day'],
            ['Where', whereLabel(e)],
            ['Tickets', priceLabel(e) + (spotsLeft != null ? ' · ' + spotsLeft + ' left' : '')],
          ].map(([k, v]) => <Card key={k} className="p-4"><p className="text-xs text-muted">{k}</p><p className="mt-1 text-[15px] font-medium">{v}</p></Card>)}
        </div>

        {e.format === 'online' && e.online_url && rsvp === 'going' && (
          <a href={e.online_url} target="_blank" rel="noopener noreferrer" className="mt-3 flex items-center gap-2 rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink"><Icon name="link" className="size-4" /> Join link</a>
        )}

        {e.description && (
          <>
            <h2 className="mb-2 mt-6 text-[18px]">About this event</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{e.description}</p>
          </>
        )}

        {e.is_paid && !host && <p className="mt-5 rounded-xl bg-chip/70 px-4 py-3 text-[13px] text-muted">Card payment for tickets is coming soon — RSVP to hold your place and pay the host directly.</p>}

        {host && (
          <Card className="mt-6 space-y-2 p-4">
            <p className="text-[15px] font-medium">Your event</p>
            <p className="text-sm text-muted">{going} going{e.capacity ? ' of ' + e.capacity : ''}.{!e.is_published && ' We’ll review it shortly — it goes live once approved.'}{e.feature_requested && !e.is_featured && ' Feature requested — we’ll be in touch about payment.'}</p>
            {!cancelled && <Button size="sm" variant="outline" onClick={cancelEvent}>Cancel event</Button>}
          </Card>
        )}
      </div>

      {!host && !cancelled && (
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-[480px] gap-3 border-t border-line bg-surface px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
          {rsvp === 'going' ? (
            <>
              <Button variant="outline" size="lg" className="flex-1" onClick={() => setRsvp(null)} disabled={busy}>Can’t make it</Button>
              <Button size="lg" className="flex-1" icon="check" disabled>You’re going</Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="lg" className="flex-1" icon="bookmark" onClick={() => setRsvp(rsvp === 'interested' ? null : 'interested')} disabled={busy}>{rsvp === 'interested' ? 'Saved' : 'Interested'}</Button>
              <Button size="lg" className="flex-[1.4]" trailingIcon="arrow-right" onClick={() => setRsvp('going')} disabled={busy || full}>{full ? 'Fully booked' : 'RSVP · ' + priceLabel(e)}</Button>
            </>
          )}
        </div>
      )}
    </>
  )
}
