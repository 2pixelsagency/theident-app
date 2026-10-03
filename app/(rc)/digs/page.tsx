'use client'

import { useMemo, useState } from 'react'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Chip, Empty, Field, PageLoading, SearchField, Sheet, TextArea, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { toISODate } from '@/lib/rc/format'

type Dig = { id: string; title: string; host_name: string | null; host_note: string | null; city: string; area: string | null; near_venue: string | null; walk_minutes: number | null; price_per_night: number | null; description: string | null; tags: string[]; rating: number | null; stays: number; image_url: string | null }

// Soft illustrated header colours when a listing has no photo (solid tints, no gradients)
const TINTS = ['bg-purple-tint', 'bg-green-tint', 'bg-amber-tint', 'bg-pink-tint', 'bg-pencil-tint']
const TAG_TONE = ['bg-purple-tint text-purple-ink', 'bg-green-tint text-green-ink', 'bg-amber-tint text-amber', 'bg-pink-tint text-purple-ink']

export default function DigsPage() {
  const { id: me, profile } = useMe()
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [maxPrice, setMaxPrice] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [enquire, setEnquire] = useState<Dig | null>(null)
  const [hosting, setHosting] = useState(false)

  const { data, loading } = useAsync(async () => {
    // Where are you this week? The running contract's venue, else your home town
    const today = toISODate(new Date())
    const { data: booked } = await supabase.from('applications').select('jobs(location, start_date, end_date)').eq('profile_id', me).eq('status', 'booked')
    const live = ((booked || []) as unknown as { jobs: { location: string | null; start_date: string | null; end_date: string | null } | null }[])
      .map(b => b.jobs).find(j => j?.location && j.start_date && j.start_date <= today && (!j.end_date || j.end_date >= today))
    const where = live?.location || profile?.location || ''
    const { data: digs } = await supabase.from('digs').select('*').order('walk_minutes', { ascending: true, nullsFirst: false }).limit(200)
    return { where, digs: (digs || []) as Dig[] }
  }, [me, profile?.location])

  const city = (data?.where || '').split(',').map(s => s.trim()).filter(Boolean).pop() || ''
  const allTags = useMemo(() => Array.from(new Set((data?.digs || []).flatMap(d => d.tags))).sort(), [data])
  const shown = useMemo(() => {
    const list = (data?.digs || []).filter(d =>
      (!maxPrice || (d.price_per_night ?? 0) <= parseFloat(maxPrice)) &&
      tags.every(t => d.tags.includes(t)) &&
      (!q.trim() || [d.title, d.area, d.city, d.near_venue, d.description, ...d.tags].join(' ').toLowerCase().includes(q.toLowerCase())))
    // Listings in your current city first
    return city ? [...list].sort((a, b) => Number(!a.city.toLowerCase().includes(city.toLowerCase())) - Number(!b.city.toLowerCase().includes(city.toLowerCase()))) : list
  }, [data, maxPrice, tags, q, city])
  const nearby = city ? shown.filter(d => d.city.toLowerCase().includes(city.toLowerCase())).length : shown.length

  return (
    <>
      <BackHeader title="Theatre digs" />
      <div className="px-4 pb-10">
        {data?.where && <p className="flex items-center gap-2 rounded-xl bg-purple-tint px-4 py-3 text-sm font-medium text-purple-ink"><Icon name="pin" className="size-4" /> Near {data.where} · this week</p>}
        <div className="mt-4 flex gap-2">
          <div className="flex-1"><SearchField value={q} onChange={setQ} placeholder="Walkable to stage door…" /></div>
          <Button variant="dark" icon="sliders" onClick={() => setShowFilters(true)}>Filters</Button>
        </div>

        <div className="mb-3 mt-5 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted">From the cast community</p>
          {city && <span className="text-sm font-medium text-green-ink">{nearby} nearby</span>}
        </div>

        {loading ? <PageLoading /> : shown.length === 0 ? (
          <Card><Empty icon="house" title="No digs listed here yet" sub="We’re adding trusted places to stay town by town. Ask in your cast chat, or tell us where you’re heading." /></Card>
        ) : (
          <ul className="space-y-4">
            {shown.map((d, i) => (
              <li key={d.id} className="overflow-hidden rounded-[20px] border border-line bg-surface shadow-card">
                <div className={cx('relative h-24 bg-cover bg-center', !d.image_url && TINTS[i % TINTS.length])} style={d.image_url ? { backgroundImage: `url(${d.image_url})` } : undefined}>
                  {!d.image_url && <Icon name="house" className="absolute bottom-3 right-6 size-14 text-surface" strokeWidth={1.2} />}
                  {d.rating != null && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-medium"><Icon name="star" className="size-3 fill-current" />{Number(d.rating).toFixed(1)}{d.stays ? ' · ' + d.stays + ' stays' : d.host_note ? ' · ' + d.host_note : ''}</span>}
                  {d.walk_minutes != null && <span className="absolute right-3 top-3 rounded-full bg-surface px-2.5 py-1 text-xs font-medium">{d.walk_minutes} min walk</span>}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[17px] font-medium">{d.title}</p>
                    {d.price_per_night != null && <p className="whitespace-nowrap text-[17px] font-medium">£{Number(d.price_per_night)}<span className="text-sm font-normal text-muted">/night</span></p>}
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{[d.host_name && 'Hosted by ' + d.host_name, d.description].filter(Boolean).join('. ')}</p>
                  {d.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{d.tags.map((t, j) => <span key={t} className={cx('rounded-md px-2 py-1 text-xs font-medium', TAG_TONE[j % TAG_TONE.length])}>{t}</span>)}</div>}
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                    <span className="text-xs text-muted">{[d.area, d.city].filter(Boolean).join(', ')}{d.near_venue ? ' · near ' + d.near_venue : ''}</span>
                    <Button size="sm" variant="dark" onClick={() => setEnquire(d)}>Enquire</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" onClick={() => setHosting(true)} className="mt-6 flex w-full items-center gap-3 rounded-[var(--radius)] bg-dark p-4 text-left text-white">
          <span className="flex size-12 items-center justify-center rounded-xl bg-green"><Icon name="plus" className="size-6" /></span>
          <span className="flex-1"><span className="block text-[16px] font-medium">List your place</span><span className="block text-[13px] text-white/65">Resting between jobs? Host other performers and earn.</span></span>
        </button>
      </div>

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <div className="space-y-4">
          <Field label="Max price per night (£)" inputMode="numeric" value={maxPrice} onChange={e => setMaxPrice(e.target.value.replace(/\D/g, ''))} placeholder="Any" />
          {allTags.length > 0 && <div className="flex flex-wrap gap-2">{allTags.map(t => <Chip key={t} selected={tags.includes(t)} onClick={() => setTags(l => l.includes(t) ? l.filter(x => x !== t) : [...l, t])}>{t}</Chip>)}</div>}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setMaxPrice(''); setTags([]) }}>Clear</Button>
            <Button className="flex-[2]" onClick={() => setShowFilters(false)}>Show {shown.length}</Button>
          </div>
        </div>
      </Sheet>

      <EnquirySheet key={enquire?.id || 'none'} dig={enquire} uid={me} onClose={() => setEnquire(null)} />
      <EnquirySheet key={'host' + String(hosting)} dig={null} host open={hosting} uid={me} onClose={() => setHosting(false)} />
    </>
  )
}

function EnquirySheet({ dig, host, open, uid, onClose }: { dig: Dig | null; host?: boolean; open?: boolean; uid: string; onClose: () => void }) {
  const [dates, setDates] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const send = async () => {
    setSaving(true)
    const { error } = await supabase.from('digs_enquiries').insert({ kind: host ? 'host_interest' : 'enquiry', dig_id: dig?.id ?? null, profile_id: uid, dates: dates.trim() || null, message: message.trim() || null })
    setSaving(false)
    if (error) { toast('Couldn’t send — try again'); return }
    toast(host ? 'Thanks — we’ll be in touch about hosting' : 'Enquiry sent — we’ll connect you with the host')
    onClose()
  }
  return (
    <Sheet open={host ? !!open : !!dig} onClose={onClose} title={host ? 'List your place' : 'Enquire'}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{host ? 'Host self-listing is coming soon. Tell us about your place and we’ll help you get listed.' : 'Our team checks every host. Send your dates and we’ll put you in touch with ' + (dig?.host_name || 'the host') + '.'}</p>
        <Field label={host ? 'Where is it?' : 'Dates'} value={dates} onChange={e => setDates(e.target.value)} placeholder={host ? 'Town and nearest theatre' : 'e.g. Sun 5 – Sat 11 Oct'} />
        <TextArea label="Message" value={message} onChange={e => setMessage(e.target.value)} placeholder={host ? 'Room type, price, anything performers should know' : 'Two-show days, late check-in…'} />
        <Button full size="lg" onClick={send} disabled={saving}>{saving ? 'Sending…' : host ? 'Register interest' : 'Send enquiry'}</Button>
      </div>
    </Sheet>
  )
}
