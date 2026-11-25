'use client'

import { useState } from 'react'
import BrandMarquee from './BrandMarquee'
import AgentDock from './AgentDock'
import Link from 'next/link'
import Icon from './Icon'
import { VerifiedTick } from './JobCard'
import { Avatar, Button, Card, cx, toast } from './ui'
import { fullName } from '@/lib/rc/format'
import { ReportSheet, blockUser, type ReportTarget } from './Safety'
import CastingProfile from './CastingProfile'
import { craftTag, graduateLabel, playingAge } from '@/lib/rc/talent'
import type { Credit, FullProfileData } from '@/lib/rc/profile'

// Button styles for controls floated over the headshot
export const heroRound = 'inline-flex size-10 items-center justify-center rounded-full bg-dark/45 text-white backdrop-blur-md transition active:scale-95'
export const heroPrimary = 'flex h-14 flex-[1.4] items-center justify-center gap-2 rounded-full bg-bg text-[15px] font-medium text-ink transition active:scale-[0.98] disabled:opacity-60'
export const heroSecondary = 'flex h-14 flex-1 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 text-[15px] font-medium text-white backdrop-blur-md transition active:scale-[0.98] disabled:opacity-60'

export type ProfileViewProps = {
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

// Everyone can download the generated (unbranded) CV; the file a member uploaded themselves is only shown to them
function CvButtons({ data, owner }: { data: FullProfileData; owner?: boolean }) {
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
      {path && owner && <Button variant="outline" className="flex-1" icon="file" onClick={openFile} disabled={busy !== null}>{busy === 'file' ? 'Opening…' : 'Uploaded CV'}</Button>}
    </div>
  )
}

// YouTube / Vimeo id from a link, for a muted background embed
function embedFor(url: string) {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/)
  if (yt) return 'https://www.youtube-nocookie.com/embed/' + yt[1] + '?autoplay=1&mute=1&loop=1&playlist=' + yt[1] + '&controls=0&playsinline=1&modestbranding=1&rel=0'
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  if (vm) return 'https://player.vimeo.com/video/' + vm[1] + '?background=1&muted=1&loop=1&autoplay=1'
  return null
}
const isFile = (url: string) => /\/storage\/v1\/object\/public\/reels\/|\.(mp4|webm|mov)(\?|$)/i.test(url)

// The header plays the main reel silently on loop (people who prefer reduced motion get the still).
// No reel → cover photo or headshot.
function HeroMedia({ reel, cover, headshot, name }: { reel?: FullProfileData['reels'][number]; cover: string | null | undefined; headshot: string | null | undefined; name: string }) {
  const [sound, setSound] = useState(false)
  const image = cover || headshot
  const still = reel?.poster_url || cover
  const fallback = still
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={still} alt={name} className="absolute inset-0 size-full object-cover" />
    : (
      // No reel or cover: a soft wash of the headshot so it isn't shown twice
      <div className="absolute inset-0 bg-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {headshot && <img src={headshot} alt="" aria-hidden className="absolute inset-0 size-full scale-125 object-cover opacity-45 blur-2xl" />}
      </div>
    )
  if (reel && isFile(reel.url)) return (
    <>
      {fallback}
      <video src={reel.url} poster={reel.poster_url || image || undefined} autoPlay muted={!sound} loop playsInline preload="metadata" aria-label={(reel.label || 'Showreel') + ' — ' + name}
        className="absolute inset-0 size-full object-cover motion-reduce:hidden" />
      <button type="button" onClick={() => setSound(v => !v)} aria-label={sound ? 'Mute showreel' : 'Play showreel with sound'}
        className="absolute bottom-16 right-4 z-10 inline-flex h-9 items-center gap-1.5 rounded-full bg-dark/55 px-3 text-xs font-medium text-white backdrop-blur-md motion-reduce:hidden">
        <Icon name={sound ? 'mic' : 'play'} className="size-3.5" />{sound ? 'Sound on' : 'Tap for sound'}
      </button>
    </>
  )
  const embed = reel && embedFor(reel.url)
  if (embed) return (
    <>
      {fallback}
      {/* oversized so the player's letterboxing and chrome sit outside the frame */}
      <iframe src={embed} title={(reel.label || 'Showreel') + ' — ' + name} allow="autoplay; encrypted-media; picture-in-picture" tabIndex={-1}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[140%] w-[140%] -translate-x-1/2 -translate-y-1/2 border-0 motion-reduce:hidden" />
    </>
  )
  return fallback
}

function Ghost({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line px-4 py-3 text-[13px] text-muted">{children}</p>
}

export function ProfileSafety({ id, name }: { id: string; name: string }) {
  const [report, setReport] = useState<ReportTarget | null>(null)
  return (
    <div className="mt-10 flex items-center justify-center gap-4 text-[13px] text-muted">
      <button type="button" onClick={() => setReport({ type: 'profile', id, profileId: id, label: name })} className="inline-flex items-center gap-1 hover:text-ink"><Icon name="alert" className="size-3.5" /> Report</button>
      <span aria-hidden>·</span>
      <button type="button" onClick={() => blockUser(id, name)} className="hover:text-ink">Block</button>
      <ReportSheet target={report} onClose={() => setReport(null)} />
    </div>
  )
}

// Section title with an owner-only Edit/Add shortcut into Customise profile
function Head({ title, owner, edit, count }: { title: string; owner?: boolean; edit: string; count?: number }) {
  return (
    <div className="mb-3 mt-7 flex items-center justify-between">
      <h2 className="text-[18px]">{title}</h2>
      {owner
        ? <Link href={'/me/edit#' + edit} className="inline-flex items-center gap-1 text-sm font-semibold text-green-ink"><Icon name={count ? 'pen' : 'plus'} className="size-3.5" />{count ? 'Edit' : 'Add'}</Link>
        : count && count > 1 ? <span className="text-sm text-muted">{count}</span> : null}
    </div>
  )
}

// One immersive profile for everyone: the owner (/me), casters and members (/talent/[id]) and the public link (/[slug]).
// The headshot bleeds to the very top of the screen, behind the status bar / notch; controls float over it.
export default function ProfileView(props: ProfileViewProps) {
  // Casting accounts get their own company-style page
  if (props.data.profile?.account_role === 'caster') return <CastingProfile {...props} />
  return <PerformerProfile {...props} />
}

// genders table ids → labels (1 = prefer not to say: not shown)
const GENDER_NAMES: Record<number, string> = { 2: 'Non-binary', 3: 'Trans woman', 4: 'Trans man', 5: 'Gender non-conforming', 6: 'Male', 7: 'Female' }

// Credits as tabs by production type, like Spotlight / Mandy CVs. Opens on the biggest type
// (All is last — a full list is too long to land on).
function CreditTabs({ groups }: { groups: Record<string, Credit[]> }) {
  const names = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length)
  const [tab, setTab] = useState(() => names[0] || 'All')
  const list = tab === 'All' ? names.flatMap(n => groups[n]) : groups[tab] || []
  return (
    <>
      {names.length > 1 && (
        <div role="tablist" aria-label="Credit types" className="scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
          {[...names, 'All'].map(n => (
            <button key={n} type="button" role="tab" aria-selected={tab === n} onClick={() => setTab(n)}
              className={cx('h-9 shrink-0 rounded-full px-4 text-[13px] font-semibold transition-colors', tab === n ? 'bg-forest text-bg' : 'bg-chip text-muted-strong hover:text-ink')}>
              {n} <span className={tab === n ? 'text-bg/60' : 'text-faint'}>{n === 'All' ? names.reduce((a, k) => a + groups[k].length, 0) : groups[n].length}</span>
            </button>
          ))}
        </div>
      )}
      <Card className="overflow-hidden">
        {list.map((c, i) => (
          <div key={c.id} className={cx('flex items-start gap-3 px-4 py-3', i > 0 && 'border-t border-line')}>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium">{[c.title, c.role].filter(Boolean).join(' — ')}</p>
              <p className="text-[13px] text-muted">{[tab === 'All' && (c.production_types?.name || 'Other'), c.production_company, c.director && 'dir. ' + c.director].filter(Boolean).join(' · ')}</p>
            </div>
            {c.year && <span className="text-sm text-faint">{c.year}</span>}
          </div>
        ))}
      </Card>
    </>
  )
}

// Skills grouped by category, strongest first, with the level (Native, Highly skilled…) as on Spotlight
const LEVEL_ORDER = ['Native', 'Highly skilled', 'High standard', 'Skilled']
function SkillGroups({ skills }: { skills: FullProfileData['skills'] }) {
  const groups = skills.reduce<Record<string, FullProfileData['skills']>>((acc, s) => { (acc[s.category || 'Other skills'] ||= []).push(s); return acc }, {})
  const rank = (l: string | null) => (l ? LEVEL_ORDER.indexOf(l) : 9)
  return (
    <div className="space-y-4">
      {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([cat, list]) => (
        <div key={cat}>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{cat}</p>
          <div className="flex flex-wrap gap-2">
            {[...list].sort((a, b) => rank(a.level) - rank(b.level) || a.name.localeCompare(b.name)).map(s => (
              <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-green-tint px-3 py-1.5 text-[13px] text-green-ink">
                {(s.level === 'Highly skilled' || s.level === 'Native') && <Icon name="star" className="size-3 fill-current" />}{s.name}
                {s.level && <span className="text-[11px] text-green-ink/70">· {s.level}</span>}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PerformerProfile({ data, owner, onBack, onShare, topRight, actions, statusLine, below, signedIn }: ProfileViewProps) {
  const p = data.profile!
  const { reels, skills, credits, brands, testimonials, gallery, hair, eyes, connections } = data
  const name = fullName(p) || 'The Ident member'
  const caster = p.account_role === 'caster'
  const craft = caster ? p.company_name : craftTag(p)
  const grad = graduateLabel(p)
  const facts = [playingAge(p) && 'Playing age ' + playingAge(p), p.height, p.location?.split(',')[0]].filter(Boolean).join(' · ')

  const stats = caster ? [] : ([
    ['Location', p.location], ['Actual age', data.age != null && (p.show_age || owner) ? data.age + (owner && !p.show_age ? ' (only you can see this)' : '') : null], ['Gender', GENDER_NAMES[p.gender_id ?? 0]], ['Playing age', playingAge(p)], ['Height', p.height],
    ['Eyes', eyes.find(e => e.id === p.eye_colour_id)?.name],
    ['Hair', [hair.find(h => h.id === p.hair_colour_id)?.name, p.hair_length, p.hair_type].filter(Boolean).join(' · ')], ['Vocal range', p.vocal_range],
    ['Also based in', p.extra_locations?.join(', ')], ['Can play', p.playing_genders?.join(', ')], ['Appearance', p.appearance?.join(', ')],
    ['Nationality', p.nationalities?.join(', ')], ['Right to work', p.right_to_work?.join(', ')], ['Twin', p.multiple_birth],
    ['Disability', data.access?.visible || owner ? [data.access?.disabilities?.join(', '), data.access?.access_notes].filter(Boolean).join(' — ') + (owner && data.access && !data.access.visible && data.access.disabilities?.length ? ' (only you can see this)' : '') : null],
    ['Agent', [p.agency_name, p.agent_name && p.agent_name !== p.agency_name ? p.agent_name : null, p.agent_address].filter(Boolean).join(' · ')],
    ...data.agents.map(a => [(a.kind || 'Other') + ' agent', [a.agency_name, a.address, a.phone, a.email].filter(Boolean).join(' · ')] as const),
    ['Weight', p.weight],
  ] as const).filter(([, v]) => !!v)

  // Credits grouped by production type, as on Spotlight/Mandy
  const groups = credits.reduce<Record<string, Credit[]>>((acc, c) => { const k = c.production_types?.name || 'Other'; (acc[k] ||= []).push(c); return acc }, {})
  const empty = !reels.length && !p.bio && !p.summary && !skills.length && !credits.length && !brands.length && !testimonials.length && !gallery.length

  return (
    <>
      <section className="relative overflow-hidden bg-dark text-white lg:rounded-b-[28px]">
        {/* Landscape header: their showreel playing silently (or cover photo / headshot), then who they are */}
        <div className="relative aspect-[16/10] max-h-[58dvh] w-full overflow-hidden sm:aspect-video lg:aspect-[21/9]">
          <HeroMedia reel={caster ? undefined : reels[0]} cover={p.banner_url} headshot={p.picture_url} name={name} />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-dark/55 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-dark to-transparent" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-4 pt-[max(14px,env(safe-area-inset-top))]">
            {onBack ? <button type="button" aria-label="Back" onClick={onBack} className={heroRound}><Icon name="chevron-left" /></button> : <span />}
            <div className="flex gap-2">
              <button type="button" aria-label="Share profile" onClick={onShare} className={heroRound}><Icon name="share" className="size-5" /></button>
              {topRight}
            </div>
          </div>
        </div>

        <div className="relative -mt-14 px-5 pb-6">
          <div className="flex items-end gap-4">
            {p.picture_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={p.picture_url} alt={name} className="size-[104px] shrink-0 rounded-[10px] object-cover ring-4 ring-dark" />
              : <span className="shrink-0 rounded-[10px] ring-4 ring-dark"><Avatar name={name} size={104} /></span>}
            <div className="flex min-w-0 flex-wrap gap-2 pb-1">
              {!caster && p.availability_status === 'available' && <span className="inline-flex items-center gap-1.5 rounded-full bg-lime px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink"><span className="size-1.5 rounded-full bg-forest" /> Open to work</span>}
              {!caster && p.pro_verified && <span title={p.pro_verified_via || 'Verified professional'} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink"><Icon name="shield-check" strokeWidth={2} className="size-3.5" /> Verified pro</span>}
              {grad && <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-ink"><Icon name={p.graduate_verified ? 'check' : 'graduation-cap'} strokeWidth={p.graduate_verified ? 2.5 : 2} className="size-3.5" />{grad}{p.graduate_verified ? ' · verified' : ''}</span>}
            </div>
          </div>
          <h1 className="mt-4 flex items-center gap-2 text-[32px] leading-tight text-white">{name}{p.is_verified && <VerifiedTick />}{!caster && p.pronouns && <span className="self-end pb-1.5 text-[14px] font-normal text-white/70">{p.pronouns}</span>}</h1>
          {craft && <p className="mt-1 text-[15px] font-medium text-lime">{craft}</p>}
          {facts && <p className="mt-1 text-sm text-white/75">{facts}</p>}
          {!caster && p.headshot_credit && <p className="mt-1 text-[11px] text-white/50">Headshot © {p.headshot_credit}</p>}
          {actions && <div className="mt-5 flex gap-3">{actions}</div>}
          <p className="mt-3 text-xs text-white/60">
            {statusLine ?? (connections + ' connection' + (connections === 1 ? '' : 's'))}
            {owner && p.show_talent === false ? ' · Hidden from search' : ''}
          </p>
        </div>
      </section>

      <div className="px-4 pb-10">
        {!caster && <CvButtons data={data} owner={owner} />}
        {below}

        {(brands.length > 0 || owner) && (
          <>
            <Head title="Worked with" owner={owner} edit="brands" count={brands.length} />
            {brands.length ? <BrandMarquee brands={brands} /> : <Ghost>Brands, theatres and studios you’ve worked with.</Ghost>}
          </>
        )}

        {(p.bio || p.summary || owner) && (
          <>
            <Head title="About" owner={owner} edit="about" count={p.bio || p.summary ? 1 : 0} />
            {(p.bio || p.summary) ? <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{p.bio || p.summary}</p> : <Ghost>Two or three lines in your own words — what you do and what you’re looking for.</Ghost>}
          </>
        )}

        {(reels.length > 0 || owner) && !caster && (
          <>
            <Head title="Showreel & tapes" owner={owner} edit="media" count={reels.length} />
            {reels.length > 0 && (
              <div className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4">
                {reels.map(r => (
                  <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/10] w-[46%] shrink-0 overflow-hidden rounded-[var(--radius)] bg-dark bg-cover bg-center lg:w-[31%]" style={r.poster_url || p.picture_url ? { backgroundImage: `url(${r.poster_url || p.picture_url})` } : undefined}>
                    <span className={cx('absolute inset-0', r.poster_url ? 'bg-gradient-to-t from-dark/70 to-transparent' : 'bg-dark/40')} />
                    <span className="absolute left-1/2 top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-ink"><Icon name="play" className="size-4 fill-current" /></span>
                    <span className="absolute bottom-2 left-3 right-3 truncate text-xs font-medium text-white">{r.label || 'Showreel'}</span>
                  </a>
                ))}
              </div>
            )}

        {(gallery.length > 0 || owner) && (
          <>
            <Head title="Gallery" owner={owner} edit="gallery" count={gallery.length} />
            {gallery.length ? <div className="grid grid-cols-3 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {gallery.map(g => <a key={g.id} href={g.url} target="_blank" rel="noopener noreferrer" aria-label={'Open photo of ' + (fullName(p) || 'this performer')}><img src={g.url} alt={(fullName(p) || 'Performer') + ' — production still or photo'} loading="lazy" className="aspect-square w-full rounded-xl object-cover" /></a>)}
            </div> : <Ghost>Production stills and headshots — they show you in the work.</Ghost>}
          </>
        )}

          </>
        )}

        {stats.length > 0 && (
          <>
            <h2 className="mb-3 mt-7 text-[18px]">Info</h2>
            <Card className="p-4">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {stats.map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-[96px] shrink-0 text-[14px] font-semibold">{k}</dt><dd className="min-w-0 flex-1 text-[14px] text-muted-strong">{v}</dd></div>)}
              </dl>
            </Card>
          </>
        )}

        {(skills.length > 0 || (owner && !caster)) && (
          <>
            <Head title="Skills" owner={owner} edit="skills" count={skills.length} />
            {skills.length ? <SkillGroups skills={skills} /> : <Ghost>Accents, dance styles, instruments, stage combat…</Ghost>}
          </>
        )}

        {!caster && data.training.length > 0 && (
          <>
            <Head title="Training" owner={owner} edit="training" count={data.training.length} />
            <Card className="divide-y divide-line">
              {data.training.map(t => (
                <div key={t.id} className="px-4 py-3"><p className="text-[15px] font-medium">{t.school}</p>{(t.course || t.years) && <p className="text-[13px] text-muted">{[t.course, t.years].filter(Boolean).join(' · ')}</p>}</div>
              ))}
            </Card>
          </>
        )}

        {(credits.length > 0 || (owner && !caster)) && (
          <>
            <Head title="Credits" owner={owner} edit="credits" count={credits.length} />
            {credits.length ? <CreditTabs groups={groups} /> : <Ghost>Add the shows, films and commercials you’ve been in.</Ghost>}
          </>
        )}

        {(testimonials.length > 0 || (owner && !caster)) && (
          <>
            <Head title="What directors say" owner={owner} edit="testimonials" count={testimonials.length} />
            {testimonials.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {testimonials.map(t => (
                  <figure key={t.id} className="rounded-[var(--radius)] bg-forest p-5 text-white">
                    <span aria-hidden className="font-display text-5xl leading-none text-lime">“</span>
                    <blockquote className="-mt-3 text-[16px] leading-relaxed">{t.quote}</blockquote>
                    <figcaption className="mt-4"><span className="block text-sm font-semibold">{t.author_name}</span>{t.author_title && <span className="block text-[13px] text-white/65">{t.author_title}</span>}</figcaption>
                  </figure>
                ))}
              </div>
            ) : <Ghost>Quotes from directors and choreographers. Use “Request a testimonial” below to ask for one.</Ghost>}
          </>
        )}

        {p.is_graduate && p.graduate_school && (
          <>
            <h2 className="mb-3 mt-6 text-[18px]">Training</h2>
            <Card className="flex items-start justify-between px-4 py-3"><div><p className="text-[15px] font-medium">{p.graduate_school}</p><p className="text-[13px] text-muted">Recent graduate</p></div>{p.graduate_year && <span className="text-sm text-faint">{p.graduate_year}</span>}</Card>
          </>
        )}

        <AgentDock p={p} agents={data.agents} />


        {!owner && signedIn && <ProfileSafety id={p.id} name={name} />}
        {empty && !owner && <p className={cx('mt-8 text-center text-sm text-muted')}>{owner ? 'Add a reel, credits and skills so casting directors can see what you do.' : (p.first_name || 'They') + ' haven’t added more to their profile yet.'}</p>}
        {empty && owner && <Link href="/me/edit" className="mx-auto mt-3 block w-fit text-sm font-medium text-green-ink">Complete your profile ›</Link>}
      </div>
    </>
  )
}
