'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Community = { id: string; name: string; slug: string; description: string | null; cover_url: string | null; category: string; is_private: boolean; owner_id: string }
type Member = { id: string; profile_id: string; role: string; status: string; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null; slug: string | null } | null }
type Reply = { id: string; content: string; author_id: string; created_at: string; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null } | null }
type Post = { id: string; content: string; post_type: string; event_date: string | null; event_time: string | null; event_location: string | null; image_url: string | null; created_at: string; author_id: string; profiles: { first_name: string | null; last_name: string | null; picture_url: string | null } | null; like_count: number; liked: boolean; replies: Reply[]; reply_count: number }

export default function CommunityDetail() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const coverRef = useRef<HTMLInputElement>(null)

  const [community, setCommunity] = useState<Community | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [membership, setMembership] = useState<{ role: string; status: string } | null>(null)
  const [newPost, setNewPost] = useState('')
  const [postType, setPostType] = useState('general')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [posting, setPosting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [tab, setTab] = useState<'feed' | 'members' | 'about'>('feed')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [uploadingCover, setUploadingCover] = useState(false)

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
          const withExtras = await Promise.all(postsData.map(async p => {
            const { count: likeCount } = await supabase.from('community_post_likes').select('id', { count: 'exact', head: true }).eq('post_id', p.id)
            const { data: myLike } = await supabase.from('community_post_likes').select('id').eq('post_id', p.id).eq('profile_id', user.id).maybeSingle()
            const { data: repliesData } = await supabase.from('community_post_replies').select('*, profiles(first_name, last_name, picture_url)').eq('post_id', p.id).order('created_at')
            return { ...p, like_count: likeCount || 0, liked: !!myLike, replies: repliesData || [], reply_count: (repliesData || []).length }
          }))
          setPosts(withExtras)
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !community) return
    setUploadingCover(true)
    const path = 'communities/' + community.id + '/cover-' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('headshots').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(path)
      await supabase.from('communities').update({ cover_url: publicUrl }).eq('id', community.id)
      setCommunity({ ...community, cover_url: publicUrl })
      showToast('Cover updated')
    }
    setUploadingCover(false)
    e.target.value = ''
  }

  const handlePost = async () => {
    if (!userId || !community || !newPost.trim()) return
    setPosting(true)
    const { data } = await supabase.from('community_posts').insert({ community_id: community.id, author_id: userId, content: newPost, post_type: postType, event_date: eventDate || null, event_time: eventTime || null, event_location: eventLocation || null }).select('*, profiles(first_name, last_name, picture_url)').single()
    if (data) setPosts([{ ...data, like_count: 0, liked: false, replies: [], reply_count: 0 }, ...posts])
    setNewPost(''); setPostType('general'); setEventDate(''); setEventTime(''); setEventLocation('')
    setPosting(false)
  }

  const deletePost = async (postId: string) => {
    await supabase.from('community_post_replies').delete().eq('post_id', postId)
    await supabase.from('community_post_likes').delete().eq('post_id', postId)
    await supabase.from('community_posts').delete().eq('id', postId)
    setPosts(posts.filter(p => p.id !== postId))
    showToast('Post deleted')
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

  const handleReply = async (postId: string) => {
    if (!userId || !replyText.trim()) return
    const { data } = await supabase.from('community_post_replies').insert({ post_id: postId, author_id: userId, content: replyText }).select('*, profiles(first_name, last_name, picture_url)').single()
    if (data) {
      setPosts(posts.map(p => p.id === postId ? { ...p, replies: [...p.replies, data], reply_count: p.reply_count + 1 } : p))
      const newExpanded = new Set(expandedReplies)
      newExpanded.add(postId)
      setExpandedReplies(newExpanded)
    }
    setReplyText(''); setReplyingTo(null)
  }

  const deleteReply = async (replyId: string, postId: string) => {
    await supabase.from('community_post_replies').delete().eq('id', replyId)
    setPosts(posts.map(p => p.id === postId ? { ...p, replies: p.replies.filter(r => r.id !== replyId), reply_count: p.reply_count - 1 } : p))
  }

  const handleMemberAction = async (memberId: string, action: 'approve' | 'reject' | 'remove') => {
    if (action === 'approve') {
      await supabase.from('community_members').update({ status: 'approved' }).eq('id', memberId)
      setMembers(members.map(m => m.id === memberId ? { ...m, status: 'approved' } : m))
      showToast('Approved')
    } else {
      await supabase.from('community_members').delete().eq('id', memberId)
      setMembers(members.filter(m => m.id !== memberId))
      showToast('Removed')
    }
  }

  const approvedMembers = members.filter(m => m.status === 'approved')
  const pendingMembers = members.filter(m => m.status === 'pending')
  const formatTime = (t: string) => { const [h, m] = t.split(':'); const hr = parseInt(h); return (hr > 12 ? hr - 12 : hr) + ':' + m + (hr >= 12 ? 'pm' : 'am') }
  const timeAgo = (d: string) => { const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (mins < 1) return 'now'; if (mins < 60) return mins + 'm'; const hrs = Math.floor(mins / 60); if (hrs < 24) return hrs + 'h'; return Math.floor(hrs / 24) + 'd' }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />
  if (!community) return <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: '#888' }}>Community not found</p></div>

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <style>{`@keyframes toastIn { from { opacity:0;transform:translateX(-50%) translateY(8px); } to { opacity:1;transform:translateX(-50%) translateY(0); } } .toast-anim { animation: toastIn 0.25s ease-out; }`}</style>
      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Cover */}
      <div style={{ position: 'relative', height: '160px', background: community.cover_url ? 'url(' + community.cover_url + ') center/cover' : '#0c2520', backgroundSize: 'cover' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(transparent 30%, rgba(0,0,0,0.5))' }} />
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 2 }}>
          <button onClick={() => router.push('/communities')} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          </button>
        </div>
        {isOwner && (
          <button onClick={() => coverRef.current?.click()} style={{ position: 'absolute', bottom: '12px', right: '12px', zIndex: 2, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '20px', padding: '6px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'white', fontWeight: 500, fontFamily: 'inherit' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            {uploadingCover ? 'Uploading...' : 'Edit cover'}
          </button>
        )}
        <input ref={coverRef} type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        {/* Name + badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
          <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '24px', fontWeight: 700, color: '#0c2520', margin: 0 }}>{community.name}</p>
          {community.is_private && (
            <div style={{ background: '#0c2520', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>{approvedMembers.length} member{approvedMembers.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '12px', color: '#aaa' }}>{community.category}</span>
          {community.is_private && <span style={{ fontSize: '9px', fontWeight: 600, color: '#f59e0b', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>RESTRICTED</span>}
        </div>

        {/* Member avatars */}
        {approvedMembers.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex' }}>
              {approvedMembers.slice(0, 10).map((m, i) => (
                <div key={m.id} style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2.5px solid #f1f0ee', background: m.profiles?.picture_url ? 'url(' + m.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', marginLeft: i > 0 ? '-8px' : '0', zIndex: 10 - i, position: 'relative' }} />
              ))}
              {approvedMembers.length > 10 && (
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2.5px solid #f1f0ee', background: '#0c2520', marginLeft: '-8px', zIndex: 0, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: '#f1f0ee' }}>+{approvedMembers.length - 10}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Join/Leave */}
        {!membership && (
          <button onClick={handleJoin} style={{ width: '100%', padding: '14px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px' }}>
            {community.is_private ? 'Request to join' : 'Join community'}
          </button>
        )}
        {membership?.status === 'pending' && (
          <div style={{ width: '100%', padding: '14px', background: '#fef3c7', borderRadius: '30px', textAlign: 'center', fontSize: '14px', fontWeight: 500, color: '#92400e', marginBottom: '16px', boxSizing: 'border-box' }}>Request pending</div>
        )}

        {/* Tabs */}
        {isApproved && (
          <div style={{ display: 'flex', background: '#e8e4de', borderRadius: '12px', padding: '4px', gap: '4px', marginBottom: '16px' }}>
            {(['feed', 'members', 'about'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', background: tab === t ? '#0c2520' : 'transparent', color: tab === t ? '#f1f0ee' : '#888', fontSize: '14px', fontWeight: tab === t ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', position: 'relative' }}>
                {t}
                {t === 'members' && isOwner && pendingMembers.length > 0 && (
                  <span style={{ position: 'absolute', top: '4px', right: '8px', width: '8px', height: '8px', borderRadius: '50%', background: '#c0392b' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px' }}>
        {/* FEED */}
        {isApproved && tab === 'feed' && (
          <>
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '14px', marginBottom: '16px' }}>
              <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Share something..." rows={2} style={{ width: '100%', border: 'none', fontSize: '14px', fontFamily: 'inherit', color: '#0c2520', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {['general', 'class', 'event', 'advice'].map(t => (
                  <button key={t} onClick={() => setPostType(t)} style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', border: postType === t ? '1.5px solid #0c2520' : '1px solid #e0ddd5', background: postType === t ? '#e8efea' : 'white', color: '#0c2520', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize' }}>{t}</button>
                ))}
              </div>
              {(postType === 'class' || postType === 'event') && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', color: '#0c2520' }} />
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)} style={{ padding: '6px 8px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', color: '#0c2520' }} />
                  <input type="text" value={eventLocation} onChange={e => setEventLocation(e.target.value)} placeholder="Location" style={{ padding: '6px 8px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '12px', fontFamily: 'inherit', color: '#0c2520', flex: 1, minWidth: '100px' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button onClick={handlePost} disabled={posting || !newPost.trim()} style={{ padding: '8px 20px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: posting || !newPost.trim() ? 0.5 : 1 }}>{posting ? 'Posting...' : 'Post'}</button>
              </div>
            </div>

            {posts.map(p => {
              const canDelete = p.author_id === userId || isOwner
              const showReplies = expandedReplies.has(p.id)
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', marginBottom: '10px', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: p.profiles?.picture_url ? 'url(' + p.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#0c2520', margin: 0 }}>{(p.profiles?.first_name || '') + ' ' + (p.profiles?.last_name || '')}</p>
                        <p style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>{timeAgo(p.created_at)}</p>
                      </div>
                      {p.post_type !== 'general' && <span style={{ fontSize: '10px', fontWeight: 600, color: p.post_type === 'class' ? '#5B7CFA' : p.post_type === 'event' ? '#4ade80' : '#f59e0b', background: (p.post_type === 'class' ? '#5B7CFA' : p.post_type === 'event' ? '#4ade80' : '#f59e0b') + '18', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>{p.post_type}</span>}
                      {canDelete && (
                        <button onClick={() => deletePost(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.8" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: '14px', color: '#0c2520', margin: '0 0 8px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.content}</p>
                    {p.event_date && (
                      <div style={{ background: '#f9f8f6', borderRadius: '8px', padding: '8px 12px', marginBottom: '8px', fontSize: '12px', color: '#666', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span>{new Date(p.event_date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                        {p.event_time && <span>{formatTime(p.event_time)}</span>}
                        {p.event_location && <span>{p.event_location}</span>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <button onClick={() => toggleLike(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: p.liked ? '#c0392b' : '#888', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={p.liked ? '#c0392b' : 'none'} stroke={p.liked ? '#c0392b' : '#888'} strokeWidth="1.8" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        {p.like_count > 0 && p.like_count}
                      </button>
                      <button onClick={() => { setReplyingTo(replyingTo === p.id ? null : p.id); setReplyText('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#888', padding: 0, fontFamily: 'inherit' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        {p.reply_count > 0 && p.reply_count}
                      </button>
                      {p.reply_count > 0 && (
                        <button onClick={() => { const s = new Set(expandedReplies); if (s.has(p.id)) s.delete(p.id); else s.add(p.id); setExpandedReplies(s) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#0c2520', padding: 0, fontFamily: 'inherit', fontWeight: 500 }}>
                          {showReplies ? 'Hide replies' : 'View ' + p.reply_count + ' repl' + (p.reply_count === 1 ? 'y' : 'ies')}
                        </button>
                      )}
                    </div>
                  </div>

                  {replyingTo === p.id && (
                    <div style={{ padding: '0 16px 12px', display: 'flex', gap: '8px' }}>
                      <input value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && replyText.trim()) handleReply(p.id) }} placeholder="Write a reply..." style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0ddd5', borderRadius: '20px', fontSize: '13px', fontFamily: 'inherit', color: '#0c2520', outline: 'none', background: '#f9f8f6' }} />
                      <button onClick={() => handleReply(p.id)} disabled={!replyText.trim()} style={{ padding: '8px 16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: !replyText.trim() ? 0.5 : 1 }}>Reply</button>
                    </div>
                  )}

                  {showReplies && p.replies.length > 0 && (
                    <div style={{ borderTop: '1px solid #f0ede5', background: '#fafaf8' }}>
                      {p.replies.map(r => (
                        <div key={r.id} style={{ padding: '10px 16px 10px 42px', display: 'flex', gap: '8px', alignItems: 'start' }}>
                          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: r.profiles?.picture_url ? 'url(' + r.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '12px', margin: 0 }}><span style={{ fontWeight: 600, color: '#0c2520' }}>{(r.profiles?.first_name || '') + ' ' + (r.profiles?.last_name || '')}</span> <span style={{ color: '#aaa' }}>{timeAgo(r.created_at)}</span></p>
                            <p style={{ fontSize: '13px', color: '#444', margin: '2px 0 0', lineHeight: 1.5 }}>{r.content}</p>
                          </div>
                          {(r.author_id === userId || isOwner) && (
                            <button onClick={() => deleteReply(r.id, p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
            {posts.length === 0 && <p style={{ textAlign: 'center', fontSize: '13px', color: '#aaa', padding: '24px 0' }}>No posts yet. Be the first to share something.</p>}
          </>
        )}

        {/* MEMBERS */}
        {isApproved && tab === 'members' && (
          <>
            {isOwner && pendingMembers.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>Pending requests ({pendingMembers.length})</p>
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

        {/* ABOUT */}
        {isApproved && tab === 'about' && (
          <div>
            {community.description && (
              <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px', marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>About</p>
                <p style={{ fontSize: '14px', color: '#0c2520', margin: 0, lineHeight: 1.6 }}>{community.description}</p>
              </div>
            )}
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ fontSize: '12px', color: '#888' }}>Category</span><span style={{ fontSize: '12px', color: '#0c2520', fontWeight: 500 }}>{community.category}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ fontSize: '12px', color: '#888' }}>Members</span><span style={{ fontSize: '12px', color: '#0c2520', fontWeight: 500 }}>{approvedMembers.length}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}><span style={{ fontSize: '12px', color: '#888' }}>Type</span><span style={{ fontSize: '12px', color: '#0c2520', fontWeight: 500 }}>{community.is_private ? 'Private' : 'Public'}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#888' }}>Posts</span><span style={{ fontSize: '12px', color: '#0c2520', fontWeight: 500 }}>{posts.length}</span></div>
            </div>
            {isApproved && !isOwner && (
              <button onClick={handleLeave} style={{ width: '100%', padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #e8e4de', borderRadius: '30px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Leave community</button>
            )}
          </div>
        )}

        {/* Not a member yet */}
        {!isApproved && !membership && community.description && (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '16px' }}>
            <p style={{ fontSize: '14px', color: '#666', lineHeight: 1.6, margin: 0 }}>{community.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
