'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type TalentProfile = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  location: string | null
  slug: string | null
  availability_status: string | null
  production_until: string | null
  minimum_age: number | null
  maximum_age: number | null
  gender_id: number | null
  last_active: string | null
  skills: { name: string; color: string; text_color: string }[]
  gallery: string[]
}

type Gender = { id: number; name: string }
type Skill = { id: number; name: string }

function ImageCarousel({ images, slug }: { images: string[]; slug: string | null }) {
  const [active, setActive] = useState(0)
  const startX = useRef(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = startX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) {
      if (diff > 0 && active < images.length - 1) setActive(active + 1)
      if (diff < 0 && active > 0) setActive(active - 1)
    }
  }

  if (images.length === 0) return (
    <Link href={slug ? '/' + slug + '?from=app' : '#'} style={{ textDecoration: 'none' }}>
      <div style={{ width: '100%', aspectRatio: '1/1', background: '#e8efea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4d2cc" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      </div>
    </Link>
  )

  return (
    <div style={{ width: '100%', aspectRatio: '1/1', position: 'relative', overflow: 'hidden' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      <Link href={slug ? '/' + slug + '?from=app' : '#'} style={{ textDecoration: 'none' }}>
        <div style={{ width: '100%', height: '100%', background: 'url(' + images[active] + ') center/cover', backgroundSize: 'cover', transition: 'background-image 0.3s ease' }} />
      </Link>
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '8px', left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: '3px' }}>
          {images.map((_, i) => (
            <div key={i} style={{
              width: i === active ? '12px' : '4px', height: '4px', borderRadius: '2px',
              background: i === active ? 'white' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s ease',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function BrowseTalent() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<TalentProfile[]>([])
  const [allProfiles, setAllProfiles] = useState<TalentProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentProfile, setCurrentProfile] = useState<{ first_name: string | null; picture_url: string | null } | null>(null)
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, string>>({})
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const [genders, setGenders] = useState<Gender[]>([])
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [selectedGender, setSelectedGender] = useState<number | null>(null)
  const [selectedSkills, setSelectedSkills] = useState<number[]>([])
  const [locationFilter, setLocationFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState<string>('')
  const [minAge, setMinAge] = useState(0)
  const [maxAge, setMaxAge] = useState(100)

  const sheetRef = useRef<HTMLDivElement>(null)

  const isOnline = (lastActive: string | null) => {
    if (!lastActive) return false
    return (Date.now() - new Date(lastActive).getTime()) < 15 * 60 * 1000
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
        await supabase.from('profiles').update({ last_active: new Date().toISOString() }).eq('id', user.id)
        const { data: myProf } = await supabase.from('profiles').select('first_name, picture_url').eq('id', user.id).single()
        if (myProf) setCurrentProfile(myProf)
        const { data: notifData } = await supabase.from('notifications').select('*').eq('profile_id', user.id).eq('read', false).order('created_at', { ascending: false }).limit(10)
        setNotifications(notifData || [])
      }

      const [{ data: genderData }, { data: skillData }] = await Promise.all([
        supabase.from('genders').select('id, name').order('id'),
        supabase.from('skills').select('id, name').order('name'),
      ])
      setGenders(genderData || [])
      setAllSkills(skillData || [])

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, picture_url, location, slug, availability_status, production_until, minimum_age, maximum_age, gender_id, last_active')
        .not('first_name', 'is', null)
        .order('first_name')

      if (profileData) {
        const profileIds = profileData.map(p => p.id)
        const [{ data: skillLinks }, { data: galleryData }] = await Promise.all([
          supabase.from('profile_skills').select('profile_id, skills(name, skills_categories(color, text_color))').in('profile_id', profileIds),
          supabase.from('gallery_images').select('profile_id, url').in('profile_id', profileIds).order('sort_order'),
        ])

        const skillMap = new Map<string, { name: string; color: string; text_color: string }[]>()
        ;(skillLinks || []).forEach((link: any) => {
          if (!link.skills) return
          if (!skillMap.has(link.profile_id)) skillMap.set(link.profile_id, [])
          skillMap.get(link.profile_id)!.push({
            name: link.skills.name,
            color: link.skills.skills_categories?.color || '#e8efea',
            text_color: link.skills.skills_categories?.text_color || '#0c2520',
          })
        })

        const galleryMap = new Map<string, string[]>()
        ;(galleryData || []).forEach((g: any) => {
          if (!galleryMap.has(g.profile_id)) galleryMap.set(g.profile_id, [])
          galleryMap.get(g.profile_id)!.push(g.url)
        })

        const enriched = profileData.map(p => ({
          ...p,
          skills: skillMap.get(p.id) || [],
          gallery: [...(p.picture_url ? [p.picture_url] : []), ...(galleryMap.get(p.id) || [])],
        }))

        setAllProfiles(enriched)
        setProfiles(enriched)

        if (user) {
          const { data: conns } = await supabase
            .from('connections')
            .select('requester_id, receiver_id, status')
            .or('requester_id.eq.' + user.id + ',receiver_id.eq.' + user.id)
          const statuses: Record<string, string> = {}
          ;(conns || []).forEach(c => {
            const otherId = c.requester_id === user.id ? c.receiver_id : c.requester_id
            statuses[otherId] = c.status
          })
          setConnectionStatuses(statuses)
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let filtered = [...allProfiles]
    if (currentUserId) filtered = filtered.filter(p => p.id !== currentUserId)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(p => {
        const name = ((p.first_name || '') + ' ' + (p.last_name || '')).toLowerCase()
        return name.includes(q) || p.skills.some(s => s.name.toLowerCase().includes(q)) || (p.location || '').toLowerCase().includes(q)
      })
    }
    if (selectedGender !== null) filtered = filtered.filter(p => p.gender_id === selectedGender)
    if (selectedSkills.length > 0) {
      filtered = filtered.filter(p => selectedSkills.every(skillId => {
        const skillName = allSkills.find(s => s.id === skillId)?.name
        return p.skills.some(s => s.name === skillName)
      }))
    }
    if (locationFilter) filtered = filtered.filter(p => (p.location || '').toLowerCase().includes(locationFilter.toLowerCase()))
    if (availabilityFilter) filtered = filtered.filter(p => p.availability_status === availabilityFilter)
    if (minAge > 0 || maxAge < 100) {
      filtered = filtered.filter(p => {
        if (p.minimum_age === null || p.maximum_age === null) return true
        return p.minimum_age <= maxAge && p.maximum_age >= minAge
      })
    }
    setProfiles(filtered)
  }, [searchQuery, selectedGender, selectedSkills, locationFilter, availabilityFilter, minAge, maxAge, allProfiles, currentUserId, allSkills])

  const handleConnect = async (profileId: string) => {
    if (!currentUserId) { router.push('/login'); return }
    if (connectionStatuses[profileId]) return
    await supabase.from('connections').insert({ requester_id: currentUserId, receiver_id: profileId })
    setConnectionStatuses(prev => ({ ...prev, [profileId]: 'pending' }))
  }

  const clearAllFilters = () => {
    setSelectedGender(null); setSelectedSkills([]); setLocationFilter(''); setAvailabilityFilter(''); setMinAge(0); setMaxAge(100)
  }

  const hasActiveFilters = selectedGender !== null || selectedSkills.length > 0 || !!locationFilter || !!availabilityFilter || minAge > 0 || maxAge < 100
  const activeFilterCount = (selectedGender !== null ? 1 : 0) + (selectedSkills.length > 0 ? 1 : 0) + (locationFilter ? 1 : 0) + (availabilityFilter ? 1 : 0) + (minAge > 0 || maxAge < 100 ? 1 : 0)
  const unreadCount = notifications.length

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.92) translateY(-4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }
        .sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .notif-popup { animation: popIn 0.2s ease-out; }
        .talent-card { transition: transform 0.15s ease; -webkit-tap-highlight-color: transparent; }
        .talent-card:active { transform: scale(0.98); }
        .range-slider { -webkit-appearance: none; width: 100%; height: 4px; background: #e0ddd5; border-radius: 2px; outline: none; }
        .range-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; background: #0c2520; border-radius: 50%; cursor: pointer; }
        input[type=text]:focus, input[type=search]:focus { border-color: #0c2520 !important; outline: none; box-shadow: 0 0 0 1px #0c2520; }
        .filter-chip { padding: 8px 14px; border-radius: 20px; font-size: 13px; cursor: pointer; font-family: inherit; border: 1px solid #e0ddd5; background: white; color: #0c2520; transition: all 0.15s ease; -webkit-tap-highlight-color: transparent; }
        .filter-chip.on { background: #0c2520; color: #f1f0ee; border-color: #0c2520; }
        .notif-row:hover { background: #f5f3ee; }
      `}</style>

      {showFilters && <div onClick={() => setShowFilters(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }} />}

      {showFilters && (
        <div ref={sheetRef} className="sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 201, maxHeight: '85vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} />
          </div>
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

            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Gender</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {genders.map(g => (
                <button key={g.id} className={'filter-chip' + (selectedGender === g.id ? ' on' : '')} onClick={() => setSelectedGender(selectedGender === g.id ? null : g.id)}>{g.name}</button>
              ))}
            </div>

            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Skills</p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px', maxHeight: '120px', overflowY: 'auto' }}>
              {allSkills.map(s => (
                <button key={s.id} className={'filter-chip' + (selectedSkills.includes(s.id) ? ' on' : '')}
                  onClick={() => setSelectedSkills(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}>{s.name}</button>
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
            <input type="text" placeholder="e.g. London" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}
              style={{ width: '100%', padding: '13px 14px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '24px', background: 'white' }} />

            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 10px' }}>Availability</p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
              <button className={'filter-chip' + (availabilityFilter === 'available' ? ' on' : '')} onClick={() => setAvailabilityFilter(availabilityFilter === 'available' ? '' : 'available')}>Available now</button>
              <button className={'filter-chip' + (availabilityFilter === 'in_production' ? ' on' : '')} onClick={() => setAvailabilityFilter(availabilityFilter === 'in_production' ? '' : 'in_production')}>In production</button>
            </div>

            <button onClick={() => setShowFilters(false)} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              {activeFilterCount > 0 ? 'Apply (' + activeFilterCount + ')' : 'Apply'}
            </button>
          </div>
        </div>
      )}

      <div className="fade-in">

        {/* Header */}
        <div style={{ padding: '24px 16px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 3px', letterSpacing: '0.02em' }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '20px', color: '#0c2520', margin: 0, fontWeight: 500, lineHeight: 1.2 }}>
                Browse talent
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button onClick={() => setShowNotifications(!showNotifications)}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'white', border: '1px solid #e0ddd5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                  </svg>
                  {unreadCount > 0 && (
                    <div style={{ position: 'absolute', top: '5px', right: '5px', width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', border: '1.5px solid #f1f0ee' }} />
                  )}
                </button>
                {showNotifications && (
                  <div className="notif-popup" style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: '280px', background: 'white', borderRadius: '16px', border: '1px solid #e8e4de', boxShadow: '0 8px 32px rgba(12,37,32,0.12)', zIndex: 300, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #f0ede5' }}>
                      <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 700, color: '#0c2520', margin: 0 }}>Notifications</p>
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                        <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>No new notifications</p>
                      </div>
                    ) : (
                      <div>
                        {notifications.slice(0, 5).map((n: any) => (
                          <div key={n.id} className="notif-row" style={{ padding: '10px 16px', borderBottom: '1px solid #f0ede5', cursor: 'pointer' }}
                            onClick={() => { if (n.data && n.data.url) router.push(n.data.url) }}>
                            <p style={{ fontSize: '13px', color: '#0c2520', margin: '0 0 2px', fontWeight: 500 }}>{n.body}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link href="/profile" style={{ textDecoration: 'none', flexShrink: 0, position: 'relative' }}>
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: currentProfile?.picture_url ? 'url(' + currentProfile.picture_url + ') center/cover' : '#e8efea',
                  backgroundSize: 'cover', border: '2px solid #e0ddd5',
                }} />
                <div style={{ position: 'absolute', bottom: '1px', right: '1px', width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80', border: '2px solid #f1f0ee' }} />
              </Link>
            </div>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="search" placeholder="Search by name, skill, location..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '13px 14px 13px 42px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box', color: '#0c2520' }} />
          </div>
        </div>

        {/* Results + filter */}
        <div style={{ padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
            {profiles.length} {profiles.length === 1 ? 'performer' : 'performers'}
          </p>
          <button onClick={() => setShowFilters(true)} style={{ background: hasActiveFilters ? '#0c2520' : 'white', color: hasActiveFilters ? '#f1f0ee' : '#0c2520', border: '1px solid #e0ddd5', padding: '8px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', WebkitTapHighlightColor: 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filters{activeFilterCount > 0 ? ' (' + activeFilterCount + ')' : ''}
          </button>
        </div>

        {/* Cards */}
        {profiles.length === 0 ? (
          <div style={{ margin: '0 16px', textAlign: 'center', padding: '48px 24px', background: 'white', borderRadius: '14px', border: '1px solid #e8e6e0' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>No talent found</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '0 16px 100px' }}>
            {profiles.map(p => {
              const fullName = ((p.first_name || '') + ' ' + (p.last_name || '')).trim()
              const online = isOnline(p.last_active)
              const primarySkill = p.skills[0]
              const isVerified = false
              return (
                <div key={p.id} className="talent-card" style={{ background: 'white', borderRadius: '14px', overflow: 'hidden', border: '1px solid #e8e4de', display: 'flex', flexDirection: 'column' }}>

                  {/* Image carousel */}
                  <div style={{ position: 'relative' }}>
                    <ImageCarousel images={p.gallery} slug={p.slug} />

                    {/* Online badge */}
                    {online && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: '10px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#4ade80' }} />
                        <span style={{ fontSize: '9px', color: '#f1f0ee', fontWeight: 500 }}>Online</span>
                      </div>
                    )}

                    {/* Availability badge */}
                    {p.availability_status === 'available' && !online && (
                      <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', alignItems: 'center', gap: '4px', background: '#4ade80', padding: '3px 8px', borderRadius: '10px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#061410' }} />
                        <span style={{ fontSize: '9px', color: '#061410', fontWeight: 600 }}>Available</span>
                      </div>
                    )}

                    {/* Skill pill */}
                    {primarySkill && (
                      <span style={{ position: 'absolute', top: '8px', left: '8px', background: primarySkill.color, color: primarySkill.text_color, padding: '3px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, textTransform: 'capitalize' }}>{primarySkill.name}</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <Link href={p.slug ? '/' + p.slug + '?from=app' : '#'} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '15px', fontWeight: 700, color: '#0c2520', margin: 0, lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{fullName}</p>
                        {isVerified && (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#0c2520" stroke="none" style={{ flexShrink: 0 }}>
                            <path d="M12 2L9.5 5 6 4l-1 3.5L2 9l2 3-2 3 3 1.5L6 20l3.5-1 2.5 3 2.5-3 3.5 1 1-3.5L22 15l-2-3 2-3-3-1.5L18 4l-3.5 1z"/>
                            <polyline points="9 12 11 14 15 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                          </svg>
                        )}
                      </div>
                    </Link>

                    {p.location && (
                      <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span style={{ borderBottom: '1px dashed #ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.location}</span>
                      </p>
                    )}

                    {/* Skills */}
                    {p.skills.length > 1 && (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.skills.slice(1, 3).map((s, i) => (
                          <span key={i} style={{ background: '#e8e4de', color: '#666', padding: '2px 7px', borderRadius: '10px', fontSize: '9px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70px' }}>{s.name}</span>
                        ))}
                        {p.skills.length > 3 && <span style={{ fontSize: '9px', color: '#aaa', padding: '2px 2px' }}>+{p.skills.length - 3}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
