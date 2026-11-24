'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import LogoMark from '@/components/LogoMark'
import { Button, ClientOnly, Field, Toaster, cx } from './ui'

// Shared pieces for the auth screens (forgot / set new / change password, verify email, callback).

// Same clean frame as the log-in screen: Paper with faint frame lines and the logo above a centred column
export function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 hidden sm:block">
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-[240px] bg-gradient-to-b from-transparent via-surface to-transparent" />
      <span className="absolute left-1/2 top-0 h-full w-px translate-x-[240px] bg-gradient-to-b from-transparent via-surface to-transparent" />
      <span className="absolute left-0 top-[12%] h-px w-full bg-gradient-to-r from-transparent via-surface to-transparent" />
      <span className="absolute bottom-[12%] left-0 h-px w-full bg-gradient-to-r from-transparent via-surface to-transparent" />
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh bg-bg text-ink">
      <Backdrop />
      {/* min-h-dvh + bottom safe-area keeps forms usable with the on-screen keyboard open */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[400px] flex-col px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))] sm:justify-center">
        <Link href="https://www.theident.me/" aria-label="The Ident" className="mx-auto mb-6 flex items-center gap-2 font-display text-[22px] font-bold tracking-[-0.03em] text-forest">
          <LogoMark className="size-5" />The Ident
        </Link>
        <ClientOnly>{children}</ClientOnly>
      </div>
      <Toaster />
    </div>
  )
}

export function AuthBack({ onClick, href }: { onClick?: () => void; href?: string }) {
  const cls = 'inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-strong transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-lime'
  return (
    <div className="flex justify-center py-1">
      {href ? <Link href={href} className={cls}><Icon name="chevron-left" strokeWidth={2} className="size-4" />Back to log in</Link>
        : <button type="button" onClick={onClick} className={cls}><Icon name="chevron-left" strokeWidth={2} className="size-4" />Back</button>}
    </div>
  )
}

export function AuthTitle({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="mt-5 font-display text-[34px] font-bold leading-[1.05] tracking-[-0.03em]">{title}</h1>
      {sub && <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-[1.6] text-muted-strong">{sub}</p>}
    </div>
  )
}

const TONE = { success: 'bg-mint text-forest', warning: 'bg-butter text-ink', error: 'bg-blossom text-ink', info: 'bg-mint text-forest' }

// Full-screen state: loading, success ("Check your email"), expired link…
export function AuthState({ tone, icon, title, body, action, secondary }: {
  tone: keyof typeof TONE | 'loading'; icon?: string; title: string; body?: React.ReactNode
  action?: { label: string; href?: string; onClick?: () => void }; secondary?: React.ReactNode
}) {
  return (
    <div role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'} className="flex flex-1 flex-col items-center justify-center text-center">
      {tone === 'loading'
        ? <span aria-hidden="true" className="size-10 animate-spin rounded-full border-2 border-line border-t-forest" />
        : <span className={cx('flex size-16 items-center justify-center rounded-full', TONE[tone])}><Icon name={icon || 'check'} className="size-7" /></span>}
      <h1 className="mt-5 font-display text-[28px] font-bold tracking-[-0.03em]">{title}</h1>
      {body && <p className="mt-2 max-w-80 text-[13px] leading-[1.6] text-muted-strong">{body}</p>}
      {action && <Button className="mt-6" size="lg" href={action.href} onClick={action.onClick}>{action.label}</Button>}
      {secondary && <div className="mt-4">{secondary}</div>}
    </div>
  )
}

// Inline error / notice under a form
export function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2 rounded-[12px] px-3.5 py-3 text-[13px] leading-snug', tone === 'error' ? 'bg-blossom text-ink' : 'bg-mint text-forest')}>
      <Icon name={tone === 'error' ? 'alert' : 'check-circle'} className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

// Password rules: 8+ characters with at least one letter and one number
export function passwordIssues(pw: string) {
  const issues: string[] = []
  if (pw.length < 8) issues.push('at least 8 characters')
  if (!/[a-z]/i.test(pw)) issues.push('a letter')
  if (!/\d/.test(pw)) issues.push('a number')
  return issues
}

export function passwordStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0
  if (passwordIssues(pw).length) return 1
  const extra = (pw.length >= 12 ? 1 : 0) + (/[^a-z0-9]/i.test(pw) ? 1 : 0) + (/[a-z]/.test(pw) && /[A-Z]/.test(pw) ? 1 : 0)
  return extra >= 2 ? 3 : 2
}

export function PasswordField({ label, value, onChange, autoComplete, showMeter, autoFocus, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; autoComplete: 'current-password' | 'new-password'; showMeter?: boolean; autoFocus?: boolean; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  const strength = passwordStrength(value)
  const issues = passwordIssues(value)
  return (
    <div>
      <div className="relative">
        <Field label={label} type={show ? 'text' : 'password'} autoComplete={autoComplete} required autoFocus={autoFocus} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="[&_input]:pr-16" />
        <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute bottom-3 right-3 rounded text-xs font-semibold text-muted focus-visible:outline-2 focus-visible:outline-lime">{show ? 'Hide' : 'Show'}</button>
      </div>
      {showMeter && value && (
        <div className="mt-2" aria-live="polite">
          <div className="flex gap-1.5" aria-hidden="true">
            {[1, 2, 3].map(i => <span key={i} className={cx('h-1 flex-1 rounded-full', strength >= i ? (strength === 1 ? 'bg-red' : strength === 2 ? 'bg-butter' : 'bg-forest') : 'bg-line')} />)}
          </div>
          <p className="mt-1.5 text-[13px] text-muted">{issues.length ? 'Needs ' + issues.join(', ') : strength === 3 ? 'Strong password' : 'Good — longer or mixed symbols make it stronger'}</p>
        </div>
      )}
    </div>
  )
}
