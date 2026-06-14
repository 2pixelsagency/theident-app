'use client'

import { useRouter } from 'next/navigation'

export default function BackButton({ label, fallback }: { label?: string; fallback?: string }) {
  const router = useRouter()
  const handleBack = () => {
    if (window.history.length > 1) router.back()
    else router.push(fallback || '/profile')
  }
  return (
    <button onClick={handleBack} style={{ background: 'none', border: 'none', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', padding: 0, WebkitTapHighlightColor: 'transparent' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
      {label || 'Back'}
    </button>
  )
}
