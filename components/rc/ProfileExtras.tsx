'use client'

import { useRef, useState } from 'react'
import Icon from './Icon'
import { Button, Card, Field, Sheet, TextArea, toast } from './ui'
import { supabase } from '@/lib/supabase'
import type { Brand, Testimonial } from '@/lib/rc/profile'

// Customise profile: "Worked with" brands, testimonials and gallery photos. Each change saves immediately.

type Photo = { id: string; url: string }
const stamp = () => Date.now().toString(36)

export function BrandsEditor({ uid, brands, onChange }: { uid: string; brands: Brand[]; onChange: (b: Brand[]) => void }) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const brand_name = name.trim()
    if (!brand_name) return
    setBusy(true)
    // Logo lookup (server-side key); a missing logo just shows initials
    const logo = await fetch('/api/brandfetch?brand=' + encodeURIComponent(brand_name)).then(r => r.json()).then(d => (d.logo as string | null) ?? null).catch(() => null)
    const { data, error } = await supabase.from('profile_brands').insert({ profile_id: uid, brand_name, logo_url: logo, sort_order: brands.length }).select('id, brand_name, logo_url').single()
    setBusy(false)
    if (error || !data) { toast('Couldn’t add that brand'); return }
    onChange([...brands, data as Brand])
    setName('')
  }
  const remove = async (b: Brand) => {
    onChange(brands.filter(x => x.id !== b.id))
    const { error } = await supabase.from('profile_brands').delete().eq('id', b.id)
    if (error) { onChange(brands); toast('Couldn’t remove that brand') }
  }
  return (
    <section id="brands" className="scroll-mt-4">
      <h2 className="mb-1 text-[18px]">Worked with</h2>
      <p className="mb-3 text-[13px] text-muted">Brands, companies and venues you’ve worked for.</p>
      {brands.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {brands.map(b => (
            <span key={b.id} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface pl-2 pr-1 text-sm font-medium">
              {b.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={b.logo_url} alt="" className="size-6 rounded object-contain" />
                : <span className="flex size-6 items-center justify-center rounded bg-forest text-[10px] text-white">{b.brand_name.slice(0, 2).toUpperCase()}</span>}
              {b.brand_name}
              <button type="button" aria-label={'Remove ' + b.brand_name} onClick={() => remove(b)} className="inline-flex size-7 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="x" className="size-3.5" /></button>
            </span>
          ))}
        </div>
      )}
      <form onSubmit={add} className="flex items-end gap-2">
        <Field className="flex-1" label="Add a brand or company" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. BBC, Nike, National Theatre" />
        <Button type="submit" variant="outline" disabled={busy || !name.trim()}>{busy ? 'Adding…' : 'Add'}</Button>
      </form>
    </section>
  )
}

export function TestimonialsEditor({ uid, testimonials, onChange }: { uid: string; testimonials: Testimonial[]; onChange: (t: Testimonial[]) => void }) {
  const [open, setOpen] = useState(false)
  const [quote, setQuote] = useState('')
  const [author, setAuthor] = useState('')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const save = async () => {
    if (!quote.trim() || !author.trim()) { toast('Add the quote and who said it'); return }
    setBusy(true)
    const { data, error } = await supabase.from('testimonials').insert({ profile_id: uid, quote: quote.trim(), author_name: author.trim(), author_title: title.trim() || null, sort_order: testimonials.length }).select('id, quote, author_name, author_title').single()
    setBusy(false)
    if (error || !data) { toast('Couldn’t add the testimonial'); return }
    onChange([...testimonials, data as Testimonial])
    setQuote(''); setAuthor(''); setTitle(''); setOpen(false)
  }
  const remove = async (t: Testimonial) => {
    if (!confirm('Remove this testimonial?')) return
    onChange(testimonials.filter(x => x.id !== t.id))
    const { error } = await supabase.from('testimonials').delete().eq('id', t.id)
    if (error) { onChange(testimonials); toast('Couldn’t remove it') }
  }
  return (
    <section id="testimonials" className="scroll-mt-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="text-[18px]">Testimonials</h2><button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-green-ink">+ Add</button></div>
      {testimonials.length === 0 ? <p className="text-sm text-muted">Add a line from a director, choreographer or teacher.</p> : (
        <div className="space-y-2">
          {testimonials.map(t => (
            <Card key={t.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1"><p className="text-[14px] leading-relaxed">“{t.quote}”</p><p className="mt-1.5 text-[13px] text-muted">{[t.author_name, t.author_title].filter(Boolean).join(' · ')}</p></div>
              <button type="button" aria-label="Remove testimonial" onClick={() => remove(t)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-chip"><Icon name="x" className="size-4" /></button>
            </Card>
          ))}
        </div>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a testimonial">
        <div className="space-y-4">
          <TextArea label="What they said" value={quote} onChange={e => setQuote(e.target.value)} placeholder="“A rare triple-threat…”" />
          <Field label="Who said it" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Name" />
          <Field label="Their role (optional)" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Director · National tour" />
          <Button full size="lg" onClick={save} disabled={busy}>{busy ? 'Saving…' : 'Add testimonial'}</Button>
        </div>
      </Sheet>
    </section>
  )
}

export function GalleryEditor({ uid, photos, onChange }: { uid: string; photos: Photo[]; onChange: (p: Photo[]) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    let next = photos
    for (const f of files.slice(0, 12)) {
      if (f.size > 15 * 1024 * 1024) { toast(f.name + ' is over 15MB'); continue }
      const path = uid + '/gallery-' + stamp() + '.' + (f.name.split('.').pop() || 'jpg')
      const { error } = await supabase.storage.from('headshots').upload(path, f, { contentType: f.type })
      if (error) { toast('Upload failed'); continue }
      const url = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
      const { data } = await supabase.from('gallery_images').insert({ profile_id: uid, url, sort_order: next.length }).select('id, url').single()
      if (data) { next = [...next, data as Photo]; onChange(next) }
    }
    setBusy(false)
  }
  const remove = async (ph: Photo) => {
    if (!confirm('Remove this photo?')) return
    onChange(photos.filter(x => x.id !== ph.id))
    const { error } = await supabase.from('gallery_images').delete().eq('id', ph.id)
    if (error) { onChange(photos); toast('Couldn’t remove it') }
  }
  return (
    <section id="gallery" className="scroll-mt-4">
      <h2 className="mb-3 text-[18px]">Gallery</h2>
      <div className="grid grid-cols-3 gap-2">
        {photos.map(ph => (
          <div key={ph.id} className="relative aspect-square overflow-hidden rounded-xl bg-chip">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ph.url} alt="" className="size-full object-cover" />
            <button type="button" aria-label="Remove photo" onClick={() => remove(ph)} className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-surface/90"><Icon name="x" className="size-3.5" /></button>
          </div>
        ))}
        <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="upload flex aspect-square flex-col items-center justify-center gap-1 text-xs text-muted"><Icon name={busy ? 'clock' : 'plus'} className="size-6" />{busy ? 'Uploading…' : 'Add photos'}</button>
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={upload} />
    </section>
  )
}
