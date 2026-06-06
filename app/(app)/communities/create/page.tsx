'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Dance','Acting','Singing','Fitness','College','Agency','Other']

export default function CreateCommunity() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Dance')
  const [isPrivate, setIsPrivate] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36)
    const { data, error } = await supabase.from('communities').insert({ name, slug, description: description || null, category, is_private: isPrivate, owner_id: user.id }).select().single()
    if (data) {
      await supabase.from('community_members').insert({ community_id: data.id, profile_id: user.id, role: 'owner', status: 'approved' })
      router.push('/communities/' + data.slug)
    }
    if (error) alert(error.message)
    setSaving(false)
  }

  const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 14px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', color: '#0c2520' }
  const labelStyle: React.CSSProperties = { fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, display: 'block', marginBottom: '6px' }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <div style={{ padding: '24px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '16px', padding: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>

        <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '22px', fontWeight: 700, color: '#0c2520', margin: '0 0 24px' }}>Create a community</p>

        <label style={labelStyle}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. House of Jazz" style={{ ...inputStyle, marginBottom: '14px' }} />

        <label style={labelStyle}>Description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this community about?" rows={3} style={{ ...inputStyle, resize: 'vertical', marginBottom: '14px' }} />

        <label style={labelStyle}>Category</label>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', border: category === c ? '2px solid #0c2520' : '1px solid #e0ddd5', background: category === c ? '#e8efea' : 'white', color: '#0c2520', fontWeight: category === c ? 600 : 400 }}>{c}</button>
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid #e0ddd5', borderRadius: '14px', padding: '16px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 500, color: '#0c2520', margin: '0 0 4px' }}>Private community</p>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>Members need approval to join</p>
          </div>
          <div onClick={() => setIsPrivate(!isPrivate)} style={{ width: '44px', height: '26px', borderRadius: '13px', background: isPrivate ? '#4ade80' : '#e0ddd5', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: isPrivate ? '20px' : '2px', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }} />
          </div>
        </div>

        <button onClick={handleCreate} disabled={saving || !name.trim()} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: saving || !name.trim() ? 0.5 : 1 }}>
          {saving ? 'Creating...' : 'Create community'}
        </button>
      </div>
    </div>
  )
}
