'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type SectionConfig = {
  key: string
  label: string
  icon: React.ReactNode
  visible: boolean
  order: number
}

const defaultSections: SectionConfig[] = [
  { key: 'reels', label: 'Showreels', visible: true, order: 1, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg> },
  { key: 'bio', label: 'About', visible: true, order: 2, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { key: 'featured_work', label: 'Featured work', visible: true, order: 3, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
  { key: 'brands', label: 'Brands & companies', visible: true, order: 4, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg> },
  { key: 'credits', label: 'Credits', visible: true, order: 5, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg> },
  { key: 'testimonials', label: 'Testimonials', visible: true, order: 6, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { key: 'gallery', label: 'Gallery', visible: true, order: 7, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> },
  { key: 'faqs', label: 'FAQs', visible: true, order: 8, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
]

export default function CustomisePage() {
  const router = useRouter()
  const [sections, setSections] = useState<SectionConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setProfileId(user.id)
      const { data: p } = await supabase.from('profiles').select('section_settings').eq('id', user.id).single()

      const settings = p?.section_settings || {}
      const merged = defaultSections.map(s => ({
        ...s,
        visible: settings[s.key]?.visible !== undefined ? settings[s.key].visible : s.visible,
        order: settings[s.key]?.order !== undefined ? settings[s.key].order : s.order,
      }))
      merged.sort((a, b) => a.order - b.order)
      setSections(merged)
      setLoading(false)
    }
    load()
  }, [])

  const moveUp = (index: number) => {
    if (index === 0) return
    const updated = [...sections]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    updated.forEach((s, i) => s.order = i + 1)
    setSections(updated)
    setHasChanges(true)
  }

  const moveDown = (index: number) => {
    if (index === sections.length - 1) return
    const updated = [...sections]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    updated.forEach((s, i) => s.order = i + 1)
    setSections(updated)
    setHasChanges(true)
  }

  const toggleVisible = (key: string) => {
    setSections(prev => prev.map(s => s.key === key ? { ...s, visible: !s.visible } : s))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!profileId) return
    setSaving(true)
    const settings: Record<string, { visible: boolean; order: number }> = {}
    sections.forEach(s => {
      settings[s.key] = { visible: s.visible, order: s.order }
    })
    await supabase.from('profiles').update({ section_settings: settings }).eq('id', profileId)
    setSaving(false)
    setHasChanges(false)
    setToast('Layout saved')
    setTimeout(() => setToast(null), 2500)
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh' }}>
      <style>{`
        @keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .toast-anim { animation: toastIn 0.25s ease-out; }
        .section-row { transition: background 0.15s ease; }
        .section-row:active { background: #e8e4de !important; }
        .toggle-track { width: 44px; height: 26px; border-radius: 13px; position: relative; cursor: pointer; transition: background 0.2s ease; -webkit-tap-highlight-color: transparent; }
        .toggle-thumb { width: 22px; height: 22px; border-radius: 50%; background: white; position: absolute; top: 2px; transition: left 0.2s ease; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
      `}</style>

      {toast && (
        <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 16px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#0c2520', fontFamily: 'inherit' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        <p style={{ fontFamily: 'Georgia, serif', fontSize: '22px', fontWeight: 500, color: '#0c2520', margin: '0 0 6px' }}>Customise your Ident</p>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 24px', lineHeight: 1.5 }}>Choose which sections appear on your public profile and drag to reorder them.</p>

        {/* Section list */}
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e8e4de', overflow: 'hidden' }}>
          {sections.map((s, i) => (
            <div key={s.key} className="section-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', borderBottom: i < sections.length - 1 ? '1px solid #f0ede5' : 'none', background: 'white', opacity: s.visible ? 1 : 0.5 }}>

              {/* Reorder arrows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                <button onClick={() => moveUp(i)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', padding: '2px', opacity: i === 0 ? 0.2 : 0.6, WebkitTapHighlightColor: 'transparent' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button onClick={() => moveDown(i)} disabled={i === sections.length - 1} style={{ background: 'none', border: 'none', cursor: i === sections.length - 1 ? 'default' : 'pointer', padding: '2px', opacity: i === sections.length - 1 ? 0.2 : 0.6, WebkitTapHighlightColor: 'transparent' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>

              {/* Icon + label */}
              <div style={{ color: '#0c2520', flexShrink: 0 }}>{s.icon}</div>
              <p style={{ fontSize: '14px', color: '#0c2520', margin: 0, fontWeight: 500, flex: 1 }}>{s.label}</p>

              {/* Toggle */}
              <div
                className="toggle-track"
                onClick={() => toggleVisible(s.key)}
                style={{ background: s.visible ? '#4ade80' : '#d4d2cc' }}
              >
                <div className="toggle-thumb" style={{ left: s.visible ? '20px' : '2px' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Preview hint */}
        <div style={{ marginTop: '20px', background: '#e8efea', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          <p style={{ fontSize: '12px', color: '#0c2520', margin: 0, lineHeight: 1.4 }}>Hidden sections won't appear on your public profile but your data is kept safe.</p>
        </div>

        {/* Save button */}
        {hasChanges && (
          <button onClick={handleSave} disabled={saving} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginTop: '20px', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save layout'}
          </button>
        )}
      </div>
    </div>
  )
}
