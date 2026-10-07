'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import { VerifiedTick } from './JobCard'
import { Avatar, Button, Card, cx, toast } from './ui'
import { fullName } from '@/lib/rc/format'
import { craftTag, graduateLabel, playingAge } from '@/lib/rc/talent'
import type { Credit, FullProfileData } from '@/lib/rc/profile'

// Button styles for controls floated over the headshot
export const heroRound = 'inline-flex size-10 items-center justify-center rounded-full bg-dark/45 text-white backdrop-blur-md transition active:scale-95'
export const heroPrimary = 'flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-[14px] bg-bg text-[15px] font-medium text-ink transition active:scale-[0.98] disabled:opacity-60'
export const heroSecondary = 'flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] border border-white/25 bg-white/10 text-[15px] font-medium text-white backdrop-blur-md transition active:scale-[0.98] disabled:opacity-60'

type Props = {
  data: FullProfileData
  owner?: boolean
  onBack?: () => void
  onShare: () => void
  topRight?: React.ReactNode // extra round buttons beside Share
  actions?: React.ReactNode // buttons at the foot of the headshot
  statusLine?: React.ReactNode
  below?: React.ReactNode // extra actions under the headshot
  signedIn?: boolean // uploaded CV files are for signed-in members only
}

function CvButtons({ data, signedIn }: { data: FullProfileData; signedIn?: boolean }) {
  const [busy, setBusy] = useState<'pdf' | 'file' | null>(null)
  const path = data.profile?.cv_path
  const generate = async () => {
    setBusy('pdf')
    try { const { downloadCv } = await import('@/lib/rc/cv'); await downloadCv(data) } catch { toast('Couldn’t create the CV — try again') }
    setBusy(null)
  }
  const openFile = async () => {
    setBusy('file')
    const { openUploadedCv } = await import('@/lib/rc/cv')
    if (!(await openUploadedCv(path!))) toast('Couldn’t open the CV file')
    setBusy(null)
  }
  return (
    <div className="mt-5 flex gap-3">
      <Button variant="dark" className="flex-1" icon="download" onClick={generate} disabled={busy !== null}>{busy === 'pdf' ? 'Creating…' : 'Download CV'}</Button>
      {path && signedIn && <Button variant="outline" className="flex-1" icon="file" onClick={openFile} disabled={busy !== null}>{busy === 'file' ? 'Opening…' : 'Uploaded CV'}</Button>}
    </div>
  )
}

// One immersive profile for everyone: the owner (/me), casters and members (/talent/[id]) and the public link (/[slug]).
// The headshot bleeds to the very top of the screen, behind the status bar / notch; controls float over it.
export default function ProfileView({ data, owner, onBack, onShare, topRight, actions, statusLine, below, signedIn }: Props) {
  const p = data.profile!
  const { reels, skills, credits, brands, testimonials, gallery, hair, eyes, connections } = data
  const name = fullName(p) || 'RoleCall member'
  const caster = p.account_role === 'caster'
  const craft = caster ? p.company_name : craftTag(p)
  const grad = graduateLabel(p)
  const facts = [playingAge(p) && 'Playing age ' + playingAge(p), p.height, p.location?.split(',')[0]].filter(Boolean).join(' · ')

  const stats = caster ? [] : ([
    ['Playing age', playingAge(p)], ['Height', p.height], ['Base', p.location?.split(',')[0]],
    ['Eyes', eyes.find(e => e.id === p.eye_colour_id)?.name], ['Hair', hair.find(h => h.id === p.hair_colour_id)?.name],
  ] as const).filter(([, v]) => !!v)

  // Credits grouped by production type, as on Spotlight/Mandy
  const groups = credits.reduce<Record<string, Credit[]>>((acc, c) => { const k = c.production_types?.name || 'Other'; (acc[k] ||= []).push(c); return acc }, {})
  const empty = !reels.length && !p.bio && !p.summary && !skills.length && !credits.length && !brands.length && !testimonials.length && !gallery.length

  return (
    <>
      <section className="relative h-[86dvh] min-h-[560px] max-h-[920px] overflow-hidden bg-dark text-white lg:h-[78vh] lg:rounded-b-[28px]">
        {p.picture_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={p.picture_url} alt={name} className="absolute inset-0 size-full object-cover" />
          : <div className="absolute inset-0 flex items-center justify-center bg-hero"><Avatar name={name} size={140} /></div>}
        {/* scrims keep the floated controls and the name legible on any photo */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-dark/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-dark via-dark/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-4 pt-[max(14px,env(safe-area-inset-top))]">
          {onBack ? <button type="button" aria-label="Back" onClick={onBack} className={heroRound}><Icon name="chevron-left" /></button> : <span />}
          <div className="flex gap-2">
            <button type="button" aria-label="Share profile" onClick={onShare} className={heroRound}><Icon name="share" className="size-5" /></button>
            {topRight}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 px-5 pb-6">
          <div className="flex flex-wrap gap-2">
            {!caster && p.availability_status === 'available' && <span className="inline-flex items-center gap-1.5 rounded-full bg-green px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em]"><span className="size-1.5 rounded-full bg-white" /> Open to work</span>}
            {craft && <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.08em] backdrop-blur">{craft}</span>}
            {grad && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-ink"><Icon name="graduation-cap" className="size-3.5" />{grad}</span>}
          </div>
          <h1 className="mt-3 flex items-center gap-2 text-[34px] text-white">{name}{p.is_verified && <VerifiedTick />}</h1>
          {facts && <p className="mt-1 text-sm text-white/80">{facts}</p>}
          {actions && <div className="mt-5 flex gap-3">{actions}</div>}
          <p className="mt-3 text-xs text-white/65">
            {statusLine ?? (connections + ' connection' + (connections === 1 ? '' : 's'))}
            {owner && p.show_talent === false ? ' · Hidden from search' : ''}
          </p>
        </div>
      </section>

      <div className="px-4 pb-10">
        {!caster && <CvButtons data={data} signedIn={signedIn} />}
        {below}

        {(reels.length > 0 || owner) && !caster && (
          <>
            <div className="mb-3 mt-6 flex items-center justify-between"><h2 className="text-[18px]">Showreel &amp; tapes</h2>{reels.length > 0 && <span className="text-sm text-muted">{reels.length} clip{reels.length === 1 ? '' : 's'}</span>}</div>
            {reels.length > 0 && (
              <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">
                {reels.map(r => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/10] w-[46%] shrink-0 overflow-hidden rounded-[var(--radius)] bg-dark bg-cover bg-center lg:w-[31%]" style={p.picture_url ? { backgroundImage: `url(${p.picture_url})` } : undefined}>
                    <span className="absolute inset-0 bg-dark/40" />
                    <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name="play" className="size-4 fill-current" /></span>
                    <span className="absolute bottom-2 left-3 right-3 truncate text-xs font-medium text-white">{r.label || 'Showreel'}</span>
                  </a>
                ))}
              </div>
            )}
            {owner && <Link href="/me/edit#media" className="upload mt-3 flex h-11 items-center justify-center gap-2 text-sm font-medium"><Icon name="plus" className="size-4" /> Add a clip</Link>}
          </>
        )}

        {stats.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Stats</h2>
            <div className="grid grid-cols-3 gap-2">{stats.map(([k, v]) => <Card key={k} className="p-3"><p className="text-xs text-muted">{k}</p><p className="mt-0.5 text-[15px] font-medium">{v}</p></Card>)}</div>
          </>
        )}

        {(p.bio || p.summary) && (
          <>
            <h2 className="mb-2 mt-6 text-[18px]">About</h2>
            <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{p.bio || p.summary}</p>
          </>
        )}

        {skills.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Skills</h2>
            <div className="flex flex-wrap gap-2">{skills.map(s => <span key={s.id} className="rounded-full bg-green-tint px-3 py-1.5 text-[13px] text-green-ink">{s.name}</span>)}</div>
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

        {p.is_graduate && p.graduate_school && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Training</h2>
            <Card className="flex items-start justify-between px-4 py-3"><div><p className="text-[15px] font-medium">{p.graduate_school}</p><p className="text-[13px] text-muted">Recent graduate</p></div>{p.graduate_year && <span className="text-sm text-faint">{p.graduate_year}</span>}</Card>
          </>
        )}

        {testimonials.length > 0 && (
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
            </div>
          </>
        )}

        {p.agent_name && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Representation</h2>
            <Card className="flex items-center gap-3 p-4">
              <span className="flex size-11 items-center justify-center rounded-xl bg-dark text-sm font-medium text-green">{p.agent_name.slice(0, 1)}</span>
              <span className="min-w-0 flex-1"><span className="block text-[15px] font-medium">Represented by {p.agent_name}</span><span className="block truncate text-[13px] text-muted">{p.agent_email || p.agent_phone || 'Agent'}</span></span>
              {p.agent_email && <a href={'mailto:' + p.agent_email} aria-label="Email agent" className="inline-flex size-10 items-center justify-center rounded-full bg-chip"><Icon name="mail" className="size-5" /></a>}
            </Card>
          </>
        )}

        {gallery.length > 0 && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Gallery</h2>
            <div className="grid grid-cols-3 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {gallery.map(g => <a key={g.id} href={g.url} target="_blank" rel="noopener noreferrer"><img src={g.url} alt="" className="aspect-square w-full rounded-xl object-cover" /></a>)}
            </div>
          </>
        )}

        {empty && <p className={cx('mt-8 text-center text-sm text-muted')}>{owner ? 'Add a reel, credits and skills so casting directors can see what you do.' : (p.first_name || 'They') + ' haven’t added more to their profile yet.'}</p>}
        {empty && owner && <Link href="/me/edit" className="mx-auto mt-3 block w-fit text-sm font-medium text-green-ink">Complete your profile ›</Link>}
      </div>
    </>
  )
}
