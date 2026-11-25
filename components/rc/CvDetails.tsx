'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { Button, Card, Field, Sheet, Toggle, cx, toast } from './ui'
import { supabase } from '@/lib/supabase'
import type { Agent, FullProfile, Skill, Training } from '@/lib/rc/profile'

// Customise profile → the rest of a Spotlight-style CV: training, other agencies, skill levels, weight,
// actual age (opt-in; date of birth stays private) and the headshot photographer's credit.
// Every change saves on its own.

export const SKILL_LEVELS = ['Native', 'High standard', 'Highly skilled', 'Skilled'] as const
const AGENT_KINDS = ['Theatrical', 'Commercial', 'Voice', 'Presenting', 'Dance', 'Other']

export default function CvDetails({ uid, profile, training: t0, agents: a0, skills, onSkills }: {
  uid: string; profile: FullProfile; training: Training[]; agents: Agent[]; skills: Skill[]; onSkills: (s: Skill[]) => void
}) {
  const [training, setTraining] = useState(t0)
  const [agents, setAgents] = useState(a0)
  const [editT, setEditT] = useState<Partial<Training> | null>(null)
  const [editA, setEditA] = useState<Partial<Agent> | null>(null)

  // Weight, headshot credit, show age: debounced save to profiles
  const [d, setD] = useState({ weight: profile.weight || '', headshot_credit: profile.headshot_credit || '', show_age: !!profile.show_age })
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    const t = setTimeout(async () => {
      const { error } = await supabase.from('profiles').update({ weight: d.weight.trim().slice(0, 40) || null, headshot_credit: d.headshot_credit.trim().slice(0, 80) || null, show_age: d.show_age }).eq('id', uid)
      if (error) toast('Couldn’t save — check your connection')
    }, 600)
    return () => clearTimeout(t)
  }, [d, uid])

  // Date of birth: write-only (never read back), so we only know whether one is on file
  const [hasDob, setHasDob] = useState<boolean | null>(null)
  const [dob, setDob] = useState('')
  useEffect(() => { supabase.rpc('has_date_of_birth').then(({ data }) => setHasDob(!!data)) }, [])
  const saveDob = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) { toast('Pick a date'); return }
    const { error } = await supabase.from('profiles').update({ date_of_birth: dob }).eq('id', uid)
    if (error) { toast('Couldn’t save that'); return }
    setHasDob(true); setDob(''); toast('Date of birth saved privately')
  }

  const saveTraining = async () => {
    if (!editT?.school?.trim()) { toast('Add the school or teacher'); return }
    const row = { school: editT.school.trim(), course: editT.course?.trim() || null, years: editT.years?.trim() || null }
    if (editT.id) {
      const { error } = await supabase.from('profile_training').update(row).eq('id', editT.id)
      if (error) { toast('Couldn’t save'); return }
      setTraining(l => l.map(x => x.id === editT.id ? { ...x, ...row } : x))
    } else {
      const { data, error } = await supabase.from('profile_training').insert({ ...row, profile_id: uid, sort_order: training.length }).select('id, school, course, years, sort_order').single()
      if (error || !data) { toast('Couldn’t save'); return }
      setTraining(l => [...l, data as Training])
    }
    setEditT(null)
  }
  const removeTraining = async (id: string) => {
    if (!confirm('Remove this training?')) return
    setTraining(l => l.filter(x => x.id !== id)); setEditT(null)
    await supabase.from('profile_training').delete().eq('id', id)
  }

  const saveAgent = async () => {
    if (!editA?.agency_name?.trim()) { toast('Add the agency name'); return }
    const web = editA.website?.trim() || ''
    const row = { kind: editA.kind || null, agency_name: editA.agency_name.trim(), address: editA.address?.trim() || null, phone: editA.phone?.trim() || null, email: editA.email?.trim() || null, website: web ? (/^https?:\/\//i.test(web) ? web : 'https://' + web) : null }
    if (editA.id) {
      const { error } = await supabase.from('profile_agents').update(row).eq('id', editA.id)
      if (error) { toast('Couldn’t save'); return }
      setAgents(l => l.map(x => x.id === editA.id ? { ...x, ...row } : x))
    } else {
      const { data, error } = await supabase.from('profile_agents').insert({ ...row, profile_id: uid, sort_order: agents.length }).select('id, kind, agency_name, address, phone, email, website, sort_order').single()
      if (error || !data) { toast('Couldn’t save'); return }
      setAgents(l => [...l, data as Agent])
    }
    setEditA(null)
  }
  const removeAgent = async (id: string) => {
    if (!confirm('Remove this agency?')) return
    setAgents(l => l.filter(x => x.id !== id)); setEditA(null)
    await supabase.from('profile_agents').delete().eq('id', id)
  }

  const setLevel = async (s: Skill, level: string | null) => {
    onSkills(skills.map(x => x.id === s.id ? { ...x, level } : x))
    const { error } = await supabase.from('profile_skills').update({ level }).eq('profile_id', uid).eq('skill_id', s.id)
    if (error) toast('Couldn’t save that')
  }

  return (
    <>
      <section id="training" className="scroll-mt-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px]">Training</h2><button type="button" onClick={() => setEditT({})} className="text-sm font-semibold text-green-ink">+ Add</button></div>
        {training.length === 0 ? <p className="text-sm text-muted">Drama school, dance college, courses and teachers.</p> : (
          <Card className="divide-y divide-line">
            {training.map(t => (
              <button key={t.id} type="button" onClick={() => setEditT(t)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">{t.school}</span><span className="block text-[13px] text-muted">{[t.course, t.years].filter(Boolean).join(' · ')}</span></span>
                <Icon name="pen" className="mt-1 size-4 text-faint" />
              </button>
            ))}
          </Card>
        )}
      </section>

      {skills.length > 0 && (
        <section id="skill-levels" className="scroll-mt-4">
          <h2 className="text-[18px]">Skill levels</h2>
          <p className="mb-3 mt-1 text-[13px] text-muted">Optional — shown next to each skill, as on Spotlight.</p>
          <Card className="divide-y divide-line">
            {skills.map(s => (
              <label key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[15px]">{s.name}</span>
                <select value={s.level || ''} onChange={e => setLevel(s, e.target.value || null)} className="rounded-lg bg-transparent px-2 py-1.5 text-right text-[14px] font-medium outline-none focus:bg-field">
                  <option value="">—</option>
                  {SKILL_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
            ))}
          </Card>
        </section>
      )}

      <section id="cv-extras" className="scroll-mt-4">
        <h2 className="mb-3 text-[18px]">More CV details</h2>
        <Card className="divide-y divide-line">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex-1 text-[15px] text-muted">Weight</span>
            <input aria-label="Weight" maxLength={40} value={d.weight} onChange={e => setD(p => ({ ...p, weight: e.target.value }))} placeholder="e.g. 11st 2lb" className="w-36 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
          </div>
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex-1 text-[15px] text-muted">Headshot by</span>
            <input aria-label="Headshot photographer" maxLength={80} value={d.headshot_credit} onChange={e => setD(p => ({ ...p, headshot_credit: e.target.value }))} placeholder="Photographer’s name" className="w-44 rounded-lg bg-transparent px-2 py-1.5 text-right text-[15px] font-medium outline-none focus:bg-field" />
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex-1"><p className="text-[15px] font-medium">Show my actual age</p><p className="text-[13px] text-muted">{hasDob ? 'Worked out from your date of birth, which stays private.' : 'Add your date of birth first — it’s never shown, only your age.'}</p></div>
              <Toggle checked={d.show_age && !!hasDob} onChange={v => { if (!hasDob) { toast('Add your date of birth first'); return } setD(p => ({ ...p, show_age: v })) }} label="Show my actual age" />
            </div>
            {hasDob === false && (
              <div className="mt-3 flex gap-2">
                <Field className="flex-1" type="date" value={dob} max={new Date().toISOString().slice(0, 10)} min="1920-01-01" onChange={e => setDob(e.target.value)} />
                <Button variant="outline" onClick={saveDob} disabled={!dob}>Save</Button>
              </div>
            )}
          </div>
        </Card>
      </section>

      <section id="agencies" className="scroll-mt-4">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px]">Other agencies</h2><button type="button" onClick={() => setEditA({ kind: 'Commercial' })} className="text-sm font-semibold text-green-ink">+ Add</button></div>
        {agents.length === 0 ? <p className="text-sm text-muted">A commercials, voice or presenting agent alongside your main one.</p> : (
          <Card className="divide-y divide-line">
            {agents.map(a => (
              <button key={a.id} type="button" onClick={() => setEditA(a)} className="flex w-full items-start gap-3 px-4 py-3 text-left">
                <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">{a.agency_name}{a.kind && <span className="ml-2 rounded-full bg-chip px-2 py-0.5 text-[11px] font-semibold text-muted-strong">{a.kind}</span>}</span><span className="block truncate text-[13px] text-muted">{[a.email, a.phone].filter(Boolean).join(' · ')}</span></span>
                <Icon name="pen" className="mt-1 size-4 text-faint" />
              </button>
            ))}
          </Card>
        )}
      </section>

      <Sheet open={!!editT} onClose={() => setEditT(null)} title={editT?.id ? 'Edit training' : 'Add training'}>
        {editT && (
          <div className="space-y-4">
            <Field label="School or teacher" value={editT.school || ''} onChange={e => setEditT(p => ({ ...p, school: e.target.value }))} placeholder="e.g. Bird College" autoFocus />
            <Field label="Course (optional)" value={editT.course || ''} onChange={e => setEditT(p => ({ ...p, course: e.target.value }))} placeholder="e.g. BA (Hons) Professional Dance & Musical Theatre" />
            <Field label="Years (optional)" value={editT.years || ''} onChange={e => setEditT(p => ({ ...p, years: e.target.value }))} placeholder="e.g. 2014–2017" />
            <Button full size="lg" onClick={saveTraining}>Save</Button>
            {editT.id && <Button full variant="ghost" onClick={() => removeTraining(editT.id!)}>Remove</Button>}
          </div>
        )}
      </Sheet>

      <Sheet open={!!editA} onClose={() => setEditA(null)} title={editA?.id ? 'Edit agency' : 'Add an agency'}>
        {editA && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {AGENT_KINDS.map(k => <button key={k} type="button" onClick={() => setEditA(p => ({ ...p, kind: k }))} className={cx('h-9 rounded-full border px-3.5 text-[13px] font-medium', editA.kind === k ? 'border-dark bg-dark text-white' : 'border-line bg-surface')}>{k}</button>)}
            </div>
            <Field label="Agency" value={editA.agency_name || ''} onChange={e => setEditA(p => ({ ...p, agency_name: e.target.value }))} placeholder="Agency name" autoFocus />
            <Field label="Address (optional)" value={editA.address || ''} onChange={e => setEditA(p => ({ ...p, address: e.target.value }))} />
            <div className="flex gap-3">
              <Field className="flex-1" label="Phone" type="tel" value={editA.phone || ''} onChange={e => setEditA(p => ({ ...p, phone: e.target.value }))} />
              <Field className="flex-1" label="Email" type="email" value={editA.email || ''} onChange={e => setEditA(p => ({ ...p, email: e.target.value }))} />
            </div>
            <Field label="Website (optional)" value={editA.website || ''} onChange={e => setEditA(p => ({ ...p, website: e.target.value }))} placeholder="agency.co.uk" />
            <p className="text-[12px] text-muted">Agency details are business contacts and show on your profile.</p>
            <Button full size="lg" onClick={saveAgent}>Save</Button>
            {editA.id && <Button full variant="ghost" onClick={() => removeAgent(editA.id!)}>Remove</Button>}
          </div>
        )}
      </Sheet>
    </>
  )
}
