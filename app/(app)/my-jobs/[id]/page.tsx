'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AppHeader from '@/components/AppHeader'

type Applicant = {
  id: string
  profile_id: string
  cover_note: string | null
  nda_signed: boolean
  signature_url: string | null
  status: string
  created_at: string
  profiles: { first_name: string | null; last_name: string | null; picture_url: string | null; slug: string | null; location: string | null } | null
  files: { id: string; file_url: string; file_type: string; file_name: string | null }[]
}

type Job = { id: string; project_role: string | null; project_in: string | null; job_title: string | null; company: string | null; is_side_hustle: boolean }

export default function JobApplicants() {
  const router = useRouter()
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<Job | null>(null)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'submitted' | 'shortlisted' | 'rejected'>('all')
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500) }

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user
      if (!user) { router.push('/login'); return }
      const { data: jobData } = await supabase.from('jobs').select('id, project_role, project_in, job_title, company, is_side_hustle').eq('id', jobId).eq('created_by', user.id).single()
      if (!jobData) { router.push('/my-jobs'); return }
      setJob(jobData)
      const { data: apps } = await supabase.from('applications').select('*, profiles(first_name, last_name, picture_url, slug, location)').eq('job_id', jobId).order('created_at', { ascending: false })
      if (apps && apps.length) {
        // One query for all files across these applications, then group in memory (was N+1 before)
        const appIds = apps.map(a => a.id)
        const { data: allFiles } = await supabase.from('application_files').select('id, application_id, file_url, file_type, file_name').in('application_id', appIds)
        const filesByApp = new Map<string, any[]>()
        ;(allFiles || []).forEach((f: any) => { const a = filesByApp.get(f.application_id) || []; a.push(f); filesByApp.set(f.application_id, a) })
        setApplicants(apps.map(a => ({ ...a, files: filesByApp.get(a.id) || [] })))
      } else {
        setApplicants([])
      }
      setLoading(false)
    }
    load()
  }, [jobId])

  const updateStatus = async (appId: string, status: string) => {
    await supabase.from('applications').update({ status }).eq('id', appId)
    setApplicants(prev => prev.map(a => a.id === appId ? { ...a, status } : a))
    if (selectedApp?.id === appId) setSelectedApp({ ...selectedApp, status })
    showToast(status === 'shortlisted' ? 'Shortlisted' : status === 'rejected' ? 'Rejected' : 'Updated')
  }

  const deleteApplication = async (appId: string) => {
    await supabase.from('application_files').delete().eq('application_id', appId)
    await supabase.from('applications').delete().eq('id', appId)
    setApplicants(prev => prev.filter(a => a.id !== appId))
    setSelectedApp(null)
    showToast('Application removed')
  }

  const filtered = filter === 'all' ? applicants : applicants.filter(a => a.status === filter)
  const title = job?.is_side_hustle ? job?.job_title : job?.project_role
  const counts = { all: applicants.length, submitted: applicants.filter(a => a.status === 'submitted').length, shortlisted: applicants.filter(a => a.status === 'shortlisted').length, rejected: applicants.filter(a => a.status === 'rejected').length }

  const statusColor = (s: string) => {
    if (s === 'submitted') return { bg: '#e8efea', color: '#0c2520' }
    if (s === 'shortlisted') return { bg: '#4ade80', color: '#061410' }
    if (s === 'rejected') return { bg: '#fde8e8', color: '#c0392b' }
    return { bg: '#e8e4de', color: '#888' }
  }

  if (loading) return <div style={{ minHeight: '100vh', background: '#f1f0ee' }} />

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#f1f0ee', minHeight: '100vh', paddingBottom: '120px' }}>
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes toastIn { from { opacity:0;transform:translateX(-50%) translateY(8px); } to { opacity:1;transform:translateX(-50%) translateY(0); } }
        .review-sheet { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
        .toast-anim { animation: toastIn 0.25s ease-out; }
      `}</style>

      {toast && <div className="toast-anim" style={{ position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)', background: '#0c2520', color: '#f1f0ee', padding: '12px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 500, zIndex: 700, whiteSpace: 'nowrap' }}>{toast}</div>}

      {/* Header */}
      <AppHeader title={title || 'Applicants'} showBack fallback="/my-jobs" />

      <div style={{ padding: '0 16px' }}>
        <p style={{ fontSize: '13px', color: '#888', margin: '0 0 20px' }}>{applicants.length} applicant{applicants.length !== 1 ? 's' : ''}</p>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto' }}>
          {(['all', 'submitted', 'shortlisted', 'rejected'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', border: filter === f ? 'none' : '1px solid #e0ddd5', background: filter === f ? '#0c2520' : 'white', color: filter === f ? '#f1f0ee' : '#888', fontWeight: filter === f ? 600 : 400, whiteSpace: 'nowrap' }}>
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>

        {/* Applicant list */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '32px', textAlign: 'center' }}>
            <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>No applicants in this category</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.map(app => {
              const p = app.profiles
              const sc = statusColor(app.status)
              return (
                <div key={app.id} onClick={() => setSelectedApp(app)} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: p?.picture_url ? 'url(' + p.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#0c2520', margin: 0 }}>{(p?.first_name || '') + ' ' + (p?.last_name || '')}</p>
                      <span style={{ background: sc.bg, color: sc.color, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>{app.status}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                      {p?.location && <span style={{ fontSize: '11px', color: '#888' }}>{p.location}</span>}
                      <span style={{ fontSize: '11px', color: '#aaa' }}>{new Date(app.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      {app.nda_signed && <span style={{ fontSize: '10px', color: '#4ade80', fontWeight: 600 }}>NDA</span>}
                      {app.files.length > 0 && <span style={{ fontSize: '10px', color: '#888' }}>{app.files.length} file{app.files.length !== 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      {selectedApp && (
        <>
          <div onClick={() => setSelectedApp(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500 }} />
          <div className="review-sheet" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#f1f0ee', borderRadius: '20px 20px 0 0', zIndex: 501, maxHeight: '90vh', overflowY: 'auto', paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}><div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d4d2cc' }} /></div>
            <div style={{ padding: '8px 20px 24px' }}>
              {/* Profile header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: selectedApp.profiles?.picture_url ? 'url(' + selectedApp.profiles.picture_url + ') center/cover' : '#e8e4de', backgroundSize: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontFamily: "'ITC Symbol',Georgia,serif", letterSpacing: '-0.03em', fontSize: '18px', fontWeight: 500, color: '#0c2520', margin: '0 0 2px' }}>{(selectedApp.profiles?.first_name || '') + ' ' + (selectedApp.profiles?.last_name || '')}</p>
                  {selectedApp.profiles?.location && <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>{selectedApp.profiles.location}</p>}
                </div>
                {selectedApp.profiles?.slug && (
                  <Link href={'/' + selectedApp.profiles.slug + '?from=app'} target="_blank" style={{ background: '#0c2520', color: '#f1f0ee', padding: '8px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>View Ident</Link>
                )}
              </div>

              {/* Cover note */}
              {selectedApp.cover_note && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 6px' }}>Cover note</p>
                  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8e4de', padding: '14px' }}>
                    <p style={{ fontSize: '14px', color: '#0c2520', margin: 0, lineHeight: 1.6 }}>{selectedApp.cover_note}</p>
                  </div>
                </div>
              )}

              {/* Files */}
              {selectedApp.files.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>Attachments</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedApp.files.map(f => (
                      <a key={f.id} href={f.file_url} target="_blank" rel="noopener" style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'white', borderRadius: '10px', padding: '10px 12px', border: '1px solid #e8e4de', textDecoration: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ flex: 1, fontSize: '13px', color: '#0c2520' }}>{f.file_name || 'File'}</span>
                        <span style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase' }}>{f.file_type}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* NDA signature */}
              {selectedApp.nda_signed && selectedApp.signature_url && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, margin: '0 0 8px' }}>NDA signature</p>
                  <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e8e4de', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={selectedApp.signature_url} alt="Signature" style={{ height: '50px', objectFit: 'contain' }} />
                    <div>
                      <p style={{ fontSize: '12px', color: '#4ade80', fontWeight: 600, margin: '0 0 2px' }}>NDA signed</p>
                      <p style={{ fontSize: '11px', color: '#aaa', margin: 0 }}>{new Date(selectedApp.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedApp.status !== 'shortlisted' && (
                  <button onClick={() => updateStatus(selectedApp.id, 'shortlisted')} style={{ flex: 1, padding: '14px', background: '#4ade80', color: '#061410', border: 'none', borderRadius: '30px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Shortlist</button>
                )}
                {selectedApp.status !== 'rejected' && (
                  <button onClick={() => updateStatus(selectedApp.id, 'rejected')} style={{ flex: 1, padding: '14px', background: 'white', color: '#c0392b', border: '1px solid #e8e4de', borderRadius: '30px', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Reject</button>
                )}
              </div>

              <button onClick={() => deleteApplication(selectedApp.id)} style={{ width: '100%', padding: '12px', background: 'transparent', color: '#c0392b', border: 'none', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit', marginTop: '10px' }}>Delete application</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
