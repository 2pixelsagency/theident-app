'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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
  gender_requirement: string | null
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
}

type SortOption = 'newest' | 'oldest' | 'az' | 'za'
type MatchFilter = 'all' | 'good_strong' | 'strong'

export default function Dashboard() {
  const router = useRouter()
  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [genders, setGenders] = useState<Lookup[]>([])
  const [ethnicities, setEthnicities] = useState<Lookup[]>([])
  const [jobs, setJobs] = useState<ScoredJob[]>([])
  const [spotlightJobs, setSpotlightJobs] = useState<Job[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  // User profile data for matching
  const [userLocation, setUserLocation] = useState<string | null>(null)
  const [userMinAge, setUserMinAge] = useState<number | null>(null)
  const [userMaxAge, setUserMaxAge] = useState<number | null>(null)
  const [userSkillIds, setUserSkillIds] = useState<Set<number>>(new Set())

  const [selectedProductionTypes, setSelectedProductionTypes] = useState<number[]>([])
  const [selectedGenders, setSelectedGenders] = useState<number[]>([])
  const [selectedEthnicities, setSelectedEthnicities] = useState<number[]>([])
  const [minAge, setMinAge] = useState(0)
  const [maxAge, setMaxAge] = useState(100)
  const [locationSearch, setLocationSearch] = useState('')
  const [keywordSearch, setKeywordSearch] = useState('')
  const [showSideHustle, setShowSideHustle] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all')

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpenDropdown(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [pt, g, e, spot] = await Promise.all([
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('genders').select('id, name').order('id'),
        supabase.from('ethnicities').select('id, name').order('name'),
        supabase.from('jobs').select('*').eq('is_spotlighted', true).eq('is_published', true).order('created_at', { ascending: false }).limit(2),
      ])

      setProductionTypes(pt.data || [])
      setGenders(g.data || [])
      setEthnicities(e.data || [])
      setSpotlightJobs(spot.data || [])

      if (user) {
        const [{ data: saved }, { data: profile }, { data: userSkills }] = await Promise.all([
          supabase.from('saved_jobs').select('job_id').eq('user_id', user.id),
          supabase.from('profiles').select('location, minimum_age, maximum_age').eq('id', user.id).single(),
          supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
        ])
        setSavedIds(new Set((saved || []).map(s => s.job_id)))
        if (profile) {
          setUserLocation(profile.location)
          setUserMinAge(profile.minimum_age)
          setUserMaxAge(profile.maximum_age)
        }
        setUserSkillIds(new Set((userSkills || []).map(s => s.skill_id)))
      }

      setLoading(false)
    }
    load()
  }, [])

  // Score a single job based on user profile
  const scoreJob = async (job: Job): Promise<ScoredJob> => {
    let score = 0
    const reasons: string[] = []

    if (userLocation && job.location && job.location.toLowerCase().includes(userLocation.toLowerCase())) {
      score += 3
      reasons.push(`Based in ${userLocation}`)
    }

    if (userMinAge !== null && userMaxAge !== null && job.age_range) {
      const match = job.age_range.match(/(\d+)\s*-\s*(\d+)/)
      if (match) {
        const jobMin = parseInt(match[1])
        const jobMax = parseInt(match[2])
        if (userMinAge <= jobMax && userMaxAge >= jobMin) {
          score += 4
          reasons.push(`Playing age ${jobMin}–${jobMax} fits yours`)
        }
      }
    }

    return { ...job, matchScore: score, matchTier: 'none', matchReasons: reasons }
  }

  useEffect(() => {
    const loadJobs = async () => {
      let query = supabase.from('jobs').select('*').eq('is_published', true).eq('is_side_hustle', showSideHustle)
      if (selectedProductionTypes.length > 0) query = query.in('production_type_id', selectedProductionTypes)
      if (locationSearch) query = query.ilike('location', `%${locationSearch}%`)
      if (keywordSearch) {
        query = query.or(`project_role.ilike.%${keywordSearch}%,project_in.ilike.%${keywordSearch}%,short_summary.ilike.%${keywordSearch}%,job_title.ilike.%${keywordSearch}%`)
      }

      if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true })

      const { data } = await query
      let result = data || []

      // Load job_skills for all jobs to score skill matches
      const jobIds = result.map(j => j.id)
      const { data: jobSkillsData } = await supabase.from('job_skills').select('job_id, skill_id').in('job_id', jobIds)

      const jobSkillsMap = new Map<string, Set<number>>()
      ;(jobSkillsData || []).forEach(js => {
        if (!jobSkillsMap.has(js.job_id)) jobSkillsMap.set(js.job_id, new Set())
        jobSkillsMap.get(js.job_id)!.add(js.skill_id)
      })

      // Score each job
      const scored: ScoredJob[] = await Promise.all(result.map(async job => {
        const base = await scoreJob(job)

        const jobSkills = jobSkillsMap.get(job.id) || new Set()
        let matchingSkillCount = 0
        jobSkills.forEach(sid => { if (userSkillIds.has(sid)) matchingSkillCount++ })
        if (matchingSkillCount > 0) {
          const skillPoints = Math.min(matchingSkillCount * 2, 10)
          base.matchScore += skillPoints
          base.matchReasons.push(`${matchingSkillCount} of your skill${matchingSkillCount === 1 ? '' : 's'} match${matchingSkillCount === 1 ? 'es' : ''}`)
        }

        if (base.matchScore >= 8) base.matchTier = 'strong'
        else if (base.matchScore >= 5) base.matchTier = 'good'
        else base.matchTier = 'none'

        return base
      }))

      // Filter by match
      let filtered = scored
      if (matchFilter === 'strong') filtered = scored.filter(j => j.matchTier === 'strong')
      if (matchFilter === 'good_strong') filtered = scored.filter(j => j.matchTier === 'strong' || j.matchTier === 'good')

      if (sortBy === 'az' || sortBy === 'za') {
        filtered = [...filtered].sort((a, b) => {
          const ta = (a.is_side_hustle ? a.job_title : a.project_role) || ''
          const tb = (b.is_side_hustle ? b.job_title : b.project_role) || ''
          return sortBy === 'az' ? ta.localeCompare(tb) : tb.localeCompare(ta)
        })
      } else if (matchFilter !== 'all') {
        // When filtering by match, sort by score
        filtered = [...filtered].sort((a, b) => b.matchScore - a.matchScore)
      }

      setJobs(filtered)
    }
    if (!loading) loadJobs()
  }, [selectedProductionTypes, selectedGenders, selectedEthnicities, minAge, maxAge, locationSearch, keywordSearch, showSideHustle, sortBy, matchFilter, loading, userLocation, userMinAge, userMaxAge, userSkillIds])

  const toggleFilter = (list: number[], setList: (v: number[]) => void, id: number) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const clearAllFilters = () => {
    setSelectedProductionTypes([]); setSelectedGenders([]); setSelectedEthnicities([])
    setMinAge(0); setMaxAge(100); setLocationSearch(''); setKeywordSearch(''); setMatchFilter('all')
  }

  const hasActiveFilters = selectedProductionTypes.length > 0 || selectedGenders.length > 0 || selectedEthnicities.length > 0 || minAge > 0 || maxAge < 100 || locationSearch || keywordSearch || matchFilter !== 'all'

  const getProductionTypeName = (id: number | null) => {
    if (!id) return null
    return productionTypes.find(pt => pt.id === id)?.name
  }

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return 'Last week'
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 60) return 'Last month'
    return `${Math.floor(diffDays / 30)} months ago`
  }

  const getSentBy = (job: Job) => {
    return job.is_side_hustle ? job.company : (job.casting_team || job.production_company)
  }

  const toggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.preventDefault()
    e.stopPropagation()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    if (savedIds.has(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId)
      const newSet = new Set(savedIds)
      newSet.delete(jobId)
      setSavedIds(newSet)
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId })
      const newSet = new Set(savedIds)
      newSet.add(jobId)
      setSavedIds(newSet)
    }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const sortLabel = sortBy === 'newest' ? 'Newest first' : sortBy === 'oldest' ? 'Oldest first' : sortBy === 'az' ? 'Name A–Z' : 'Name Z–A'
  const matchLabel = matchFilter === 'all' ? 'Matches' : matchFilter === 'strong' ? 'Strong matches' : 'Good & strong matches'
  const matchCount = matchFilter !== 'all' ? 1 : 0

  const FilterPill = ({ id, label, count }: { id: string; label: string; count: number }) => (
    <button onClick={() => setOpenDropdown(openDropdown === id ? null : id)} className="filter-pill" style={{ background: count > 0 ? '#e8efea' : 'white', border: count > 0 ? '1px solid #0c2520' : '1px solid #e0ddd5', padding: '8px 14px', borderRadius: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: count > 0 ? 500 : 400, transition: 'all 0.2s ease' }}>
      {label}{count > 0 && ` (${count})`} <span style={{ fontSize: '10px' }}>▼</span>
    </button>
  )

  const DropdownPanel = ({ items, selected, setSelected }: { items: Lookup[]; selected: number[]; setSelected: (v: number[]) => void }) => (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'white', border: '1px solid #e0ddd5', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px', minWidth: '220px', maxHeight: '320px', overflowY: 'auto', zIndex: 20 }}>
      {items.map(item => (
        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#0c2520' }} className="dropdown-item">
          <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggleFilter(selected, setSelected, item.id)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
          {item.name}
        </label>
      ))}
      {selected.length > 0 && (
        <button onClick={() => setSelected([])} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'transparent', border: 'none', fontSize: '12px', color: '#666', cursor: 'pointer', fontFamily: 'inherit', borderTop: '1px solid #e0ddd5', marginTop: '4px' }}>Clear</button>
      )}
    </div>
  )

  const SaveButton = ({ jobId, isLightBg = false }: { jobId: string; isLightBg?: boolean }) => {
    const isSaved = savedIds.has(jobId)
    return (
      <button onClick={(e) => toggleSave(e, jobId)} className="save-btn" style={{
        background: isSaved ? '#0c2520' : (isLightBg ? 'white' : 'rgba(255,255,255,0.9)'),
        border: isSaved ? '1px solid #0c2520' : '1px solid #e0ddd5',
        color: isSaved ? '#f1f0ee' : '#0c2520',
        padding: '6px 14px', borderRadius: '20px', fontSize: '12px',
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
        transition: 'all 0.2s ease', whiteSpace: 'nowrap',
      }}>
        {isSaved ? 'Saved' : 'Save'}
      </button>
    )
  }

  const renderSpotlight = () => {
    const ctaCard = (key: string) => (
      <Link key={key} href="/post-job" style={{ textDecoration: 'none' }}>
        <div className="job-card" style={{ background: '#e8e6e0', borderRadius: '12px', padding: '24px', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px' }}>Spotlight your job</p>
          <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, textDecoration: 'underline', fontWeight: 500 }}>Get your role booked in less<br />than one week</p>
        </div>
      </Link>
    )

    const spotlightCard = (job: Job, isMint: boolean) => {
      const title = job.is_side_hustle ? job.job_title : job.project_role
      const subtitle = job.is_side_hustle ? job.company : job.project_in
      const productionTypeName = getProductionTypeName(job.production_type_id)
      const sentBy = getSentBy(job)

      return (
        <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
          <div className="job-card" style={{ background: isMint ? '#92d7af' : '#0c2520', borderRadius: '12px', padding: '24px', minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
              <SaveButton jobId={job.id} isLightBg={isMint} />
            </div>
            <div style={{ paddingRight: '70px' }}>
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: isMint ? '#0c2520' : '#f1f0ee', margin: '0 0 4px', lineHeight: 1.2 }}>{title}</h3>
              {subtitle && <p style={{ fontSize: '13px', color: isMint ? '#0c2520' : '#a8c4b4', margin: '0 0 10px', fontStyle: 'italic' }}>In {subtitle}</p>}

              {job.short_summary && <p style={{ fontSize: '13px', color: isMint ? '#0c2520' : '#cfdfd6', margin: '0 0 12px', lineHeight: 1.4 }}>{job.short_summary}</p>}

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {job.location && <span style={{ background: isMint ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: isMint ? '#0c2520' : '#f1f0ee' }}>{job.location}</span>}
                {productionTypeName && <span style={{ background: isMint ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: isMint ? '#0c2520' : '#f1f0ee' }}>{productionTypeName}</span>}
                {job.salary && <span style={{ background: isMint ? '#0c2520' : '#f1f0ee', color: isMint ? '#f1f0ee' : '#0c2520', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500 }}>{job.salary}</span>}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px' }}>
              <div style={{ fontSize: '11px', color: isMint ? '#0c2520' : '#a8c4b4', lineHeight: 1.4 }}>
                <div style={{ marginBottom: '2px' }}>{formatRelativeDate(job.created_at)}</div>
                {sentBy && <div>Sent by {sentBy}</div>}
              </div>
              <button className="apply-btn" style={{ background: 'white', color: '#0c2520', border: '1px solid white', padding: '8px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease' }}>View</button>
            </div>
          </div>
        </Link>
      )
    }

    if (spotlightJobs.length === 0) {
      return [0, 1, 2].map(i => ctaCard(`cta-${i}`))
    }

    const cards: React.ReactElement[] = []
    spotlightJobs.forEach((job, i) => {
      cards.push(spotlightCard(job, i === 0))
    })
    while (cards.length < 3) {
      cards.push(ctaCard(`cta-fill-${cards.length}`))
    }
    return cards
  }

  return (
    <div style={{ padding: '32px 40px', overflowY: 'auto' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .job-card { transition: all 0.2s ease; }
        .job-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(12, 37, 32, 0.1); }
        .filter-pill:hover { border-color: #0c2520 !important; }
        .dropdown-item:hover { background: #f5f3ee; }
        .save-btn:hover { background: #0c2520 !important; color: #f1f0ee !important; border-color: #0c2520 !important; }
        .apply-btn:hover { background: #0c2520 !important; color: #f1f0ee !important; border-color: #0c2520 !important; }
        .range-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 4px; background: #d4d2cc; border-radius: 2px; outline: none; }
        .range-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 18px; height: 18px; background: #0c2520; border-radius: 50%; cursor: pointer; border: none; }
        .range-slider::-moz-range-thumb { width: 18px; height: 18px; background: #0c2520; border-radius: 50%; cursor: pointer; border: none; }
        input:focus { border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520 !important; }
      `}</style>

      <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <section style={{ marginBottom: '40px' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px' }}>In the Spotlight</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {renderSpotlight()}
          </div>
        </section>

        <section style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0' }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Job Opportunities</h2>

          <div ref={dropdownRef} style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <FilterPill id="matches" label={matchLabel} count={matchCount} />
              {openDropdown === 'matches' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'white', border: '1px solid #e0ddd5', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '6px', minWidth: '220px', zIndex: 20 }}>
                  {(['all', 'good_strong', 'strong'] as MatchFilter[]).map(opt => (
                    <button key={opt} onClick={() => { setMatchFilter(opt); setOpenDropdown(null) }} className="dropdown-item" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: matchFilter === opt ? '#e8efea' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#0c2520', fontFamily: 'inherit', fontWeight: matchFilter === opt ? 500 : 400 }}>
                      {opt === 'all' ? 'All jobs' : opt === 'good_strong' ? 'Good & strong matches' : 'Strong matches only'}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <FilterPill id="production" label="Production Type" count={selectedProductionTypes.length} />
              {openDropdown === 'production' && <DropdownPanel items={productionTypes} selected={selectedProductionTypes} setSelected={setSelectedProductionTypes} />}
            </div>
            <div style={{ position: 'relative' }}>
              <FilterPill id="gender" label="Gender" count={selectedGenders.length} />
              {openDropdown === 'gender' && <DropdownPanel items={genders} selected={selectedGenders} setSelected={setSelectedGenders} />}
            </div>
            <div style={{ position: 'relative' }}>
              <FilterPill id="ethnicity" label="Ethnicity" count={selectedEthnicities.length} />
              {openDropdown === 'ethnicity' && <DropdownPanel items={ethnicities} selected={selectedEthnicities} setSelected={setSelectedEthnicities} />}
            </div>
            <div style={{ position: 'relative' }}>
              <FilterPill id="age" label={minAge > 0 || maxAge < 100 ? `Age ${minAge}-${maxAge}` : 'Age'} count={minAge > 0 || maxAge < 100 ? 1 : 0} />
              {openDropdown === 'age' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'white', border: '1px solid #e0ddd5', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '16px', width: '280px', zIndex: 20 }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#0c2520', fontWeight: 500 }}>Min</label>
                      <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>{minAge}</span>
                    </div>
                    <input type="range" min="0" max="100" value={minAge} onChange={(e) => { const v = Number(e.target.value); if (v <= maxAge) setMinAge(v) }} className="range-slider" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <label style={{ fontSize: '12px', color: '#0c2520', fontWeight: 500 }}>Max</label>
                      <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500 }}>{maxAge}</span>
                    </div>
                    <input type="range" min="0" max="100" value={maxAge} onChange={(e) => { const v = Number(e.target.value); if (v >= minAge) setMaxAge(v) }} className="range-slider" />
                  </div>
                  {(minAge > 0 || maxAge < 100) && (
                    <button onClick={() => { setMinAge(0); setMaxAge(100) }} style={{ width: '100%', textAlign: 'left', padding: '8px 0 0', background: 'transparent', border: 'none', fontSize: '12px', color: '#666', cursor: 'pointer', fontFamily: 'inherit', marginTop: '8px', borderTop: '1px solid #e0ddd5' }}>Clear</button>
                  )}
                </div>
              )}
            </div>
            <input type="text" placeholder="Location" value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)} style={{ flex: 1, minWidth: '120px', padding: '8px 14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
              <input type="checkbox" checked={showSideHustle} onChange={(e) => setShowSideHustle(e.target.checked)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
              Show Side Hustle
            </label>
          </div>

          <input type="text" placeholder="Search by role, project or keyword" value={keywordSearch} onChange={(e) => setKeywordSearch(e.target.value)} style={{ width: '100%', padding: '12px 16px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e8e6e0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{jobs.length} {jobs.length === 1 ? 'result' : 'results'}</p>
              {hasActiveFilters && <button onClick={clearAllFilters} style={{ background: 'transparent', border: 'none', fontSize: '12px', color: '#666', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Clear all filters</button>}
            </div>

            <div style={{ position: 'relative' }}>
              <button onClick={() => setOpenDropdown(openDropdown === 'sort' ? null : 'sort')} style={{ background: 'transparent', border: 'none', fontSize: '13px', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Sort: {sortLabel} <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {openDropdown === 'sort' && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, background: 'white', border: '1px solid #e0ddd5', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '6px', minWidth: '180px', zIndex: 20 }}>
                  {(['newest', 'oldest', 'az', 'za'] as SortOption[]).map(opt => (
                    <button key={opt} onClick={() => { setSortBy(opt); setOpenDropdown(null) }} className="dropdown-item" style={{ width: '100%', textAlign: 'left', padding: '8px 12px', background: sortBy === opt ? '#e8efea' : 'transparent', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', color: '#0c2520', fontFamily: 'inherit', fontWeight: sortBy === opt ? 500 : 400 }}>
                      {opt === 'newest' ? 'Newest first' : opt === 'oldest' ? 'Oldest first' : opt === 'az' ? 'Name A–Z' : 'Name Z–A'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#0c2520', margin: '0 0 8px' }}>No jobs found</p>
              <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{matchFilter !== 'all' ? 'No matches against your profile right now.' : showSideHustle ? 'No side hustles match your filters.' : 'No industry jobs match your filters.'}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobs.map(job => {
                const title = job.is_side_hustle ? job.job_title : job.project_role
                const subtitle = job.is_side_hustle ? job.company : job.project_in
                const productionTypeName = getProductionTypeName(job.production_type_id)
                const sentBy = getSentBy(job)
                const showMatchBadge = job.matchTier !== 'none'
                const isStrong = job.matchTier === 'strong'
                const showMatchReasons = matchFilter !== 'all' && job.matchReasons.length > 0
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                    <div className="job-card" style={{ padding: '20px', border: isStrong && matchFilter !== 'all' ? '2px solid #92d7af' : '1px solid #e8e6e0', borderRadius: '12px', cursor: 'pointer', background: 'white', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                        <SaveButton jobId={job.id} isLightBg={true} />
                      </div>
                      <div style={{ paddingRight: '70px' }}>
                        {showMatchBadge && (
                          <span style={{ display: 'inline-block', background: isStrong ? '#92d7af' : '#e8efea', color: '#0c2520', padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            {isStrong ? 'Strong match' : 'Good match'}
                          </span>
                        )}
                        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: '0 0 4px' }}>{title}</h3>
                        {subtitle && <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px', fontStyle: 'italic' }}>In {subtitle}</p>}
                        {job.short_summary && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 12px' }}>{job.short_summary}</p>}

                        {showMatchReasons && (
                          <div style={{ background: '#f5f3ee', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px' }}>
                            <p style={{ fontSize: '11px', color: '#888', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Why this matches you</p>
                            <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: '#0c2520', lineHeight: 1.6 }}>
                              {job.matchReasons.map((reason, i) => <li key={i}>{reason}</li>)}
                            </ul>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                          {job.location && <span style={{ background: '#f1f0ee', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#0c2520' }}>{job.location}</span>}
                          {productionTypeName && <span style={{ background: '#e8efea', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#0c2520' }}>{productionTypeName}</span>}
                          {job.salary && <span style={{ background: '#0c2520', color: '#f1f0ee', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500 }}>{job.salary}</span>}
                          {job.is_side_hustle && <span style={{ background: '#fde6c2', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#8a5a2e' }}>Side Hustle</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #f0ede5', paddingTop: '12px', marginTop: '4px' }}>
                        <div style={{ fontSize: '11px', color: '#888', lineHeight: 1.4 }}>
                          <div>{formatRelativeDate(job.created_at)}</div>
                          {sentBy && <div>Sent by {sentBy}</div>}
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
