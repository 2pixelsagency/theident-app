'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Props = {
  jobId: string
  profileId: string
  requiresNda: boolean
  ndaText: string | null
  onClose: () => void
  onApplied: () => void
}

export default function ApplyForm({ jobId, profileId, requiresNda, ndaText, onClose, onApplied }: Props) {
  const [note, setNote] = useState('')
  const [files, setFiles] = useState<{ url: string; type: string; name: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [ndaSigned, setNdaSigned] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const sigRef = useRef<HTMLCanvasElement>(null)
  const [signing, setSigning] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)

  const startSign = (e: React.PointerEvent) => {
    setSigning(true)
    const canvas = sigRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.strokeStyle = '#0c2520'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  const drawSign = (e: React.PointerEvent) => {
    if (!signing) return
    const canvas = sigRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    ctx.lineTo(x, y)
    ctx.stroke()
    setHasSigned(true)
  }

  const endSign = () => setSigning(false)

  const clearSignature = () => {
    const canvas = sigRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
    setNdaSigned(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files
    if (!fileList) return
    setUploading(true)
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i]
      if (file.size > 100 * 1024 * 1024) { alert('File too large. Max 100MB.'); continue }
      const ext = file.name.split('.').pop()
      const path = profileId + '/' + jobId + '/' + Date.now() + '-' + i + '.' + ext
      const { error } = await supabase.storage.from('applications').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('applications').getPublicUrl(path)
        const fileType = file.type.startsWith('video') ? 'video' : file.type.startsWith('image') ? 'image' : 'document'
        setFiles(prev => [...prev, { url: publicUrl, type: fileType, name: file.name }])
      }
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (requiresNda && (!ndaSigned || !hasSigned)) return
    setSubmitting(true)

    let signatureUrl = null
    if (requiresNda && hasSigned && sigRef.current) {
      const blob = await new Promise<Blob | null>(resolve => sigRef.current?.toBlob(resolve, 'image/png'))
      if (blob) {
        const sigPath = profileId + '/' + jobId + '/nda-signature-' + Date.now() + '.png'
        const { error: sigErr } = await supabase.storage.from('applications').upload(sigPath, blob, { contentType: 'image/png' })
        if (!sigErr) {
          const { data: { publicUrl } } = supabase.storage.from('applications').getPublicUrl(sigPath)
          signatureUrl = publicUrl
        }
      }
    }

    const { data: app, error } = await supabase.from('applications').insert({
      job_id: jobId, profile_id: profileId, cover_note: note || null,
      nda_signed: ndaSigned, nda_signed_at: ndaSigned ? new Date().toISOString() : null,
      signature_url: signatureUrl,
      status: 'submitted'
    }).select().single()

    if (app && files.length > 0) {
      await supabase.from('application_files').insert(files.map(f => ({
        application_id: app.id, file_url: f.url, file_type: f.type, file_name: f.name
      })))
    }

    if (!error) {
      await supabase.from('calendar_events').insert({
        profile_id: profileId, title: 'Application submitted',
        event_type: 'audition', start_date: new Date().toISOString().split('T')[0],
        all_day: true, status: 'confirmed', color: '#4ade80',
        description: 'Applied for job'
      })
      onApplied()
    }
    setSubmitting(false)
  }

  const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index))

  const fileIcon = (type: string) => {
    if (type === 'video') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B7CFA" strokeWidth="1.8" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
    if (type === 'image') return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500 }} />
      <div className="apply-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 501, maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <style>{`@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } } .apply-sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }`}</style>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} /></div>
        <div style={{ padding: '8px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 700, color: '#0c2520', margin: 0 }}>Apply</p>
            <button onClick={onClose} style={{ background: '#0c2520', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f1f0ee" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          {/* Cover note */}
          <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 6px' }}>Cover note</p>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Why are you right for this role?" rows={4} style={{ width: '100%', padding: '13px 14px', border: '1px solid #e0ddd5', borderRadius: '12px', fontSize: '14px', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white', color: '#0c2520', resize: 'vertical', marginBottom: '16px' }} />

          {/* File uploads */}
          <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>Attachments</p>
          <p style={{ fontSize: '12px', color: '#aaa', margin: '0 0 10px' }}>Photos, videos, CV, headshots (max 100MB each)</p>
          {files.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
              {files.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e8e4de' }}>
                  {fileIcon(f.type)}
                  <span style={{ flex: 1, fontSize: '13px', color: '#0c2520', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', fontSize: '14px', color: '#c0392b', cursor: 'pointer' }}>x</button>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '2px dashed #d4d2cc', background: 'transparent', fontSize: '13px', color: '#888', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '16px' }}>
            {uploading ? 'Uploading...' : '+ Add files'}
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: 'none' }} />

          {/* NDA with signature */}
          {requiresNda && (
            <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e0ddd5', marginBottom: '16px', overflow: 'hidden' }}>
              <div style={{ padding: '16px', borderBottom: '1px solid #f0ede5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0c2520" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: '#0c2520', margin: 0 }}>Non-Disclosure Agreement</p>
                </div>
                <p style={{ fontSize: '12px', color: '#888', margin: 0, lineHeight: 1.5 }}>This role requires you to sign an NDA before your application can be submitted. Please read the terms below carefully.</p>
              </div>

              {ndaText && (
                <div style={{ padding: '16px', borderBottom: '1px solid #f0ede5', maxHeight: '200px', overflowY: 'auto' }}>
                  <p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{ndaText}</p>
                </div>
              )}

              <div style={{ padding: '16px', borderBottom: '1px solid #f0ede5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: 0 }}>Your signature</p>
                  {hasSigned && (
                    <button onClick={clearSignature} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#c0392b', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <canvas ref={sigRef} width={560} height={160}
                    onPointerDown={startSign} onPointerMove={drawSign} onPointerUp={endSign} onPointerLeave={endSign}
                    style={{ width: '100%', height: '100px', border: '1px solid #e0ddd5', borderRadius: '10px', background: '#fafaf8', cursor: 'crosshair', touchAction: 'none' }}
                  />
                  {!hasSigned && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <p style={{ fontSize: '13px', color: '#ccc', margin: 0 }}>Draw your signature here</p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" checked={ndaSigned} onChange={e => setNdaSigned(e.target.checked)} disabled={!hasSigned} style={{ accentColor: '#0c2520', width: '18px', height: '18px', cursor: hasSigned ? 'pointer' : 'not-allowed' }} />
                <p style={{ fontSize: '13px', color: hasSigned ? '#0c2520' : '#aaa', margin: 0 }}>I have read and agree to the NDA terms</p>
              </div>

              {ndaSigned && hasSigned && (
                <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <p style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, margin: 0 }}>NDA signed</p>
                </div>
              )}
            </div>
          )}

          <button onClick={handleSubmit} disabled={submitting || (requiresNda && (!ndaSigned || !hasSigned))} style={{ width: '100%', padding: '16px', background: '#0c2520', color: '#f1f0ee', border: 'none', borderRadius: '30px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', opacity: submitting || (requiresNda && (!ndaSigned || !hasSigned)) ? 0.5 : 1 }}>
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
        </div>
      </div>
    </>
  )
}
