'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useSyncExternalStore } from 'react'
import Icon from './Icon'

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/* ---------- Buttons ---------- */

type Variant = 'primary' | 'dark' | 'outline' | 'accent' | 'ghost' | 'light'
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-green text-white shadow-[0_8px_20px_-8px_var(--green)] hover:opacity-90',
  dark: 'bg-dark text-white hover:opacity-90',
  outline: 'border border-line bg-surface text-ink hover:bg-field',
  accent: 'bg-accent text-ink hover:opacity-90', // dark text on the pink gradient, always
  ghost: 'text-green-ink hover:bg-green-tint',
  light: 'bg-surface text-ink hover:opacity-90',
}

type ButtonProps = {
  variant?: Variant
  size?: 'md' | 'lg' | 'sm'
  href?: string
  icon?: string
  trailingIcon?: string
  full?: boolean
  className?: string
  children: React.ReactNode
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export function Button({ variant = 'primary', size = 'md', href, icon, trailingIcon, full, className, children, ...rest }: ButtonProps) {
  const cls = cx(
    'inline-flex items-center justify-center gap-2 font-medium transition disabled:opacity-50 disabled:pointer-events-none',
    size === 'lg' && 'h-14 rounded-[14px] text-base px-6',
    size === 'md' && 'h-12 rounded-[14px] text-[15px] px-5',
    size === 'sm' && 'h-9 rounded-full text-[13px] px-4',
    full && 'w-full',
    VARIANTS[variant],
    className,
  )
  const inner = <>{icon && <Icon name={icon} className="size-[18px]" />}{children}{trailingIcon && <Icon name={trailingIcon} className="size-[18px]" />}</>
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" className={cls} {...rest}>{inner}</button>
}

export function IconButton({ icon, label, onClick, href, className, dot }: { icon: string; label: string; onClick?: () => void; href?: string; className?: string; dot?: boolean }) {
  const cls = cx('relative inline-flex size-10 items-center justify-center rounded-full text-ink transition hover:bg-chip', className)
  const inner = <><Icon name={icon} className="size-[22px]" />{dot && <span className="absolute right-2 top-2 size-2 rounded-full bg-green ring-2 ring-bg" />}</>
  if (href) return <Link href={href} aria-label={label} className={cls}>{inner}</Link>
  return <button type="button" aria-label={label} onClick={onClick} className={cls}>{inner}</button>
}

/* ---------- Surfaces ---------- */

export function Card({ className, children, as: As = 'div', ...rest }: { className?: string; children: React.ReactNode; as?: 'div' | 'section' | 'li' } & React.HTMLAttributes<HTMLElement>) {
  return <As className={cx('rounded-[var(--radius)] border border-line bg-surface shadow-card', className)} {...rest}>{children}</As>
}

export function DarkCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cx('rounded-[var(--radius)] bg-dark p-5 text-white', className)}>{children}</div>
}

/* ---------- Headers ---------- */

// Back arrow + title, flush-left and on one line. No tap "box" behind the arrow.
function BackArrow({ back, onBack }: { back?: string; onBack?: () => void }) {
  const router = useRouter()
  const goBack = () => {
    if (onBack) return onBack()
    if (back) return router.push(back)
    if (window.history.length > 1) router.back()
    else router.push('/home')
  }
  return (
    <button type="button" onClick={goBack} aria-label="Back" className="-my-2 -ml-1.5 inline-flex h-10 w-8 shrink-0 items-center justify-start text-ink transition active:opacity-50">
      <Icon name="chevron-left" className="size-6" />
    </button>
  )
}

const headerCls = 'sticky top-0 z-30 bg-bg/95 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur lg:pt-6'

export function BackHeader({ title, right, back, onBack }: { title: string; right?: React.ReactNode; back?: string; onBack?: () => void }) {
  return (
    <header className={headerCls}>
      <div className="flex items-center gap-1.5">
        <BackArrow back={back} onBack={onBack} />
        <h1 className="flex-1 truncate text-[20px] leading-tight">{title}</h1>
        {right}
      </div>
    </header>
  )
}

// Tab-root header. Keeps the same back arrow so every screen has one (falls back to Home).
export function PageHeader({ title, right, sub, back = '/home' }: { title: string; right?: React.ReactNode; sub?: string; back?: string }) {
  return (
    <header className={headerCls}>
      <div className="flex items-center gap-1.5">
        <BackArrow back={back} />
        <h1 className="flex-1 truncate text-[20px] leading-tight">{title}</h1>
        {right}
      </div>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </header>
  )
}

export function SectionTitle({ title, action, href, className }: { title: string; action?: string; href?: string; className?: string }) {
  return (
    <div className={cx('mb-3 mt-6 flex items-center justify-between', className)}>
      <h2 className="text-[18px]">{title}</h2>
      {action && href && <Link href={href} className="text-sm font-medium text-green-ink">{action} ›</Link>}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('mb-2 text-xs font-medium uppercase tracking-[0.08em] text-muted', className)}>{children}</p>
}

/* ---------- Chips & pills ---------- */

export type Tone = 'green' | 'amber' | 'pencil' | 'purple' | 'pink' | 'red' | 'neutral' | 'dark' | 'blue'
const TONES: Record<Tone, string> = {
  green: 'bg-green-tint text-green-ink',
  amber: 'bg-amber-tint text-amber',
  pencil: 'bg-pencil-tint text-pencil',
  purple: 'bg-purple-tint text-purple-ink',
  pink: 'bg-pink-tint text-purple-ink',
  red: 'bg-red-tint text-red',
  neutral: 'bg-chip text-muted',
  dark: 'bg-green text-white',
  blue: 'bg-blue-tint text-ink',
}

export function Pill({ tone = 'neutral', children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>{children}</span>
}

export function Chip({ selected, onClick, children, tone = 'dark', className }: { selected?: boolean; onClick?: () => void; children: React.ReactNode; tone?: 'dark' | 'green' | 'purple'; className?: string }) {
  const on = tone === 'dark' ? 'border-dark bg-dark text-white' : tone === 'green' ? 'border-transparent bg-green-tint text-green-ink' : 'border-transparent bg-purple-tint text-purple-ink'
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cx('inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full border px-4 text-[13px] transition', selected ? on : 'border-line bg-surface text-ink hover:bg-field', className)}>
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'purple' }) {
  return <span className={cx('inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium', tone === 'purple' ? 'bg-purple-tint text-purple-ink' : 'bg-chip text-ink')}>{children}</span>
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex rounded-[14px] bg-chip p-1', className)}>
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('h-10 flex-1 rounded-[11px] text-sm font-medium transition', value === o.value ? 'bg-dark text-white shadow-card' : 'text-muted')}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function TabChips<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map(o => (
        <Chip key={o.value} selected={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}{o.count != null && o.count > 0 && <span className={cx('ml-1 text-xs', value === o.value ? 'text-white/70' : 'text-faint')}>{o.count}</span>}
        </Chip>
      ))}
    </div>
  )
}

/* ---------- Form controls ---------- */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-green' : 'bg-line')}>
      <span className={cx('absolute top-1 size-5 rounded-full bg-surface shadow transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  )
}

export function ToggleRow({ title, sub, checked, onChange }: { title: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        {sub && <p className="text-[13px] text-muted">{sub}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-line bg-field px-4 text-[15px] text-ink placeholder:text-faint outline-none transition focus:border-green focus:bg-surface'

export function Field({ label, hint, icon, className, ...rest }: { label?: string; hint?: string; icon?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] font-medium">{label}</span>}
      <span className="relative block">
        {icon && <Icon name={icon} className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" />}
        <input className={cx(inputCls, 'h-12', icon && 'pl-10')} {...rest} />
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function TextArea({ label, className, ...rest }: { label?: string; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] font-medium">{label}</span>}
      <textarea className={cx(inputCls, 'min-h-24 resize-y py-3 leading-relaxed')} {...rest} />
    </label>
  )
}

export function SearchField({ placeholder, value, onChange }: { placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="relative block">
      <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-muted" />
      <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="h-12 w-full rounded-[14px] border border-line bg-surface pl-11 pr-4 text-[15px] outline-none placeholder:text-faint focus:border-green" />
    </label>
  )
}

/* Dashed upload target (DESIGN.md: uploads are dashed outlines, never filled blocks) */
export function UploadTile({ icon = 'upload', title, sub, onClick, className, children }: { icon?: string; title: string; sub?: string; onClick?: () => void; className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={cx('upload flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-surface', className)}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-tint text-purple-ink"><Icon name={icon} /></span>
      <span className="flex-1">
        <span className="block text-[15px] font-medium">{title}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {children}
    </button>
  )
}

/* ---------- Progress ---------- */

export function Progress({ value, className, dark }: { value: number; className?: string; dark?: boolean }) {
  return (
    <div className={cx('h-2 overflow-hidden rounded-full', dark ? 'bg-white/15' : 'bg-chip', className)}>
      <div className="h-full rounded-full bg-accent transition-all" style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
    </div>
  )
}

export function Steps({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-1 gap-2" aria-label={'Step ' + step + ' of ' + total}>
      {Array.from({ length: total }).map((_, i) => <span key={i} className={cx('h-1 flex-1 rounded-full', i < step ? 'bg-dark' : 'bg-line')} />)}
    </div>
  )
}

/* ---------- Lists ---------- */

export function IconTile({ icon, tone = 'neutral', className }: { icon: string; tone?: Tone; className?: string }) {
  return <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl', TONES[tone], tone === 'neutral' && 'bg-green-tint/60 text-ink', className)}><Icon name={icon} className="size-5" /></span>
}

export function ListRow({ icon, tone, title, sub, right, href, onClick, chevron = true, danger }: { icon?: string; tone?: Tone; title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode; href?: string; onClick?: () => void; chevron?: boolean; danger?: boolean }) {
  const inner = (
    <>
      {icon && <IconTile icon={icon} tone={tone} />}
      <span className="min-w-0 flex-1">
        <span className={cx('block text-[15px] font-medium', danger && 'text-red')}>{title}</span>
        {sub && <span className="block text-[13px] text-muted">{sub}</span>}
      </span>
      {right}
      {chevron && (href || onClick) && <Icon name="chevron-right" className="size-4 text-faint" />}
    </>
  )
  const cls = 'flex w-full items-center gap-3 px-4 py-3.5 text-left'
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

export function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <Card className={cx('divide-y divide-line overflow-hidden', className)}>{children}</Card>
}

/* ---------- People ---------- */

export function Avatar({ src, name, size = 44, className, ring }: { src?: string | null; name?: string | null; size?: number; className?: string; ring?: boolean }) {
  const initials = (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase()).join('') || '?'
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-tint font-medium text-green-ink', ring && 'ring-2 ring-surface', className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.34) }}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="size-full object-cover" />
        : initials}
    </span>
  )
}

export function AvatarPile({ people, size = 30, max = 3 }: { people: { id: string; name?: string | null; src?: string | null }[]; size?: number; max?: number }) {
  return (
    <span className="flex -space-x-2">
      {people.slice(0, max).map(p => <Avatar key={p.id} src={p.src} name={p.name} size={size} ring />)}
    </span>
  )
}

/* ---------- States ---------- */

export function Empty({ icon = 'sparkle', title, sub, action }: { icon?: string; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-green-tint text-green-ink"><Icon name={icon} className="size-6" /></span>
      <p className="text-[15px] font-medium">{title}</p>
      {sub && <p className="mt-1 max-w-72 text-sm text-muted">{sub}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-[var(--radius)] bg-chip', className)} />
}

export function PageLoading() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28" />
      <Skeleton className="h-20" />
      <Skeleton className="h-20" />
    </div>
  )
}

/* ---------- Client-only rendering ---------- */

const noopSubscribe = () => () => {}
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false)
}

// For screens whose first render depends on browser-only state (localStorage drafts)
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return useIsClient() ? <>{children}</> : <>{fallback}</>
}

/* ---------- Toast ---------- */

let pushToast: ((msg: string) => void) | null = null
export function toast(msg: string) { pushToast?.(msg) }

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    pushToast = m => { setMsg(m); clearTimeout(t); t = setTimeout(() => setMsg(null), 2600) }
    return () => { pushToast = null; clearTimeout(t) }
  }, [])
  if (!msg) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-32 z-[200] lg:bottom-8 lg:left-64 flex justify-center px-4">
      <div className="rounded-full bg-dark px-5 py-3 text-sm text-white shadow-card">{msg}</div>
    </div>
  )
}

/* ---------- Bottom sheet ---------- */

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[150]" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-dark/40" />
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] max-w-[480px] overflow-y-auto rounded-t-[24px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[24px] lg:pb-6 bg-bg px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[20px]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-9 items-center justify-center rounded-full hover:bg-chip"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- Bottom action bar ---------- */

export function StickyActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-bg/95 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      {children}
    </div>
  )
}
