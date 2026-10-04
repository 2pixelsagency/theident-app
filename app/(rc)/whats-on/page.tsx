'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { BackHeader, Card, Empty, PageLoading, Pill, SearchField, TabChips, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fmtDate, toISODate } from '@/lib/rc/format'
import { EVENT_SELECT, EVENT_TYPES, priceLabel, timeLabel, typeMeta, whereLabel, type EventType, type RCEvent } from '@/lib/rc/events'

type Filter = 'all' | EventType

export default function WhatsOnPage() {
  const { id: me, profile } = useMe()
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [city, setCity] = useState<string>(() => (profile?.location || '').split(',')[0].trim())
  const [mine, setMine] = useState(false)

  const { data, loading, mutate } = useAsync(async () => {
    const today = toISODate(new Date())
    const [{ data: events }, { data: rsvps }, { data: hosting }] = await Promise.all([
      supabase.from('events').select(EVENT_SELECT).eq('is_published', true).neq('status', 'cancelled').gte('start_date', today).order('start_date').limit(200),
      supabase.from('event_rsvps').select('event_id, status').eq('profile_id', me),
      supabase.from('events').select(EVENT_SELECT).eq('created_by', me).gte('start_date', today).order('start_date'),
    ])
    return { events: (events || []) as RCEvent[], rsvps: new Map((rsvps || []).map(r => [r.event_id as string, r.status as string])), hosting: (hosting || []) as RCEvent[] }
  }, [me])

  const cities = useMemo(() => Array.from(new Set((data?.events || []).filter(e => e.format !== 'online' && e.venue).map(e => (e.venue!.split(',').pop() || '').trim()).filter(Boolean))).sort(), [data])

  const shown = useMemo(() => (data?.events || []).filter(e =>
    (filter === 'all' || e.event_type === filter) &&
    (!mine || data?.rsvps.has(e.id)) &&
    (!city || e.format === 'online' || (e.venue || '').toLowerCase().includes(city.toLowerCase())) &&
    (!q.trim() || [e.title, e.host_name, e.venue, e.description].join(' ').toLowerCase().includes(q.toLowerCase()))), [data, filter, mine, city, q])

  const featured = shown.find(e => e.is_featured)
  const list = shown.filter(e => e !== featured)

  const toggleSave = async (e: RCEvent) => {
    const has = data?.rsvps.get(e.id)
    mutate(d => { if (!d) return d; const r = new Map(d.rsvps); if (has) r.delete(e.id); else r.set(e.id, 'interested'); return { ...d, rsvps: r } })
    const { error } = has
      ? await supabase.from('event_rsvps').delete().eq('event_id', e.id).eq('profile_id', me)
      : await supabase.from('event_rsvps').insert({ event_id: e.id, profile_id: me, status: 'interested' })
    if (error) toast('Couldn’t update'); else if (!has) toast('Saved to your events')
  }

  return (
    <>
      <BackHeader title="What’s on" right={
        <label className="relative flex h-9 items-center gap-1 rounded-full border border-line bg-surface pl-3 pr-7 text-sm font-medium">
          <Icon name="pin" className="size-4 text-green-ink" />
          <select value={city} onChange={e => setCity(e.target.value)} aria-label="Location" className="max-w-28 appearance-none truncate bg-transparent outline-none">
            <option value="">Anywhere</option>
            {city && !cities.includes(city) && <option value={city}>{city}</option>}
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <Icon name="chevron-down" className="pointer-events-none absolute right-2.5 size-3.5" />
        </label>
      } />
      <div className="px-4 pb-10">
        <p className="text-sm text-muted">Auditions, workshops, talks, webinars, premieres &amp; companies near you.</p>
        <div className="mt-4"><SearchField value={q} onChange={setQ} placeholder="Search events & companies…" /></div>
        <div className="mt-3"><TabChips value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, ...EVENT_TYPES.map(t => ({ value: t.value, label: t.plural }))]} /></div>

        {(data?.hosting.length || 0) > 0 && (
          <Link href={'/whats-on/' + data!.hosting[0].id} className="mt-4 flex items-center gap-3 rounded-[var(--radius)] border border-line bg-surface p-3 text-sm shadow-card">
            <Icon name="ticket" className="size-5 text-purple-ink" />
            <span className="flex-1">You’re hosting <span className="font-medium">{data!.hosting.length}</span> event{data!.hosting.length === 1 ? '' : 's'}{data!.hosting.some(e => !e.is_published) ? ' · some pending review' : ''}</span>
            <Icon name="chevron-right" className="size-4 text-faint" />
          </Link>
        )}

        {loading ? <PageLoading /> : (
          <>
            {featured && (
              <Link href={'/whats-on/' + featured.id} className="mt-4 block overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
                <div className="relative h-36 bg-hero bg-cover bg-center" style={featured.cover_image_url ? { backgroundImage: `url(${featured.cover_image_url})` } : undefined}>
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-surface px-2 py-1 text-[11px] font-medium uppercase tracking-wide"><Icon name="star" className="size-3 fill-current" /> Featured · {typeMeta(featured.event_type).label}</span>
                  <span className="absolute right-3 top-3 rounded-md bg-dark/80 px-2 py-1 text-xs font-medium text-white">{priceLabel(featured)}</span>
                </div>
                <div className="p-4">
                  <p className="text-[19px] font-medium">{featured.title}</p>
                  {featured.host_name && <p className="text-sm text-muted">with {featured.host_name}</p>}
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted"><Icon name="calendar" className="size-4" /> {fmtDate(featured.start_date)} · {timeLabel(featured)} · {whereLabel(featured)}</p>
                </div>
              </Link>
            )}

            <div className="mb-3 mt-6 flex items-center justify-between">
              <h2 className="text-[18px]">{mine ? 'Your events' : 'Coming up'}</h2>
              <button type="button" onClick={() => setMine(v => !v)} className="text-sm font-medium text-green-ink">{mine ? 'Show all' : 'Saved & going ›'}</button>
            </div>
            {list.length === 0 && !featured ? (
              <Card><Empty icon="ticket" title={mine ? 'Nothing saved yet' : 'Nothing listed here yet'} sub={mine ? 'Tap the bookmark on an event to keep it here.' : 'Try another location or type — or host one yourself.'} /></Card>
            ) : (
              <ul className="space-y-3">
                {list.map(e => {
                  const t = typeMeta(e.event_type)
                  const d = new Date(e.start_date + 'T00:00:00')
                  const saved = data?.rsvps.get(e.id)
                  return (
                    <li key={e.id} className="relative">
                      <Link href={'/whats-on/' + e.id} className="flex gap-3 rounded-[var(--radius)] border border-line bg-surface p-4 pr-12 shadow-card">
                        <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-chip/70 py-2">
                          <span className="text-[11px] uppercase text-muted">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                          <span className="text-[22px] font-medium leading-none">{d.getDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <Pill tone={t.tone} className="uppercase tracking-wide">{t.label}</Pill>
                            {e.format === 'online' && <span className="flex items-center gap-1 text-xs text-muted"><span className="size-1.5 rounded-full bg-dark" />Online</span>}
                            <span className={cx('ml-auto text-sm font-medium', !e.is_paid && 'text-green-ink')}>{priceLabel(e)}</span>
                          </span>
                          <span className="mt-1.5 block text-[16px] font-medium leading-snug">{e.title}</span>
                          <span className="mt-1 flex items-center gap-1 truncate text-[13px] text-muted"><Icon name={e.format === 'online' ? 'globe' : 'pin'} className="size-3.5 shrink-0" />{[e.format === 'online' ? e.host_name : e.venue, timeLabel(e)].filter(Boolean).join(' · ')}</span>
                        </span>
                      </Link>
                      <button type="button" onClick={() => toggleSave(e)} aria-pressed={!!saved} aria-label={saved ? 'Remove from your events' : 'Save event'} className={cx('absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-full', saved ? 'text-green' : 'text-faint')}>
                        <Icon name="bookmark" className={cx('size-5', saved && 'fill-current')} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}

            <Link href="/whats-on/new" className="mt-6 flex items-center gap-3 rounded-[var(--radius)] bg-dark p-4 text-white">
              <span className="flex size-12 items-center justify-center rounded-xl bg-green"><Icon name="plus" className="size-6" /></span>
              <span className="flex-1"><span className="block text-[16px] font-medium">Host an event</span><span className="block text-[13px] text-white/65">List an audition, workshop or premiere · reach local talent</span></span>
              <Icon name="chevron-right" className="size-4 text-white/60" />
            </Link>
          </>
        )}
      </div>
    </>
  )
}
