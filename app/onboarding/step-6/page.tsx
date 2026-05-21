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
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('bio, picture_url, vid_1, vid_2, vid_3, vid_4, available')
        .eq('id', user.id)
        .single()

      if (profile) {
        setBio(profile.bio || '')
        setPictureUrl(profile.picture_url || '')
        setVid1(profile.vid_1 || '')
        setVid2(profile.vid_2 || '')
        setVid3(profile.vid_3 || '')
        setVid4(profile.vid_4 || '')
        setCurrentlyIn(profile.available || '')
      }
      setLoading(false)
    }
    load()
  }, [router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingImage(false); return }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/headshot-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('headshots')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message)
      setUploadingImage(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(fileName)
    setPictureUrl(publicUrl)
    setUploadingImage(false)
  }

  const handleVideoUpload = async (slot: 'vid1' | 'vid2' | 'vid3' | 'vid4', file: File) => {
    setUploadingVideo(slot)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingVideo(null); return }

    if (file.size > 200 * 1024 * 1024) {
      alert('Video too large. Maximum size is 200MB.')
      setUploadingVideo(null)
      return
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${slot}-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('reels')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      alert('Video upload failed: ' + uploadError.message)
      setUploadingVideo(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('reels').getPublicUrl(fileName)
    if (slot === 'vid1') setVid1(publicUrl)
    if (slot === 'vid2') setVid2(publicUrl)
    if (slot === 'vid3') setVid3(publicUrl)
    if (slot === 'vid4') setVid4(publicUrl)
    setUploadingVideo(null)
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

  const VideoSlot = ({ label, slot, value }: { label: string; slot: 'vid1' | 'vid2' | 'vid3' | 'vid4'; value: string }) => {
    const isUploading = uploadingVideo === slot
    return (
      <label style={{
        padding: '20px 12px',
        border: value ? '1px solid #0c2520' : '1px dashed #c4c2bc',
        borderRadius: '8px',
        fontSize: '13px',
        background: value ? '#e8f0eb' : 'transparent',
        textAlign: 'center',
        color: '#0c2520',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        display: 'block',
      }}>
        {isUploading ? 'Uploading...' : (value ? `✓ ${label} uploaded` : `+ ${label}`)}
        <input
          type="file"
          accept="video/*"
          disabled={isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleVideoUpload(slot, file)
          }}
          style={{ display: 'none' }}
        />
      </label>
    )
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '700px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '36px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 40px' }}>Almost there! Let&apos;s finish strong</h1>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '8px', background: pictureUrl ? `url(${pictureUrl}) center/cover` : '#e8e6e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#aaa' }}>
            {!pictureUrl && '👤'}
          </div>
          <label style={{ background: 'white', border: '1px solid #e0ddd5', borderRadius: '8px', padding: '10px 20px', cursor: uploadingImage ? 'not-allowed' : 'pointer', fontSize: '14px', color: '#0c2520', fontWeight: 500 }}>
            ↑ {uploadingImage ? 'Uploading...' : (pictureUrl ? 'Change Headshot' : 'Add Headshot')}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: 'none' }} />
          </label>
        </div>

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

        <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>Upload your reels (optional — max 200MB each)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
          <VideoSlot label="Ident" slot="vid1" value={vid1} />
          <VideoSlot label="Dance Reel" slot="vid2" value={vid2} />
          <VideoSlot label="Acting Reel" slot="vid3" value={vid3} />
          <VideoSlot label="Singing Reel" slot="vid4" value={vid4} />
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
