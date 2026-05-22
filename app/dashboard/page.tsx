'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  available: string | null
}

type Lookup = { id: number; name: string }

type Job = {
  id: string
  project_role: string | null
  project_in: string | null
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
}

export default function Dashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [productionTypes, setProductionTypes] = useState<Lookup[]>([])
  const [genders, setGenders] = useState<Lookup[]>([])
  const [ethnicities, setEthnicities] = useState<Lookup[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [spotlightJobs, setSpotlightJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('jobs')

  // Filters
  const [selectedProductionTypes, setSelectedProductionTypes] = useState<number[]>([])
  const [selectedGenders, setSelectedGenders] = useState<number[]>([])
  const [selectedEthnicities, setSelectedEthnicities] = useState<number[]>([])
  const [minAge, setMinAge] = useState(0)
  const [maxAge, setMaxAge] = useState(100)
  const [locationSearch, setLocationSearch] = useState('')
  const [keywordSearch, setKeywordSearch] = useState('')
  const [showSideHustle, setShowSideHustle] = useState(false)

  // Open dropdown tracking
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const [{ data: p }, { data: pt }, { data: g }, { data: e }, { data: spot }] = await Promise.all([
        supabase.from('profiles').select('id, first_name, last_name, picture_url, available').eq('id', user.id).single(),
        supabase.from('production_types').select('id, name').order('name'),
        supabase.from('genders').select('id, name').order('id'),
        supabase.from('ethnicities').select('id, name').order('name'),
        supabase.from('jobs').select('*').eq('is_spotlighted', true).eq('is_published', true).order('created_at', { ascending: false }).limit(2),
      ])

      setProfile(p)
      setProductionTypes(pt || [])
      setGenders(g || [])
      setEthnicities(e || [])
      setSpotlightJobs(spot || [])
      setLoading(false)
    }
    load()
  }, [router])

  // Load jobs when filters change
  useEffect(() => {
    const loadJobs = async () => {
      let query = supabase.from('jobs').select('*').eq('is_published', true).eq('is_side_hustle', showSideHustle)

      if (selectedProductionTypes.length > 0) query = query.in('production_type_id', selectedProductionTypes)
      if (locationSearch) query = query.ilike('location', `%${locationSearch}%`)
      if (keywordSearch) {
        query = query.or(`project_role.ilike.%${keywordSearch}%,project_in.ilike.%${keywordSearch}%,short_summary.ilike.%${keywordSearch}%,job_title.ilike.%${keywordSearch}%`)
      }

      const { data } = await query.order('created_at', { ascending: false })
      setJobs(data || [])
    }
    if (!loading) loadJobs()
  }, [selectedProductionTypes, selectedGenders, selectedEthnicities, minAge, maxAge, locationSearch, keywordSearch, showSideHustle, loading])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/signup')
  }

  const toggleFilter = (list: number[], setList: (v: number[]) => void, id: number) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  const clearAllFilters = () => {
    setSelectedProductionTypes([])
    setSelectedGenders([])
    setSelectedEthnicities([])
    setMinAge(0)
    setMaxAge(100)
    setLocationSearch('')
    setKeywordSearch('')
  }

  const hasActiveFilters = selectedProductionTypes.length > 0 || selectedGenders.length > 0 || selectedEthnicities.length > 0 || minAge > 0 || maxAge < 100 || locationSearch || keywordSearch

  if (loading || !profile) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  const navItem = (key: string, label: string, icon: string) => (
    <button
      onClick={() => setActiveTab(key)}
      className="nav-item"
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px',
        background: activeTab === key ? '#e8efea' : 'transparent', border: 'none', borderRadius: '8px',
        textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit',
        fontWeight: activeTab === key ? 500 : 400, transition: 'background 0.2s ease',
      }}
    >
      <span style={{ fontSize: '16px' }}>{icon}</span>
      {label}
    </button>
  )

  // Reusable filter pill + dropdown
  const FilterPill = ({ id, label, count }: { id: string; label: string; count: number }) => (
    <button
      onClick={() => setOpenDropdown(openDropdown === id ? null : id)}
      className="filter-pill"
      style={{
        background: count > 0 ? '#e8efea' : 'white',
        border: count > 0 ? '1px solid #0c2520' : '1px solid #e0ddd5',
        padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
        color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', gap: '6px', fontWeight: count > 0 ? 500 : 400,
        transition: 'all 0.2s ease',
      }}
    >
      {label}{count > 0 && ` (${count})`} <span style={{ fontSize: '10px' }}>▼</span>
    </button>
  )

  const DropdownPanel = ({ items, selected, setSelected }: { items: Lookup[]; selected: number[]; setSelected: (v: number[]) => void }) => (
    <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, background: 'white', border: '1px solid #e0ddd5', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px', minWidth: '220px', maxHeight: '320px', overflowY: 'auto', zIndex: 20 }}>
      {items.map(item => (
        <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', cursor: 'pointer', borderRadius: '6px', fontSize: '13px', color: '#0c2520' }} className="dropdown-item">
          <input
            type="checkbox"
            checked={selected.includes(item.id)}
            onChange={() => toggleFilter(selected, setSelected, item.id)}
            style={{ accentColor: '#0c2520', width: '14px', height: '14px' }}
          />
          {item.name}
        </label>
      ))}
      {selected.length > 0 && (
        <button onClick={() => setSelected([])} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', background: 'transparent', border: 'none', fontSize: '12px', color: '#666', cursor: 'pointer', fontFamily: 'inherit', borderTop: '1px solid #e0ddd5', marginTop: '4px' }}>
          Clear
        </button>
      )}
    </div>
  )

  const renderSpotlight = () => {
    if (spotlightJobs.length === 0) {
      // No spotlights — show 3 CTA cards
      return [0, 1, 2].map(i => (
        <div key={i} className="job-card" style={{ background: '#e8e6e0', borderRadius: '12px', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px' }}>Spotlight your job</p>
          <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, textDecoration: 'underline', fontWeight: 500 }}>
            Get your role booked in less<br />than one week
          </p>
        </div>
      ))
    }

    const cards = []
    spotlightJobs.forEach((job, i) => {
      const isMint = i === 0
      cards.push(
        <div key={job.id} className="job-card" style={{ background: isMint ? '#92d7af' : '#0c2520', borderRadius: '12px', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div>
            <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 600, color: isMint ? '#0c2520' : '#f1f0ee', margin: '0 0 8px', lineHeight: 1.2 }}>{job.project_role || job.job_title}</h3>
            {job.project_in && <p style={{ fontSize: '13px', color: isMint ? '#0c2520' : '#a8c4b4', margin: '0 0 12px' }}>In {job.project_in}</p>}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {job.location && <span style={{ background: isMint ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: isMint ? '#0c2520' : '#f1f0ee' }}>{job.location}</span>}
            </div>
          </div>
          <button style={{ background: 'white', color: '#0c2520', border: 'none', padding: '8px 24px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'inherit' }}>Apply</button>
        </div>
      )
    })
    // Fill remaining spots with CTA card
    while (cards.length < 3) {
      cards.push(
        <div key={`cta-${cards.length}`} className="job-card" style={{ background: '#e8e6e0', borderRadius: '12px', padding: '24px', minHeight: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px' }}>Spotlight your job</p>
          <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, textDecoration: 'underline', fontWeight: 500 }}>
            Get your role booked in less<br />than one week
          </p>
        </div>
      )
    }
    return cards
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', fontFamily: 'system-ui, sans-serif', display: 'flex' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .nav-item:hover { background: #e8efea !important; }
        .job-card { transition: all 0.2s ease; }
        .job-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(12, 37, 32, 0.1); }
        .filter-pill:hover { border-color: #0c2520 !important; }
        .dropdown-item:hover { background: #f5f3ee; }
        .range-slider {
          -webkit-appearance: none; appearance: none; width: 100%;
          height: 4px; background: #d4d2cc; border-radius: 2px; outline: none;
        }
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 18px; height: 18px; background: #0c2520; border-radius: 50%; cursor: pointer; border: none;
        }
        .range-slider::-moz-range-thumb {
          width: 18px; height: 18px; background: #0c2520; border-radius: 50%; cursor: pointer; border: none;
        }
        input:focus { border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520 !important; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: '260px', background: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', minHeight: '100vh', borderRight: '1px solid #e8e6e0' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: profile.picture_url ? `url(${profile.picture_url}) center/cover` : '#e8e6e0', margin: '0 auto 12px', border: '1px solid #e0ddd5' }} />
          <p style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600, color: '#0c2520' }}>{profile.first_name} {profile.last_name}</p>
          <button style={{ background: 'white', border: '1px solid #e0ddd5', padding: '6px 16px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', color: '#0c2520', fontFamily: 'inherit', fontWeight: 500 }}>View Ident</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navItem('jobs', 'Jobs', '📋')}
          {navItem('saved', 'Saved Jobs', '🔖')}
          {navItem('post', 'Post a job', '➕')}
          {navItem('browse', 'Browse Talent', '👥')}
          {navItem('news', 'News', '📰')}
        </div>

        <div style={{ marginTop: '32px', paddingTop: '20px', borderTop: '1px solid #e8e6e0' }}>
          <p style={{ fontSize: '10px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px 14px', fontWeight: 600 }}>Your Settings</p>
          {navItem('profile', 'Profile', '⚙️')}
          {navItem('wishlist', 'Wishlist', '❤️')}
          {navItem('billing', 'Billing', '💳')}
          <button onClick={handleLogout} className="nav-item" style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '16px' }}>↪️</span>
            Logout
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>

          {/* In the Spotlight */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 16px' }}>In the Spotlight</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              {renderSpotlight()}
            </div>
          </section>

          {/* Job Opportunities */}
          <section style={{ background: 'white', borderRadius: '16px', padding: '32px', border: '1px solid #e8e6e0' }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', fontWeight: 500, color: '#0c2520', margin: '0 0 20px' }}>Job Opportunities</h2>

            {/* Filters row */}
            <div ref={dropdownRef} style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center', position: 'relative' }}>

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

              {/* Age */}
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

              <input
                type="text"
                placeholder="Location"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                style={{ flex: 1, minWidth: '120px', padding: '8px 14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
              />

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0c2520', cursor: 'pointer' }}>
                <input type="checkbox" checked={showSideHustle} onChange={(e) => setShowSideHustle(e.target.checked)} style={{ accentColor: '#0c2520', width: '14px', height: '14px' }} />
                Show Side Hustle
              </label>
            </div>

            <input
              type="text"
              placeholder="Search by role, project or keyword"
              value={keywordSearch}
              onChange={(e) => setKeywordSearch(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', marginBottom: '24px', boxSizing: 'border-box' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e8e6e0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <p style={{ fontSize: '13px', color: '#0c2520', margin: 0, fontWeight: 500 }}>{jobs.length} {jobs.length === 1 ? 'result' : 'results'}</p>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} style={{ background: 'transparent', border: 'none', fontSize: '12px', color: '#666', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>Clear all filters</button>
                )}
              </div>
              <button style={{ background: 'transparent', border: 'none', fontSize: '13px', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Sort By <span style={{ fontSize: '10px' }}>▼</span>
              </button>
            </div>

            {/* Job results */}
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#0c2520', margin: '0 0 8px' }}>No jobs found</p>
                <p style={{ fontSize: '13px', color: '#666', margin: 0 }}>{showSideHustle ? 'No side hustles match your filters.' : 'No industry jobs match your filters.'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {jobs.map(job => (
                  <div key={job.id} className="job-card" style={{ padding: '20px', border: '1px solid #e8e6e0', borderRadius: '12px', cursor: 'pointer', background: 'white' }}>
                    <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: '0 0 4px' }}>{job.project_role || job.job_title}</h3>
                    {job.project_in && <p style={{ fontSize: '13px', color: '#666', margin: '0 0 8px' }}>In {job.project_in}</p>}
                    {job.short_summary && <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 12px' }}>{job.short_summary}</p>}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {job.location && <span style={{ background: '#f1f0ee', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#0c2520' }}>{job.location}</span>}
                      {job.is_side_hustle && <span style={{ background: '#fde6c2', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#8a5a2e' }}>Side Hustle</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>
    </div>
  )
}
