'use client'

import { useState } from 'react'
import Icon from '@/components/rc/Icon'
import { BackHeader, Card, SearchField, Sheet, cx } from '@/components/rc/ui'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

const TOPICS: { q: string; a: string }[] = [
  { q: 'Getting verified', a: 'Casting teams and employers can be verified so their roles get the green tick. Email us from your work address with a link to your company or recent productions and we’ll confirm it, usually within two working days.' },
  { q: 'How applications & self-tapes work', a: 'Apply with your reel and any materials a role asks for. Your role then moves through Castings: Applied → Self-tape → Recall → Pencilled → Booked. You’ll get a notification at each step, and dates land in your Diary automatically.' },
  { q: 'Fair pay', a: 'Every role shows its pay up front. The Fair pay badge means the rate meets the industry minimum for that kind of work; side hustles must pay at least the National Living Wage.' },
  { q: 'Payments & payouts', a: 'Log each payment in Pay & earnings and we’ll keep a running total and suggest what to put aside for tax. In-app payouts are coming soon.' },
  { q: 'Theatre digs — staying safe', a: 'We check every host before they’re listed. Never pay a deposit outside an arrangement you’ve confirmed with the host, and tell someone in your company where you’re staying.' },
  { q: 'Side hustles & avoiding scams', a: 'Side hustles from members aren’t verified employers. Meet in public places, never pay to apply, and report anything that feels off — we’ll look into it.' },
]

export default function HelpPage() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [safety, setSafety] = useState(false)
  const shown = TOPICS.filter(t => !q.trim() || (t.q + ' ' + t.a).toLowerCase().includes(q.toLowerCase()))
  const mail = (subject: string) => 'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(subject)

  return (
    <>
      <BackHeader title="Help & support" />
      <div className="px-4 pb-10">
        <SearchField value={q} onChange={setQ} placeholder="Search help…" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a href={mail('Help with RoleCall')} className="rounded-[var(--radius)] bg-dark p-4 text-white"><Icon name="chat" className="size-6 text-green" /><p className="mt-5 text-[15px] font-medium">Message us</p><p className="text-[13px] text-white/60">We reply within a day</p></a>
          <a href={mail('Support')} className="rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card"><Icon name="mail" className="size-6" /><p className="mt-5 text-[15px] font-medium">Email support</p><p className="truncate text-[13px] text-muted">{SUPPORT_EMAIL}</p></a>
          <a href={mail('Report a problem')} className="rounded-[var(--radius)] border border-line bg-surface p-4 shadow-card"><Icon name="alert" className="size-6 text-red" /><p className="mt-5 text-[15px] font-medium">Report a problem</p><p className="text-[13px] text-muted">Scam, bug or safety</p></a>
          <button type="button" onClick={() => setSafety(true)} className="rounded-[var(--radius)] border border-line bg-surface p-4 text-left shadow-card"><Icon name="shield" className="size-6 text-green-ink" /><p className="mt-5 text-[15px] font-medium">Safety centre</p><p className="text-[13px] text-muted">Stay safe on gigs</p></button>
        </div>

        <h2 className="mb-3 mt-6 text-[18px]">Popular topics</h2>
        <Card className="divide-y divide-line overflow-hidden">
          {shown.map(t => (
            <div key={t.q}>
              <button type="button" onClick={() => setOpen(open === t.q ? null : t.q)} aria-expanded={open === t.q} className="flex w-full items-center justify-between px-4 py-3.5 text-left text-[15px] font-medium">
                {t.q}<Icon name="chevron-down" className={cx('size-4 text-faint transition', open === t.q && 'rotate-180')} />
              </button>
              {open === t.q && <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{t.a}</p>}
            </div>
          ))}
          {shown.length === 0 && <p className="p-4 text-sm text-muted">Nothing matches — email us and we’ll help.</p>}
        </Card>

        <p className="mt-4 flex items-center gap-2 rounded-xl bg-green-tint px-4 py-3 text-sm font-medium text-green-ink"><span className="size-2 rounded-full bg-green" /> All systems running normally</p>
        <p className="mt-4 text-center text-xs text-faint">RoleCall · Terms · Privacy · Community guidelines</p>
      </div>

      <Sheet open={safety} onClose={() => setSafety(false)} title="Safety centre">
        <ul className="space-y-3 text-sm leading-relaxed">
          {['Never pay to apply or audition.', 'Meet new contacts in public places and tell someone where you’re going.', 'Check for the green verified tick on roles from companies.', 'Keep conversations in RoleCall until you’re confident a job is real.', 'Report anything that feels wrong — we act on every report.'].map(t => (
            <li key={t} className="flex gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-green" />{t}</li>
          ))}
        </ul>
        <a href={mail('Safety report')} className="mt-5 flex h-12 items-center justify-center rounded-[14px] bg-dark text-[15px] font-medium text-white">Report a safety concern</a>
      </Sheet>
    </>
  )
}
