'use client'

import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { VerifiedTick } from '@/components/rc/JobCard'
import { Avatar, Button, Card, IconButton, PageLoading, Pill, toast } from '@/components/rc/ui'
import { useMe } from '@/lib/rc/me'
import { useAsync } from '@/lib/rc/useAsync'
import { fullName } from '@/lib/rc/format'
import { loadFullProfile, type Credit } from '@/lib/rc/profile'
import { craftTag, graduateLabel, playingAge } from '@/lib/rc/talent'

// The performer's full public page (what casting directors and the public see)
export default function MyProfilePage() {
  const { id, role } = useMe()
  const { data, loading } = useAsync(() => loadFullProfile(id), [id])

  if (loading || !data?.profile) return <PageLoading />
  const { profile: p, reels, skills, credits, brands, testimonials, gallery, hair, eyes, connections } = data
  const name = fullName(p)
  const grad = graduateLabel(p)
  const caster = role === 'caster'
  const publicUrl = p.slug ? (typeof window !== 'undefined' ? window.location.origin : '') + '/' + p.slug : null

  const share = async () => {
    if (!publicUrl) { toast('Add your name to get a public link'); return }
    try { if (navigator.share) await navigator.share({ title: name, url: publicUrl }); else { await navigator.clipboard.writeText(publicUrl); toast('Profile link copied') } } catch { /* dismissed */ }
  }

  const stats = caster ? [] : ([
    ['Playing age', playingAge(p)], ['Height', p.height], ['Base', p.location?.split(',')[0]],
    ['Eyes', eyes.find(e => e.id === p.eye_colour_id)?.name], ['Hair', hair.find(h => h.id === p.hair_colour_id)?.name],
  ] as const).filter(([, v]) => !!v)

  // Credits grouped by production type, as on Spotlight/Mandy
  const groups = credits.reduce<Record<string, Credit[]>>((acc, c) => { const k = c.production_types?.name || 'Other'; (acc[k] ||= []).push(c); return acc }, {})

  return (
    <>
      <div className="relative h-32 bg-hero bg-cover bg-center" style={p.banner_url ? { backgroundImage: `url(${p.banner_url})` } : undefined}>
        <div className="flex justify-end gap-2 px-4 pt-[max(14px,env(safe-area-inset-top))]">
          <IconButton icon="share" label="Share profile" onClick={share} className="bg-surface/90" />
          <IconButton icon="pen" label="Edit profile" href="/me/edit" className="bg-surface/90" />
        </div>
      </div>
      <div className="px-4 pb-10">
        <div className="relative z-10 -mt-12 w-fit rounded-full ring-4 ring-bg"><Avatar src={p.picture_url} name={name} size={92} /></div>
        <h1 className="mt-3 flex items-center gap-2 text-[24px]">{name} {p.is_verified && <VerifiedTick />}</h1>
        <p className="text-sm text-muted">{caster ? [p.company_name, p.location].filter(Boolean).join(' · ') : [craftTag(p), p.location?.split(',')[0]].filter(Boolean).join(' · ')}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          {!caster && p.availability_status === 'available' && <Pill tone="green">Open to work</Pill>}
          {grad && <span className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-xs font-medium text-ink"><Icon name="graduation-cap" className="size-3.5" />{grad}</span>}
          <span>{connections} connection{connections === 1 ? '' : 's'}</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="dark" href="/me/edit">Edit profile</Button>
          <Button variant="outline" onClick={share}>Share</Button>
        </div>
        <p className="mt-2 text-center text-xs text-faint">This is how casting directors and the public see you{p.show_talent === false ? ' (currently hidden)' : ''}</p>

        {stats.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Stats</h2>
            <div className="grid grid-cols-3 gap-2">{stats.map(([k, v]) => <Card key={k} className="p-3"><p className="text-xs text-muted">{k}</p><p className="mt-0.5 text-[15px] font-medium">{v}</p></Card>)}</div>
          </>
        )}

        {!caster && (
          <>
            <div className="mb-3 mt-6 flex items-center justify-between"><h2 className="text-[18px]">Showreels</h2>{reels.length > 0 && <span className="text-sm text-muted">{reels.length} clip{reels.length === 1 ? '' : 's'}</span>}</div>
            {reels.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {reels.slice(0, 4).map(r => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/10] overflow-hidden rounded-[var(--radius)] bg-dark bg-cover bg-center" style={p.picture_url ? { backgroundImage: `url(${p.picture_url})` } : undefined}>
                    <span className="absolute inset-0 bg-dark/40" />
                    <span className="absolute left-1/2 top-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name="play" className="size-4 fill-current" /></span>
                    <span className="absolute bottom-2 left-2.5 right-2.5 truncate text-xs font-medium text-white">{r.label || 'Showreel'}</span>
                  </a>
                ))}
              </div>
            )}
            <Link href="/me/edit#media" className="upload mt-3 flex h-11 items-center justify-center gap-2 text-sm font-medium"><Icon name="plus" className="size-4" /> Add a clip</Link>
          </>
        )}

        {brands.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Worked with</h2>
            <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
              {brands.map(b => (
                <span key={b.id} className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-medium shadow-card">
                  {b.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={b.logo_url} alt="" className="size-7 rounded-md object-contain" />
                    : <span className="flex size-7 items-center justify-center rounded-md bg-green text-[11px] text-white">{b.brand_name.slice(0, 2).toUpperCase()}</span>}
                  {b.brand_name}
                </span>
              ))}
            </div>
          </>
        )}

        {credits.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Credits</h2>
            <Card className="overflow-hidden">
              {Object.entries(groups).map(([group, list]) => (
                <div key={group}>
                  <p className="bg-chip/50 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{group}</p>
                  {list.map(c => (
                    <div key={c.id} className="flex items-start gap-3 border-t border-line px-4 py-3">
                      <div className="min-w-0 flex-1"><p className="text-[15px] font-medium">{[c.title, c.role].filter(Boolean).join(' — ')}</p><p className="text-[13px] text-muted">{[c.production_company, c.director && 'dir. ' + c.director].filter(Boolean).join(' · ')}</p></div>
                      {c.year && <span className="text-sm text-faint">{c.year}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          </>
        )}

        {skills.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Skills</h2>
            <div className="flex flex-wrap gap-2">{skills.map(s => <span key={s.id} className="rounded-full bg-green-tint px-3 py-1.5 text-[13px] text-green-ink">{s.name}</span>)}</div>
          </>
        )}

        {p.is_graduate && p.graduate_school && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Training</h2>
            <Card className="flex items-start justify-between px-4 py-3"><div><p className="text-[15px] font-medium">{p.graduate_school}</p><p className="text-[13px] text-muted">Recent graduate</p></div>{p.graduate_year && <span className="text-sm text-faint">{p.graduate_year}</span>}</Card>
          </>
        )}

        {(testimonials.length > 0 || !caster) && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Testimonials</h2>
            <div className="space-y-3">
              {testimonials.map(t => (
                <Card key={t.id} className="p-4">
                  <p className="text-[15px] leading-relaxed">“{t.quote}”</p>
                  <p className="mt-3 text-sm font-medium">{t.author_name}</p>
                  {t.author_title && <p className="text-[13px] text-muted">{t.author_title}</p>}
                </Card>
              ))}
              {!caster && <button type="button" onClick={async () => { if (publicUrl) { await navigator.clipboard?.writeText(publicUrl).catch(() => {}); toast('Link copied — send it to a director or choreographer') } }} className="upload flex h-11 w-full items-center justify-center gap-2 text-sm font-medium"><Icon name="send" className="size-4" /> Request a testimonial</button>}
            </div>
          </>
        )}

        {(p.bio || p.summary) && (
          <>
            <h2 className="mb-2 mt-6 text-[18px]">About</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{p.bio || p.summary}</p>
          </>
        )}

        {p.agent_name && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Representation</h2>
            <Card className="flex items-center gap-3 p-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-dark text-sm font-medium text-green">{p.agent_name.slice(0, 1)}</span>
              <span className="flex-1"><span className="block text-[15px] font-medium">Represented by {p.agent_name}</span><span className="block text-[13px] text-muted">{p.agent_email || p.agent_phone || 'Agent'}</span></span>
            </Card>
          </>
        )}

        {gallery.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Gallery</h2>
            <div className="grid grid-cols-3 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {gallery.map(g => <img key={g.id} src={g.url} alt="" className="aspect-square w-full rounded-xl object-cover" />)}
            </div>
          </>
        )}
      </div>
    </>
  )
}
