'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Community = { id: string; name: string; slug: string; description: string | null; cover_url: string | null; category: string; is_private: boolean; owner_id: string }
type Member = { id: string; profile_id: string; role: string; status: string; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null; slug: string | null } | null }
type Post = { id: string; content: string; post_type: string; event_date: string | null; event_time: string | null; event_location: string | null; image_url: string | null; created_at: string; author_id: string; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null } | null; like_count: number; liked: boolean }

export default function CommunityDetail() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [membership, setMembership] = useState<{ role: string; status: string } | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [postType, setPostType] = useState('general')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [posting, setPosting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'feed' | 'members'>('feed')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }
  const isOwner = community?.owner_id === userId
  const isApproved = membership?.status === 'approved'

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: comm } = await supabase.from('communities').select('*').eq('slug', slug).single()
      if (!comm) { setLoading(false); return }
      setCommunity(comm)

      const { data: mem } = await supabase.from('community_members').select('*, profiles(first_name, last_name, picture_url, slug)').eq('community_id', comm.id).order('joined_at')
      setMembers(mem || [])

      const myMem = (mem || []).find(m => m.profile_id === user.id)
      if (myMem) setMembership({ role: myMem.role, status: myMem.status })

      if (!comm.is_private || myMem?.status === 'approved') {
        const { data: postsData } = await supabase.from('community_posts').select('*, profiles(first_name, last_name, picture_url)').eq('community_id', comm.id).order('created_at', { ascending: false })
        if (postsData) {
          const withLikes = await Promise.all(postsData.map(async p => {
            const { count } = await supabase.from('community_post_likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id)
            const { data: myLike } = await supabase.from('community_post_likes').select('id').eq('post_id', p.id).eq('profile_id', user.id).maybeSingle()
            return { ...p, like_count: count || 0, liked: !!myLike }
          }))
          setPosts(withLikes)
        }
      }
      setLoading(false)
    }
    load()
  }, [slug])

  const handleJoin = async () => {
    if (!userId || !community) return
    const status = community.is_private ? 'pending' : 'approved'
    await supabase.from('community_members').insert({ community_id: community.id, profile_id: userId, role: 'member', status })
    setMembership({ role: 'member', status })
    showToast(community.is_private ? 'Request sent' : 'Joined')
  }

  const handleLeave = async () => {
    if (!userId || !community) return
    await supabase.from('community_members').delete().eq('community_id', community.id).eq('profile_id', userId)
    setMembership(null)
    showToast('Left community')
  }

  const handlePost = async () => {
    if (!userId || !community || !newPost.trim()) return
    setPosting(true)
    const { data } = await supabase.from('community_posts').insert({ community_id: community.id, author_id: userId, content: newPost, post_type: postType, event_date: eventDate || null, event_time: eventTime || null, event_location: eventLocation || null }).select('*, profiles(first_name, last_name, picture_url)').single()
    if (data) setPosts([{ ...data, like_count: 0, liked: false }, ...posts])
    setNewPost(''); setPostType('general'); setEventDate(''); setEventTime(''); setEventLocation('')
    setPosting(false)
  }

  const toggleLike = async (postId: string) => {
    if (!userId) return
    const post = posts.find(p => p.id === postId)
    if (!post) return
    if (post.liked) {
      await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('profile_id', userId)
      setPosts(posts.map(p => p.id === postId ? { ...p, liked: false, like_count: p.like_count - 1 } : p))
    } else {
      await supabase.from('community_post_likes').insert({ post_id: postId, profile_id: userId })
      setPosts(posts.map(p => p.id === postId ? { ...p, liked: true, like_count: p.like_count + 1 } : p))
    }
  }

  const handleMemberAction = async (memberId: string, action: 'approve' | 'reject' | 'remove') => {
    if (action === 'approve') {
      await supabase.from('community_members').update({ status: 'approved' }).eq('id', memberId)
      setMembers(members.map(m => m.id === memberId ? { ...m, status: 'approved' } : m))
      showToast('Approved')
    } else if (action === 'reject' || action === 'remove') {
      await supabase.from('community_members').delete().eq('id', memberId)
      setMembers(members.filter(m => m.id !== memberId))
      showToast('Removed')
    }
  }

  const approvedMembers = members.filter(m => m.status === 'approved')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const formatTime = (t: string) => { const [h, m] = t.split(':'); const hr = parseInt(h); return (hr > 12 ? hr - 12 : hr) + ':' + m + (hr >= 12 ? 'pm' : 'am') }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />
  if (!community) return <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#888' }}>Community not found</p></div>

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <style>{`@keyframes toastIn { from { opacity:0;transform:translateX(-50%) translateY(8px); } to { opacity:1;transform:translateX(-50%) translateY(0); } } .toast-anim { animation: toastIn 0.25s ease-out; }`}</style>
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <div style={{ background: community.cover_url ? 'url(' + community.cover_url + ') center/cover' : '#0c2520', backgroundSize: 'cover', padding: '24px 16px', paddingTop: 'max(24px, env(safe-area-inset-top))', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 40%, rgba(0,0,0,0.6))' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button onClick={() => router.push('/communities')} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginBottom: '16px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 4px' }}>{community.name}</p>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{approvedMembers.length} members</span>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{community.category}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        {/* Join/Leave */}
        {!membership && (
          <button onClick={handleJoin} style={{ width: '100%', padding: '14px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px' }}>
            {community.is_private ? 'Request to join' : 'Join community'}
          </button>
        )}
        {membership?.status === 'pending' && (
          <div style={{ width: '100%', padding: '14px', background: '#fef3c7', borderRadius: '30px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: '#92400e', marginBottom: '16px' }}>Request pending</div>
        )}
        {isApproved && !isOwner && (
          <button onClick={handleLeave} style={{ width: '100%', padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #e8e4de', borderRadius: '30px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px' }}>Leave community</button>
        )}

        {community.description && <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, margin: '0 0 16px' }}>{community.description}</p>}

        {/* Tabs */}
        {isApproved && (
          <>
            <div style={{ display: 'flex', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px', marginBottom: '16px' }}>
              <button onClick={() => setTab('feed')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === 'feed' ? '#0c2520' : 'transparent', color: tab === 'feed' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === 'feed' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>Feed</button>
              <button onClick={() => setTab('members')} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === 'members' ? '#0c2520' : 'transparent', color: tab === 'members' ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === 'members' ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit' }}>Members {isOwner && pendingMembers.length > 0 ? '(' + pendingMembers.length + ')' : ''}</button>
            </div>

            {tab === 'feed' && (
              <>
                {/* New post */}
                <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '14px', marginBottom: '16px' }}>
                  <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share something with the community..." rows={2} style={{ width: '100%', border: 'none', fontSize: '14px', fontFamily: 'inherit', color: '#0c2520', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {['general', 'class', 'event', 'advice'].map(t => (
                      <button key={t} onClick={() => setPostType(t)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', border: postType === t ? '1.5px solid #0c2520' : '1px solid #e0ddd5', background: postType === t ? '#e8efea' : 'white', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t}</button>
                    ))}
                  </div>
                  {(postType === 'class' || postType === 'event') && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', color: '#0c2520' }} />
                      <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', color: '#0c2520' }} />
                      <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Location" style={{ padding: '6px 8px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', color: '#0c2520', flex: 1 }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button onClick={handlePost} disabled={posting || !newPost.trim()} style={{ padding: '8px 20px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: posting || !newPost.trim() ? 0.5 : 1 }}>{posting ? 'Posting...' : 'Post'}</button>
                  </div>
                </div>

                {/* Posts */}
                {posts.map(p => (
                  <div key={p.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '14px 16px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: p.profiles?.picture_url ? 'url(' + p.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: 0 }}>{(p.profiles?.first_name || '') + ' ' + (p.profiles?.last_name || '')}</p>
                        <p style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>{new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      {p.post_type !== 'general' && <span style={{ fontSize: '10px', fontWeight: 600, color: p.post_type === 'class' ? '#5B7CFA' : p.post_type === 'event' ? '#4ade80' : '#f59e0b', background: (p.post_type === 'class' ? '#5B7CFA' : p.post_type === 'event' ? '#4ade80' : '#f59e0b') + '18', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{p.post_type}</span>}
                    </div>
                    <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 8px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.content}</p>
                    {p.event_date && (
                      <div style={{ background: '#f9f8f6', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', color: '#666', display: 'flex', gap: '12px' }}>
                        <span>{new Date(p.event_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        {p.event_time && <span>{formatTime(p.event_time)}</span>}
                        {p.event_location && <span>{p.event_location}</span>}
                      </div>
                    )}
                    <button onClick={() => toggleLike(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: p.liked ? '#c0392b' : '#888', padding: 0, fontFamily: 'inherit' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={p.liked ? '#c0392b' : 'none'} stroke={p.liked ? '#c0392b' : '#888'} strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                      {p.like_count > 0 && p.like_count}
                    </button>
                  </div>
                ))}
                {posts.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#aaa', padding: '24px 0' }}>No posts yet. Be the first to share something.</p>}
              </>
            )}

            {tab === 'members' && (
              <>
                {isOwner && pendingMembers.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>Pending requests</p>
                    {pendingMembers.map(m => (
                      <div key={m.id} style={{ background: '#fef3c7', borderRadius: '12px', padding: '12px 14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: m.profiles?.picture_url ? 'url(' + m.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0 }} />
                        <p style={{ flex: 1, fontSize: '13px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{(m.profiles?.first_name || '') + ' ' + (m.profiles?.last_name || '')}</p>
                        <button onClick={() => handleMemberAction(m.id, 'approve')} style={{ padding: '6px 12px', background: '#4ade80', color: '#061410', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Accept</button>
                        <button onClick={() => handleMemberAction(m.id, 'reject')} style={{ padding: '6px 12px', background: 'white', color: '#c0392b', border: '1px solid #e8e4de', borderRadius: '8px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Decline</button>
                      </div>
                    ))}
                  </div>
                )}
                <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>Members ({approvedMembers.length})</p>
                {approvedMembers.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: '1px solid #f0ede5' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: m.profiles?.picture_url ? 'url(' + m.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: '#0c2520', margin: 0 }}>{(m.profiles?.first_name || '') + ' ' + (m.profiles?.last_name || '')}</p>
                      {m.role === 'owner' && <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>Owner</span>}
                    </div>
                    {m.profiles?.slug && <Link href={'/' + m.profiles.slug} style={{ fontSize: '11px', color: '#888', textDecoration: 'underline' }}>View</Link>}
                    {isOwner && m.profile_id !== userId && <button onClick={() => handleMemberAction(m.id, 'remove')} style={{ background: 'none', border: 'none', fontSize: '11px', color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
