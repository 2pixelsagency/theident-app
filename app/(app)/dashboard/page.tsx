'use client'

import { useState, useEffect } from 'react'
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

export default function Dashboard() {
  const router = useRouter()
  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [jobs, setJobs] = useState<ScoredJob[]>([])
  const [spotlightJobs, setSpotlightJobs] = useState<Job[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<{ first_name: string | null; picture_url: string | null } | null>(null)

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

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      const [pt, spot] = await Promise.all([
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('jobs').select('*').eq('is_spotlighted', true).eq('is_published', true).order('created_at', { ascending: false }).limit(3),
      ])

      setProductionTypes(pt.data || [])
      setSpotlightJobs(spot.data || [])

      if (user) {
        const [{ data: saved }, { data: prof }, { data: userSkills }] = await Promise.all([
          supabase.from('saved_jobs').select('job_id').eq('profile_id', user.id),
          supabase.from('profiles').select('first_name, picture_url, location, minimum_age, maximum_age, gender_id, ethnicity_id, hair_colour_id, eye_colour_id').eq('id', user.id).single(),
          supabase.from('profile_skills').select('skill_id').eq('profile_id', user.id),
        ])
        setSavedIds(new Set((saved || []).map(s => s.job_id)))
        if (prof) {
          setProfile({ first_name: prof.first_name, picture_url: prof.picture_url })
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
      let score = 0
      const reasons: string[] = []
      let excluded = false

      if (job.gender_ids && job.gender_ids.length > 0) {
        if (userGenderId && job.gender_ids.includes(userGenderId)) { score += 5; reasons.push('Gender matches') }
        else { excluded = true }
      } else { score += 5 }

      if (job.age_range && !excluded) {
        const m = job.age_range.match(/(\d+)\s*-\s*(\d+)/)
        if (m && userMinAge !== null && userMaxAge !== null) {
          const jobMin = parseInt(m[1]); const jobMax = parseInt(m[2])
          if (userMinAge <= jobMax && userMaxAge >= jobMin) { score += 5; reasons.push(`Age ${jobMin}–${jobMax} fits`) }
          else { excluded = true }
        }
      } else if (!excluded) { score += 5 }

      let matchingSkillCount = 0
      jobSkills.forEach(sid => { if (userSkillIds.has(sid)) matchingSkillCount++ })
      if (matchingSkillCount > 0) {
        score += Math.min(matchingSkillCount * 3, 12)
        reasons.push(`${matchingSkillCount} skill${matchingSkillCount === 1 ? '' : 's'} match`)
      }

      if (job.ethnicity_ids && job.ethnicity_ids.length > 0) {
        if (userEthnicityId && job.ethnicity_ids.includes(userEthnicityId)) score += 2
      } else { score += 2 }

      if (job.hair_colour_ids && job.hair_colour_ids.length > 0) {
        if (userHairColourId && job.hair_colour_ids.includes(userHairColourId)) score += 1
      } else { score += 1 }

      if (job.eye_colour_ids && job.eye_colour_ids.length > 0) {
        if (userEyeColourId && job.eye_colour_ids.includes(userEyeColourId)) score += 1
      } else { score += 1 }

      if (userLocation && job.location && job.location.toLowerCase().includes(userLocation.toLowerCase())) {
        score += 1; reasons.push(`Based in ${userLocation}`)
      }

      let tier: 'strong' | 'good' | 'none' = 'none'
      if (!excluded) {
        if (score >= 10) tier = 'strong'
        else if (score >= 6) tier = 'good'
      }

      return { ...job, matchScore: excluded ? 0 : score, matchTier: tier, matchReasons: reasons, excluded }
    }

    const loadJobs = async () => {
      let query = supabase.from('jobs').select('*').eq('is_published', true).eq('is_side_hustle', showSideHustle)
      if (selectedProductionTypes.length > 0) query = query.in('production_type_id', selectedProductionTypes)
      if (locationSearch) query = query.ilike('location', `%${locationSearch}%`)
      if (keywordSearch) query = query.or(`project_role.ilike.%${keywordSearch}%,project_in.ilike.%${keywordSearch}%,short_summary.ilike.%${keywordSearch}%,job_title.ilike.%${keywordSearch}%`)
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
      if (sortBy === 'oldest') query = query.order('created_at', { ascending: true })

      const { data } = await query
      const result = data || []
      const jobIds = result.map(j => j.id)
      const jobSkillsMap = new Map<string, Set<number>>()

      if (jobIds.length > 0) {
        const { data: jobSkillsData } = await supabase.from('job_skills').select('job_id, skill_id').in('job_id', jobIds)
        ;(jobSkillsData || []).forEach(js => {
          if (!jobSkillsMap.has(js.job_id)) jobSkillsMap.set(js.job_id, new Set())
          jobSkillsMap.get(js.job_id)!.add(js.skill_id)
        })
      }

      const scored: ScoredJob[] = result.map(job => scoreJob(job, jobSkillsMap.get(job.id) || new Set()))
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
        filtered = [...filtered].sort((a, b) => b.matchScore - a.matchScore)
      }

      setJobs(filtered)
    }

    if (!loading) loadJobs()
  }, [selectedProductionTypes, minAge, maxAge, locationSearch, keywordSearch, showSideHustle, sortBy, matchFilter, loading, userLocation, userMinAge, userMaxAge, userGenderId, userEthnicityId, userHairColourId, userEyeColourId, userSkillIds])

  const clearAllFilters = () => {
    setSelectedProductionTypes([])
    setMinAge(0); setMaxAge(100)
    setLocationSearch(''); setKeywordSearch('')
    setMatchFilter('all')
  }

  const hasActiveFilters = selectedProductionTypes.length > 0 || minAge > 0 || maxAge < 100 || !!locationSearch || !!keywordSearch || matchFilter !== 'all'
  const activeFilterCount = selectedProductionTypes.length + (minAge > 0 || maxAge < 100 ? 1 : 0) + (locationSearch ? 1 : 0) + (matchFilter !== 'all' ? 1 : 0)

  const getProductionTypeName = (id: number | null) => productionTypes.find(pt => pt.id === id)?.name || null

  const formatRelativeDate = (dateStr: string) => {
    const diffDays = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 14) return 'Last week'
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return 'Last month'
  }

  const getSentBy = (job: Job) => job.is_side_hustle ? job.company : (job.casting_team || job.production_company)

  const toggleSave = async (e: React.MouseEvent, jobId: string) => {
    e.preventDefault(); e.stopPropagation()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    if (savedIds.has(jobId)) {
      await supabase.from('saved_jobs').delete().eq('profile_id', user.id).eq('job_id', jobId)
      const s = new Set(savedIds); s.delete(jobId); setSavedIds(s)
    } else {
      await supabase.from('saved_jobs').insert({ profile_id: user.id, job_id: jobId })
      const s = new Set(savedIds); s.add(jobId); setSavedIds(s)
    }
  }

  const getGreeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  if (loading) return <div />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        .job-card { transition: transform 0.2s ease, box-shadow 0.2s ease; }
        .job-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(12,37,32,0.08); }
        .save-btn:hover { background: #0c2520 !important; color: #f1f0ee !important; border-color: #0c2520 !important; }
        .spot-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .spot-scroll::-webkit-scrollbar { display: none; }
        .pill-scroll { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; -webkit-overflow-scrolling: touch; padding-bottom: 2px; }
        .pill-scroll::-webkit-scrollbar { display: none; }
        .range-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #d4d2cc; border-radius: 2px; outline: none; }
        .range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; background: #0c2520; border-radius: 50%; cursor: pointer; }
        input[type=text]:focus, input[type=search]:focus { border-color: #0c2520 !important; outline: none; box-shadow: 0 0 0 1px #0c2520; }
      `}</style>

      <div className="fade-in">

        {/* Greeting */}
        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 3px' }}>{getGreeting()}</p>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '22px', color: '#0c2520', margin: 0, fontWeight: 500 }}>
                {profile?.first_name || 'Welcome back'}
              </p>
            </div>
            <Link href="/profile">
              <div style={{
                width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
                background: profile?.picture_url ? `url(${profile.picture_url}) center/cover` : '#e8efea',
                border: '2px solid #e0ddd5', cursor: 'pointer',
              }} />
            </Link>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 20px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="search"
              placeholder="Search roles, projects, keywords..."
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              style={{
                width: '100%', padding: '13px 14px 13px 42px',
                border: '1px solid #e0ddd5', borderRadius: '12px',
                fontSize: '14px', fontFamily: 'inherit', background: 'white',
                boxSizing: 'border-box', color: '#0c2520',
              }}
            />
          </div>
        </div>

        {/* Spotlight */}
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0c2520', margin: '0 0 12px', fontWeight: 500, paddingLeft: '16px' }}>In the spotlight</p>
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
                  const isMint = i % 2 === 1
                  const title = job.is_side_hustle ? job.job_title : job.project_role
                  const subtitle = job.is_side_hustle ? job.company : job.project_in
                  const prodTypeName = getProductionTypeName(job.production_type_id)
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
                      <div className="job-card" style={{
                        width: '220px', minHeight: '170px',
                        background: isMint ? '#92d7af' : '#061410',
                        borderRadius: '14px', padding: '18px',
                        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                      }}>
                        <div>
                          <p style={{ fontSize: '10px', color: isMint ? '#0c2520' : '#4ade80', margin: '0 0 8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spotlight</p>
                          <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '15px', color: isMint ? '#0c2520' : '#f1f0ee', margin: '0 0 4px', fontWeight: 500, lineHeight: 1.2 }}>{title}</h3>
                          {subtitle && <p style={{ fontSize: '11px', color: isMint ? '#0c2520' : '#6b9e8a', margin: '0 0 10px', fontStyle: 'italic' }}>In {subtitle}</p>}
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {job.location && (
                              <span style={{ background: isMint ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', color: isMint ? '#0c2520' : '#e0f0e8', padding: '3px 8px', borderRadius: '5px', fontSize: '10px' }}>
                                {job.location}
                              </span>
                            )}
                            {prodTypeName && (
                              <span style={{ background: isMint ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)', color: isMint ? '#0c2520' : '#e0f0e8', padding: '3px 8px', borderRadius: '5px', fontSize: '10px' }}>
                                {prodTypeName}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                          {job.salary
                            ? <span style={{ fontSize: '11px', background: isMint ? '#0c2520' : '#4ade80', color: isMint ? '#f1f0ee' : '#061410', padding: '3px 8px', borderRadius: '6px', fontWeight: 700 }}>{job.salary}</span>
                            : <span />
                          }
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

        {/* Jobs section */}
        <div>
          <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0c2520', margin: 0, fontWeight: 500 }}>Job opportunities</p>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{ background: hasActiveFilters ? '#0c2520' : '#f1f0ee', color: hasActiveFilters ? '#f1f0ee' : '#0c2520', border: '1px solid #d8d5ce', padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', WebkitTapHighlightColor: 'transparent' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
              </svg>
              Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>

          {/* Filter pills */}
          <div className="pill-scroll" style={{ paddingLeft: '16px', paddingRight: '16px', marginBottom: '14px' }}>
            <button
              onClick={() => { setMatchFilter('all'); setShowSideHustle(false) }}
              style={{ whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: !showSideHustle ? '#0c2520' : '#e8e4de', color: !showSideHustle ? '#f1f0ee' : '#0c2520', fontWeight: !showSideHustle ? 600 : 400, WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}
            >
              Industry jobs
            </button>
            <button
              onClick={() => setShowSideHustle(!showSideHustle)}
              style={{ whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', border: 'none', background: showSideHustle ? '#0c2520' : '#e8e4de', color: showSideHustle ? '#f1f0ee' : '#0c2520', fontWeight: showSideHustle ? 600 : 400, WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}
            >
              Side hustles
            </button>
            <div style={{ width: '1px', background: '#d8d5ce', margin: '0 4px', alignSelf: 'stretch', flexShrink: 0 }} />
            <button
              onClick={() => setMatchFilter(matchFilter === 'good_strong' ? 'all' : 'good_strong')}
              style={{ whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${matchFilter === 'good_strong' ? '#4ade80' : '#d8d5ce'}`, background: matchFilter === 'good_strong' ? 'rgba(74,222,128,0.12)' : 'transparent', color: '#0c2520', fontWeight: matchFilter === 'good_strong' ? 600 : 400, WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}
            >
              Good matches
            </button>
            <button
              onClick={() => setMatchFilter(matchFilter === 'strong' ? 'all' : 'strong')}
              style={{ whiteSpace: 'nowrap', padding: '9px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', border: `1px solid ${matchFilter === 'strong' ? '#4ade80' : '#d8d5ce'}`, background: matchFilter === 'strong' ? '#4ade80' : 'transparent', color: matchFilter === 'strong' ? '#061410' : '#0c2520', fontWeight: matchFilter === 'strong' ? 600 : 400, WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s ease' }}
            >
              Strong matches
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div style={{ margin: '0 16px 16px', background: 'white', borderRadius: '14px', padding: '20px', border: '1px solid #e0ddd5' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: 0 }}>Filters</p>
                {hasActiveFilters && <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#888', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Clear all</button>}
              </div>

              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>Production type</p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {productionTypes.map(pt => (
                  <button key={pt.id}
                    onClick={() => setSelectedProductionTypes(prev => prev.includes(pt.id) ? prev.filter(x => x !== pt.id) : [...prev, pt.id])}
                    style={{ padding: '7px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', border: selectedProductionTypes.includes(pt.id) ? '1px solid #0c2520' : '1px solid #e0ddd5', background: selectedProductionTypes.includes(pt.id) ? '#0c2520' : 'white', color: selectedProductionTypes.includes(pt.id) ? '#f1f0ee' : '#0c2520', WebkitTapHighlightColor: 'transparent' }}>
                    {pt.name}
                  </button>
                ))}
              </div>

              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>Playing age</p>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#0c2520', fontWeight: 500 }}>{minAge} – {maxAge}</span>
                  {(minAge > 0 || maxAge < 100) && <button onClick={() => { setMinAge(0); setMaxAge(100) }} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>Clear</button>}
                </div>
                <input type="range" min="0" max="100" value={minAge} onChange={(e) => { const v = Number(e.target.value); if (v <= maxAge) setMinAge(v) }} className="range-slider" style={{ marginBottom: '10px' }} />
                <input type="range" min="0" max="100" value={maxAge} onChange={(e) => { const v = Number(e.target.value); if (v >= minAge) setMaxAge(v) }} className="range-slider" />
              </div>

              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px', fontWeight: 600 }}>Location</p>
              <input type="text" placeholder="e.g. London" value={locationSearch} onChange={(e) => setLocationSearch(e.target.value)}
                style={{ width: '100%', padding: '11px 12px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '20px', background: '#f9f8f6' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontWeight: 600 }}>Sort by</p>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)}
                  style={{ padding: '9px 12px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', background: 'white', color: '#0c2520' }}>
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="az">Name A–Z</option>
                  <option value="za">Name Z–A</option>
                </select>
              </div>
            </div>
          )}

          <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px', paddingLeft: '16px' }}>
            {jobs.length} {jobs.length === 1 ? 'result' : 'results'}
          </p>

          {jobs.length === 0 ? (
            <div style={{ margin: '0 16px', textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '14px', border: '1px solid #e8e6e0' }}>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>No jobs found</p>
              <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Try adjusting your filters</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0 16px 100px' }}>
              {jobs.map(job => {
                const title = job.is_side_hustle ? job.job_title : job.project_role
                const subtitle = job.is_side_hustle ? job.company : job.project_in
                const productionTypeName = getProductionTypeName(job.production_type_id)
                const sentBy = getSentBy(job)
                const isStrong = job.matchTier === 'strong'
                const isGood = job.matchTier === 'good'
                const isSaved = savedIds.has(job.id)
                return (
                  <Link key={job.id} href={`/jobs/${job.id}`} style={{ textDecoration: 'none' }}>
                    <div className="job-card" style={{ background: 'white', borderRadius: '14px', padding: '16px', border: isStrong ? '1.5px solid #4ade80' : '1px solid #e8e4de', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '14px', right: '14px' }}>
                        <button onClick={(e) => toggleSave(e, job.id)} className="save-btn" style={{ background: isSaved ? '#0c2520' : '#f1f0ee', color: isSaved ? '#f1f0ee' : '#0c2520', border: '1px solid #e0ddd5', padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, WebkitTapHighlightColor: 'transparent' }}>
                          {isSaved ? 'Saved' : 'Save'}
                        </button>
                      </div>
                      <div style={{ paddingRight: '72px' }}>
                        {(isStrong || isGood) && (
                          <span style={{ display: 'inline-block', background: isStrong ? '#4ade80' : 'rgba(74,222,128,0.15)', color: isStrong ? '#061410' : '#0c2520', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                            {isStrong ? 'Strong match' : 'Good match'}
                          </span>
                        )}
                        <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '16px', fontWeight: 500, color: '#0c2520', margin: '0 0 3px', lineHeight: 1.2 }}>{title}</h3>
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
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
