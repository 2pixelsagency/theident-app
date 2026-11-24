'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from './Icon'
import { Button, cx } from './ui'
import type { Role } from '@/lib/rc/onboarding'

// A short first-run tour of The Ident, so nobody misses a feature. Shown once per device on Home;
// replay any time from More → Take the tour (it fires the 'ident:tour' event).
const KEY = 'ident-tour-v1'
type Step = { icon: string; tone: string; title: string; body: string; href?: string; cta?: string }

const STEPS: Record<Role, Step[]> = {
  performer: [
    { icon: 'sparkle', tone: 'bg-lime text-forest', title: 'Welcome to The Ident', body: 'Find roles, apply with your reel and track every self-tape, recall and booking — all in one place. Here’s a 30-second look around.' },
    { icon: 'search', tone: 'bg-mint text-green-ink', title: 'Find work', body: 'Castings, auditions and side hustles with the pay and closing date up front. Save searches and apply in a tap.', href: '/find', cta: 'Open Find' },
    { icon: 'briefcase', tone: 'bg-butter text-ink', title: 'Track your castings', body: 'Every application moves from applied to self-tape, recall, pencil and booked. Deadlines land in your Diary.', href: '/castings', cta: 'Open Castings' },
    { icon: 'user', tone: 'bg-blossom text-ink', title: 'Your profile', body: 'Headshots, showreel, credits and skills. Upload your CV — including the one from Spotlight or Mandy — and we’ll fill it in for you.', href: '/me/edit', cta: 'Customise profile' },
    { icon: 'menu', tone: 'bg-chip text-ink', title: 'Everything else is in More', body: 'Diary, Goals, To do, People, Your postings, What’s on, Classes, Theatre digs, Pay & earnings, Tax & expenses and Settings.', href: '/menu', cta: 'Open More' },
  ],
  caster: [
    { icon: 'sparkle', tone: 'bg-lime text-forest', title: 'Welcome to The Ident', body: 'Post roles, review tapes and book your cast — all in one place. Here’s a 30-second look around.' },
    { icon: 'megaphone', tone: 'bg-mint text-green-ink', title: 'Post a role', body: 'Ask for exactly the materials you need, add an NDA and a closing date. Applicants arrive with reels and CVs.', href: '/postings', cta: 'Open Postings' },
    { icon: 'users', tone: 'bg-butter text-ink', title: 'Search talent', body: 'Find performers by skill, playing age and place — then invite them to apply or add them to a shortlist.', href: '/talent', cta: 'Open Talent' },
    { icon: 'chat', tone: 'bg-blossom text-ink', title: 'Recall and book', body: 'Request a self-tape, set a video call or recall in person, then book — with cast chats for everyone you hire.', href: '/chats', cta: 'Open Chats' },
    { icon: 'menu', tone: 'bg-chip text-ink', title: 'Everything else is in More', body: 'Diary, What’s on, Classes, Theatre digs, Settings and Help.', href: '/menu', cta: 'Open More' },
  ],
}

export function startTour() { window.dispatchEvent(new Event('ident:tour')) }

export default function Tour({ role, autoStart }: { role: Role; autoStart: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)

  useEffect(() => {
    const show = () => { setI(0); setOpen(true) }
    window.addEventListener('ident:tour', show)
    let seen = true
    try { seen = !!localStorage.getItem(KEY) } catch { /* storage blocked: don't nag */ }
    if (autoStart && !seen) show()
    return () => window.removeEventListener('ident:tour', show)
  }, [autoStart])

  const close = () => { setOpen(false); try { localStorage.setItem(KEY, '1') } catch { /* */ } }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null
  const steps = STEPS[role], s = steps[i], last = i === steps.length - 1
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tour-title" className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-[420px] rounded-[28px] bg-surface p-6 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.5)]">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5" aria-hidden="true">
            {steps.map((_, k) => <span key={k} className={cx('h-1.5 rounded-full transition-all duration-300', k === i ? 'w-6 bg-forest' : 'w-1.5 bg-line-strong')} />)}
          </div>
          <button type="button" onClick={close} className="text-[14px] font-semibold text-muted hover:text-ink">Skip</button>
        </div>
        <div key={i} className="animate-[rc-step-in_260ms_ease-out]">
          <span className={cx('mt-6 flex size-14 items-center justify-center rounded-2xl', s.tone)}><Icon name={s.icon} strokeWidth={2} className="size-7" /></span>
          <h2 id="tour-title" className="mt-5 text-[24px] leading-tight">{s.title}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-muted-strong">{s.body}</p>
          {s.href && <button type="button" onClick={() => { close(); router.push(s.href!) }} className="mt-3 inline-flex items-center gap-1.5 text-[14px] font-semibold text-green-ink">{s.cta} <Icon name="arrow-right" strokeWidth={2} className="size-4" /></button>}
        </div>
        <div className="mt-7 flex gap-3">
          {i > 0 && <Button variant="outline" className="flex-1" onClick={() => setI(i - 1)}>Back</Button>}
          <Button className="flex-[2]" trailingIcon={last ? undefined : 'arrow-right'} onClick={() => (last ? close() : setI(i + 1))}>{last ? 'Get started' : 'Next'}</Button>
        </div>
      </div>
    </div>
  )
}
