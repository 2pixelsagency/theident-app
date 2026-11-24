'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { BackHeader, Button, Card, Chip, Empty, Field, PageLoading, SearchField, Sheet, TextArea, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName, toISODate } from '@/lib/rc/format'
import { compressImage, fileExt } from '@/lib/rc/media'

type Dig = {
  id: string; title: string; host_name: string | null; host_note: string | null; city: string; area: string | null; near_venue: string | null
  walk_minutes: number | null; price_per_night: number | null; price_per_week: number | null; description: string | null; tags: string[]
  rating: number | null; stays: number; image_url: string | null; images: string[]; owner_id: string | null; is_published: boolean
  review_status: 'pending' | 'approved' | 'rejected'; review_note: string | null
}
type Enquiry = { id: string; dig_id: string; profile_id: string; dates: string | null; message: string | null; created_at: string; profiles: { first_name: string | null; last_name: string | null } | null }

const TINTS = ['bg-mint', 'bg-butter', 'bg-blossom', 'bg-chip']
const TAGS = ['Walk to stage door', 'Late check-in', 'Own bathroom', 'Kitchen', 'Wi-Fi', 'Parking', 'Pets welcome', 'Quiet for sleep-ins', 'Laundry', 'Whole place']
const photo = (d: Dig) => d.images?.[0] || d.image_url
const priceLabel = (d: Dig) => d.price_per_week != null ? ['£' + Number(d.price_per_week), '/week'] : d.price_per_night != null ? ['£' + Number(d.price_per_night), '/night'] : null

// Other places to look, opened on their own sites with the town (and contract dates) filled in
function elsewhere(town: string, from?: string | null, to?: string | null) {
  const q = encodeURIComponent(town || 'London')
  const dates = (a: string, b: string) => (from && to ? a + from + b + to : '')
  return [
    { name: 'Airbnb', href: `https://www.airbnb.co.uk/s/${q}/homes${dates('?checkin=', '&checkout=')}` },
    { name: 'Booking.com', href: `https://www.booking.com/searchresults.en-gb.html?ss=${q}${dates('&checkin=', '&checkout=')}` },
    { name: 'SpareRoom', href: `https://www.spareroom.co.uk/flatshare/search.pl?flatshare_type=offered&search=${q}` },
    { name: 'Theatre Digs Booker', href: 'https://www.theatredigsbooker.com/' },
  ]
}

export default function DigsPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { id: me, profile } = useMe()
  const [q, setQ] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [maxWeek, setMaxWeek] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [enquire, setEnquire] = useState<Dig | null>(null)
  const [editing, setEditing] = useState<Partial<Dig> | null>(null)
  const [tab, setTab] = useState<'find' | 'mine'>(params.get('mine') ? 'mine' : 'find')

  const { data, loading, mutate } = useAsync(async () => {
    // Where are you working? The running (or next) contract's town and dates, else your home town
    const today = toISODate(new Date())
    const [{ data: booked }, { data: digs }] = await Promise.all([
      supabase.from('applications').select('jobs(location, start_date, end_date)').eq('profile_id', me).eq('status', 'booked'),
      supabase.from('digs').select('*').order('created_at', { ascending: false }).limit(300),
    ])
    const jobs = ((booked || []) as unknown as { jobs: { location: string | null; start_date: string | null; end_date: string | null } | null }[]).map(b => b.jobs).filter(j => j?.location && (!j.end_date || j.end_date >= today))
    const next = jobs.sort((a, b) => (a!.start_date || '').localeCompare(b!.start_date || ''))[0] || null
    const all = (digs || []) as Dig[]
    const mineIds = all.filter(d => d.owner_id === me).map(d => d.id)
    const { data: enq } = mineIds.length
      ? await supabase.from('digs_enquiries').select('id, dig_id, profile_id, dates, message, created_at, profiles(first_name, last_name)').in('dig_id', mineIds).order('created_at', { ascending: false })
      : { data: [] }
    return { where: next?.location || profile?.location || '', from: next?.start_date || null, to: next?.end_date || null, digs: all, enquiries: (enq || []) as unknown as Enquiry[] }
  }, [me, profile?.location])

  const town = (data?.where || '').split(',')[0].trim()
  const live = useMemo(() => (data?.digs || []).filter(d => d.is_published), [data])
  const mine = useMemo(() => (data?.digs || []).filter(d => d.owner_id === me), [data, me])
  const shown = useMemo(() => {
    const list = live.filter(d =>
      (!maxWeek || (d.price_per_week ?? (d.price_per_night ?? 0) * 7) <= parseFloat(maxWeek)) &&
      tags.every(t => d.tags.includes(t)) &&
      (!q.trim() || [d.title, d.area, d.city, d.near_venue, d.description, ...d.tags].join(' ').toLowerCase().includes(q.toLowerCase())))
    return town ? [...list].sort((a, b) => Number(!a.city.toLowerCase().includes(town.toLowerCase())) - Number(!b.city.toLowerCase().includes(town.toLowerCase()))) : list
  }, [live, maxWeek, tags, q, town])

  const reply = async (e: Enquiry) => {
    const { data: cid, error } = await supabase.rpc('reply_to_digs_enquiry', { enquiry: e.id })
    if (error || !cid) { toast('Couldn’t open a chat'); return }
    router.push('/chats/' + cid)
  }
  const remove = async (d: Dig) => {
    if (!confirm('Delete “' + d.title + '”?')) return
    const { error } = await supabase.from('digs').delete().eq('id', d.id)
    if (error) { toast('Couldn’t delete'); return }
    mutate(x => x && { ...x, digs: x.digs.filter(y => y.id !== d.id) })
  }

  return (
    <>
      <BackHeader title="Theatre digs" />
      <div className="px-4 pb-10">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-chip p-1">
          {(['find', 'mine'] as const).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} aria-pressed={tab === t} className={cx('h-9 rounded-full text-sm font-semibold', tab === t ? 'bg-surface shadow-card' : 'text-muted')}>
              {t === 'find' ? 'Find a place' : 'My listings' + (mine.length ? ' · ' + mine.length : '')}
            </button>
          ))}
        </div>

        {loading || !data ? <PageLoading /> : tab === 'find' ? (<>
          {data.where && <p className="mt-4 flex items-center gap-2 rounded-xl bg-mint px-4 py-3 text-sm font-medium"><Icon name="pin" className="size-4" /> Looking near {data.where}{data.from ? ' · from ' + new Date(data.from).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''}</p>}
          <div className="mt-4 flex gap-2">
            <div className="flex-1"><SearchField value={q} onChange={setQ} placeholder="Town, theatre or street…" /></div>
            <Button variant="outline" icon="sliders" onClick={() => setShowFilters(true)}>Filters</Button>
          </div>

          <h2 className="mb-3 mt-6 text-[18px]">From performers &amp; hosts</h2>
          {shown.length === 0 ? (
            <Card><Empty icon="house" title={town ? 'No digs listed in ' + town + ' yet' : 'No digs listed yet'} sub="Try the sites below, or list your own place to help the next cast." /></Card>
          ) : (
            <ul className="space-y-4">
              {shown.map((d, i) => {
                const price = priceLabel(d)
                return (
                  <li key={d.id} className="overflow-hidden rounded-[10px] border border-line bg-surface shadow-card">
                    <div className={cx('relative aspect-[16/9] bg-cover bg-center', !photo(d) && TINTS[i % TINTS.length])} style={photo(d) ? { backgroundImage: `url(${photo(d)})` } : undefined}>
                      {!photo(d) && <Icon name="house" className="absolute bottom-4 right-6 size-14 text-ink/20" strokeWidth={1.2} />}
                      {d.walk_minutes != null && <span className="absolute left-3 top-3 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">{d.walk_minutes} min to the theatre</span>}
                      {d.images?.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-dark/60 px-2 py-0.5 text-[11px] font-medium text-white">{d.images.length} photos</span>}
                    </div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="title text-[18px]">{d.title}</p>
                        {price && <p className="title whitespace-nowrap text-[18px]">{price[0]}<span className="font-sans text-sm font-normal text-muted">{price[1]}</span></p>}
                      </div>
                      <p className="mt-0.5 text-[13px] text-muted">{[d.area, d.city].filter(Boolean).join(', ')}{d.near_venue ? ' · near ' + d.near_venue : ''}</p>
                      {d.description && <p className="mt-2 line-clamp-3 text-[14px] leading-relaxed text-ink/80">{d.description}</p>}
                      {d.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{d.tags.map(t => <span key={t} className="rounded-full bg-chip px-2.5 py-1 text-xs font-medium">{t}</span>)}</div>}
                      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                        <span className="text-xs text-muted">{d.host_name ? 'Hosted by ' + d.host_name : 'Checked by The Ident'}</span>
                        {d.owner_id === me ? <span className="text-xs font-semibold text-green-ink">Your listing</span> : <Button size="sm" variant="dark" onClick={() => setEnquire(d)}>Enquire</Button>}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <h2 className="mb-1 mt-8 text-[18px]">Search elsewhere{town ? ' for ' + town : ''}</h2>
          <p className="mb-3 text-[13px] text-muted">Opens their site with your town{data.from ? ' and contract dates' : ''} filled in.</p>
          <div className="grid grid-cols-2 gap-2">
            {elsewhere(town, data.from, data.to).map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" className="flex h-12 items-center justify-between rounded-full border border-line bg-surface px-4 text-sm font-semibold">
                {s.name}<Icon name="arrow-right" className="size-4 -rotate-45 text-muted" />
              </a>
            ))}
          </div>

          <button type="button" onClick={() => { setTab('mine'); setEditing({}) }} className="mt-8 flex w-full items-center gap-3 rounded-[var(--radius)] bg-forest p-4 text-left text-white">
            <span className="flex size-12 items-center justify-center rounded-full bg-lime text-ink"><Icon name="plus" className="size-6" /></span>
            <span className="flex-1"><span className="block text-[16px] font-semibold">List your place</span><span className="block text-[13px] text-white/70">A spare room near a theatre? Host touring performers.</span></span>
          </button>
        </>) : (
          <MyListings mine={mine} enquiries={data.enquiries} onAdd={() => setEditing({})} onEdit={setEditing} onDelete={remove} onReply={reply} />
        )}
      </div>

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <div className="space-y-4">
          <Field label="Max per week (£)" inputMode="numeric" value={maxWeek} onChange={e => setMaxWeek(e.target.value.replace(/\D/g, ''))} placeholder="Any" />
          <div className="flex flex-wrap gap-2">{TAGS.map(t => <Chip key={t} selected={tags.includes(t)} onClick={() => setTags(l => l.includes(t) ? l.filter(x => x !== t) : [...l, t])}>{t}</Chip>)}</div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setMaxWeek(''); setTags([]) }}>Clear</Button>
            <Button className="flex-[2]" onClick={() => setShowFilters(false)}>Show {shown.length}</Button>
          </div>
        </div>
      </Sheet>

      <EnquirySheet key={enquire?.id || 'none'} dig={enquire} uid={me} onClose={() => setEnquire(null)} />
      <ListingSheet key={editing ? (editing.id || 'new') : 'closed'} dig={editing} uid={me} hostName={profile?.first_name || ''}
        onClose={() => setEditing(null)}
        onSaved={d => { mutate(x => x && { ...x, digs: x.digs.some(y => y.id === d.id) ? x.digs.map(y => y.id === d.id ? d : y) : [d, ...x.digs] }); setEditing(null); setTab('mine') }} />
    </>
  )
}

function MyListings({ mine, enquiries, onAdd, onEdit, onDelete, onReply }: {
  mine: Dig[]; enquiries: Enquiry[]; onAdd: () => void; onEdit: (d: Dig) => void; onDelete: (d: Dig) => void; onReply: (e: Enquiry) => void
}) {
  const STATUS = { pending: ['Checking', 'bg-butter'], approved: ['Live', 'bg-mint'], rejected: ['Needs changes', 'bg-red-tint text-red'] } as const
  return (
    <div className="mt-5">
      {mine.length === 0 ? (
        <Card><Empty icon="house" title="List your place" sub="Rent a room to touring performers. We check every listing before it goes live." action={<Button size="sm" variant="dark" onClick={onAdd}>Add a listing</Button>} /></Card>
      ) : (<>
        <ul className="space-y-3">
          {mine.map(d => {
            const st = STATUS[d.review_status] || STATUS.pending
            const enq = enquiries.filter(e => e.dig_id === d.id)
            return (
              <li key={d.id} className="rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card">
                <div className="flex items-start gap-3">
                  <span className="size-14 shrink-0 rounded-xl bg-chip bg-cover bg-center" style={photo(d) ? { backgroundImage: `url(${photo(d)})` } : undefined} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{d.title}</span>
                    <span className="block text-[13px] text-muted">{[d.area, d.city].filter(Boolean).join(', ')}</span>
                    <span className={cx('mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold', st[1])}>{st[0]}</span>
                  </span>
                  <button type="button" onClick={() => onEdit(d)} className="text-sm font-semibold text-green-ink">Edit</button>
                </div>
                {d.review_status === 'pending' && <p className="mt-2 text-[13px] text-muted">We’re checking your listing — it usually goes live within a day.</p>}
                {d.review_status === 'rejected' && d.review_note && <p className="mt-2 rounded-lg bg-red-tint px-3 py-2 text-[13px] text-red">{d.review_note}</p>}
                {enq.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Enquiries · {enq.length}</p>
                    {enq.map(e => (
                      <div key={e.id} className="flex items-start gap-3 rounded-xl bg-field p-3">
                        <span className="min-w-0 flex-1 text-sm">
                          <span className="block font-semibold">{fullName(e.profiles) || 'A performer'}{e.dates ? ' · ' + e.dates : ''}</span>
                          {e.message && <span className="block text-muted">{e.message}</span>}
                        </span>
                        <Button size="sm" variant="dark" onClick={() => onReply(e)}>Reply</Button>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" onClick={() => onDelete(d)} className="mt-3 text-xs font-medium text-muted">Delete listing</button>
              </li>
            )
          })}
        </ul>
        <Button className="mt-4" full variant="outline" icon="plus" onClick={onAdd}>Add another place</Button>
      </>)}
    </div>
  )
}

function ListingSheet({ dig, uid, hostName, onClose, onSaved }: { dig: Partial<Dig> | null; uid: string; hostName: string; onClose: () => void; onSaved: (d: Dig) => void }) {
  const [f, setF] = useState({
    title: dig?.title || '', city: dig?.city || '', area: dig?.area || '', near_venue: dig?.near_venue || '',
    walk: dig?.walk_minutes != null ? String(dig.walk_minutes) : '', week: dig?.price_per_week != null ? String(dig.price_per_week) : '',
    description: dig?.description || '', tags: dig?.tags || [], images: dig?.images || [], host_name: dig?.host_name || hostName,
  })
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(x => ({ ...x, [k]: v }))

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); e.target.value = ''
    setBusy(true)
    for (const raw of files.slice(0, 8 - f.images.length)) {
      const file = await compressImage(raw)
      const path = uid + '/digs-' + Date.now().toString(36) + '.' + fileExt(file)
      const { error } = await supabase.storage.from('headshots').upload(path, file, { contentType: file.type })
      if (error) { toast('A photo didn’t upload'); continue }
      const url = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
      setF(x => ({ ...x, images: [...x.images, url] }))
    }
    setBusy(false)
  }
  const save = async () => {
    if (!f.title.trim() || !f.city.trim()) { toast('Add a title and town'); return }
    if (!f.week || !(Number(f.week) > 0)) { toast('Add a price per week'); return }
    setBusy(true)
    const row = {
      title: f.title.trim(), city: f.city.trim(), area: f.area.trim() || null, near_venue: f.near_venue.trim() || null,
      walk_minutes: f.walk ? parseInt(f.walk, 10) : null, price_per_week: Number(f.week), description: f.description.trim() || null,
      tags: f.tags, images: f.images, image_url: f.images[0] || null, host_name: f.host_name.trim() || null,
    }
    const res = dig?.id
      ? await supabase.from('digs').update(row).eq('id', dig.id).select('*').single()
      : await supabase.from('digs').insert(row).select('*').single()
    setBusy(false)
    if (res.error || !res.data) { toast('Couldn’t save your listing'); return }
    toast('Thanks — we’ll check it and it’ll go live soon')
    onSaved(res.data as Dig)
  }
  return (
    <Sheet open={!!dig} onClose={onClose} title={dig?.id ? 'Edit listing' : 'List your place'}>
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-[13px] font-medium">Photos</p>
          <div className="grid grid-cols-4 gap-2">
            {f.images.map(u => (
              <div key={u} className="relative aspect-square rounded-xl bg-chip bg-cover bg-center" style={{ backgroundImage: `url(${u})` }}>
                <button type="button" aria-label="Remove photo" onClick={() => set('images', f.images.filter(x => x !== u))} className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-surface/90"><Icon name="x" className="size-3" /></button>
              </div>
            ))}
            {f.images.length < 8 && <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className="upload flex aspect-square flex-col items-center justify-center text-xs text-muted"><Icon name="plus" className="size-5" />Add</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={upload} />
        </div>
        <Field label="Title" value={f.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Double room, 5 min from the Lyceum" />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Town" value={f.city} onChange={e => set('city', e.target.value)} placeholder="Edinburgh" />
          <Field label="Area" value={f.area} onChange={e => set('area', e.target.value)} placeholder="Tollcross" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nearest theatre" value={f.near_venue} onChange={e => set('near_venue', e.target.value)} placeholder="Royal Lyceum" />
          <Field label="Minutes’ walk" inputMode="numeric" value={f.walk} onChange={e => set('walk', e.target.value.replace(/\D/g, ''))} placeholder="5" />
        </div>
        <Field label="Price per week (£)" inputMode="numeric" value={f.week} onChange={e => set('week', e.target.value.replace(/[^\d.]/g, ''))} placeholder="175" />
        <TextArea label="About the place" value={f.description} onChange={e => set('description', e.target.value)} placeholder="Room, bathroom, kitchen use, house rules, late check-in after shows…" />
        <div className="flex flex-wrap gap-2">{TAGS.map(t => <Chip key={t} selected={f.tags.includes(t)} onClick={() => set('tags', f.tags.includes(t) ? f.tags.filter(x => x !== t) : [...f.tags, t])}>{t}</Chip>)}</div>
        <Field label="Host name shown" value={f.host_name} onChange={e => set('host_name', e.target.value)} />
        <p className="text-[13px] text-muted">We check every listing before it goes live, and again after changes. Never ask guests to pay outside a secure method.</p>
        <Button full size="lg" onClick={save} disabled={busy}>{busy ? 'Saving…' : dig?.id ? 'Save changes' : 'Submit listing'}</Button>
      </div>
    </Sheet>
  )
}

function EnquirySheet({ dig, uid, onClose }: { dig: Dig | null; uid: string; onClose: () => void }) {
  const [dates, setDates] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const send = async () => {
    setSaving(true)
    const { error } = await supabase.from('digs_enquiries').insert({ kind: 'enquiry', dig_id: dig?.id ?? null, profile_id: uid, dates: dates.trim() || null, message: message.trim() || null })
    setSaving(false)
    if (error) { toast('Couldn’t send — try again'); return }
    toast(dig?.owner_id ? 'Sent — the host will reply in Chats' : 'Enquiry sent — we’ll connect you with the host')
    onClose()
  }
  return (
    <Sheet open={!!dig} onClose={onClose} title={'Enquire · ' + (dig?.title || '')}>
      <div className="space-y-4">
        <p className="text-sm text-muted">{dig?.owner_id ? 'Your enquiry goes to ' + (dig.host_name || 'the host') + ', who’ll reply in Chats.' : 'Our team will put you in touch with ' + (dig?.host_name || 'the host') + '.'}</p>
        <Field label="Dates" value={dates} onChange={e => setDates(e.target.value)} placeholder="e.g. Sun 5 – Sat 11 Jan" />
        <TextArea label="Message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Show, two-show days, late check-in…" />
        <Button full size="lg" onClick={send} disabled={saving}>{saving ? 'Sending…' : 'Send enquiry'}</Button>
      </div>
    </Sheet>
  )
}
