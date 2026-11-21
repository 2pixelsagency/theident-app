import Icon from '@/components/rc/Icon'
import { Eyebrow } from '@/components/site/Chrome'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

export const metadata = { title: 'Contact & help · The Ident', description: 'Get help with your account, membership or a casting.' }

const TOPICS = [
  ['user', 'Account & login', 'Trouble logging in, changing your email, or your account type.'],
  ['card', 'Membership & billing', 'Trials, receipts, cancelling. You can also manage billing in Settings → Membership.'],
  ['shield-check', 'Safety & reporting', 'Report a profile, message or post. Use “Report” in the app, or email us — we review every report.'],
  ['download', 'Your data', 'Ask for a copy of your data or for your account and data to be deleted.'],
]

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-[900px] px-5 pb-20 pt-14 md:pt-20">
      <Eyebrow>Contact &amp; help</Eyebrow>
      <h1 className="mt-3 text-[40px] leading-[1.05] md:text-[52px]">How can we help?</h1>
      <p className="mt-4 max-w-[560px] text-[18px] text-muted">Email us and a real person will reply, usually within one working day.</p>
      <a href={'mailto:' + SUPPORT_EMAIL} className="mt-8 inline-flex h-14 items-center gap-3 rounded-[10px] bg-forest px-6 text-[16px] font-semibold text-white"><Icon name="mail" className="size-5" />{SUPPORT_EMAIL}</a>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {TOPICS.map(([icon, title, body]) => (
          <a key={title} href={'mailto:' + SUPPORT_EMAIL + '?subject=' + encodeURIComponent(title)} className="rounded-[var(--radius)] border border-line bg-surface p-6 shadow-card transition hover:border-ink/20">
            <span className="flex size-11 items-center justify-center rounded-[10px] bg-mint text-green-ink"><Icon name={icon} className="size-5" /></span>
            <p className="mt-4 text-[17px] font-semibold">{title}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
          </a>
        ))}
      </div>
    </section>
  )
}
