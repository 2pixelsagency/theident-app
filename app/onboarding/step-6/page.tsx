'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingStep6() {
  const router = useRouter()
  const [currentlyIn, setCurrentlyIn] = useState('')
  const [bio, setBio] = useState('')
  const [vid1, setVid1] = useState('')
  const [vid2, setVid2] = useState('')
  const [vid3, setVid3] = useState('')
  const [vid4, setVid4] = useState('')
  const [pictureUrl, setPictureUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('bio, picture_url, vid_1, vid_2, vid_3, vid_4')
        .eq('id', user.id)
        .single()

      if (profile) {
        setBio(profile.bio || '')
        setPictureUrl(profile.picture_url || '')
        setVid1(profile.vid_1 || '')
        setVid2(profile.vid_2 || '')
        setVid3(profile.vid_3 || '')
        setVid4(profile.vid_4 || '')
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('headshots')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message + '\n\nMake sure the "headshots" storage bucket exists in Supabase.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(fileName)
    setPictureUrl(publicUrl)
    setUploading(false)
  }

  const handleFinish = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      bio: bio,
      picture_url: pictureUrl,
      vid_1: vid1,
      vid_2: vid2,
      vid_3: vid3,
      vid_4: vid4,
      available: currentlyIn,
    }).eq('id', user.id)
    router.push('/dashboard')
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 40px' }}>Almost there! Let&apos;s finish strong</h1>

        {/* Headshot */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: pictureUrl ? `url(${pictureUrl}) center/cover` : '#e8e6e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#aaa' }}>
            {!pictureUrl && '👤'}
          </div>
          <label style={{ background: 'white', border: '1px solid #e0ddd5', borderRadius: '8px', padding: '10px 20px', cursor: 'pointer', fontSize: '14px', color: '#0c2520', fontWeight: 500 }}>
            ↑ {uploading ? 'Uploading...' : (pictureUrl ? 'Change Headshot' : 'Add Headshot')}
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
          </label>
        </div>

        {/* Currently In */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Currently In</label>
          <input
            type="text"
            value={currentlyIn}
            onChange={(e) => setCurrentlyIn(e.target.value)}
            placeholder="Currently in Wicked"
            style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box' }}
          />
        </div>

        {/* Bio */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: '#0c2520', marginBottom: '8px', fontWeight: 500 }}>Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Explain who you are to get you booked."
            rows={5}
            style={{ width: '100%', padding: '14px', border: '1px solid #e0ddd5', borderRadius: '8px', fontSize: '15px', background: 'white', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }}
          />
        </div>

        {/* Reels (optional) */}
        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Add reel links (optional — you can do this later)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          <input type="text" value={vid1} onChange={(e) => setVid1(e.target.value)} placeholder="+ Ident link" style={{ padding: '12px', border: '1px dashed #c4c2bc', borderRadius: '8px', fontSize: '13px', background: 'transparent', boxSizing: 'border-box', textAlign: 'center', color: '#0c2520' }} />
          <input type="text" value={vid2} onChange={(e) => setVid2(e.target.value)} placeholder="+ Dance Reel link" style={{ padding: '12px', border: '1px dashed #c4c2bc', borderRadius: '8px', fontSize: '13px', background: 'transparent', boxSizing: 'border-box', textAlign: 'center', color: '#0c2520' }} />
          <input type="text" value={vid3} onChange={(e) => setVid3(e.target.value)} placeholder="+ Acting Reel link" style={{ padding: '12px', border: '1px dashed #c4c2bc', borderRadius: '8px', fontSize: '13px', background: 'transparent', boxSizing: 'border-box', textAlign: 'center', color: '#0c2520' }} />
          <input type="text" value={vid4} onChange={(e) => setVid4(e.target.value)} placeholder="+ Singing Reel link" style={{ padding: '12px', border: '1px dashed #c4c2bc', borderRadius: '8px', fontSize: '13px', background: 'transparent', boxSizing: 'border-box', textAlign: 'center', color: '#0c2520' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
          <button onClick={handleFinish} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '14px 56px', borderRadius: '30px', fontSize: '16px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Start Auditioning'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%' }} />
          <div style={{ width: '24px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
        </div>
      </div>
    </div>
  )
}
