'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Community = {
  id: string; name: string; slug: string; description: string | null
  cover_url: string | null; icon_url: string | null; category: string
  is_private: boolean; member_count: number; is_member: boolean; status: string | null
  member_pics: string[]
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: allComms } = await supabase.from('communities').select('*').order('created_at', { ascending: false })
      const { data: myMemberships } = await supabase.from('community_members').select('community_id, status').eq('profile_id', user.id)
      const memberMap = new Map((myMemberships || []).map(m => [m.community_id, m.status]))

      const enriched = await Promise.all((allComms || []).map(async c => {
        const { data: mems } = await supabase.from('community_members').select('profiles(picture_url)').eq('community_id', c.id).eq('status', 'approved').limit(8)
        const pics = (mems || []).map((m: any) => m.profiles?.picture_url).filter(Boolean)
        const { count } = await supabase.from('community_members').select('id', { count: 'exact', head: true }).eq('community_id', c.id).eq('status', 'approved')
        return { ...c, member_count: count || 0, is_member: memberMap.has(c.id), status: memberMap.get(c.id) || null, member_pics: pics }
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
      <div style={{ padding: '24px 16px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '22px', fontWeight: 700, color: '#0c2520', margin: 0 }}>Communities</p>
          <Link href="/communities/create" style={{ background: '#0c2520', color: '#f1f0ee', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, textDecoration: 'none' }}>+ Create</Link>
        </div>

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
                  {/* Cover */}
                  <div style={{ height: '100px', background: c.cover_url ? 'url(' + c.cover_url + ') center/cover' : 'linear-gradient(135deg, #0c2520, #1a4a3a)', backgroundSize: 'cover', position: 'relative' }} />

                  {/* Content */}
                  <div style={{ padding: '0 16px 14px', position: 'relative' }}>
                    {/* Profile pic overlapping cover */}
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', border: '3px solid white', background: c.icon_url ? 'url(' + c.icon_url + ') center/cover' : '#0c2520', backgroundSize: 'cover', position: 'relative', marginTop: '-28px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {!c.icon_url && <span style={{ fontSize: '22px', fontWeight: 700, color: '#f1f0ee' }}>{c.name[0]}</span>}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '17px', fontWeight: 700, color: '#0c2520', margin: 0 }}>{c.name}</p>
                          {c.is_private && (
                            <div style={{ background: '#0c2520', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </div>
                          )}
                        </div>

                        {/* Avatars + meta */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {c.member_pics.length > 0 && (
                            <div style={{ display: 'flex' }}>
                              {c.member_pics.slice(0, 6).map((pic, i) => (
                                <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid white', background: 'url(' + pic + ') center/cover', backgroundSize: 'cover', marginLeft: i > 0 ? '-6px' : '0', zIndex: 6 - i, position: 'relative' }} />
                              ))}
                              {c.member_count > 6 && (
                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid white', background: '#0c2520', marginLeft: '-6px', zIndex: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '7px', fontWeight: 700, color: '#f1f0ee' }}>+{c.member_count - 6}</span>
                                </div>
                              )}
                            </div>
                          )}
                          <span style={{ fontSize: '11px', color: '#888' }}>{c.member_count} member{c.member_count !== 1 ? 's' : ''}</span>
                          <span style={{ fontSize: '10px', color: '#888', background: '#f1f0ee', padding: '2px 8px', borderRadius: '4px' }}>{c.category}</span>
                          {c.is_private && <span style={{ fontSize: '9px', fontWeight: 600, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>RESTRICTED</span>}
                        </div>
                      </div>

                      {c.status === 'pending' && <span style={{ fontSize: '10px', fontWeight: 600, color: '#f59e0b', background: '#fef3c7', padding: '3px 8px', borderRadius: '4px' }}>PENDING</span>}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: '4px' }}><path d="M9 18l6-6-6-6"/></svg>
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
