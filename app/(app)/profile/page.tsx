'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

type Lookup = { id: number; name: string }

type Job = {
  id: string
  project_role: string | null
  project_in: string | null
  production_company: string | null
  company: string | null
  casting_team: string | null
  location: string | null
  short_summary: string | null
  is_side_hustle: boolean
  is_spotlighted: boolean
  production_type_id: number | null
  gender_ids: number[] | null
  ethnicity_ids: number[] | null
  hair_colour_ids: number[] | null
  eye_colour_ids: number[] | null
  age_range: string | null
  salary: string | null
  created_at: string
  job_title: string | null
  created_by: string | null
}

type ScoredJob = Job & {
  matchScore: number
  matchTier: 'strong' | 'good' | 'none'
  matchReasons: string[]
  excluded: boolean
}

type SortOption = 'newest' | 'oldest' | 'az' | 'za'
type MatchFilter = 'all' | 'good_strong' | 'strong'
type ActionToast = { type: 'removed' | 'saved'; job: ScoredJob; index: number }

function SwipeableJobCard({ job, productionTypeName, sentBy, formatRelativeDate, onRemove, onSave, onOpen }: {
  job: ScoredJob
  productionTypeName: string | null
  sentBy: string | null
  formatRelativeDate: (s: string) => string
  onRemove: (id: string) => void
  onSave: (id: string) => void
  onOpen: (id: string) => void
}) {
  const [tx, setTx] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const dir = useRef<'h' | 'v' | null>(null)
  const THRESHOLD = 90

  const title = job.is_side_hustle ? job.job_title : job.project_role
  const subtitle = job.is_side_hustle ? job.company : job.project_in
  const isStrong = job.matchTier === 'strong'
  const isGood = job.matchTier === 'good'

  const handleStart = (x: number, y: number) => { startX.current = x; startY.current = y; dir.current = null; setTransitioning(false) }
  const handleMove = (x: number, y: number) => {
    const dx = x - startX.current; const dy = y - startY.current
    if (dir.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) dir.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v'
    if (dir.current === 'h') setTx(dx)
  }
  const handleEnd = () => {
    if (dir.current === 'h') {
      if (tx < -THRESHOLD) { setTransitioning(true); setTx(-500); setTimeout(() => onRemove(job.id), 200); return }
      if (tx > THRESHOLD) { setTransitioning(true); setTx(500); setTimeout(() => onSave(job.id), 200); return }
    }
    setTransitioning(true); setTx(0)
  }

  const progress = Math.min(Math.abs(tx) / THRESHOLD, 1)

  return (
    <div style={{ position: 'relative', borderRadius: '14px' }}>
      {tx !== 0 && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: '14px', background: tx < 0 ? '#c0392b' : '#0c2520', display: 'flex', alignItems: 'center', justifyContent: tx < 0 ? 'flex-end' : 'flex-start', padding: '0 22px', opacity: progress }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tx < 0 ? '#fff' : '#92d7af', fontSize: '13px', fontWeight: 600 }}>
            {tx < 0 ? (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>Remove</>
            ) : (
              <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>Saved</>
            )}
          </span>
        </div>
      )}
      <div
        onTouchStart={e => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={e => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleEnd}
        onClick={() => { if (Math.abs(tx) < 8) onOpen(job.id) }}
        style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', position: 'relative', transform: 'translateX(' + tx + 'px)', transition: transitioning ? 'transform 0.2s ease' : 'none', cursor: 'pointer', touchAction: 'pan-y' }}
      >
        <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '6px', zIndex: 2 }}>
          <button onClick={e => { e.stopPropagation(); onSave(job.id) }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#f1f0ee', border: '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: 0 }} aria-label="Save">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onRemove(job.id) }} style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#f1f0ee', border: '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', padding: 0 }} aria-label="Remove">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style={{ paddingRight: '76px' }}>
          {(isStrong || isGood) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#888', fontSize: '10px', fontWeight: 500, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isStrong ? '#4ade80' : '#92d7af' }} />
              Match
            </span>
          )}
          <h3 style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '16px', fontWeight: 500, color: '#0c2520', margin: '0 0 3px', lineHeight: 1.2 }}>{title}</h3>
          {subtitle && <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px', fontStyle: 'italic' }}>In {subtitle}</p>}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {job.location && <span style={{ background: '#f1f0ee', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', color: '#0c2520' }}>{job.location}</span>}
            {productionTypeName && <span style={{ background: '#e8efea', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', color: '#0c2520' }}>{productionTypeName}</span>}
            {job.salary && <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', fontWeight: 500 }}>{job.salary}</span>}
            {job.is_side_hustle && <span style={{ background: '#fde6c2', color: '#8a5a2e', padding: '3px 9px', borderRadius: '5px', fontSize: '11px' }}>Side hustle</span>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f0ede5', paddingTop: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#888' }}>{formatRelativeDate(job.created_at)}</span>
          {sentBy && <span style={{ fontSize: '11px', color: '#888' }}>via {sentBy}</span>}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [jobs, setJobs] = useState<ScoredJob[]>([])
  const [spotlightJobs, setSpotlightJobs] = useState<Job[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ first_name: string | null; picture_url: string | null; id: string } | null>(null)
  const [actionToast, setActionToast] = useState<ActionToast | null>(null)
  const [viewRemoved, setViewRemoved] = useState(false)

  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [userMinAge, setUserMinAge] = useState<number | null>(null)
  const [userMaxAge, setUserMaxAge] = useState<number | null>(null)
  const [userGenderId, setUserGenderId] = useState<number | null>(null)
  const [userEthnicityId, setUserEthnicityId] = useState<number | null>(null)
  const [userHairColourId, setUserHairColourId] = useState<number | null>(null)
  const [userEyeColourId, setUserEyeColourId] = useState<number | null>(null)
  const [userSkillIds, setUserSkillIds] = useState<Set<number>>(new Set())

  const [selectedProductionTypes, setSelectedProductionTypes] = useState<number[]>([])
  const [minAge, setMinAge] = useState(0)
  const [maxAge, setMaxAge] = useState(100)
  const [locationSearch, setLocationSearch] = useState('')
  const [keywordSearch, setKeywordSearch] = useState('')
  const [showSideHustle, setShowSideHustle] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')
  const [showFilters, setShowFilters] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)

  const formatRelativeDate = (dateStr: string) => {
    const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return diffDays + ' days ago'
    if (diffDays < 14) return 'Last week'
    if (diffDays < 30) return Math.floor(diffDays / 7) + ' weeks ago'
    return 'Last month'
  }

  useEffect(() => {
    if (!actionToast) return
    const t = setTimeout(() => setActionToast(null), 4000)
    return () => clearTimeout(t)
  }, [actionToast])

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user || null
      const [pt, spot] = await Promise.all([
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('jobs').select('*').eq('is_spotlighted', true).eq('is_published', true).order('created_at', { ascending: false }).limit(3),
      ])
      setProductionTypes(pt.data || [])
      setSpotlightJobs(spot.data || [])
      if (user) {
        const [{ data: saved }, { data: removed }, { data: prof }, { data: userSkills }] = await Promise.all([
          supabase.from('saved_jobs').select('job_id').eq('profile_id', user.id),
          supabase.from('removed_jobs').select('job_id').eq('profile_id', user.id),
          supabase.from('profiles').select('id, first_name, picture_url, location, minimum_age, maximum_age, gender_id, ethnicity_id, hair_colour_id, eye_colour_id').eq('id', user.id).single(),
          supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
        ])
        setSavedIds(new Set((saved || []).map(s => s.job_id)))
        setRemovedIds(new Set((removed || []).map(r => r.job_id)))
        if (prof) {
          setProfile({ id: prof.id, first_name: prof.first_name, picture_url: prof.picture_url })
          setUserLocation(prof.location)
          setUserMinAge(prof.minimum_age)
          setUserMaxAge(prof.maximum_age)
          setUserGenderId(prof.gender_id)
          setUserEthnicityId(prof.ethnicity_id)
          setUserHairColourId(prof.hair_colour_id)
          setUserEyeColourId(prof.eye_colour_id)
        }
        setUserSkillIds(new Set((userSkills || []).map(s => s.skill_id)))
      }
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const scoreJob = (job: Job, jobSkills: Set<number>): ScoredJob => {
      let score = 0; const reasons: string[] = []; let excluded = false
      if (job.gender_ids && job.gender_ids.length > 0) { if (userGenderId && job.gender_ids.includes(userGenderId)) { score += 5; reasons.push('Gender matches') } else { excluded = true } } else { score += 5 }
      if (job.age_range && !excluded) { const m = job.age_range.match(/(\d+)\s*-\s*(\d+)/); if (m && userMinAge !== null && userMaxAge !== null) { const jobMin = parseInt(m[1]); const jobMax = parseInt(m[2]); if (userMinAge <= jobMax && userMaxAge >= jobMin) { score += 5; reasons.push('Age ' + jobMin + '-' + jobMax + ' fits') } else { excluded = true } } } else if (!excluded) { score += 5 }
      let matchingSkillCount = 0; jobSkills.forEach(sid => { if (userSkillIds.has(sid)) matchingSkillCount++ }); if (matchingSkillCount > 0) { score += Math.min(matchingSkillCount * 3, 12); reasons.push(matchingSkillCount + ' skill' + (matchingSkillCount === 1 ? '' : 's') + ' match') }
      if (job.ethnicity_ids && job.ethnicity_ids.length > 0) { if (userEthnicityId && job.ethnicity_ids.includes(userEthnicityId)) score += 2 } else { score += 2 }
      if (job.hair_colour_ids && job.hair_colour_ids.length > 0) { if (userHairColourId && job.hair_colour_ids.includes(userHairColourId)) score += 1 } else { score += 1 }
      if (job.eye_colour_ids && job.eye_colour_ids.length > 0) { if (userEyeColourId && job.eye_colour_ids.includes(userEyeColourId)) score += 1 } else { score += 1 }
      if (userLocation && job.location && job.location.toLowerCase().includes(userLocation.toLowerCase())) { score += 1; reasons.push('Based in ' + userLocation) }
      let tier: 'strong' | 'good' | 'none' = 'none'; if (!excluded) { if (score >= 10) tier = 'strong'; else if (score >= 6) tier = 'good' }
      return { ...job, matchScore: excluded ? 0 : score, matchTier: tier, matchReasons: reasons, excluded }
    }

    const loadJobs = async () => {
      if (viewRemoved) {
        if (!profile) { setJobs([]); return }
        const { data: rem } = await supabase.from('removed_jobs').select('created_at, jobs(*)').eq('profile_id', profile.id).order('created_at', { ascending: false })
        const remJobs: ScoredJob[] = (rem || []).filter((r: any) => r.jobs).map((r: any) => ({ ...(r.jobs as Job), matchScore: 0, matchTier: 'none', matchReasons: [], excluded: false }))
        setJobs(remJobs)
        return
      }

      let query = supabase.from('jobs').select('*').eq('is_published', true).eq('is_side_hustle', showSideHustle)
      if (selectedProductionTypes.length > 0) query = query.in('production_type_id', selectedProductionTypes)
      if (locationSearch) query = query.ilike('location', '%' + locationSearch + '%')
      if (keywordSearch) query = query.or('project_role.ilike.%' + keywordSearch + '%,project_in.ilike.%' + keywordSearch + '%,short_summary.ilike.%' + keywordSearch + '%,job_title.ilike.%' + keywordSearch + '%')
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true })
      const { data } = await query; const result = data || []; const jobIds = result.map(j => j.id)
      const jobSkillsMap = new Map<string, Set<number>>()
      if (jobIds.length > 0) { const { data: jobSkillsData } = await supabase.from('job_skills').select('job_id, skill_id').in('job_id', jobIds); (jobSkillsData || []).forEach(js => { if (!jobSkillsMap.has(js.job_id)) jobSkillsMap.set(js.job_id, new Set()); jobSkillsMap.get(js.job_id)!.add(js.skill_id) }) }
      const scored: ScoredJob[] = result.map(job => scoreJob(job, jobSkillsMap.get(job.id) || new Set())); let filtered = scored
      filtered = filtered.filter(j => !removedIds.has(j.id) && !savedIds.has(j.id))
      if (matchFilter === 'strong') filtered = filtered.filter(j => j.matchTier === 'strong')
      if (matchFilter === 'good_strong') filtered = filtered.filter(j => j.matchTier === 'strong' || j.matchTier === 'good')
      if (sortBy === 'az' || sortBy === 'za') { filtered = [...filtered].sort((a, b) => { const ta = (a.is_side_hustle ? a.job_title : a.project_role) || ''; const tb = (b.is_side_hustle ? b.job_title : b.project_role) || ''; return sortBy === 'az' ? ta.localeCompare(tb) : tb.localeCompare(ta) }) } else if (matchFilter !== 'all') { filtered = [...filtered].sort((a, b) => b.matchScore - a.matchScore) }
      setJobs(filtered)
    }
    if (!loading) loadJobs()
  }, [selectedProductionTypes, minAge, maxAge, locationSearch, keywordSearch, showSideHustle, sortBy, matchFilter, loading, viewRemoved, profile, userLocation, userMinAge, userMaxAge, userGenderId, userEthnicityId, userHairColourId, userEyeColourId, userSkillIds])

  const clearAllFilters = () => { setSelectedProductionTypes([]); setMinAge(0); setMaxAge(100); setLocationSearch(''); setKeywordSearch(''); setMatchFilter('all') }

  const hasActiveFilters = selectedProductionTypes.length > 0 || minAge > 0 || maxAge < 100 || !!locationSearch || !!keywordSearch || matchFilter !== 'all'
  const activeFilterCount = selectedProductionTypes.length + (minAge > 0 || maxAge < 100 ? 1 : 0) + (locationSearch ? 1 : 0) + (matchFilter !== 'all' ? 1 : 0)
  const getProductionTypeName = (id: number | null) => productionTypes.find(pt => pt.id === id)?.name || null
  const getSentBy = (job: Job) => job.is_side_hustle ? job.company : (job.casting_team || job.production_company)

  const handleRemoveJob = async (jobId: string) => {
    const idx = jobs.findIndex(j => j.id === jobId)
    const job = jobs[idx]
    setJobs(prev => prev.filter(j => j.id !== jobId))
    setRemovedIds(prev => { const s = new Set(prev); s.add(jobId); return s })
    if (profile) { try { await supabase.from('removed_jobs').insert({ profile_id: profile.id, job_id: jobId }) } catch {} }
    if (job) setActionToast({ type: 'removed', job, index: idx })
  }

  const handleSaveJob = async (jobId: string) => {
    const idx = jobs.findIndex(j => j.id === jobId)
    const job = jobs[idx]
    setJobs(prev => prev.filter(j => j.id !== jobId))
    setSavedIds(prev => { const s = new Set(prev); s.add(jobId); return s })
    if (profile) { try { await supabase.from('saved_jobs').insert({ profile_id: profile.id, job_id: jobId }) } catch {} }
    if (job) setActionToast({ type: 'saved', job, index: idx })
  }

  const undoAction = async () => {
    if (!actionToast || !profile) return
    const { type, job, index } = actionToast
    if (type === 'removed') {
      try { await supabase.from('removed_jobs').delete().eq('profile_id', profile.id).eq('job_id', job.id) } catch {}
      setRemovedIds(prev => { const s = new Set(prev); s.delete(job.id); return s })
    } else {
      try { await supabase.from('saved_jobs').delete().eq('profile_id', profile.id).eq('job_id', job.id) } catch {}
      setSavedIds(prev => { const s = new Set(prev); s.delete(job.id); return s })
    }
    setJobs(prev => { const copy = [...prev]; copy.splice(Math.min(index, copy.length), 0, job); return copy })
    setActionToast(null)
  }

  const restoreRemoved = async (jobId: string) => {
    if (!profile) return
    try { await supabase.from('removed_jobs').delete().eq('profile_id', profile.id).eq('job_id', jobId) } catch {}
    setRemovedIds(prev => { const s = new Set(prev); s.delete(jobId); return s })
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh' }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .job-card:hover { box-shadow: 0 6px 20px rgba(12,37,32,0.08); }
        .spot-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .spot-scroll::-webkit-scrollbar { display: none; }
        .range-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #e0ddd5; border-radius: 2px; outline: none; }
        .range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; background: #0c2520; border-radius: 50%; cursor: pointer; }
        input[type=text]:focus, input[type=search]:focus { border-color: #0c2520 !important; outline: none; box-shadow: 0 0 0 1px #0c2520; }
        .prod-chip { padding: 8px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; font-family: inherit; border: 1px solid #e0ddd5; background: white; color: #0c2520; transition: all 0.15s ease; -webkit-tap-highlight-color: transparent; }
        .prod-chip.on { background: #0c2520; color: #f1f0ee; border-color: #0c2520; }
      `}</style>

      {/* Undo toast */}
      {actionToast && (
        <div className="toast-anim" style={{ position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '10px 14px 10px 18px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 400, display: 'flex', alignItems: 'center', gap: '14px', whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(12,37,32,0.3)' }}>
          <span>{actionToast.type === 'removed' ? 'Removed' : 'Saved'}</span>
          <button onClick={undoAction} style={{ background: 'transparent', border: 'none', color: '#92d7af', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>Undo</button>
        </div>
      )}

      {showFilters && <div onClick={() => setShowFilters(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />}

      {showFilters && (
        <div ref={sheetRef} className="sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} /></div>
          <div style={{ padding: '8px 20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Filters</p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {hasActiveFilters && <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#888', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>}
                <button onClick={() => setShowFilters(false)} style={{ background: '#0c2520', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>View</p>
            <button onClick={() => setViewRemoved(v => !v)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderRadius: '12px', border: viewRemoved ? 'none' : '1px solid #e0ddd5', background: viewRemoved ? '#0c2520' : 'white', color: viewRemoved ? '#f1f0ee' : '#0c2520', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 500 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Removed jobs
              </span>
              <span style={{ fontSize: '12px', opacity: 0.8 }}>{viewRemoved ? 'On' : 'Off'}</span>
            </button>

            <div style={{ opacity: viewRemoved ? 0.4 : 1, pointerEvents: viewRemoved ? 'none' : 'auto' }}>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Match</p>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                {([['all', 'All jobs'], ['good_strong', 'Good matches'], ['strong', 'Strong matches']] as [MatchFilter, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setMatchFilter(val)} style={{ padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent', border: matchFilter === val ? 'none' : '1px solid #e0ddd5', background: matchFilter === val ? '#0c2520' : 'white', color: matchFilter === val ? '#f1f0ee' : '#0c2520', fontWeight: matchFilter === val ? 500 : 400 }}>{label}</button>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Production type</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {productionTypes.map(pt => (
                  <button key={pt.id} className={'prod-chip' + (selectedProductionTypes.includes(pt.id) ? ' on' : '')} onClick={() => setSelectedProductionTypes(prev => prev.includes(pt.id) ? prev.filter(x => x !== pt.id) : [...prev, pt.id])}>{pt.name}</button>
                ))}
              </div>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Playing age</p>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span style={{ fontSize: '14px', color: '#0c2520', fontWeight: 500 }}>{minAge} - {maxAge}</span>
                  {(minAge > 0 || maxAge < 100) && <button onClick={() => { setMinAge(0); setMaxAge(100) }} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Clear</button>}
                </div>
                <input type="range" min="0" max="100" value={minAge} onChange={(e) => { const v = Number(e.target.value); if (v <= maxAge) setMinAge(v) }} className="range-slider" style={{ marginBottom: '12px' }} />
                <input type="range" min="0" max="100" value={maxAge} onChange={(e) => { const v = Number(e.target.value); if (v >= minAge) setMaxAge(v) }} className="range-slider" />
              </div>
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Location</p>
              <input type="text" placeholder="e.g. London" value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} style={{ width: '100%', padding: '13px 14px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '24px', background: 'white' }} />
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Sort by</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '28px' }}>
                {([['newest', 'Newest first'], ['oldest', 'Oldest first'], ['az', 'Name A-Z'], ['za', 'Name Z-A']] as [SortOption, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)} style={{ padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent', border: sortBy === val ? 'none' : '1px solid #e0ddd5', background: sortBy === val ? '#0c2520' : 'white', color: sortBy === val ? '#f1f0ee' : '#0c2520', fontWeight: sortBy === val ? 500 : 400 }}>{label}</button>
                ))}
              </div>
            </div>

            <button onClick={() => setShowFilters(false)} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {activeFilterCount > 0 ? 'Apply (' + activeFilterCount + ')' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      <div>
        {/* Header */}
        <AppHeader title={'Hey, ' + (profile?.first_name || '')} />

        {/* Saved pill */}
        <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'flex-end' }}>
          <Link href="/saved" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1px solid #e6e2d9', borderRadius: '20px', padding: '8px 14px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span style={{ fontSize: '13px', color: '#0c2520', fontWeight: 500 }}>Saved</span>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 20px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="search" placeholder="Search roles, projects, keywords..." value={keywordSearch} onChange={(e) => setKeywordSearch(e.target.value)} style={{ width: '100%', padding: '13px 14px 13px 42px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box', color: '#0c2520' }} />
          </div>
        </div>

        {/* Spotlight */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 12px', fontWeight: 500, paddingLeft: '16px' }}>In the spotlight</p>
          <div className="spot-scroll" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
            {spotlightJobs.length === 0 ? (
              <Link href="/post-job" style={{ textDecoration: 'none', flexShrink: 0 }}>
                <div style={{ width: '200px', minHeight: '170px', background: '#e8e4de', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                  <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>Spotlight your job</p>
                  <p style={{ fontSize: '12px', color: '#0c2520', margin: 0, textDecoration: 'underline', fontWeight: 500 }}>Get booked in less than a week</p>
                </div>
              </Link>
            ) : (
              <>
                {spotlightJobs.map((job, i) => {
                  const isMint = i % 2 === 1; const title = job.is_side_hustle ? job.job_title : job.project_role; const subtitle = job.is_side_hustle ? job.company : job.project_in; const prodTypeName = getProductionTypeName(job.production_type_id)
                  return (
                    <Link key={job.id} href={'/jobs/' + job.id} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div className="job-card" style={{ width: '220px', minHeight: '170px', background: isMint ? '#92d7af' : '#061410', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontSize: '10px', color: isMint ? '#0c2520' : '#4ade80', margin: '0 0 8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spotlight</p>
                          <h3 style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', color: isMint ? '#0c2520' : '#f1f0ee', margin: '0 0 4px', fontWeight: 500, lineHeight: 1.2 }}>{title}</h3>
                          {subtitle && <p style={{ fontSize: '11px', color: isMint ? '#0c2520' : '#6b9e8a', margin: '0 0 10px', fontStyle: 'italic' }}>In {subtitle}</p>}
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {job.location && <span style={{ background: isMint ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', color: isMint ? '#0c2520' : '#e0f0e8', padding: '3px 8px', borderRadius: '5px', fontSize: '10px' }}>{job.location}</span>}
                            {prodTypeName && <span style={{ background: isMint ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', color: isMint ? '#0c2520' : '#e0f0e8', padding: '3px 8px', borderRadius: '5px', fontSize: '10px' }}>{prodTypeName}</span>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                          {job.salary ? <span style={{ fontSize: '11px', background: isMint ? '#0c2520' : '#4ade80', color: isMint ? '#f1f0ee' : '#061410', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>{job.salary}</span> : <span />}
                          <span style={{ fontSize: '11px', color: isMint ? '#0c2520' : '#6b9e8a' }}>{formatRelativeDate(job.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
                <Link href="/post-job" style={{ textDecoration: 'none', flexShrink: 0 }}>
                  <div style={{ width: '170px', minHeight: '170px', background: '#e8e4de', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#666', margin: '0 0 4px' }}>Spotlight your job</p>
                    <p style={{ fontSize: '12px', color: '#0c2520', margin: 0, textDecoration: 'underline', fontWeight: 500 }}>Get booked in less than a week</p>
                  </div>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Jobs */}
        <div>
          {viewRemoved ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 16px 16px' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: 0, fontWeight: 500 }}>Removed jobs</p>
              <button onClick={() => setViewRemoved(false)} style={{ background: 'white', color: '#0c2520', border: '1px solid #e0ddd5', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', WebkitTapHighlightColor: 'transparent' }}>Back to feed</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', margin: '0 16px 16px', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px' }}>
                <button onClick={() => setShowSideHustle(false)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: !showSideHustle ? 'white' : 'transparent', color: '#0c2520', fontSize: '14px', fontWeight: !showSideHustle ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', boxShadow: !showSideHustle ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', WebkitTapHighlightColor: 'transparent' }}>Industry jobs</button>
                <button onClick={() => setShowSideHustle(true)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: showSideHustle ? 'white' : 'transparent', color: '#0c2520', fontSize: '14px', fontWeight: showSideHustle ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', boxShadow: showSideHustle ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', WebkitTapHighlightColor: 'transparent' }}>Side hustles</button>
              </div>

              <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '8px' }}>
                <p style={{ fontSize: '13px', color: '#888', margin: 0, flex: 1 }}>
                  {jobs.length} {jobs.length === 1 ? 'result' : 'results'}
                </p>
                <button onClick={() => setMatchFilter(matchFilter === 'all' ? 'good_strong' : 'all')} style={{ background: matchFilter !== 'all' ? '#0c2520' : 'white', color: matchFilter !== 'all' ? '#f1f0ee' : '#0c2520', border: '1px solid #e0ddd5', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px', WebkitTapHighlightColor: 'transparent' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill={matchFilter !== 'all' ? '#4ade80' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  Matches
                </button>
                <button onClick={() => setShowFilters(true)} style={{ background: hasActiveFilters ? '#0c2520' : 'white', color: hasActiveFilters ? '#f1f0ee' : '#0c2520', border: '1px solid #e0ddd5', padding: '8px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px', WebkitTapHighlightColor: 'transparent' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
                  Filters{activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : ''}
                </button>
              </div>
            </>
          )}

          {jobs.length === 0 ? (
            <div style={{ margin: '0 16px', textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '14px', border: '1px solid #e8e6e0' }}>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>{viewRemoved ? 'No removed jobs' : 'No jobs found'}</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{viewRemoved ? 'Jobs you swipe away will appear here' : 'Try adjusting your filters'}</p>
            </div>
          ) : viewRemoved ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 16px 100px' }}>
              {jobs.map(job => {
                const title = job.is_side_hustle ? job.job_title : job.project_role
                const subtitle = job.is_side_hustle ? job.company : job.project_in
                const productionTypeName = getProductionTypeName(job.production_type_id)
                return (
                  <div key={job.id} style={{ background: 'white', borderRadius: '14px', padding: '16px', border: '1px solid #e8e4de', position: 'relative', opacity: 0.85 }}>
                    <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                      <button onClick={() => restoreRemoved(job.id)} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}>Restore</button>
                    </div>
                    <div style={{ paddingRight: '76px' }} onClick={() => router.push('/jobs/' + job.id)}>
                      <h3 style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '16px', fontWeight: 500, color: '#0c2520', margin: '0 0 3px', lineHeight: 1.2 }}>{title}</h3>
                      {subtitle && <p style={{ fontSize: '12px', color: '#666', margin: '0 0 10px', fontStyle: 'italic' }}>In {subtitle}</p>}
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                        {job.location && <span style={{ background: '#f1f0ee', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', color: '#0c2520' }}>{job.location}</span>}
                        {productionTypeName && <span style={{ background: '#e8efea', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', color: '#0c2520' }}>{productionTypeName}</span>}
                        {job.salary && <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '3px 9px', borderRadius: '5px', fontSize: '11px', fontWeight: 500 }}>{job.salary}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 16px 100px' }}>
              {jobs.map(job => (
                <SwipeableJobCard
                  key={job.id}
                  job={job}
                  productionTypeName={getProductionTypeName(job.production_type_id)}
                  sentBy={getSentBy(job)}
                  formatRelativeDate={formatRelativeDate}
                  onRemove={handleRemoveJob}
                  onSave={handleSaveJob}
                  onOpen={(id) => router.push('/jobs/' + id)}
                />
              ))}
              <p style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', margin: '8px 0 0' }}>Swipe left to remove · swipe right to save</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
