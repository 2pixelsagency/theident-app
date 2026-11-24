import Link from 'next/link'
import Icon from '@/components/rc/Icon'

// Calendly-style feature rows: copy on one side, a real-looking app screen floating on a soft tinted panel
// on the other, alternating sides. Panels are flat tints (no gradients) per DESIGN.md.
const FLOAT = 'shadow-[0_30px_60px_-28px_rgb(18_49_39/0.35),0_2px_6px_rgb(18_49_39/0.06)]'
const CARD = 'rounded-[12px] border border-line/70 bg-surface ' + FLOAT

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={'shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ' + tone}>{children}</span>
}

function CastingsVisual() {
  return (
    <>
      <div className={CARD + ' w-full max-w-[440px] p-5'}>
        <div className="flex items-center justify-between"><p className="text-[15px] font-semibold">My castings</p><span className="text-[12px] text-muted">This week</span></div>
        <ul className="mt-4 divide-y divide-line">
          {[['The Glass Orchard', 'Nell (lead) · tape by Fri', 'bg-amber-tint text-amber', 'Self-tape'], ['Harbour Lights', 'Young witness · Tue 14:00', 'bg-pencil-tint text-pencil', 'Recall'], ['Pulse — UK arena tour', 'Dancer · sign contract', 'bg-lime text-ink', 'Booked']].map(([t, s, tone, label]) => (
            <li key={t} className="flex items-center gap-3 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-chip text-[13px] font-semibold">{t[0]}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-semibold">{t}</span><span className="block truncate text-[12px] text-muted">{s}</span></span>
              <Pill tone={tone}>{label}</Pill>
            </li>
          ))}
        </ul>
      </div>
      <div className={CARD + ' absolute -bottom-6 right-4 hidden w-[200px] p-4 sm:block md:-right-6'}>
        <p className="text-[12px] text-muted">This month</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center">
          {[['6', 'Applied'], ['2', 'Recalls'], ['1', 'Booked']].map(([n, l]) => <div key={l}><p className="font-display text-[22px] font-bold leading-none">{n}</p><p className="mt-1 text-[11px] text-muted">{l}</p></div>)}
        </div>
      </div>
    </>
  )
}

function ApplyVisual() {
  return (
    <>
      <div className={CARD + ' w-full max-w-[420px] overflow-hidden'}>
        <div className="p-5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-green-ink">Theatre · Manchester</p>
          <p className="mt-1.5 text-[17px] font-semibold leading-snug">Swing (female) — UK tour</p>
          <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone="bg-chip text-ink">£700 / week</Pill><Pill tone="bg-chip text-ink">6 months</Pill><Pill tone="bg-mint text-green-ink">Fair pay</Pill></div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line bg-field px-5 py-3.5">
          <span className="text-[12px] text-muted">Closes in 8 days</span>
          <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-forest px-4 text-[13px] font-semibold text-white">Apply <Icon name="arrow-right" className="size-3.5" /></span>
        </div>
      </div>
      <div className={CARD + ' absolute -top-5 right-2 hidden p-3 sm:block md:-right-8'}>
        <p className="mb-2 text-[12px] font-semibold">Sent with your application</p>
        {['Showreel', 'CV & credits', 'Self-tape'].map(x => <p key={x} className="flex items-center gap-2 py-0.5 text-[12px]"><span className="flex size-4 items-center justify-center rounded-full bg-lime"><Icon name="check" className="size-2.5" /></span>{x}</p>)}
      </div>
    </>
  )
}

function RecallVisual() {
  return (
    <>
      <div className={CARD + ' w-full max-w-[420px] p-5'}>
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[15px] font-semibold">You’ve got a recall</p><p className="mt-0.5 text-[13px] text-muted">Harbour Lights · Young witness</p></div>
          <Pill tone="bg-pencil-tint text-pencil">Recall</Pill>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[['video', 'Video call', true], ['play', 'New tape', false], ['pin', 'In person', false]].map(([icon, l, on]) => (
            <div key={l as string} className={'rounded-[10px] border p-3 text-center ' + (on ? 'border-forest bg-forest text-white' : 'border-line')}>
              <Icon name={icon as string} className="mx-auto size-4" /><p className="mt-1.5 text-[12px] font-medium">{l as string}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-[10px] bg-field px-3.5 py-3">
          <span className="text-[13px]"><b className="font-semibold">Tue 14:00</b> <span className="text-muted">· 15 min</span></span>
          <span className="inline-flex h-8 items-center rounded-[8px] bg-lime px-3 text-[12px] font-semibold">Join call</span>
        </div>
      </div>
      <div className={CARD + ' absolute -bottom-5 left-2 hidden items-center gap-2.5 px-3.5 py-2.5 sm:flex md:-left-8'}>
        <span className="flex size-7 items-center justify-center rounded-full bg-mint"><Icon name="check" className="size-3.5 text-green-ink" /></span>
        <span className="text-[12px]"><b className="block font-semibold">NDA signed</b><span className="text-muted">Typed signature · today</span></span>
      </div>
    </>
  )
}

function MoneyVisual() {
  return (
    <>
      <div className={CARD + ' w-full max-w-[420px] p-5'}>
        <p className="text-[13px] text-muted">Suggested set-aside for tax</p>
        <p className="mt-1 font-display text-[40px] font-bold leading-none">£2,856</p>
        <div className="mt-5 flex h-24 items-end gap-2">
          {[38, 52, 30, 64, 48, 80, 58].map((h, i) => <span key={i} className={'flex-1 rounded-t-[4px] ' + (i === 5 ? 'bg-forest' : 'bg-mint')} style={{ height: h + '%' }} />)}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-faint"><span>May</span><span>Nov</span></div>
      </div>
      <div className={CARD + ' absolute -top-6 right-2 hidden w-[210px] p-4 sm:block md:-right-6'}>
        <p className="text-[12px] font-semibold">Goals</p>
        {[['Dance class ×2', 100], ['New showreel', 60]].map(([l, v]) => (
          <div key={l as string} className="mt-2"><div className="flex justify-between text-[11px]"><span>{l}</span><span className="text-muted">{v}%</span></div><div className="mt-1 h-1.5 rounded-full bg-chip"><div className="h-full rounded-full bg-forest" style={{ width: v + '%' }} /></div></div>
        ))}
      </div>
    </>
  )
}

const ROWS = [
  { eyebrow: 'Castings', title: 'Every casting, from applied to booked, in one view.', body: 'See what needs a self-tape, which recalls are coming up and what you’ve booked — without digging through emails.', link: ['/performers', 'How tracking works'], tint: 'bg-mint/60', Visual: CastingsVisual },
  { eyebrow: 'Apply', title: 'Apply in a tap, with everything casting asks for.', body: 'Pay, dates and closing date are up front. Your reel, CV and self-tape go with every application automatically.', link: ['/jobs', 'Browse open roles'], tint: 'bg-butter/50', Visual: ApplyVisual },
  { eyebrow: 'Recalls', title: 'Recalls your way — tape, video call or in person.', body: 'Join the call from the app, send another tape, or sign an NDA with a typed signature. Every step is tracked for you.', link: ['/performers', 'See the casting flow'], tint: 'bg-blossom/60', Visual: RecallVisual },
  { eyebrow: 'Money & goals', title: 'Pay, tax and goals, sorted.', body: 'Log payments, send invoices, see what to put aside for self-assessment, and keep the goals that move your career.', link: ['/pricing', 'What’s included'], tint: 'bg-chip/70', Visual: MoneyVisual },
]

export default function FeatureRows() {
  return (
    <div className="space-y-20 md:space-y-28">
      {ROWS.map((r, i) => (
        <div key={r.eyebrow} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
          <div className={i % 2 ? 'md:order-2' : ''}>
            <p className="eyebrow text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">{r.eyebrow}</p>
            <h3 className="mt-3 max-w-[480px] text-[28px] leading-[1.1] tracking-[-0.02em] md:text-[36px]">{r.title}</h3>
            <p className="mt-4 max-w-[460px] text-[17px] leading-relaxed text-muted">{r.body}</p>
            <Link href={r.link[0]} className="group mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-green-ink">{r.link[1]}<Icon name="arrow-right" className="cta-arrow size-4" /></Link>
          </div>
          <div data-reveal className={'relative flex min-h-[340px] items-center justify-center rounded-[16px] px-6 py-12 md:min-h-[420px] md:px-12 ' + r.tint + (i % 2 ? ' md:order-1' : '')}>
            <r.Visual />
          </div>
        </div>
      ))}
    </div>
  )
}

// Smaller white cards for the extras, each with a tinted icon tile
export function FeatureGrid() {
  const items: [string, string, string, string][] = [
    ['chat', 'Cast chats', 'Group chats for every job, with call times and updates in one thread.', 'bg-mint'],
    ['sparkle', 'Classes & spare spaces', 'Grab someone’s spare space at a sold-out class, or list your own.', 'bg-blossom'],
    ['home', 'Digs on tour', 'Theatre digs by the stage door, plus Airbnb and SpareRoom search for your dates.', 'bg-butter'],
    ['users', 'Get found', 'A public profile casting directors can find on Google, with headshots and reels.', 'bg-chip'],
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(([icon, t, b, tint]) => (
        <div key={t} className="rounded-[14px] border border-line bg-surface p-6 transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_-28px_rgb(18_49_39/0.35)]">
          <span className={'flex size-10 items-center justify-center rounded-[10px] ' + tint}><Icon name={icon} className="size-5 text-green-ink" /></span>
          <p className="mt-5 text-[17px] font-semibold">{t}</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{b}</p>
        </div>
      ))}
    </div>
  )
}
