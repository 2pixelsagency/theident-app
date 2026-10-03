'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Avatar, Chip, Empty, Field, PageHeader, PageLoading, SearchField, Sheet, Button } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { TALENT_SELECT, craftTag, type Talent } from '@/lib/rc/talent'

const CRAFTS = ['Actor', 'Dancer', 'Singer', 'Musical theatre', 'Presenter', 'Model', 'Voiceover']

export default function TalentPage() {
  const { id } = useMe()
  const [q, setQ] = useState('')
  const [openOnly, setOpenOnly] = useState(false)
  const [gradOnly, setGradOnly] = useState(false)
  const [gradYear, setGradYear] = useState('')
  const [school, setSchool] = useState('')
  const [crafts, setCrafts] = useState<string[]>([])
  const [location, setLocation] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: people, loading } = useAsync(async () => {
    const { data } = await supabase.from('profiles').select(TALENT_SELECT).eq('account_role', 'performer').neq('id', id)
      .order('last_active', { ascending: false, nullsFirst: false }).limit(300)
    return ((data || []) as Talent[]).filter(t => t.show_talent !== false && (t.first_name || t.last_name))
  }, [id])

  const years = useMemo(() => Array.from(new Set((people || []).map(p => p.graduate_year).filter(Boolean))).sort((a, b) => (b as number) - (a as number)) as number[], [people])

  const shown = useMemo(() => (people || []).filter(t => {
    if (openOnly && t.availability_status !== 'available') return false
    if (gradOnly && !t.is_graduate) return false
    if (gradOnly && gradYear && String(t.graduate_year) !== gradYear) return false
    if (gradOnly && school.trim() && !(t.graduate_school || '').toLowerCase().includes(school.trim().toLowerCase())) return false
    if (crafts.length && !crafts.some(c => (t.what_i_do || '').toLowerCase().includes(c.toLowerCase()))) return false
    if (location.trim() && !(t.location || '').toLowerCase().includes(location.trim().toLowerCase())) return false
    if (q.trim()) {
      const hay = [t.first_name, t.last_name, t.what_i_do, t.location, t.graduate_school].join(' ').toLowerCase()
      if (!q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false
    }
    return true
  }), [people, openOnly, gradOnly, gradYear, school, crafts, location, q])

  const extra = crafts.length + (location ? 1 : 0) + (gradYear ? 1 : 0) + (school ? 1 : 0)

  return (
    <>
      <PageHeader title="Talent" right={<Button size="sm" variant="outline" icon="sliders" onClick={() => setShowFilters(true)}>{extra ? 'Filters · ' + extra : 'Filters'}</Button>} />
      <div className="px-4 pb-8">
        <SearchField value={q} onChange={setQ} placeholder="Search names, skills, schools…" />
        <div className="scrollbar-none -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          <Chip selected={openOnly} tone="green" onClick={() => setOpenOnly(v => !v)}>Open to work</Chip>
          <Chip selected={gradOnly} tone="purple" onClick={() => setGradOnly(v => !v)}><Icon name="graduation-cap" className="size-4" /> Recent graduates</Chip>
          {CRAFTS.slice(0, 4).map(c => <Chip key={c} selected={crafts.includes(c)} onClick={() => setCrafts(l => l.includes(c) ? l.filter(x => x !== c) : [...l, c])}>{c}</Chip>)}
        </div>

        <p className="mb-3 mt-4 text-sm text-muted"><span className="font-medium text-ink">{shown.length}</span> performers</p>
        {loading ? <PageLoading /> : shown.length === 0 ? <Empty icon="users" title="No one matches yet" sub="Try fewer filters or a broader search." /> : (
          <ul className="grid grid-cols-2 gap-3">
            {shown.map(t => (
              <li key={t.id}>
                <Link href={'/talent/' + t.id} className="block overflow-hidden rounded-[var(--radius)] border border-line bg-surface shadow-card">
                  <span className="relative block aspect-[4/5] bg-chip">
                    {t.picture_url
                      // eslint-disable-next-line @next/next/no-img-element
                      ? <img src={t.picture_url} alt="" className="size-full object-cover" />
                      : <span className="flex size-full items-center justify-center"><Avatar name={fullName(t)} size={72} /></span>}
                    <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
                      {t.availability_status === 'available' && <span className="rounded-full bg-green px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">Open</span>}
                      {t.is_graduate && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-ink"><Icon name="graduation-cap" className="size-3" />Grad{t.graduate_year ? ' ’' + String(t.graduate_year).slice(2) : ''}</span>}
                    </span>
                  </span>
                  <span className="block p-3">
                    <span className="block truncate text-sm font-medium">{fullName(t)}</span>
                    <span className="block truncate text-xs text-muted">{[t.location, craftTag(t)].filter(Boolean).join(' · ')}</span>
                  </span>
                </Link>
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
