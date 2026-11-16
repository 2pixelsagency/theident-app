'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Avatar, Button, Sheet, cx, toast } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { fullName } from '@/lib/rc/format'
import { craftTag } from '@/lib/rc/talent'

export type AppFile = { application_id: string; file_url: string; file_type: string; file_name: string | null }
export type Note = { application_id: string; rating: number | null; note: string | null }
type Person = { first_name: string | null; last_name: string | null; picture_url: string | null; location: string | null; what_i_do: string | null; is_graduate: boolean; graduate_year: number | null }
export type ReviewRow = { id: string; profile_id: string; cover_note: string | null; profiles: Person | null }

// Reels are public links or uploads; self-tapes live in the private applications bucket (signed URL)
export function videosOf(files: AppFile[]) { return files.filter(f => f.file_type === 'video') }
function embed(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&playsinline=1&rel=0'
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return 'https://player.vimeo.com/video/' + vm[1] + '?autoplay=1'
  return null
}
async function playable(url: string) {
  if (/^https?:\/\//.test(url)) return { src: url, embed: embed(url) }
  const { data } = await supabase.storage.from('applications').createSignedUrl(url, 3600)
  return { src: data?.signedUrl || null, embed: null }
}

export function Stars({ value, onChange, size = 'size-6' }: { value: number | null; onChange?: (v: number | null) => void; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role={onChange ? 'radiogroup' : undefined} aria-label={onChange ? 'Rating' : (value ? value + ' out of 5' : 'Not rated')}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = (value || 0) >= n
        const star = <Icon name="star" className={cx(size, on ? 'fill-current text-amber' : 'text-line')} />
        return onChange
          ? <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={n + ' star' + (n > 1 ? 's' : '')} onClick={() => onChange(value === n ? null : n)} className="p-0.5">{star}</button>
          : <span key={n}>{star}</span>
      })}
    </span>
  )
}

// Watch, rate and decide without leaving the list; ← → steps through the stage
export default function QuickReview({ rows, index, files, notes, onIndex, onClose, onNote, actions }: {
  rows: ReviewRow[]; index: number | null; files: Map<string, AppFile[]>; notes: Map<string, Note>
  onIndex: (i: number) => void; onClose: () => void; onNote: (n: Note) => void
  actions: (id: string) => { label: string; icon: string; onClick: () => void; tone?: 'primary' | 'no' }[]
}) {
  const row = index == null ? null : rows[index]
  const vids = row ? videosOf(files.get(row.id) || []) : []
  const [pick, setPick] = useState(0)
  const [media, setMedia] = useState<{ key: string; src: string | null; embed: string | null } | null>(null)
  const saved = row ? notes.get(row.id) : undefined
  const [draft, setDraft] = useState<{ id: string; text: string } | null>(null)
  const text = draft && draft.id === row?.id ? draft.text : saved?.note || ''
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const file = vids[Math.min(pick, vids.length - 1)]
  const key = row && file ? row.id + file.file_url : null
  useEffect(() => {
    if (!key || !file) return
    let live = true
    playable(file.file_url).then(m => live && setMedia({ key, ...m }))
    return () => { live = false }
  }, [key, file])

  const save = async (patch: Partial<Note>) => {
    if (!row) return
    const next = { application_id: row.id, rating: saved?.rating ?? null, note: saved?.note ?? null, ...patch }
    onNote(next)
    const { error } = await supabase.from('applicant_notes').upsert({ ...next, updated_at: new Date().toISOString() })
    if (error) toast('Couldn’t save your note')
  }
  const typing = (v: string) => {
    if (!row) return
    setDraft({ id: row.id, text: v })
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => save({ note: v.trim() || null }), 700)
  }
  const go = (d: number) => {
    if (index == null) return
    const n = index + d
    if (n < 0 || n >= rows.length) return
    if (timer.current) { clearTimeout(timer.current); if (draft?.id === row?.id) save({ note: draft!.text.trim() || null }) }
    setPick(0); onIndex(n)
  }

  useEffect(() => {
    if (index == null) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const p = row?.profiles
  const shown = media && media.key === key ? media : null
  return (
    <Sheet open={!!row} onClose={onClose} title={row ? (index! + 1) + ' of ' + rows.length : ''}>
      {row && (
        <div className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-[var(--radius)] bg-dark">
            {!file ? (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-white/70">
                {p?.picture_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={p.picture_url} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
                  : null}
                <span className="relative text-sm">No reel or self-tape sent</span>
              </div>
            ) : !shown ? <span className="flex size-full items-center justify-center text-sm text-white/70">Loading…</span>
              : shown.embed ? <iframe key={shown.embed} src={shown.embed} title={file.file_name || 'Reel'} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" className="size-full border-0" />
              : shown.src ? <video key={shown.src} src={shown.src} controls autoPlay playsInline className="size-full bg-black object-contain" />
              : <span className="flex size-full items-center justify-center text-sm text-white/70">This video couldn’t be opened</span>}
          </div>
          {vids.length > 1 && (
            <div className="flex gap-2">
              {vids.map((v, i) => <button key={v.file_url} type="button" onClick={() => setPick(i)} aria-pressed={i === pick}
                className={cx('h-8 rounded-full border px-3 text-xs font-medium', i === pick ? 'border-forest bg-forest text-white' : 'border-line')}>{v.file_name || 'Video ' + (i + 1)}</button>)}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Avatar src={p?.picture_url} name={fullName(p)} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-semibold">{fullName(p)}</p>
              <p className="truncate text-[13px] text-muted">{[p?.location, p && craftTag(p)].filter(Boolean).join(' · ')}</p>
            </div>
            <Link href={'/talent/' + row.profile_id + '?app=' + row.id} className="text-sm font-semibold text-green-ink">Profile</Link>
          </div>
          {row.cover_note && <p className="rounded-xl bg-field p-3 text-sm">“{row.cover_note}”</p>}

          <div className="rounded-[var(--radius)] border border-line p-3">
            <div className="flex items-center justify-between"><span className="text-[13px] font-medium">Your rating</span><Stars value={saved?.rating ?? null} onChange={v => save({ rating: v })} /></div>
            <textarea value={text} onChange={e => typing(e.target.value)} rows={2} maxLength={2000} placeholder="Private note — only you can see this"
              className="mt-2 w-full resize-none rounded-lg bg-field px-3 py-2 text-sm outline-none focus:bg-surface" aria-label="Private note" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {actions(row.id).map(a => (
              <Button key={a.label} size="md" variant={a.tone === 'primary' ? 'primary' : 'outline'} icon={a.icon}
                className={cx(a.tone === 'no' && 'text-red')} onClick={() => { a.onClick(); if (index! < rows.length - 1) go(1); else onClose() }}>{a.label}</Button>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={() => go(-1)} disabled={index === 0} className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-30"><Icon name="chevron-left" className="size-4" /> Previous</button>
            <button type="button" onClick={() => go(1)} disabled={index === rows.length - 1} className="inline-flex items-center gap-1 text-sm font-medium disabled:opacity-30">Next <Icon name="chevron-right" className="size-4" /></button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
