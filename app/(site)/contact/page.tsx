import Icon from '@/components/rc/Icon'
import { Container } from '@/components/site/Chrome'
import { IconBadge, Pill, SandCard, SectionHeader } from '@/components/site/ds'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

export const metadata = { alternates: { canonical: '/contact' }, title: 'Contact & help · The Ident', description: 'Get help with your account, membership or a casting.' }

const TOPICS = [
  ['Account & login', 'Trouble logging in, changing your email, or your account type.'],
  ['Membership & billing', 'Trials, receipts, cancelling. You can also manage billing in Settings → Membership.'],
  ['Safety & reporting', 'Report a profile, message or post. Use “Report” in the app, or email us — we review every report.'],
  ['Your data', 'Ask for a copy of your data, or for your account and data to be deleted.'],
]

const ICONS = ['user', 'pound', 'shield-check', 'lock']

export default function ContactPage() {
  return (
    <>
      <Container className="pb-6 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow="Contact & help" title="Talk to a real person." sub="Email us and we’ll usually reply within one working day."
          actions={<Pill href={'mailto:' + SUPPORT_EMAIL} arrow>{SUPPORT_EMAIL}</Pill>} />
      </Container>
      <Container className="pb-28">
        <ul className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
          {TOPICS.map(([title, body], i) => (
            <SandCard key={title} as="li" dark={i === TOPICS.length - 1} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <IconBadge tone={['bg-lime', 'bg-butter', 'bg-mint', 'bg-lime'][i]}><Icon strokeWidth={2} name={ICONS[i]} className="size-5 text-forest" /></IconBadge>
                <a href={'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(title)} aria-label={'Email us about ' + title}
                  className={'group flex size-11 items-center justify-center rounded-[14px] border transition-colors duration-300 ' + (i === TOPICS.length - 1 ? 'border-white/20 bg-white/[0.08] hover:bg-lime hover:text-ink' : 'border-line-strong bg-bg hover:border-forest hover:bg-forest hover:text-lime')}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"><path d="M7 17L17 7M8 7h9v9" /></svg>
                </a>
              </div>
              <h2 className="mt-1.5 font-display text-[24px] font-bold tracking-[-0.02em]">{title}</h2>
              <p className={'text-[13px] leading-[1.6] ' + (i === TOPICS.length - 1 ? 'text-on-dark-muted' : 'text-muted-strong')}>{body}</p>
            </SandCard>
          ))}
        </ul>
      </Container>
    </>
  )
}
