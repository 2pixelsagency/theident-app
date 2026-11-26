'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Icon from './Icon'
import { Button, cx } from './ui'
import type { Role } from '@/lib/rc/onboarding'

// Interactive first-run tour: it walks across the app's screens, dims everything except the real
// button it's talking about, and points at it ("tap here to filter jobs"). Targets are marked in the
// UI with data-tour="…"; a step can list several (the first visible one wins: phone tab bar vs desktop rail).
// Shown once per device on Home; replay any time from More → Take the tour (fires 'ident:tour').
export const TOUR_KEY = 'ident-tour-v2'
type Step = { route: string; targets?: string[]; title: string; body: string }

const STEPS: Record<Role, Step[]> = {
  performer: [
    { route: '/home', title: 'Welcome to The Ident 👋', body: 'A 30-second look around — we’ll show you exactly where everything lives.' },
    { route: '/home', targets: ['profile-home', 'profile'], title: 'Your profile', body: 'Tap your picture for your profile — headshots, showreel, credits and skills. Upload your CV and we’ll fill it in for you.' },
    { route: '/home', targets: ['home-alerts', 'tab-inbox'], title: 'Your alerts', body: 'Invites, self-tape requests, recalls and bookings land here the moment casting gets in touch.' },
    { route: '/home', targets: ['tab-find'], title: 'Find work', body: 'Tap here for castings, auditions and side hustles — pay and closing date up front.' },
    { route: '/find', targets: ['find-search'], title: 'Search roles', body: 'Type a role, skill or place — try “dancer London”.' },
    { route: '/find', targets: ['find-filters'], title: 'Filter jobs', body: 'Tap Filters to narrow by type, pay, age and skills. Saved and Later keep your shortlist.' },
    { route: '/find', targets: ['find-job'], title: 'Open a role', body: 'Tap a card for the full brief and apply in one tap. Swipe right to save it, left for later.' },
    { route: '/castings', targets: ['tab-castings'], title: 'Your castings', body: 'Everything you’ve applied for lives here.' },
    { route: '/castings', targets: ['castings-stages'], title: 'Track every stage', body: 'Each application moves from applied to self-tape, recall, pencil and booked — tap a stage to filter.' },
    { route: '/castings', targets: ['castings-diary'], title: 'Your diary', body: 'Self-tape deadlines, recalls and shows go straight into your diary.' },
    { route: '/chats', targets: ['tab-chats'], title: 'Chats', body: 'Messages from casting directors and your cast chats.' },
    { route: '/chats', targets: ['chats-new'], title: 'Start a cast chat', body: 'Make a group for your show — polls, events with RSVPs and photos for the whole company.' },
    { route: '/chats', targets: ['chats-join'], title: 'Join with a code', body: 'Been sent a cast chat code? Tap here to join.' },
    { route: '/menu', targets: ['more-grid', 'tab-menu'], title: 'Everything else', body: 'Money (pay, invoices, tax), Diary, Goals, Classes, Theatre digs and more.' },
  ],
  caster: [
    { route: '/home', title: 'Welcome to The Ident 👋', body: 'A 30-second look around — we’ll show you exactly where everything lives.' },
    { route: '/home', targets: ['profile-home', 'profile'], title: 'Your company profile', body: 'Tap your picture for your profile — logo, credits and the shows you’ve cast.' },
    { route: '/home', targets: ['home-alerts', 'tab-inbox'], title: 'Your alerts', body: 'New applicants, replies and confirmations land here.' },
    { route: '/home', targets: ['tab-talent'], title: 'Search talent', body: 'Tap here to find performers by skill, playing age and place.' },
    { route: '/talent', targets: ['talent-search'], title: 'Search', body: 'Type a name, skill or school — then invite them to apply or shortlist them.' },
    { route: '/postings', targets: ['tab-postings'], title: 'Your postings', body: 'Every role you’ve posted and everyone who applied.' },
    { route: '/postings', targets: ['postings-new'], title: 'Post a role', body: 'Ask for exactly the materials you need, add an NDA and a closing date.' },
    { route: '/chats', targets: ['tab-chats'], title: 'Chats', body: 'Talk to applicants and run cast chats for everyone you book.' },
    { route: '/chats', targets: ['chats-new'], title: 'Start a cast chat', body: 'One group for your company — polls, events and photos.' },
    { route: '/menu', targets: ['more-grid', 'tab-menu'], title: 'Everything else', body: 'Diary, What’s on, Classes, Theatre digs and Settings.' },
  ],
}

export function startTour() { window.dispatchEvent(new Event('ident:tour')) }

const findTarget = (names: string[]) => {
  for (const n of names) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${n}"]`)) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return el
    }
  }
  return null
}

export default function Tour({ role, autoStart }: { role: Role; autoStart: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  // Where the current step's target is (null = not found → centred card)
  const [found, setFound] = useState<{ i: number; rect: DOMRect | null } | null>(null)
  const started = useRef(false)
  const steps = STEPS[role], s = steps[Math.min(i, steps.length - 1)], last = i === steps.length - 1

  useEffect(() => {
    const show = () => { started.current = true; setFound(null); setI(0); setOpen(true) }
    window.addEventListener('ident:tour', show)
    let seen = true
    try { seen = !!localStorage.getItem(TOUR_KEY) } catch { /* storage blocked: don't nag */ }
    if (autoStart && !seen && !started.current) show()
    return () => window.removeEventListener('ident:tour', show)
  }, [autoStart])

  const close = (goHome?: boolean) => {
    setOpen(false)
    try { localStorage.setItem(TOUR_KEY, '1') } catch { /* */ }
    if (goHome) router.push('/home')
  }

  // Go to the step's screen
  useEffect(() => {
    if (open && pathname !== s.route) router.push(s.route)
  }, [open, i, pathname, s.route, router])

  // Find the target once the screen has loaded, bring it into view and follow it on scroll/resize
  useEffect(() => {
    if (!open || !s.targets || pathname !== s.route) return
    let el: HTMLElement | null = null, tries = 0, timer: ReturnType<typeof setTimeout>
    const measure = () => { if (el) setFound({ i, rect: el.getBoundingClientRect() }) }
    const poll = () => {
      el = findTarget(s.targets!)
      if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); timer = setTimeout(measure, 380); return }
      if (++tries > 40) { setFound({ i, rect: null }); return } // ~6s: show the card in the middle instead
      timer = setTimeout(poll, 150)
    }
    timer = setTimeout(poll, 60)
    window.addEventListener('scroll', measure, true)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(timer); window.removeEventListener('scroll', measure, true); window.removeEventListener('resize', measure) }
  }, [open, i, pathname, s.route, s.targets])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') setI(k => Math.min(k + 1, steps.length - 1))
      if (e.key === 'ArrowLeft') setI(k => Math.max(k - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, steps.length])

  if (!open) return null
  const here = found && found.i === i ? found : null
  const waiting = !!s.targets && (!here || pathname !== s.route)
  const rect = !waiting && here ? here.rect : null

  // Card placement: below the target if there's more room there, else above; arrow points at its centre
  const vw = window.innerWidth, vh = window.innerHeight
  const w = Math.min(340, vw - 24)
  let cardStyle: React.CSSProperties = { left: (vw - w) / 2, top: '50%', transform: 'translateY(-50%)', width: w }
  let arrow: { left: number; below: boolean } | null = null
  if (rect) {
    const below = vh - rect.bottom >= rect.top
    const left = Math.min(Math.max(rect.left + rect.width / 2 - w / 2, 12), vw - w - 12)
    cardStyle = below ? { left, top: rect.bottom + 16, width: w } : { left, bottom: vh - rect.top + 16, width: w }
    arrow = { left: Math.min(Math.max(rect.left + rect.width / 2 - left - 8, 18), w - 34), below }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tour-title" className="fixed inset-0 z-[70]">
      {rect
        ? <div aria-hidden="true" className="pointer-events-none absolute rounded-[16px] ring-2 ring-lime transition-all duration-300 ease-out"
            style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.6)' }} />
        : <div aria-hidden="true" className="absolute inset-0 bg-black/60" />}
      {rect && <span aria-hidden="true" className="pointer-events-none absolute size-3 animate-ping rounded-full bg-lime" style={{ left: rect.left + rect.width / 2 - 6, top: rect.top + rect.height / 2 - 6 }} />}

      {!waiting && (
        <div key={i} className="absolute animate-[rc-step-in_240ms_ease-out] rounded-[22px] bg-surface p-5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.55)]" style={cardStyle}>
          {arrow && <span aria-hidden="true" className={cx('absolute size-4 rotate-45 bg-surface', arrow.below ? '-top-2' : '-bottom-2')} style={{ left: arrow.left }} />}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-muted">{i + 1} of {steps.length}</span>
            <button type="button" onClick={() => close()} className="text-[13px] font-semibold text-muted hover:text-ink">Skip tour</button>
          </div>
          <h2 id="tour-title" className="mt-1.5 font-display text-[20px] font-bold leading-tight tracking-[-0.02em]">{s.title}</h2>
          <p className="mt-1.5 text-[14px] leading-relaxed text-muted-strong">{s.body}</p>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex flex-1 gap-1" aria-hidden="true">
              {steps.map((_, k) => <span key={k} className={cx('h-1.5 rounded-full transition-all duration-300', k === i ? 'w-4 bg-forest' : 'w-1.5 bg-line-strong')} />)}
            </div>
            {i > 0 && <Button size="sm" variant="outline" onClick={() => setI(i - 1)} aria-label="Back"><Icon name="arrow-left" className="size-4" /></Button>}
            <Button size="sm" trailingIcon={last ? undefined : 'arrow-right'} onClick={() => (last ? close(true) : setI(i + 1))}>{last ? 'Done' : i === 0 ? 'Show me' : 'Next'}</Button>
          </div>
        </div>
      )}
    </div>
  )
}
