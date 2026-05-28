'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingStep1() {
  const router = useRouter()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [dob, setDob] = useState('')
  const [location, setLocation] = useState('')
  const [pictureUrl, setPictureUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/signup'); return }
      const { data: profile } = await supabase.from('profiles').select('first_name, last_name, date_of_birth, location, picture_url').eq('id', user.id).single()
      if (profile) {
        setFirstName(profile.first_name || '')
        setLastName(profile.last_name || '')
        setDob(profile.date_of_birth || '')
        setLocation(profile.location || '')
        setPictureUrl(profile.picture_url || '')
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
    const { error: uploadError } = await supabase.storage.from('headshots').upload(fileName, file, { upsert: true })
    if (uploadError) { alert('Upload failed: ' + uploadError.message); setUploadingImage(false); return }
    const { data: { publicUrl } } = supabase.storage.from('headshots').getPublicUrl(fileName)
    setPictureUrl(publicUrl)
    setUploadingImage(false)
  }

  const generateSlug = async (first: string, last: string, userId: string) => {
    const base = `${first}-${last}`
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')

    // Check if slug already exists — if so append a number
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('slug', base)
      .neq('id', userId)
      .maybeSingle()

    if (!existing) return base

    // Try base-2, base-3 etc until unique
    let n = 2
    while (true) {
      const candidate = `${base}-${n}`
      const { data: clash } = await supabase
        .from('profiles')
        .select('id')
        .eq('slug', candidate)
        .neq('id', userId)
        .maybeSingle()
      if (!clash) return candidate
      n++
    }
  }

  const handleNext = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Only generate slug if they have a name
    let slug: string | undefined
    if (firstName && lastName) {
      // Check if they already have a slug — don't overwrite it
      const { data: existing } = await supabase
        .from('profiles')
        .select('slug')
        .eq('id', user.id)
        .single()

      if (!existing?.slug) {
        slug = await generateSlug(firstName, lastName, user.id)
      }
    }

    await supabase.from('profiles').update({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob || null,
      location,
      picture_url: pictureUrl,
      ...(slug ? { slug } : {}),
    }).eq('id', user.id)

    router.push('/onboarding/step-2')
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
        .headshot-upload {
          position: relative; width: 140px; height: 140px; border-radius: 10px;
          border: 1.5px dashed #c4c2bc; background: transparent; cursor: pointer;
          transition: all 0.2s ease; overflow: hidden; display: flex;
          align-items: center; justify-content: center; color: #0c2520;
          font-size: 13px; font-weight: 500;
        }
        .headshot-upload:hover { transform: translateY(-2px); border-color: #0c2520; background: white; }
        .headshot-upload.has-image { border: 1.5px solid #0c2520; background-size: cover; background-position: center; }
      `}</style>

      <div className="fade-in" style={{ width: '100%', maxWidth: '520px' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 500, color: '#0c2520', textAlign: 'center', margin: '0 0 8px' }}>Let&apos;s get to know you!</h1>
        <p style={{ textAlign: 'center', color: '#666', fontSize: '13px', margin: '0 0 32px' }}>Your headshot is the first thing casting directors see — make it count.</p>

        {/* Headshot */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <label
            className={`headshot-upload ${pictureUrl ? 'has-image' : ''}`}
            style={pictureUrl ? { backgroundImage: `url(${pictureUrl})` } : {}}
          >
            {!pictureUrl && !uploadingImage && '+ Add Headshot'}
            {uploadingImage && 'Uploading...'}
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} style={{ display: 'none' }} />
          </label>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>First name</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Last name</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Date of birth</label>
          <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} style={inputStyle} />
        </div>

        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '13px', color: '#0c2520', marginBottom: '6px', fontWeight: 500 }}>Location</label>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="London, UK" style={inputStyle} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <button onClick={handleNext} disabled={saving} style={{ background: '#0c2520', color: '#f1f0ee', border: 'none', padding: '12px 48px', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving...' : 'Next'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '8px', background: '#0c2520', borderRadius: '4px' }} />
          <button onClick={() => router.push('/onboarding/step-2')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-3')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-4')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-5')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
          <button onClick={() => router.push('/onboarding/step-6')} style={{ width: '8px', height: '8px', background: '#d4d2cc', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 }} />
        </div>
      </div>
    </div>
  )
}
