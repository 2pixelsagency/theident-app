import Link from 'next/link'
// Server-safe class joiner (the app's cx lives in a client module)
export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// Shared building blocks for the Castings section: card shell + header, arrow link, tinted panel with
// the stripe band, and the translucent frame around each floating white card.

export function ArrowLink({ href, label, size = 48, dark }: { href: string; label: string; size?: 44 | 48; dark?: boolean }) {
  return (
    <Link href={href} aria-label={label}
      className={cx('group flex shrink-0 items-center justify-center rounded-[14px] border transition-colors duration-300',
        size === 48 ? 'size-12' : 'size-11',
        dark ? 'border-white/20 bg-white/[0.08] text-bg hover:bg-lime hover:text-ink' : 'border-line-strong bg-bg text-ink hover:border-forest hover:bg-forest hover:text-lime')}>
      <svg aria-hidden="true" width={size === 48 ? 18 : 16} height={size === 48 ? 18 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><path d="M7 17L17 7M8 7h9v9" /></svg>
    </Link>
  )
}

export function IconBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-full', tone)}>{children}</span>
}

export function FeatureCard({ size, dark, header, title, body, children }: {
  size: 'lg' | 'sm'; dark?: boolean; header: React.ReactNode; title: string; body: string; children: React.ReactNode
}) {
  return (
    <article data-reveal className={cx('group/card flex flex-col rounded-[var(--radius-feature)]',
      size === 'lg' ? 'gap-3.5 p-6 md:p-8' : 'gap-3 p-6 md:p-7',
      dark ? 'bg-forest text-bg' : 'bg-sand text-ink')}>
      {header}
      <h3 className={cx('font-display font-bold tracking-[-0.02em]', size === 'lg' ? 'mt-1 text-[28px] leading-[1.1] md:text-[32px]' : 'mt-1.5 text-[26px] leading-[1.15]')}>{title}</h3>
      <p className={cx('leading-[1.6]', size === 'lg' ? 'text-[14px]' : 'text-[13px]', dark ? 'text-on-dark-muted' : 'text-muted-strong')}>{body}</p>
      {children}
    </article>
  )
}

export function Panel({ size, background, stripes, children }: { size: 'lg' | 'sm'; background: string; stripes: 'light' | 'dark'; children: React.ReactNode }) {
  return (
    <div className={cx('relative isolate flex items-center justify-center overflow-hidden', size === 'lg' ? 'mt-[18px] h-[360px] rounded-[24px]' : 'mt-3 h-[280px] rounded-[22px]')}>
      <div aria-hidden="true" className="absolute inset-0 -z-10" style={{ backgroundImage: background }} />
      <div aria-hidden="true" className={cx('absolute inset-x-0', size === 'lg' ? 'top-[37%] h-[124px]' : 'top-[34%] h-[100px]')}
          style={{ backgroundImage: stripes === 'dark' ? 'var(--stripes-dark)' : 'var(--stripes-light)' }} />
      {children}
    </div>
  )
}

// Translucent outer border (8px padding) around the inner white card
export function FloatFrame({ size, onDark, children }: { size: 'lg' | 'sm'; onDark?: boolean; children: React.ReactNode }) {
  return (
    <div className={cx('relative border', size === 'lg' ? 'w-[94%] max-w-[440px] rounded-[26px] p-2 sm:w-[82%]' : 'w-[88%] rounded-[22px] p-[7px] sm:w-[84%]',
      onDark ? 'border-white/[0.22] bg-white/[0.14]' : size === 'lg' ? 'border-white/70 bg-white/45' : 'border-white/80 bg-white/50')}>
      <div className={cx('bg-surface text-ink', size === 'lg' ? 'rounded-[20px]' : 'rounded-[16px] p-[18px]')}>{children}</div>
    </div>
  )
}
