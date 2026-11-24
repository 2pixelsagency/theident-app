import Icon from '@/components/rc/Icon'
import { cx } from './castings/parts'

// App screens for the Performers / Casting tab showcases. Demo content only (fictional shows and people).
// Rows use .hiw-item with --i so they stagger in on every tab change.
const I = (i: number) => ({ '--i': i } as React.CSSProperties)
const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cx('rounded-[20px] bg-surface p-5 text-ink md:p-6', className)}>{children}</div>
const Head = ({ title, aside }: { title: string; aside?: string }) => (
  <div className="hiw-item flex items-baseline justify-between gap-3"><p className="font-display text-[22px] font-bold tracking-[-0.02em]">{title}</p>{aside && <span className="text-[13px] text-muted">{aside}</span>}</div>
)
const Check = () => <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>

/* ---------- Performers: Track every casting ---------- */

export function PipelineWidget() {
  const rows: [string, string, string, string][] = [
    ['The Glass Orchard — Nell', 'Applied · 2 days ago', 'Applied', 'bg-chip'],
    ['Harbour Lights — Young witness', 'Self-tape due Fri', 'Self-tape', 'bg-butter'],
    ['Cinderella — Prince Charming', 'Recall · Tue 14:00', 'Recall', 'bg-mint'],
    ['Pulse — UK arena tour', 'Held for 12–16 Jan', 'Pencilled', 'bg-pencil-tint text-pencil'],
    ['Brew & Co. — Barista', 'Sign your contract', 'Booked', 'bg-lime'],
  ]
  return (
    <Card>
      <Head title="Your castings" aside="5 active" />
      <ul className="mt-3">
        {rows.map(([t, s, label, tone], i) => (
          <li key={t} style={I(i + 1)} className="hiw-item flex items-center justify-between gap-3 border-t border-line-soft py-3">
            <div className="min-w-0"><p className="truncate text-[14px] font-semibold">{t}</p><p className="truncate text-[12px] text-muted">{s}</p></div>
            <span className={cx('shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold', tone)}>{label}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

export function SelfTapeWidget() {
  return (
    <Card>
      <Head title="Send your self-tape" aside="Due Fri" />
      <p style={I(1)} className="hiw-item mt-1 text-[13px] text-muted">Harbour Lights — Young witness</p>
      <div style={I(2)} className="hiw-item mt-4 flex items-center gap-3 rounded-[14px] bg-bg p-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-forest text-lime"><Icon name="play" strokeWidth={2} className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <div className="flex justify-between text-[13px]"><span className="truncate font-semibold">young-witness-take-2.mp4</span><span className="text-muted">1:12</span></div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line-soft"><div className="hiw-grow h-full w-full rounded-full bg-forest" /></div>
        </div>
      </div>
      <p style={I(3)} className="hiw-item mt-3 flex items-center gap-2 text-[13px] font-medium text-forest"><span className="flex size-5 items-center justify-center rounded-full bg-lime"><Check /></span>Sent to casting</p>
      <div style={I(4)} className="hiw-item mt-5 flex items-center justify-between gap-3 border-t border-line-soft pt-4">
        <div><p className="text-[13px] font-semibold">Recall · Tue 14:00</p><p className="text-[12px] text-muted">Video call · 15 min</p></div>
        <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-lime px-4 text-[13px] font-semibold"><Icon name="video" strokeWidth={2} className="size-4" />Join call</span>
      </div>
    </Card>
  )
}

export function ContractWidget() {
  return (
    <Card>
      <Head title="Your contract" aside="Ready to sign" />
      <p style={I(1)} className="hiw-item mt-1 text-[13px] text-muted">Brew &amp; Co. coffee — Barista</p>
      <dl style={I(2)} className="hiw-item mt-4 grid grid-cols-2 gap-2 text-[13px]">
        {[['Shoot', '14 Jan'], ['Fee', '£650 / day'], ['Usage', 'Online, 1 year'], ['Location', 'Bristol']].map(([k, v]) => (
          <div key={k} className="rounded-[12px] bg-bg px-3 py-2.5"><dt className="text-[11px] text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
        ))}
      </dl>
      <div style={I(3)} className="hiw-item mt-4 rounded-[12px] border border-line-strong px-3.5 py-3">
        <p className="text-[11px] text-muted">Type your full name to sign</p>
        <p className="mt-0.5 font-display text-[20px] font-bold italic">Alex Morgan</p>
      </div>
      <span style={I(4)} className="hiw-item mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-forest text-[14px] font-semibold text-bg"><Check />Sign contract</span>
    </Card>
  )
}

/* ---------- Casting: Recall and book ---------- */

export function RecallChoiceWidget() {
  return (
    <Card>
      <Head title="Recall Sam Okafor" aside="Harbour Lights" />
      <div style={I(1)} className="hiw-item mt-4 grid grid-cols-3 gap-2">
        {[['play', 'Another tape', false], ['video', 'Video call', true], ['pin', 'In person', false]].map(([icon, l, on]) => (
          <div key={l as string} className={cx('rounded-[12px] border p-3 text-center', on ? 'border-forest bg-forest text-white' : 'border-line')}>
            <Icon name={icon as string} strokeWidth={2} className="mx-auto size-4" /><p className="mt-1.5 text-[12px] font-medium">{l as string}</p>
          </div>
        ))}
      </div>
      <div style={I(2)} className="hiw-item mt-4 grid grid-cols-2 gap-2 text-[13px]">
        <div className="rounded-[12px] bg-bg px-3 py-2.5"><p className="text-[11px] text-muted">When</p><p className="font-semibold">Tue 8 Dec · 14:00</p></div>
        <div className="rounded-[12px] bg-bg px-3 py-2.5"><p className="text-[11px] text-muted">Link</p><p className="truncate font-semibold">zoom.us/j/…</p></div>
      </div>
      <span style={I(3)} className="hiw-item mt-4 flex h-11 items-center justify-center rounded-full bg-forest text-[14px] font-semibold text-bg">Send recall</span>
    </Card>
  )
}

export function PencilWidget() {
  const days = ['M', 'T', 'W', 'T', 'F']
  return (
    <Card>
      <Head title="Pencil and book" aside="Pulse — UK tour" />
      <div style={I(1)} className="hiw-item mt-4">
        <p className="text-[12px] text-muted">Rehearsals · w/c 12 Jan</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {days.map((d, i) => <span key={i} className="flex h-10 flex-col items-center justify-center rounded-[10px] bg-pencil-tint text-[12px] font-semibold text-pencil">{d}<span className="text-[10px] font-medium">{12 + i}</span></span>)}
        </div>
      </div>
      <div style={I(2)} className="hiw-item mt-4 flex items-center justify-between rounded-[12px] bg-bg px-3.5 py-3 text-[13px]">
        <span><span className="block text-[11px] text-muted">Offer</span><span className="font-semibold">£650 / week · 6 months</span></span>
        <span className="rounded-full bg-butter px-2.5 py-1 text-[11px] font-semibold">Pencilled</span>
      </div>
      <div style={I(3)} className="hiw-item mt-4 grid grid-cols-2 gap-2">
        <span className="flex h-11 items-center justify-center rounded-full border border-line-strong text-[13px] font-semibold">Send offer</span>
        <span className="flex h-11 items-center justify-center rounded-full bg-forest text-[13px] font-semibold text-bg">Issue contract</span>
      </div>
    </Card>
  )
}

export function CompanyChatWidget() {
  return (
    <Card className="flex flex-col gap-2.5">
      <Head title="Pulse — company" aside="18 members" />
      <p style={I(1)} className="hiw-item w-fit max-w-[80%] rounded-[14px] rounded-bl-[4px] bg-bg px-3.5 py-2 text-[13px]"><b className="block text-[11px] text-muted">Casting</b>Welcome to the company! Call is 10am Monday, Studio 2.</p>
      <p style={I(2)} className="hiw-item ml-auto w-fit max-w-[80%] rounded-[14px] rounded-br-[4px] bg-forest px-3.5 py-2 text-[13px] text-white">Can’t wait — see you all there!</p>
      <p style={I(3)} className="hiw-item w-fit max-w-[80%] rounded-[14px] rounded-bl-[4px] bg-bg px-3.5 py-2 text-[13px]"><b className="block text-[11px] text-muted">Stage management</b>Schedule for week one is pinned above.</p>
      <div style={I(4)} className="hiw-item mt-1 flex items-center gap-2 rounded-full border border-line-strong px-4 py-2.5 text-[13px] text-faint"><Icon name="chat" strokeWidth={2} className="size-4" />Message the company…</div>
    </Card>
  )
}
