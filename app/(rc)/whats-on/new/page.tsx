'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Chip, Field, Segmented, TextArea, Toggle, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { fullName, toISODate } from '@/lib/rc/format'
import { EVENT_TYPES, FEATURE_PRICE, type EventType } from '@/lib/rc/events'

const stamp = () => Date.now().toString(36)

export default function HostEventPage() {
  const router = useRouter()
  const me = useMe()
  const fileRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<EventType>('workshop')
  const [title, setTitle] = useState('')
  const [host, setHost] = useState(me.profile?.company_name || fullName(me.profile))
  const [cover, setCover] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [date, setDate] = useState(toISODate(new Date()))
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('13:00')
  const [format, setFormat] = useState<'in_person' | 'online'>('in_person')
  const [venue, setVenue] = useState('')
  const [url, setUrl] = useState('')
  const [paid, setPaid] = useState(false)
  const [price, setPrice] = useState('')
  const [spots, setSpots] = useState('')
  const [details, setDetails] = useState('')
  const [feature, setFeature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const pickCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setCover(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  const publish = async () => {
    if (!title.trim()) { setError('Give your event a title.'); return }
    if (format === 'in_person' && !venue.trim()) { setError('Add the venue.'); return }
    if (format === 'online' && !/^https?:\/\//.test(url.trim())) { setError('Add the joining link (starting https://).'); return }
    if (paid && !(parseFloat(price) > 0)) { setError('Add the ticket price.'); return }
    setError(null)
    setSaving(true)

    let cover_image_url: string | null = null
    if (cover) {
      const path = me.id + '/' + stamp() + '.' + (cover.name.split('.').pop() || 'jpg')
      const { error: upErr } = await supabase.storage.from('event-covers').upload(path, cover, { contentType: cover.type })
      if (!upErr) cover_image_url = supabase.storage.from('event-covers').getPublicUrl(path).data.publicUrl
    }

    // status / is_published / is_featured are set by the server (review + paid feature)
    const { data, error: err } = await supabase.from('events').insert({
      created_by: me.id, host_name: host.trim() || null, title: title.trim(), event_type: type, description: details.trim() || null,
      cover_image_url, start_date: date, start_time: start || null, end_time: end || null, all_day: !start,
      format, venue: format === 'in_person' ? venue.trim() : null, online_url: format === 'online' ? url.trim() : null,
      is_paid: paid, price: paid ? parseFloat(price) : null, capacity: spots ? parseInt(spots, 10) : null, feature_requested: feature,
    }).select('id').single()
    setSaving(false)
    if (err || !data) { setError('Couldn’t publish — ' + (err?.message || 'please try again')); return }
    toast('Submitted for review')
    router.replace('/whats-on/' + data.id)
  }

  const card = 'space-y-4 rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card'
  const label = 'text-xs font-medium uppercase tracking-[0.08em] text-muted'

  return (
    <>
      <BackHeader title="Host an event" />
      <div className="space-y-4 px-4 pb-10">
        <div>
          <p className={cx(label, 'mb-2')}>Event type</p>
          <div className="flex flex-wrap gap-2">{EVENT_TYPES.map(t => <Chip key={t.value} selected={type === t.value} onClick={() => setType(t.value)}>{t.label}</Chip>)}</div>
        </div>

        <section className={card}>
          <p className={label}>Basics</p>
          <Field label="Event title" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Screen Acting Intensive" />
          <Field label="Hosted by" value={host} onChange={e => setHost(e.target.value)} placeholder="Your name or company" />
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Cover image</p>
            {coverPreview
              // eslint-disable-next-line @next/next/no-img-element
              ? <div className="relative"><img src={coverPreview} alt="" className="h-36 w-full rounded-xl object-cover" /><button type="button" onClick={() => { setCover(null); setCoverPreview(null) }} className="absolute right-2 top-2 rounded-full bg-dark/70 px-3 py-1 text-xs text-white">Remove</button></div>
              : <button type="button" onClick={() => fileRef.current?.click()} className="upload flex h-12 w-full items-center gap-2 px-4 text-[15px] font-medium"><Icon name="image" className="size-5 text-muted" /> Add a cover image</button>}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickCover} />
          </div>
        </section>

        <section className={card}>
          <p className={label}>When &amp; where</p>
          <Field label="Date" type="date" icon="calendar" value={date} onChange={e => setDate(e.target.value)} />
          <div className="flex gap-3">
            <Field className="flex-1" label="Start" type="time" value={start} onChange={e => setStart(e.target.value)} />
            <Field className="flex-1" label="End" type="time" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-medium">Format</p>
            <Segmented value={format} onChange={setFormat} options={[{ value: 'in_person', label: 'In person' }, { value: 'online', label: 'Online' }]} />
          </div>
          {format === 'in_person'
            ? <Field label="Venue" icon="pin" value={venue} onChange={e => setVenue(e.target.value)} placeholder="e.g. Soho Studios, London" />
            : <Field label="Joining link" icon="link" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" hint="Shown to people who RSVP." />}
        </section>

        <section className={card}>
          <p className={label}>Tickets</p>
          <div className="flex items-center justify-between"><span className="text-[15px] font-medium">Paid event</span><Toggle checked={paid} onChange={setPaid} label="Paid event" /></div>
          <div className="flex gap-3">
            {paid && <Field className="flex-1" label="Price (£)" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))} placeholder="45" />}
            <Field className="flex-1" label="Spots" inputMode="numeric" value={spots} onChange={e => setSpots(e.target.value.replace(/\D/g, ''))} placeholder="Unlimited" />
          </div>
          {paid && <p className="text-xs text-muted">Card payments through RoleCall are coming soon; until then attendees RSVP and pay you directly.</p>}
        </section>

        <section className={card}>
          <p className={label}>Details</p>
          <TextArea value={details} onChange={e => setDetails(e.target.value)} placeholder="What’s the event about, who’s it for, and what should people bring or prepare?" aria-label="Details" />
        </section>

        <div>
          <p className={cx(label, 'mb-2')}>Promote</p>
          <div className={cx('overflow-hidden rounded-[var(--radius)] border-2 bg-surface', feature ? 'border-purple' : 'border-line')}>
            <div className="flex items-start gap-3 bg-accent p-4 text-ink">
              <span className="flex size-11 items-center justify-center rounded-xl bg-surface/60"><Icon name="zap" /></span>
              <span><span className="block text-[16px] font-medium">Feature this event</span><span className="block text-[13px] text-ink/75">Top of What’s on for 7 days + a push to matching talent</span></span>
            </div>
            <div className="flex items-center justify-between p-4">
              <span><span className="block text-[18px] font-medium">£{FEATURE_PRICE}</span><span className="block text-xs text-muted">one-off · ~5× more views</span></span>
              <Toggle checked={feature} onChange={setFeature} label="Feature this event" />
            </div>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-red">{error}</p>}
        <Button size="lg" full variant="dark" trailingIcon="arrow-right" onClick={publish} disabled={saving}>{saving ? 'Publishing…' : 'Publish event' + (feature ? ' · £' + FEATURE_PRICE : '')}</Button>
        <p className="text-center text-xs text-muted">Goes live after a quick review.{feature ? ' We’ll confirm the feature and payment by email.' : ' Turn on Feature to reach more people.'}</p>
      </div>
    </>
  )
}
