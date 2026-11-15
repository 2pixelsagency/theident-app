'use client'

import { useState } from 'react'
import Link from 'next/link'
import Icon from './Icon'
import { Button, ClientOnly, Field, Toaster, cx } from './ui'

// Shared pieces for the auth screens (forgot / set new / change password, verify email, callback).

// Brand backdrop: soft organic pastel blobs behind the content (decorative only)
export function Blobs() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <span className="absolute -right-24 -top-20 size-72 rounded-[62%_38%_55%_45%/48%_60%_40%_52%] bg-mint opacity-70" />
      <span className="absolute -left-28 top-[55%] size-64 rounded-[45%_55%_38%_62%/55%_42%_58%_45%] bg-blossom opacity-60" />
    </div>
  )
}

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh bg-bg">
      <Blobs />
      {/* min-h-dvh + bottom safe-area keeps forms usable with the on-screen keyboard open */}
      <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(16px,env(safe-area-inset-top))]">
        <ClientOnly>{children}</ClientOnly>
      </div>
      <Toaster />
    </div>
  )
}

export function AuthBack({ onClick, href }: { onClick?: () => void; href?: string }) {
  const cls = '-ml-1.5 inline-flex h-10 w-8 items-center justify-start rounded-md text-ink active:opacity-50 focus-visible:outline-2 focus-visible:outline-lime'
  return (
    <div className="py-2">
      {href ? <Link href={href} aria-label="Back" className={cls}><Icon name="chevron-left" className="size-6" /></Link>
        : <button type="button" aria-label="Back" onClick={onClick} className={cls}><Icon name="chevron-left" className="size-6" /></button>}
    </div>
  )
}

export function AuthTitle({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <>
      <h1 className="mt-6 text-[28px]">{title}</h1>
      {sub && <p className="mt-2 text-[15px] leading-relaxed text-muted">{sub}</p>}
    </>
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
      <h1 className="mt-5 text-[24px]">{title}</h1>
      {body && <p className="mt-2 max-w-80 text-[15px] leading-relaxed text-muted">{body}</p>}
      {action && <Button className="mt-6" size="lg" href={action.href} onClick={action.onClick}>{action.label}</Button>}
      {secondary && <div className="mt-4">{secondary}</div>}
    </div>
  )
}

// Inline error / notice under a form
export function FormMessage({ tone = 'error', children }: { tone?: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={cx('flex items-start gap-2 rounded-xl px-3.5 py-3 text-[14px] leading-snug', tone === 'error' ? 'bg-blossom text-ink' : 'bg-mint text-forest')}>
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
