'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Avatar, Chip, Empty, Field, PageHeader, PageLoading, SearchField, Sheet, Button, TabChips, toast } from '@/components/rc/ui'
import FindTabs from '@/components/rc/FindTabs'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { TALENT_SELECT, craftTag, messageOrConnect, type Talent } from '@/lib/rc/talent'

const CRAFTS = ['Actor', 'Dancer', 'Singer', 'Musical theatre', 'Presenter', 'Model', 'Voiceover']

type Who = 'performers' | 'casting'

// Find people: performers (talent search) and casting teams — for every member, with one-tap Message
export default function TalentPage() {
  const { id, profile } = useMe()
  const router = useRouter()
  const params = useSearchParams()
  const [who, setWho] = useState<Who>(params.get('who') === 'casting' ? 'casting' : 'performers')
  const [nearMe, setNearMe] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const isCaster = profile?.account_role === 'caster'
  const myTown = (profile?.location || '').split(',')[0].trim()
  const [q, setQ] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [gradOnly, setGradOnly] = useState(false)
  const [gradYear, setGradYear] = useState('')
  const [school, setSchool] = useState('')
  const [crafts, setCrafts] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: people, loading } = useAsync(async () => {
    const { data } = await supabase.from('profiles').select(TALENT_SELECT + ', company_name').eq('account_role', who === 'casting' ? 'caster' : 'performer').neq('id', id)
      .order('last_active', { ascending: false, nullsFirst: false }).limit(300)
    // Performers can hide themselves from search; casting teams are always findable
    return ((data || []) as unknown as (Talent & { company_name?: string | null })[]).filter(t => (who === 'casting' || t.show_talent !== false) && (t.first_name || t.last_name || t.company_name))
  }, [id, who])
  const message = async (t: Talent) => {
    setBusy(t.id)
    const res = await messageOrConnect(id, t.id)
    setBusy(null)
    if (res.conversationId) router.push('/chats/' + res.conversationId)
    else if (res.requested) toast('Connection request sent — you can chat once ' + (t.first_name || 'they') + ' accepts')
    else toast('Couldn’t start a chat — try again')
  }

  const years = useMemo(() => Array.from(new Set((people || []).map(p => p.graduate_year).filter(Boolean))).sort((a, b) => (b as number) - (a as number)) as number[], [people])

  const shown = useMemo(() => (people || []).filter(t => {
    if (openOnly && t.availability_status !== 'available') return false
    if (gradOnly && !t.is_graduate) return false
    if (gradOnly && gradYear && String(t.graduate_year) !== gradYear) return false
    if (gradOnly && school.trim() && !(t.graduate_school || '').toLowerCase().includes(school.trim().toLowerCase())) return false
    if (crafts.length && !crafts.some(c => (t.what_i_do || '').toLowerCase().includes(c.toLowerCase()))) return false
    if (location.trim() && !(t.location || '').toLowerCase().includes(location.trim().toLowerCase())) return false
    if (nearMe && myTown && !(t.location || '').toLowerCase().includes(myTown.toLowerCase())) return false
    if (q.trim()) {
      const hay = [t.first_name, t.last_name, t.what_i_do, t.location, t.graduate_school].join(' ').toLowerCase()
      if (!q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false
    }
    return true
  }), [people, openOnly, gradOnly, gradYear, school, crafts, location, q, nearMe, myTown])

  const extra = crafts.length + (location ? 1 : 0) + (gradYear ? 1 : 0) + (school ? 1 : 0)

  return (
    <>
      <PageHeader title={isCaster ? 'Talent' : 'Find'} />
      <div className="px-4 pb-24">
        {!isCaster && <FindTabs value="people" />}
        <div className={isCaster ? '' : 'mt-4'}><SearchField value={q} onChange={setQ} placeholder={who === 'casting' ? 'Search casting directors, companies…' : 'Search names, skills, schools…'} /></div>
        <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {who === 'performers' && <Chip selected={extra > 0} onClick={() => setShowFilters(true)}><Icon name="sliders" className="size-4" /> More filters{extra ? ' · ' + extra : ''}</Chip>}
          {myTown && <Chip selected={nearMe} onClick={() => setNearMe(v => !v)}><Icon name="pin" className="size-4" /> Near {myTown}</Chip>}
          {who === 'performers' && <>
          <Chip selected={openOnly} tone="green" onClick={() => setOpenOnly(v => !v)}>Open to work</Chip>
          <Chip selected={gradOnly} tone="purple" onClick={() => setGradOnly(v => !v)}><Icon name="graduation-cap" className="size-4" /> Recent graduates</Chip>
          {CRAFTS.slice(0, 4).map(c => <Chip key={c} selected={crafts.includes(c)} onClick={() => setCrafts(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c])}>{c}</Chip>)}
          </>}
        </div>

        <div className="mt-4">
          <TabChips value={who} onChange={v => { setWho(v); router.replace(v === 'casting' ? '/talent?who=casting' : '/talent', { scroll: false }) }}
            options={[{ value: 'performers', label: 'Performers' }, { value: 'casting', label: 'Casting teams' }]} />
        </div>

        <p className="mb-3 mt-3 text-sm text-muted"><span className="font-medium text-ink">{shown.length}</span> {who === 'casting' ? 'casting teams' : 'performers'}</p>
        {loading ? <PageLoading /> : shown.length === 0 ? <Empty icon="users" title="No one matches yet" sub="Try fewer filters or a broader search." /> : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {shown.map(t => (
              <li key={t.id}>
                <div className="overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card">
                <Link href={'/talent/' + t.id} className="block">
                  <span className="relative block aspect-[4/5] bg-chip">
                    {t.picture_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={t.picture_url} alt={fullName(t) + ' headshot'} loading="lazy" className="size-full object-cover" />
                      : <span className="flex size-full items-center justify-center"><Avatar name={fullName(t)} size={72} /></span>}
                    <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                      {t.availability_status === 'available' && <span className="rounded-full bg-green px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">Open</span>}
                      {t.is_graduate && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-ink"><Icon name="graduation-cap" className="size-3" />Grad{t.graduate_year ? ' ’' + String(t.graduate_year).slice(2) : ''}</span>}
                    </span>
                  </span>
                  <span className="block p-3 pb-2">
                    <span className="block truncate text-sm font-medium">{who === 'casting' ? (t as Talent & { company_name?: string | null }).company_name || fullName(t) : fullName(t)}</span>
                    <span className="block truncate text-xs text-muted">{who === 'casting' ? [fullName(t), t.location?.split(',')[0]].filter(Boolean).join(' · ') : [t.location?.split(',')[0], craftTag(t)].filter(Boolean).join(' · ')}</span>
                  </span>
                </Link>
                <div className="-mt-1 px-3 pb-3">
                  <button type="button" onClick={() => message(t)} disabled={busy === t.id} className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-line text-[13px] font-semibold transition hover:bg-chip disabled:opacity-50"><Icon name="chat" className="size-4" />{busy === t.id ? 'Opening…' : 'Message'}</button>
                </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[13px] font-medium">What they do</p>
            <div className="flex flex-wrap gap-2">{CRAFTS.map(c => <Chip key={c} selected={crafts.includes(c)} onClick={() => setCrafts(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c])}>{c}</Chip>)}</div>
          </div>
          <Field label="Based in" icon="pin" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. London, Manchester" />
          <div className="rounded-[var(--radius)] border border-line bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-[15px] font-medium"><Icon name="graduation-cap" className="size-5 text-purple-ink" /> Recent graduates only</p>
              <Chip selected={gradOnly} tone="purple" onClick={() => setGradOnly(v => !v)}>{gradOnly ? 'On' : 'Off'}</Chip>
            </div>
            {gradOnly && (
              <div className="mt-3 space-y-3">
                <Field label="Drama school" value={school} onChange={e => setSchool(e.target.value)} placeholder="Any school" />
                {years.length > 0 && <div className="flex flex-wrap gap-2"><Chip selected={!gradYear} onClick={() => setGradYear('')}>Any year</Chip>{years.map(y => <Chip key={y} selected={gradYear === String(y)} onClick={() => setGradYear(String(y))}>{y}</Chip>)}</div>}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setCrafts([]); setLocation(''); setGradYear(''); setSchool(''); setGradOnly(false); setOpenOnly(false) }}>Clear</Button>
            <Button className="flex-[2]" onClick={() => setShowFilters(false)}>Show {shown.length}</Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
