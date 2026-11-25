'use client'

import { useRef, useState } from 'react'
import Icon from './Icon'
import { Button, Sheet, cx, toast } from './ui'
import { supabase } from '@/lib/supabase'

// "Create my profile from my CV": upload a PDF/Word CV (e.g. the CV PDF from Spotlight or Mandy), Claude reads it
// on the server, and the member reviews what was found and picks what to add. Nothing changes until they confirm.
type Found = {
  first_name: string; last_name: string; what_i_do: string; location: string; bio: string; height: string
  playing_age_min: number; playing_age_max: number; agent_name: string; agent_email: string; agent_phone: string; website: string
  drama_school: string; graduation_year: number; vocal_range: string; weight: string; headshot_credit: string; agent_address: string
  agencies: { kind: string; agency_name: string; address: string; phone: string; email: string; website: string }[]
  credits: { title: string; role: string; type: string; year: number; director: string; company: string }[]
  skills: { as_written: string; match: string; name: string; category: string; level: string }[]; training: { school: string; course: string; years: string }[]
}
type Current = { first_name: string | null; last_name: string | null; what_i_do: string | null; location: string | null; bio: string | null; height: string | null
  minimum_age: number | null; maximum_age: number | null; agent_name: string | null; agent_email: string | null; agent_phone: string | null; website: string | null; graduate_school: string | null; vocal_range?: string | null; agency_name?: string | null; weight?: string | null; headshot_credit?: string | null; agent_address?: string | null }

const FIELDS: [keyof Found, string, keyof Current][] = [
  ['first_name', 'First name', 'first_name'], ['last_name', 'Last name', 'last_name'], ['what_i_do', 'What you do', 'what_i_do'],
  ['location', 'Location', 'location'], ['height', 'Height', 'height'], ['bio', 'Bio', 'bio'],
  ['agent_name', 'Agency', 'agency_name'], ['agent_email', 'Agent email', 'agent_email'], ['agent_phone', 'Agent phone', 'agent_phone'],
  ['website', 'Website', 'website'], ['drama_school', 'Drama school', 'graduate_school'], ['vocal_range', 'Vocal range', 'vocal_range'],
  ['weight', 'Weight', 'weight'], ['headshot_credit', 'Headshot photographer', 'headshot_credit'], ['agent_address', 'Agency address', 'agent_address'],
]

export default function CvImport({ uid, current, types, allSkills, mySkillIds, existingCredits }: {
  uid: string; current: Current; types: { id: number; name: string }[]; allSkills: { id: number; name: string }[]
  mySkillIds: number[]; existingCredits: { title: string | null; role: string | null }[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [found, setFound] = useState<Found | null>(null)
  const [pick, setPick] = useState<Record<string, boolean>>({})

  const read = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null); setBusy('reading')
    const { data: { session } } = await supabase.auth.getSession()
    const body = new FormData(); body.append('file', file)
    const res = await fetch('/api/profile/import', { method: 'POST', headers: { Authorization: 'Bearer ' + (session?.access_token || '') }, body }).catch(() => null)
    const json = res ? await res.json().catch(() => ({})) : {}
    setBusy(null)
    if (!res?.ok || !json.profile) { setError(json.error || 'We couldn’t read that CV. Please try again.'); return }
    const f = json.profile as Found
    // Default picks: fill empty fields, add new credits and matched skills; don't overwrite what's already there
    const next: Record<string, boolean> = {}
    for (const [k, , ck] of FIELDS) if (f[k]) next['f:' + k] = !current[ck]
    if (f.playing_age_min || f.playing_age_max) next['f:ages'] = !current.minimum_age && !current.maximum_age
    f.credits.forEach((c, i) => { next['c:' + i] = !existingCredits.some(x => (x.title || '').toLowerCase() === c.title.toLowerCase() && (x.role || '').toLowerCase() === c.role.toLowerCase()) })
    next['skills'] = true
    if (f.training.length) next['training'] = true
    if (f.agencies?.length) next['agencies'] = true
    setPick(next); setFound(f)
  }

  // Each CV skill → one we already have (Claude's match, or the same name), or a new skill to add to the list
  const byName = new Map(allSkills.map(s => [s.name.toLowerCase(), s]))
  const resolved = found ? found.skills.map(x => {
    const hit = byName.get((x.match || '').trim().toLowerCase()) || byName.get((x.name || '').trim().toLowerCase()) || byName.get(x.as_written.trim().toLowerCase())
    return { label: hit?.name || (x.name || x.as_written).trim(), id: hit?.id ?? null, category: x.category, isNew: !hit, level: x.level || null }
  }).filter((x, i, a) => x.label && a.findIndex(y => y.label.toLowerCase() === x.label.toLowerCase()) === i && !(x.id && mySkillIds.includes(x.id))) : []
  const typeId = (t: string) => (types.find(x => x.name.toLowerCase() === t.toLowerCase()) || types.find(x => t.toLowerCase().includes(x.name.toLowerCase())) || types.find(x => x.name === 'Other'))?.id ?? null
  const toggle = (k: string) => setPick(p => ({ ...p, [k]: !p[k] }))

  const apply = async () => {
    if (!found) return
    setBusy('saving')
    const upd: Record<string, unknown> = {}
    for (const [k, , ck] of FIELDS) if (pick['f:' + k] && found[k]) upd[ck] = String(found[k]).trim()
    // Tidy values to what the profile accepts (a CV's "www.name.com" needs https://; keep lengths in range)
    if (typeof upd.website === 'string') upd.website = /^https?:\/\//i.test(upd.website) ? upd.website : 'https://' + upd.website.replace(/^\/+/, '')
    if (typeof upd.vocal_range === 'string') upd.vocal_range = upd.vocal_range.slice(0, 60)
    if (pick['f:drama_school'] && found.drama_school) { upd.is_graduate = true; if (found.graduation_year >= 1950 && found.graduation_year <= 2100) upd.graduate_year = found.graduation_year }
    if (pick['f:ages']) { if (found.playing_age_min) upd.minimum_age = found.playing_age_min; if (found.playing_age_max) upd.maximum_age = found.playing_age_max }
    const training = pick['training'] ? found.training.filter(t => t.school?.trim()).map((t, i) => ({ profile_id: uid, school: t.school.trim().slice(0, 160), course: t.course?.trim().slice(0, 200) || null, years: t.years?.trim().slice(0, 40) || null, sort_order: i })) : []
    const agencies = pick['agencies'] ? (found.agencies || []).filter(a => a.agency_name?.trim()).map((a, i) => ({ profile_id: uid, kind: a.kind?.trim().slice(0, 40) || null, agency_name: a.agency_name.trim().slice(0, 120), address: a.address?.trim() || null, phone: a.phone?.trim() || null, email: a.email?.trim() || null, website: a.website?.trim() || null, sort_order: i })) : []
    const have = (c: { title: string; role: string }) => existingCredits.some(x => (x.title || '').toLowerCase() === c.title.toLowerCase() && (x.role || '').toLowerCase() === (c.role || '').toLowerCase())
    const credits = found.credits.filter((c, i) => pick['c:' + i] && c.title?.trim() && !have(c) && found.credits.findIndex(x => x.title === c.title && x.role === c.role) === i).map(c => ({
      profile_id: uid, title: c.title, role: c.role || null, year: c.year || null, director: c.director || null,
      production_company: c.company || null, production_type_id: typeId(c.type),
    }))
    let skillIds: number[] = []
    let skillLevels = new Map<number, string | null>()
    if (pick['skills'] && resolved.length) {
      const fresh = resolved.filter(r => r.isNew)
      let cats: { id: number; name: string }[] = []
      if (fresh.length) cats = ((await supabase.from('skills_categories').select('id, name')).data || []) as { id: number; name: string }[]
      const created = await Promise.all(fresh.map(r => supabase.rpc('add_skill', { p_name: r.label, p_category_id: cats.find(c => c.name === r.category)?.id ?? null })))
      const levelOf = new Map<number, string | null>()
      resolved.filter(r => r.id).forEach(r => levelOf.set(r.id as number, r.level))
      fresh.forEach((r, i) => { const id = created[i]?.data as number | null; if (typeof id === 'number') levelOf.set(id, r.level) })
      skillIds = [...levelOf.keys()]
      skillLevels = levelOf
    }
    const skills = [...new Set(skillIds)].map(skill_id => ({ profile_id: uid, skill_id, level: skillLevels.get(skill_id) || null }))
    const [prof, cred, sk] = await Promise.all([
      Object.keys(upd).length ? supabase.from('profiles').update(upd).eq('id', uid) : Promise.resolve({ error: null }),
      credits.length ? supabase.from('credits').insert(credits) : Promise.resolve({ error: null }),
      skills.length ? supabase.from('profile_skills').upsert(skills, { onConflict: 'profile_id,skill_id' }) : Promise.resolve({ error: null }),
    ])
    const [tr, ag] = await Promise.all([
      training.length ? supabase.from('profile_training').insert(training) : Promise.resolve({ error: null }),
      agencies.length ? supabase.from('profile_agents').insert(agencies) : Promise.resolve({ error: null }),
    ])
    // If the details save fails, save them one by one so a single odd value doesn't lose the rest
    const missed: string[] = []
    if (prof.error) {
      for (const [col, val] of Object.entries(upd)) {
        const { error } = await supabase.from('profiles').update({ [col]: val }).eq('id', uid)
        if (error) missed.push(FIELDS.find(f => f[2] === col)?.[1] || col.replace(/_/g, ' '))
      }
    }
    if (cred.error) missed.push('credits')
    if (sk.error) missed.push('skills')
    if (tr.error) missed.push('training')
    if (ag.error) missed.push('agencies')
    if (missed.length) { setBusy(null); setFound(null); toast('Added — except ' + missed.join(', ') + '. You can fill ' + (missed.length > 1 ? 'those' : 'that') + ' in below.'); setTimeout(() => window.location.reload(), 2500); return }
    toast('Added to your profile')
    // Reload so the editor's own draft picks up the new values instead of autosaving over them
    window.location.reload()
  }

  const chosen = Object.values(pick).filter(Boolean).length

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius)] bg-sand p-4 sm:flex-nowrap">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime text-forest"><Icon name="file" strokeWidth={2} className="size-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">Create your profile from your CV</p>
          <p className="text-[13px] text-muted-strong">Upload a PDF or Word CV — including the one you download from Spotlight or Mandy. You choose what gets added.</p>
          {error && <p role="alert" className="mt-1 text-[13px] font-medium text-red">{error}</p>}
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={read} />
        <Button size="sm" onClick={() => fileRef.current?.click()} disabled={busy !== null}>{busy === 'reading' ? 'Reading…' : 'Upload CV'}</Button>
      </div>

      <Sheet open={!!found} onClose={() => busy !== 'saving' && setFound(null)} title="What we found">
        {found && (
          <div className="space-y-5">
            <p className="text-[13px] text-muted-strong">Tick what you’d like to add. Anything already on your profile is left alone unless you tick it.</p>
            <ul className="divide-y divide-line-soft rounded-[14px] border border-line-soft bg-surface">
              {FIELDS.filter(([k]) => found[k]).map(([k, label, ck]) => (
                <PickRow key={k} on={!!pick['f:' + k]} onToggle={() => toggle('f:' + k)} label={label} value={String(found[k])} note={current[ck] ? 'Replaces what’s there' : undefined} />
              ))}
              {(found.playing_age_min > 0 || found.playing_age_max > 0) && (
                <PickRow on={!!pick['f:ages']} onToggle={() => toggle('f:ages')} label="Playing age" value={[found.playing_age_min || '?', found.playing_age_max || '?'].join('–')} note={current.minimum_age || current.maximum_age ? 'Replaces what’s there' : undefined} />
              )}
              {found.training.length > 0 && <PickRow on={!!pick['training']} onToggle={() => toggle('training')} label="Training" value={found.training.map(t => [t.school, t.course, t.years].filter(Boolean).join(', ')).join('\n')} />}
              {(found.agencies?.length ?? 0) > 0 && <PickRow on={!!pick['agencies']} onToggle={() => toggle('agencies')} label="Other agencies" value={found.agencies.map(a => (a.kind ? a.kind + ': ' : '') + a.agency_name).join('\n')} />}
            </ul>

            {found.credits.length > 0 && (
              <div>
                <p className="mb-2 text-[13px] font-semibold">Credits ({found.credits.length})</p>
                <ul className="divide-y divide-line-soft rounded-[14px] border border-line-soft bg-surface">
                  {found.credits.map((c, i) => (
                    <PickRow key={i} on={!!pick['c:' + i]} onToggle={() => toggle('c:' + i)} label={[c.title, c.role].filter(Boolean).join(' — ')}
                      value={[c.type, c.company, c.director && 'dir. ' + c.director, c.year || ''].filter(Boolean).join(' · ')} />
                  ))}
                </ul>
              </div>
            )}

            {resolved.length > 0 && (
              <div>
                <button type="button" onClick={() => toggle('skills')} className="flex items-center gap-2 text-[13px] font-semibold">
                  <Box on={!!pick['skills']} />Skills ({resolved.length})
                </button>
                <div className="mt-2 flex flex-wrap gap-1.5">{resolved.map(r => (
                  <span key={r.label} className={cx('rounded-full px-2.5 py-1 text-[12px] font-medium', r.isNew ? 'bg-butter text-ink' : 'bg-mint text-green-ink')}>{r.label}{r.level && <span className="ml-1 text-[10px] text-muted-strong">· {r.level}</span>}{r.isNew && <span className="ml-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-strong">new</span>}</span>
                ))}</div>
                {resolved.some(r => r.isNew) && <p className="mt-2 text-[12px] text-muted">Skills marked new aren’t in our list yet — we’ll add them so casting can search for them too.</p>}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" full onClick={() => setFound(null)} disabled={busy === 'saving'}>Cancel</Button>
              <Button full onClick={apply} disabled={busy === 'saving' || chosen === 0}>{busy === 'saving' ? 'Adding…' : 'Add to my profile'}</Button>
            </div>
          </div>
        )}
      </Sheet>
    </>
  )
}

function Box({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={cx('flex size-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors', on ? 'border-forest bg-forest text-lime' : 'border-line-strong bg-surface')}>
      {on && <Icon name="check" strokeWidth={3} className="size-3" />}
    </span>
  )
}

function PickRow({ on, onToggle, label, value, note }: { on: boolean; onToggle: () => void; label: string; value: string; note?: string }) {
  return (
    <li>
      <button type="button" role="checkbox" aria-checked={on} onClick={onToggle} className="flex w-full items-start gap-3 px-3.5 py-3 text-left">
        <Box on={on} />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-medium">{label}</span>
          <span className="block whitespace-pre-line text-[13px] text-muted-strong [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">{value}</span>
          {note && <span className="mt-0.5 block text-[11px] font-medium text-amber">{note}</span>}
        </span>
      </button>
    </li>
  )
}
