import Icon from '@/components/rc/Icon'
import { Container } from '@/components/site/Chrome'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

export const metadata = { alternates: { canonical: '/contact' }, title: 'Contact & help · The Ident', description: 'Get help with your account, membership or a casting.' }

const TOPICS = [
  ['Account & login', 'Trouble logging in, changing your email, or your account type.'],
  ['Membership & billing', 'Trials, receipts, cancelling. You can also manage billing in Settings → Membership.'],
  ['Safety & reporting', 'Report a profile, message or post. Use “Report” in the app, or email us — we review every report.'],
  ['Your data', 'Ask for a copy of your data, or for your account and data to be deleted.'],
]

export default function ContactPage() {
  return (
    <>
      <Container className="pb-16 pt-32 md:pt-44">
        <p className="rise text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">Contact &amp; help</p>
        <h1 className="rise mt-5 max-w-[900px] text-[44px] leading-[1.02] tracking-[-0.035em] md:text-[72px]" style={{ '--d': '100ms' } as React.CSSProperties}>Talk to a real person.</h1>
        <p className="rise mt-6 max-w-[560px] text-[18px] leading-relaxed text-muted" style={{ '--d': '200ms' } as React.CSSProperties}>Email us and we’ll usually reply within one working day.</p>
        <a href={'mailto:' + SUPPORT_EMAIL} className="rise group mt-12 inline-flex items-center gap-4 break-all font-display text-[30px] font-bold tracking-[-0.02em] text-forest underline decoration-lime decoration-[6px] underline-offset-[10px] md:text-[56px]" style={{ '--d': '300ms' } as React.CSSProperties}>
          {SUPPORT_EMAIL}<span className="hidden size-14 shrink-0 items-center justify-center rounded-full bg-forest text-lime transition group-hover:translate-x-1 md:flex"><Icon name="arrow-right" className="size-6" /></span>
        </a>
      </Container>
      <Container className="pb-28">
        <ul className="divide-y divide-line border-y border-line">
          {TOPICS.map(([title, body]) => (
            <li key={title}>
              <a href={'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(title)} className="group grid gap-2 py-8 md:grid-cols-[340px_1fr_auto] md:items-center md:gap-10">
                <span className="text-[22px] font-semibold">{title}</span>
                <span className="text-[16px] leading-relaxed text-muted">{body}</span>
                <span className="hidden size-12 items-center justify-center rounded-full border border-line transition group-hover:border-forest group-hover:bg-forest group-hover:text-lime md:flex"><Icon name="arrow-right" className="size-5" /></span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </>
  )
}
