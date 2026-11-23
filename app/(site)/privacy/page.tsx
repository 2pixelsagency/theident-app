import { LegalPage } from '@/components/site/Legal'
import { SUPPORT_EMAIL } from '@/lib/rc/profile'

export const metadata = { alternates: { canonical: '/privacy' }, title: 'Privacy policy · The Ident', description: 'What The Ident collects, why, who sees it, and your rights under UK data protection law.' }

// DRAFT for the owner to review (ideally with a solicitor) before launch:
// add the registered company name, company number and registered address in section 1.
export default function PrivacyPage() {
  const mail = <a href={'mailto:' + SUPPORT_EMAIL} className="font-medium text-green-ink underline">{SUPPORT_EMAIL}</a>
  return (
    <LegalPage title="Privacy policy" updated="21 November 2026"
      intro="This policy explains what personal information The Ident collects, why, who we share it with, and the choices and rights you have. We’ve tried to keep it plain and short."
      sections={[
        { h: 'Who we are', body: <><p>The Ident (“we”, “us”) runs the website theident.me and The Ident apps. We are the controller of your personal data under UK data protection law (UK GDPR and the Data Protection Act 2018).</p><p>Questions about privacy: {mail}.</p></> },
        { h: 'What we collect', body: <ul>
          <li><b>Account details</b> — name, email address, password (stored securely hashed by our authentication provider), account type.</li>
          <li><b>Profile information you add</b> — headshots, showreels, self-tapes, credits, skills, playing age, physical details such as height, location, bio, agent details and CV.</li>
          <li><b>Activity in the app</b> — roles you post, save or apply for, application status, messages and chats, goals, to-dos, diary entries, classes and digs listings, payments and expenses you log.</li>
          <li><b>Membership and billing</b> — your plan and its status. Card payments are handled by Stripe; we never see or store your full card number.</li>
          <li><b>Technical information</b> — device and browser type, and, if you turn them on, a push-notification token for your device.</li>
        </ul> },
        { h: 'How we use it', body: <ul>
          <li>To run the service you signed up for — your profile, applications, castings, messages and membership (<i>contract</i>).</li>
          <li>To show your profile to casting teams and other members when your profile is set to public (<i>contract</i>; you can hide it in Settings).</li>
          <li>To send emails and notifications about your account and castings, which you can control in Settings (<i>contract / legitimate interests</i>).</li>
          <li>To keep members safe — reviewing reports, moderating content and preventing misuse (<i>legitimate interests</i>).</li>
          <li>To meet legal and tax obligations (<i>legal obligation</i>).</li>
          <li>To send tips and news only if you opt in (<i>consent</i>, which you can withdraw any time).</li>
        </ul> },
        { h: 'Who can see your information', body: <><p>If your profile is public, other signed-in members and casting teams can see it, and it’s available at your public profile link. When you apply for a role, the poster sees your application and the materials you send. Messages are visible to the people in that conversation. Our safety team can review content that’s been reported.</p><p>If your profile is public, your public profile page (name, headshot, craft, location, bio, credits and skills — never your contact details) can also be found by search engines such as Google. Turn off “Public profile” in Settings to hide it; search engines usually drop it within a few weeks.</p><p>If you turn on “Feature me on theident.me” in Settings, your headshot, first name and craft may appear on our public website. You can turn it off at any time.</p><p>We never sell your personal data.</p></> },
        { h: 'Service providers', body: <><p>We use trusted providers to run The Ident. They process data only on our instructions:</p><ul>
          <li>Supabase — database, file storage and sign-in</li>
          <li>Vercel — website and app hosting</li>
          <li>Stripe — membership payments</li>
          <li>Resend — sending emails</li>
          <li>Apple and Google — push notifications and, if you choose them, sign in</li>
        </ul><p>Some providers may process data outside the UK. Where they do, we rely on appropriate safeguards such as the UK International Data Transfer Agreement or adequacy regulations.</p></> },
        { h: 'How long we keep it', body: <p>We keep your data while your account is open. If you delete your account we delete or anonymise your personal data within 30 days, except where we must keep some records longer for legal, tax or safety reasons (for example billing records, typically six years).</p> },
        { h: 'Your rights', body: <><p>You can ask to access, correct, delete or receive a copy of your data, object to or restrict how we use it, and withdraw consent. Most of your information can be edited directly in the app. To make a request, email {mail}. We’ll respond within one month.</p><p>If you’re unhappy with how we handle your data you can complain to the Information Commissioner’s Office (ico.org.uk).</p></> },
        { h: 'Cookies and storage', body: <p>We use only what’s needed to keep you signed in and remember simple preferences on your device (browser storage). We don’t use advertising cookies or sell data to advertisers.</p> },
        { h: 'Age', body: <p>The Ident is for people aged 18 and over. We don’t knowingly collect data from children.</p> },
        { h: 'Changes', body: <p>If we make significant changes we’ll tell you in the app or by email before they take effect.</p> },
      ]} />
  )
}
