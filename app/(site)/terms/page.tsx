import Link from 'next/link'
import { LegalPage } from '@/components/site/Legal'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'
import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

export const metadata = { alternates: { canonical: '/terms' }, title: 'Terms of use · The Ident', description: 'The terms for using The Ident — memberships, posting roles, your content and safety.' }

// DRAFT for the owner to review (ideally with a solicitor) before launch:
// add the registered company name and address, and confirm governing law.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="21 November 2026"
      intro="These terms are the agreement between you and The Ident when you use our website and apps. Please read them — by creating an account you agree to them."
      sections={[
        { h: 'Your account', body: <><p>You must be 18 or over and give accurate information. Keep your password safe; you’re responsible for activity on your account. Each account is either a performer account or a casting account.</p></> },
        { h: 'Membership and payment', body: <><p>Using the app needs a membership: Performer {price(PLANS.performer.pence)} a month or Casting {price(PLANS.casting.pence)} a month, after a {TRIAL_DAYS}-day free trial (one trial per member). Memberships renew monthly until cancelled. You can cancel any time in Settings → Membership; you keep access until the end of the period you’ve paid for. Prices include VAT where applicable. We’ll give you notice before any price change.</p><p>Browsing the public job board is free.</p></> },
        { h: 'Posting roles', body: <ul>
          <li>Roles must be real, lawful and accurately described, including pay. Don’t ask for payment from applicants.</li>
          <li>Follow equality law in how you describe and cast roles, and only collect what you need.</li>
          <li>Treat applicants’ materials as confidential and use them only for that casting.</li>
          <li>Roles posted by performers are shown as “Community”. Roles shared by The Ident from public posts are credited to the original poster.</li>
        </ul> },
        { h: 'Your content', body: <p>You own what you upload — headshots, reels, self-tapes and the rest. You give us permission to store, display and send it as needed to run The Ident (for example, showing your profile and sending your application to a poster). You confirm you have the rights to anything you upload, including permission from anyone else who appears in it.</p> },
        { h: 'Behaviour and safety', body: <><p>Be respectful. Don’t harass, discriminate, spam, impersonate anyone, share others’ private information, or post anything unlawful, sexual or misleading. Never ask performers for money, explicit material or to meet somewhere unsafe.</p><p>You can report or block members and content in the app. We may remove content or suspend accounts that break these terms.</p></> },
        { h: 'Classes, digs and arrangements between members', body: <p>Class spaces, digs and side hustles are arranged directly between members. The Ident isn’t a party to those arrangements and doesn’t handle payment for them. Check details with the studio or host, and only pay people you trust.</p> },
        { h: 'Our service', body: <p>We work hard to keep The Ident running and accurate, but we can’t guarantee it will always be available or that any role will lead to work. We’re not the employer or agent for roles posted by others.</p> },
        { h: 'Liability', body: <p>Nothing in these terms limits liability that can’t be limited by law (such as for death or personal injury caused by negligence, or fraud). Otherwise, our total liability to you is limited to the membership fees you paid in the 12 months before the claim. Your statutory rights as a consumer are not affected.</p> },
        { h: 'Ending your account', body: <p>You can delete your account at any time. We may suspend or close accounts that break these terms, with notice where it’s safe to give it.</p> },
        { h: 'Changes and law', body: <p>We may update these terms; we’ll tell you about significant changes before they apply. These terms are governed by the law of England and Wales.</p> },
        { h: 'Contact', body: <p>Questions? Email <a href={'mailto:' + SUPPORT_EMAIL} className="font-medium text-green-ink underline">{SUPPORT_EMAIL}</a> or see <Link href="/contact" className="font-medium text-green-ink underline">Contact &amp; help</Link>. Our <Link href="/privacy" className="font-medium text-green-ink underline">privacy policy</Link> explains how we use your data.</p> },
      ]} />
  )
}
