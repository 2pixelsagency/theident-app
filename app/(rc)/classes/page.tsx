'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Avatar, Button, Chip, Empty, Field, PageHeader, PageLoading, SearchField, Segmented, Sheet, TextArea, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName, toISODate } from '@/lib/rc/format'
import { messageOrConnect } from '@/lib/rc/talent'

type Kind = 'spare' | 'class'
type Space = {
  id: string; created_by: string; kind: Kind; title: string; style: string | null; studio: string | null; teacher: string | null; location: string | null
  starts_at: string; price_pence: number | null; spaces: number; link: string | null; note: string | null; status: 'open' | 'taken' | 'removed'
  profiles: { first_name: string | null; last_name: string | null; picture_url: string | null } | null
}
const SELECT = 'id, created_by, kind, title, style, studio, teacher, location, starts_at, price_pence, spaces, link, note, status, profiles:created_by(first_name, last_name, picture_url)'
const STYLES = ['Ballet', 'Jazz', 'Commercial', 'Contemporary', 'Tap', 'Street / hip hop', 'Musical theatre', 'Heels', 'Acting', 'Singing', 'Audition prep', 'Fitness']

const when = (iso: string) => {
  const d = new Date(iso), today = new Date(), tmrw = new Date(); tmrw.setDate(today.getDate() + 1)
  const day = d.toDateString() === today.toDateString() ? 'Today' : d.toDateString() === tmrw.toDateString() ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return day + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
const price = (p: number | null) => (p == null ? null : p === 0 ? 'Free' : '£' + (p / 100).toFixed(p % 100 ? 2 : 0))

// Classes board: pass on a class space you can't use (e.g. a Pineapple class) or promote a class you teach.
// No payment in the app — people message each other and sort it out directly.
export default function ClassesPage() {
  const router = useRouter()
  const params = useSearchParams()
  const { id: me } = useMe()
  const [tab, setTab] = useState<Kind>(params.get('tab') === 'class' ? 'class' : 'spare')
  const [q, setQ] = useState('')
  const [style, setStyle] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const { data, loading, mutate } = useAsync(async () => {
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    const { data } = await supabase.from('class_spaces').select(SELECT).neq('status', 'removed').gte('starts_at', since).order('starts_at').limit(300)
    return (data || []) as unknown as Space[]
  }, [])

  const list = useMemo(() => (data || []).filter(s => s.kind === tab && (s.status === 'open' || s.created_by === me)
    && (!style || s.style === style)
    && (!q.trim() || [s.title, s.studio, s.teacher, s.location, s.style].join(' ').toLowerCase().includes(q.trim().toLowerCase()))), [data, tab, style, q, me])
  const styles = useMemo(() => [...new Set((data || []).filter(s => s.kind === tab && s.style).map(s => s.style!))], [data, tab])

  const contact = async (s: Space) => {
    setBusy(s.id)
    const res = await messageOrConnect(me, s.created_by)
    setBusy(null)
    if (res.conversationId) router.push('/chats/' + res.conversationId)
    else if (res.requested) toast('Request sent — you can message once ' + (s.profiles?.first_name || 'they') + ' accepts')
    else toast('Couldn’t start a chat — try again')
  }
  const setStatus = async (s: Space, status: Space['status']) => {
    mutate(d => d && (status === 'removed' ? d.filter(x => x.id !== s.id) : d.map(x => x.id === s.id ? { ...x, status } : x)))
    const { error } = await supabase.from('class_spaces').update({ status }).eq('id', s.id)
    toast(error ? 'Couldn’t update' : status === 'taken' ? 'Marked as taken' : status === 'open' ? 'Back on the board' : 'Removed')
  }

  return (
    <>
      <PageHeader title="Classes" sub="Spare class spaces & classes to book" right={<Button size="sm" icon="plus" onClick={() => setPosting(true)}>Post</Button>} />
      <div className="px-4 pb-10">
        <Segmented value={tab} onChange={v => { setTab(v); setStyle(null) }} options={[{ value: 'spare', label: 'Spare spaces' }, { value: 'class', label: 'Classes' }]} />
        <p className="mt-3 text-[13px] text-muted">{tab === 'spare'
          ? 'Booked a class you can’t make? Pass your space on — free or for what you paid. Sort it out directly; no payment in the app.'
          : 'Classes and workshops run by members. Message the teacher or use their booking link.'}</p>
        <div className="mt-4"><SearchField value={q} onChange={setQ} placeholder={tab === 'spare' ? 'Search studio, class, teacher…' : 'Search classes, teachers, places…'} /></div>
        {styles.length > 1 && (
          <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
            <Chip selected={!style} onClick={() => setStyle(null)}>All</Chip>
            {styles.map(s => <Chip key={s} selected={style === s} onClick={() => setStyle(style === s ? null : s)}>{s}</Chip>)}
          </div>
        )}

        {loading ? <PageLoading /> : list.length === 0 ? (
          <div className="pt-8"><Empty icon={tab === 'spare' ? 'ticket' : 'sparkle'} title={tab === 'spare' ? 'No spare spaces right now' : 'No classes listed yet'}
            sub={tab === 'spare' ? 'Can’t make a class you’ve booked? Post it here so someone else can go.' : 'Teach a class or workshop? List it here for free.'}
            action={<Button size="sm" variant="dark" icon="plus" onClick={() => setPosting(true)}>{tab === 'spare' ? 'Pass on a space' : 'List a class'}</Button>} /></div>
        ) : (
          <ul className="rise-stagger mt-4 space-y-3">
            {list.map(s => {
              const mine = s.created_by === me, taken = s.status === 'taken'
              return (
                <li key={s.id} className={cx('rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card', taken && 'opacity-60')}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-green-ink">{when(s.starts_at)}</p>
                      <p className="mt-1 text-[17px] font-semibold leading-snug">{s.title}</p>
                      <p className="mt-0.5 text-[13px] text-muted">{[s.studio, s.teacher && 'with ' + s.teacher, s.location].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {price(s.price_pence) && <p className="text-[17px] font-semibold">{price(s.price_pence)}</p>}
                      {taken ? <span className="text-[12px] font-medium text-muted">Taken</span> : s.spaces > 1 && <span className="text-[12px] text-muted">{s.spaces} spaces</span>}
                    </div>
                  </div>
                  {s.style && <span className="mt-3 inline-block rounded-full bg-chip px-2.5 py-1 text-[12px] font-medium">{s.style}</span>}
                  {s.note && <p className="mt-3 whitespace-pre-line text-[14px] leading-relaxed text-ink/85">{s.note}</p>}
                  <div className="mt-4 flex items-center gap-3 border-t border-line pt-3">
                    <Avatar src={s.profiles?.picture_url} name={fullName(s.profiles)} size={28} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-muted">{mine ? 'Your post' : fullName(s.profiles)}</span>
                    {mine ? (<>
                      <Button size="sm" variant="outline" onClick={() => setStatus(s, taken ? 'open' : 'taken')}>{taken ? 'Re-open' : 'Mark taken'}</Button>
                      <button type="button" aria-label="Remove" onClick={() => setStatus(s, 'removed')} className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="trash" className="size-4" /></button>
                    </>) : !taken && (<>
                      {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-semibold">Book</a>}
                      <Button size="sm" icon="chat" onClick={() => contact(s)} disabled={busy === s.id}>{s.kind === 'spare' ? 'I’ll take it' : 'Message'}</Button>
                    </>)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-[12px] text-faint">Only pay people you trust, and check with the studio that a space can be transferred.</p>
      </div>
      <PostSheet open={posting} kind={tab} onClose={() => setPosting(false)} onPosted={s => { mutate(d => [...(d || []), s].sort((a, b) => a.starts_at.localeCompare(b.starts_at))); setTab(s.kind) }} />
    </>
  )
}

function PostSheet({ open, kind: initialKind, onClose, onPosted }: { open: boolean; kind: Kind; onClose: () => void; onPosted: (s: Space) => void }) {
  const blank = { title: '', style: '', studio: '', teacher: '', location: '', date: toISODate(new Date()), time: '18:00', price: '', spaces: '1', link: '', note: '' }
  const [kind, setKind] = useState<Kind>(initialKind)
  const [f, setF] = useState(blank)
  const [saving, setSaving] = useState(false)
  const set = (k: keyof typeof blank, v: string) => setF(x => ({ ...x, [k]: v }))

  const save = async () => {
    if (f.title.trim().length < 3) { toast('Add the class name'); return }
    const starts = new Date(f.date + 'T' + (f.time || '00:00') + ':00')
    if (isNaN(starts.getTime()) || starts.getTime() < Date.now() - 60 * 60 * 1000) { toast('Pick a date and time that hasn’t passed'); return }
    const link = f.link.trim()
    if (link && !/^https:\/\/\S+$/i.test(link)) { toast('Links need to start with https://'); return }
    const pence = f.price.trim() === '' ? null : Math.round(Number(f.price) * 100)
    if (pence != null && (isNaN(pence) || pence < 0 || pence > 100000)) { toast('Check the price'); return }
    setSaving(true)
    const { data, error } = await supabase.from('class_spaces').insert({
      kind, title: f.title.trim(), style: f.style || null, studio: f.studio.trim() || null, teacher: f.teacher.trim() || null, location: f.location.trim() || null,
      starts_at: starts.toISOString(), price_pence: pence, spaces: Math.max(1, Math.min(200, Number(f.spaces) || 1)), link: link || null, note: f.note.trim() || null,
    }).select(SELECT).single()
    setSaving(false)
    if (error || !data) { toast(/verified/i.test(error?.message || '') || error?.code === '42501' ? 'Verify your email first, then post' : 'Couldn’t post — check the details'); return }
    toast(kind === 'spare' ? 'Your space is on the board' : 'Class listed')
    onPosted(data as unknown as Space); setF(blank); onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={kind === 'spare' ? 'Pass on a class space' : 'List a class'}>
      <div className="space-y-4">
        <Segmented value={kind} onChange={setKind} options={[{ value: 'spare', label: 'Spare space' }, { value: 'class', label: 'A class I teach' }]} />
        <Field label="Class" value={f.title} onChange={e => set('title', e.target.value)} placeholder={kind === 'spare' ? 'e.g. Commercial Intermediate' : 'e.g. Musical theatre audition workshop'} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Studio" value={f.studio} onChange={e => set('studio', e.target.value)} placeholder="e.g. Pineapple" />
          <Field label="Teacher" value={f.teacher} onChange={e => set('teacher', e.target.value)} placeholder={kind === 'class' ? 'You' : 'Optional'} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date" type="date" value={f.date} onChange={e => set('date', e.target.value)} />
          <Field label="Time" type="time" value={f.time} onChange={e => set('time', e.target.value)} />
        </div>
        <Field label="Where" value={f.location} onChange={e => set('location', e.target.value)} placeholder="Covent Garden, London — or Online" />
        <div>
          <p className="mb-2 text-[13px] font-medium">Style</p>
          <div className="flex flex-wrap gap-2">{STYLES.map(s => <Chip key={s} selected={f.style === s} onClick={() => set('style', f.style === s ? '' : s)}>{s}</Chip>)}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={kind === 'spare' ? 'Asking (£, 0 = free)' : 'Price (£)'} inputMode="decimal" value={f.price} onChange={e => set('price', e.target.value.replace(/[^\d.]/g, ''))} placeholder={kind === 'spare' ? '0' : 'e.g. 12'} />
          <Field label="Spaces" inputMode="numeric" value={f.spaces} onChange={e => set('spaces', e.target.value.replace(/\D/g, ''))} />
        </div>
        {kind === 'class' && <Field label="Booking link (optional)" type="url" value={f.link} onChange={e => set('link', e.target.value)} placeholder="https://…" />}
        <TextArea label="Anything else" value={f.note} onChange={e => set('note', e.target.value)} placeholder={kind === 'spare' ? 'e.g. Booked on the studio app — I’ll transfer it to your name' : 'Level, what to wear, what you’ll cover…'} />
        <Button full size="lg" onClick={save} disabled={saving}>{saving ? 'Posting…' : kind === 'spare' ? 'Post my space' : 'List class'}</Button>
      </div>
    </Sheet>
  )
}
