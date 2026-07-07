'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

type Community = {
  id: string; name: string; slug: string; description: string | null
  cover_url: string | null; icon_url: string | null; category: string
  is_private: boolean; member_count: number; is_member: boolean; status: string | null
}

const CATEGORIES = ['All','Dance','Acting','Singing','Fitness','College','Agency','Other']

export default function CommunitiesPage() {
  const router = useRouter()
  const [communities, setCommunities] = useState<Community[]>([])
  const [myCommunities, setMyCommunities] = useState<Community[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'discover' | 'mine'>('mine')
  const [catFilter, setCatFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }

      const [{ data: allComms }, { data: myMemberships }] = await Promise.all([
        supabase.from('communities').select('*').order('created_at', { ascending: false }),
        supabase.from('community_members').select('community_id, status').eq('profile_id', user.id),
      ])
      const comms = allComms || []
      const memberMap = new Map((myMemberships || []).map(m => [m.community_id, m.status]))

      // Count approved members per community (one query)
      const commIds = comms.map(c => c.id)
      let approved: any[] = []
      if (commIds.length) {
        const { data } = await supabase
          .from('community_members')
          .select('community_id')
          .eq('status', 'approved')
          .in('community_id', commIds)
        approved = data || []
      }
      const countMap = new Map<string, number>()
      approved.forEach((m: any) => countMap.set(m.community_id, (countMap.get(m.community_id) || 0) + 1))

      const enriched: Community[] = comms.map((c: any) => ({
        ...c,
        member_count: countMap.get(c.id) || 0,
        is_member: memberMap.has(c.id),
        status: memberMap.get(c.id) || null,
      }))

      setCommunities(enriched.filter(c => !memberMap.has(c.id) || memberMap.get(c.id) !== 'approved'))
      setMyCommunities(enriched.filter(c => memberMap.get(c.id) === 'approved'))
      setLoading(false)
    }
    load()
  }, [])

  const filtered = (tab === 'mine' ? myCommunities : communities).filter(c => {
    if (catFilter !== 'All' && c.category.toLowerCase() !== catFilter.toLowerCase()) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <AppHeader title="Communities" showBack />

      <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/communities/create" style={{ background: '#0c2520', color: '#f1f0ee', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>+ Create</Link>
      </div>

      <div style={{ padding: '0 16px 12px' }}>
        <div style={{ display: 'flex', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px', marginBottom: '14px' }}>
          <button onClick={() => setTab('mine')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === 'mine' ? '#0c2520' : 'transparent', color: tab === 'mine' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === 'mine' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>My Communities</button>
          <button onClick={() => setTab('discover')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === 'discover' ? '#0c2520' : 'transparent', color: tab === 'discover' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === 'discover' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>Discover</button>
        </div>

        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities..." style={{ width: '100%', padding: '11px 14px 11px 38px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '13px', fontFamily: 'inherit', background: 'white', boxSizing: 'border-box', color: '#0c2520' }} />
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '4px' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCatFilter(c)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', border: catFilter === c ? 'none' : '1px solid #e0ddd5', background: catFilter === c ? '#0c2520' : 'white', color: catFilter === c ? '#f1f0ee' : '#888', fontWeight: catFilter === c ? 600 : 400, whiteSpace: 'nowrap' }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '48px 24px', textAlign: 'center' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', color: '#0c2520', margin: '0 0 6px' }}>{tab === 'mine' ? 'No communities yet' : 'Nothing found'}</p>
            <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>{tab === 'mine' ? 'Join or create a community to get started' : 'Try a different search or category'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map(c => (
              <Link key={c.id} href={'/communities/' + c.slug} style={{ textDecoration: 'none' }}>
                <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
                  {/* Banner with name overlaid */}
                  <div style={{ height: '128px', position: 'relative', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : 'linear-gradient(135deg, #0c2520, #1a4a3a)', backgroundSize: 'cover' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.72))' }} />

                    {c.status === 'pending' && (
                      <span style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '10px', fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: '3px 8px', borderRadius: '6px' }}>PENDING</span>
                    )}

                    <div style={{ position: 'absolute', left: '16px', right: '16px', bottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '5px' }}>
                        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '19px', fontWeight: 500, color: '#fff', margin: 0 }}>{c.name}</p>
                        {c.is_private && (
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)' }}>{c.member_count} member{c.member_count !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: '10px', color: '#fff', background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: '4px' }}>{c.category}</span>
                        {c.is_private && <span style={{ fontSize: '9px', fontWeight: 600, color: '#fde68a', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px' }}>RESTRICTED</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
