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
  primary: 'bg-green text-white hover:bg-lime hover:text-ink', // Forest pill → Lime on hover
  dark: 'bg-dark text-white hover:bg-lime hover:text-ink',
  outline: 'border-[1.5px] border-forest bg-transparent text-forest hover:bg-forest hover:text-white',
  accent: 'bg-accent text-ink hover:bg-forest hover:text-lime', // Ink text on Lime, always
  ghost: 'text-green-ink hover:bg-green-tint',
  light: 'bg-surface text-ink hover:bg-lime',

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
    'group inline-flex cursor-pointer items-center justify-center gap-2 font-semibold transition-[background-color,color,border-color,transform,box-shadow] duration-300 ease-out active:scale-[.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime',
    size === 'lg' && 'h-14 rounded-full text-base px-7',
    size === 'md' && 'h-12 rounded-full text-[15px] px-6',
    size === 'sm' && 'h-9 rounded-full text-[13px] px-4',
    full && 'w-full',
    VARIANTS[variant],
    className,
  )
  const inner = <>{icon && <Icon name={icon} className="size-[18px]" />}{children}{trailingIcon && <Icon name={trailingIcon} className="cta-arrow size-[18px]" />}</>
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
  return <As className={cx('rounded-[var(--radius)] border border-line-soft bg-surface shadow-card', className)} {...rest}>{children}</As>
}

export function DarkCard({ className, children }: { className?: string; children: React.ReactNode }) {
  // Forest panel with the lime stripe band (website design system)
  return (
    <div className={cx('relative isolate overflow-hidden rounded-[var(--radius)] p-5 text-white', className)} style={{ backgroundImage: 'var(--panel-forest)' }}>
      <span aria-hidden="true" className="absolute inset-x-0 top-[40%] -z-10 h-20" style={{ backgroundImage: 'var(--stripes-dark)' }} />
      {children}
    </div>
  )
}

/* ---------- Headers ---------- */

// Back arrow + title, flush-left and on one line. No tap "box" behind the arrow.
// In-app history. The (rc) layout records every screen in a small stack (sessionStorage). Visiting a screen
// that's already in the stack (e.g. Profile → Edit → save → Profile) collapses the loop, so Back never
// bounces between two screens. Back uses the browser's history only when we know the previous browser
// entry is the previous screen; otherwise it replaces with the right screen (or the fallback).
type NavEntry = { path: string; pushed: boolean }
const STACK_KEY = 'ident.navStack', INTENT_KEY = 'ident.navIntent'
const readStack = (): NavEntry[] => { try { const v = JSON.parse(sessionStorage.getItem(STACK_KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
const writeStack = (s: NavEntry[]) => { try { sessionStorage.setItem(STACK_KEY, JSON.stringify(s.slice(-40))) } catch { /* private mode */ } }
const setIntent = (v: 'pop' | 'replace') => { try { sessionStorage.setItem(INTENT_KEY, v) } catch { /* */ } }
const bare = (p: string) => p.split('?')[0].replace(/\/$/, '') || '/'
export function listenNav() {
  const on = () => setIntent('pop')
  window.addEventListener('popstate', on)
  return () => window.removeEventListener('popstate', on)
}
export function trackNav() {
  let intent: string | null = null
  try { intent = sessionStorage.getItem(INTENT_KEY); sessionStorage.removeItem(INTENT_KEY) } catch { /* */ }
  const here = window.location.pathname + window.location.search
  const s = readStack()
  const i = s.findIndex(e => bare(e.path) === bare(here))
  if (i >= 0) {
    const t = s.slice(0, i + 1)
    t[i] = { path: here, pushed: intent === 'pop' ? s[i].pushed : false }
    writeStack(t)
  } else writeStack([...s, { path: here, pushed: intent === null }])
}
export function useGoBack(fallback = '/home') {
  const router = useRouter()
  return () => {
    const s = readStack()
    const cur = s[s.length - 1], prev = s[s.length - 2]
    if (prev && cur?.pushed) { setIntent('pop'); router.back(); return }
    setIntent('replace')
    router.replace(prev ? prev.path : fallback)
  }
}

export function BackArrow({ back, onBack }: { back?: string; onBack?: () => void }) {
  const fallbackBack = useGoBack(back || '/home')
  const goBack = () => (onBack ? onBack() : fallbackBack())
  return (
    <button type="button" onClick={goBack} aria-label="Back" className="-my-2 -ml-1.5 inline-flex h-10 w-8 shrink-0 items-center justify-start text-ink transition active:opacity-50">
      <Icon name="chevron-left" className="size-6" />
    </button>
  )
}

const headerCls = 'sticky top-0 z-30 bg-bg/95 px-4 pb-3 pt-[max(14px,env(safe-area-inset-top))] backdrop-blur lg:static lg:bg-transparent lg:pb-5 lg:pt-6 lg:backdrop-blur-none'

export function BackHeader({ title, right, back, onBack }: { title: string; right?: React.ReactNode; back?: string; onBack?: () => void }) {
  return (
    <header className={headerCls}>
      <div className="flex items-center gap-1.5">
        <BackArrow back={back} onBack={onBack} />
        <h1 className="flex-1 truncate font-display text-[24px] font-bold leading-tight tracking-[-0.03em] lg:text-[36px]">{title}</h1>
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
        <h1 className="flex-1 truncate font-display text-[24px] font-bold leading-tight tracking-[-0.03em] lg:text-[36px]">{title}</h1>
        {right}
      </div>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </header>
  )
}

export function SectionTitle({ title, action, href, className }: { title: string; action?: string; href?: string; className?: string }) {
  return (
    <div className={cx('mb-3 mt-6 flex items-center justify-between', className)}>
      <h2 className="font-display text-[20px] font-bold tracking-[-0.02em]">{title}</h2>
      {action && href && <Link href={href} className="group inline-flex items-center gap-1 text-[13px] font-semibold text-forest">{action}<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><path d="M7 17L17 7M8 7h9v9" /></svg></Link>}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cx('mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-forest', className)}><span aria-hidden="true" className="size-1.5 rounded-full bg-current" />{children}</p>
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
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold', TONES[tone], className)}>{children}</span>
}

export function Chip({ selected, onClick, children, tone = 'dark', className }: { selected?: boolean; onClick?: () => void; children: React.ReactNode; tone?: 'dark' | 'green' | 'purple'; className?: string }) {
  const on = tone === 'dark' ? 'border-dark bg-dark text-white' : tone === 'green' ? 'border-transparent bg-green-tint text-green-ink' : 'border-transparent bg-purple-tint text-purple-ink'
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cx('inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full border px-4 text-[13px] transition', selected ? on : 'border-line-strong bg-sand text-ink hover:border-forest', className)}>
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'purple' }) {
  return <span className={cx('inline-flex items-center rounded-[10px] px-3 py-1 text-xs font-medium', tone === 'purple' ? 'bg-purple-tint text-purple-ink' : 'bg-sand-2 text-muted-strong')}>{children}</span>
}

export function Segmented<T extends string>({ value, options, onChange, className }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div role="tablist" className={cx('flex rounded-full bg-sand-2 p-1', className)}>
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={cx('h-10 flex-1 rounded-full text-sm font-semibold transition-colors duration-300', value === o.value ? 'bg-forest text-bg shadow-card' : 'text-muted-strong hover:text-ink')}>
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
      className={cx('relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300', checked ? 'bg-forest' : 'bg-line-strong')}>
      <span className={cx('absolute top-[3px] size-[22px] rounded-full shadow transition-all duration-300', checked ? 'left-[23px] bg-lime' : 'left-[3px] bg-surface')} />
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

const inputCls = 'w-full rounded-[14px] border border-line-strong bg-surface px-4 text-[16px] text-ink placeholder:text-faint outline-none transition focus:border-forest focus:ring-2 focus:ring-lime/50'

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
        className="h-12 w-full rounded-full border border-line-strong bg-surface pl-11 pr-4 text-[15px] outline-none placeholder:text-faint focus:border-forest focus:ring-2 focus:ring-lime/50" />
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
      <div className={cx('h-full rounded-full transition-all duration-700', dark ? 'bg-lime' : 'bg-forest')} style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
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
  return <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full', TONES[tone], tone === 'neutral' && 'bg-green-tint/60 text-ink', className)}><Icon name={icon} className="size-5" /></span>
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
        ? <img src={src} alt={name ? name + ' photo' : ''} className="size-full object-cover" />
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
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-lime text-forest"><Icon name={icon} strokeWidth={2} className="size-6" /></span>
      <p className="font-display text-[20px] font-bold tracking-[-0.02em]">{title}</p>
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

type ToastAction = { label: string; onClick: () => void }
let pushToast: ((msg: string, action?: ToastAction) => void) | null = null
export function toast(msg: string, action?: ToastAction) { pushToast?.(msg, action) }

export function Toaster() {
  const [t, setT] = useState<{ msg: string; action?: ToastAction } | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    pushToast = (msg, action) => { setT({ msg, action }); clearTimeout(timer); timer = setTimeout(() => setT(null), action ? 5000 : 2600) }
    return () => { pushToast = null; clearTimeout(timer) }
  }, [])
  if (!t) return null
  return (
    <div role="status" className="fixed inset-x-0 bottom-32 z-[200] lg:bottom-8 lg:left-[76px] flex justify-center px-4">
      <div className="flex max-w-[440px] items-center gap-3 rounded-full bg-dark py-3 pl-5 pr-3 text-sm text-white shadow-card">
        <span className="line-clamp-2">{t.msg}</span>
        {t.action && <button type="button" onClick={() => { t.action!.onClick(); setT(null) }} className="shrink-0 rounded-full bg-lime px-3 py-1 text-[13px] font-semibold text-ink">{t.action.label}</button>}
      </div>
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
      <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[90dvh] max-w-[480px] overflow-y-auto rounded-t-[32px] lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[32px] lg:pb-6 bg-bg px-4 pb-[max(20px,env(safe-area-inset-bottom))] pt-3">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-[22px] font-bold tracking-[-0.02em]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="inline-flex size-10 items-center justify-center rounded-[14px] border border-line-strong bg-bg transition-colors hover:border-forest hover:bg-forest hover:text-lime"><Icon name="x" /></button>
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
