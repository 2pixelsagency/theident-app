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
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data: profile } = await supabase.from('profiles').select('bio, vid_1, vid_2, vid_3, vid_4, available').eq('id', user.id).single()
      if (profile) {
        setBio(profile.bio || '')
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

  const handleVideoUpload = async (slot: 'vid1' | 'vid2' | 'vid3' | 'vid4', file: File) => {
    setUploadingVideo(slot)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingVideo(null); return }
    if (file.size > 200 * 1024 * 1024) { alert('Video too large. Max 200MB.'); setUploadingVideo(null); return }
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${slot}-${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('reels').upload(fileName, file, { upsert: true })
    if (uploadError) { alert('Video upload failed: ' + uploadError.message); setUploadingVideo(null); return }
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
      bio, vid_1: vid1, vid_2: vid2, vid_3: vid3, vid_4: vid4, available: currentlyIn,
    }).eq('id', user.id)
    router.push('/dashboard')
  }

  const VideoSlot = ({ label, slot, value }: { label: string; slot: 'vid1' | 'vid2' | 'vid3' | 'vid4'; value: string }) => {
    const isUploading = uploadingVideo === slot
    return (
      <label className={`reel-slot ${value ? 'filled' : ''}`} style={{
        padding: '18px 10px',
        border: value ? '1.5px solid #0c2520' : '1.5px dashed #c4c2bc',
        borderRadius: '10px', fontSize: '13px',
        background: value ? '#e8f0eb' : 'transparent',
        textAlign: 'center', color: '#0c2520',
        cursor: isUploading ? 'not-allowed' : 'pointer',
        display: 'block', fontWeight: 500,
        transition: 'all 0.2s ease',
      }}>
        {isUploading ? 'Uploading...' : (value ? `✓ ${label} uploaded` : `+ ${label}`)}
        <input type="file" accept="video/*" disabled={isUploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVideoUpload(slot, file) }} style={{ display: 'none' }} />
      </label>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px', border: '1px solid #e0ddd5', borderRadius: '8px',
    fontSize: '14px', background: 'white', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ minHeight: '100vh', background: '#f1f0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`
        input:focus, textarea:focus { border-color: #0c2520 !important; box-shadow: 0 0 0 1px #0c2520 !important; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn 0.5s ease-out; }

        .reel-slot:hover {
          transform: translateY(-2px);
          border-color: #0c2520 !important;
          background: white !important;
        }
        .reel-slot.filled:hover {
          background: #d8e8df !important;
        }
      `}</style>

      <div className="fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 8px' }}>Almost there! Let&apos;s finish strong</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', margin: '0 0 32px' }}>Tell us where you are and let&apos;s see those reels.</p>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Currently In</label>
          <input type="text" value={currentlyIn} onChange={(e) => setCurrentlyIn(e.target.value)} placeholder="Currently in Wicked" style={inputStyle} />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Explain who you are to get you booked." rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        <p style={{ fontSize: '12px', color: '#666', marginBottom: '10px', fontWeight: 500 }}>Upload your reels (optional — max 200MB each)</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '32px' }}>
          <VideoSlot label="Ident" slot="vid1" value={vid1} />
          <VideoSlot label="Dance Reel" slot="vid2" value={vid2} />
          <VideoSlot label="Acting Reel" slot="vid3" value={vid3} />
          <VideoSlot label="Singing Reel" slot="vid4" value={vid4} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button onClick={handleFinish} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '12px 48px', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Start Auditioning'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <button onClick={() => router.push('/onboarding/step-1')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-2')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-3')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border:
