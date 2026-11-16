// Server-only: branded HTML for the app's emails (welcome + verify, password changed).
// Password-reset emails come from Supabase itself (custom SMTP + template, see the PR notes).
// Hex values are inlined because email clients don't support CSS variables; they mirror tokens.css.
const C = { paper: '#F6F4EE', ink: '#15211C', forest: '#123127', lime: '#CBF24C', muted: '#5C6862' }

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

type Step = { title: string; text: string }

export function brandedEmail({ title, body, button, footer, steps, preheader }: {
  title: string; body: string[]; button?: { label: string; href: string }; footer?: string; steps?: Step[]; preheader?: string
}) {
  const display = `font-family:'Bricolage Grotesque',Helvetica,Arial,sans-serif;font-weight:700;letter-spacing:-0.03em;`
  return (
    `<div style="background:${C.paper};padding:28px 12px;font-family:Inter,Helvetica,Arial,sans-serif;color:${C.ink};">` +
    // preview text in the inbox list, hidden in the email itself
    (preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>` : '') +
    `<div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:22px;overflow:hidden;">` +
    `<div style="background:${C.forest};padding:22px 28px;">` +
    `<span style="${display}font-size:20px;color:${C.lime};">The Ident</span>` +
    `<span style="float:right;font-size:12px;line-height:28px;color:#C9D6CF;">Stage · Screen · Commercials · Dance</span></div>` +
    `<div style="padding:30px 28px 8px;">` +
    `<h1 style="margin:0 0 12px;${display}font-size:27px;line-height:1.12;color:${C.ink};">${esc(title)}</h1>` +
    body.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.muted};">${esc(p)}</p>`).join('') +
    (button ? `<a href="${esc(button.href)}" style="display:inline-block;margin:6px 0 10px;background:${C.lime};color:${C.ink};text-decoration:none;padding:14px 28px;border-radius:14px;font-weight:700;font-size:15px;">${esc(button.label)}</a>` : '') +
    (steps?.length ? `<div style="margin:22px 0 6px;">` + steps.map((st, i) =>
      `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 12px;"><tr>` +
      `<td style="width:34px;vertical-align:top;"><div style="width:26px;height:26px;border-radius:13px;background:${C.paper};color:${C.forest};font-weight:700;font-size:13px;line-height:26px;text-align:center;">${i + 1}</div></td>` +
      `<td style="vertical-align:top;"><p style="margin:2px 0 2px;font-size:15px;font-weight:600;color:${C.ink};">${esc(st.title)}</p><p style="margin:0;font-size:14px;line-height:1.5;color:${C.muted};">${esc(st.text)}</p></td>` +
      `</tr></table>`).join('') + `</div>` : '') +
    `</div>` +
    `<div style="padding:18px 28px 26px;border-top:1px solid #ECE9E1;">` +
    (footer ? `<p style="margin:0 0 10px;font-size:12px;line-height:1.5;color:${C.muted};">${esc(footer)}</p>` : '') +
    `<p style="margin:0;font-size:12px;line-height:1.5;color:${C.muted};">Real casting never asks you to pay to audition. Questions? Email <a href="mailto:hello@theident.me" style="color:${C.forest};">hello@theident.me</a>.</p>` +
    `</div></div>` +
    `<p style="max-width:520px;margin:14px auto 0;text-align:center;font-size:11px;color:${C.muted};">The Ident · app.theident.me</p>` +
    `</div>`
  )
}

// The first email a new member gets: welcome + their first steps (+ verify button for email sign-ups)
export function welcomeEmail({ firstName, caster, verifyLink }: { firstName: string | null; caster: boolean; verifyLink?: string }) {
  const app = 'https://app.theident.me'
  const steps: Step[] = caster
    ? [
        ...(verifyLink ? [{ title: 'Verify your email', text: 'Needed before you can post roles — one tap on the button above.' }] : []),
        { title: 'Add your logo and company', text: 'Performers trust castings with a real face and a website.' },
        { title: 'Post your first role', text: 'Self-tapes, reels and CVs land in one place, ready to review and shortlist.' },
        { title: 'Find talent', text: 'Search performers by skills, playing age and location, and invite them to audition.' },
      ]
    : [
        ...(verifyLink ? [{ title: 'Verify your email', text: 'Needed before you can apply — one tap on the button above.' }] : []),
        { title: 'Finish your profile', text: 'Add a headshot and your showreel — complete profiles get seen far more by casting.' },
        { title: 'Set a goal', text: 'Create a showreel, take dance classes, sign with an agent — tick off a few actions each week.' },
        { title: 'Turn on notifications', text: 'Don’t miss an audition: get an alert the moment you’re invited, recalled or booked.' },
      ]
  return brandedEmail({
    preheader: caster ? 'Post roles, review tapes and book your cast in one place.' : 'Your castings, goals and career — all in one place.',
    title: 'Welcome to The Ident' + (firstName ? ', ' + firstName : '') + ' 👋',
    body: [caster
      ? 'Thanks for joining. The Ident is where casting directors and producers find and book performers for stage, screen, commercials and dance.'
      : 'Thanks for joining. The Ident is your home for castings, auditions and paid work — and for staying on top of the career you want.'],
    button: verifyLink ? { label: 'Verify my email', href: verifyLink } : { label: 'Open The Ident', href: app + '/home' },
    steps,
    footer: verifyLink ? 'Button not working? Paste this link into your browser: ' + verifyLink + ' — it expires in 24 hours. Didn’t sign up? Ignore this email.' : undefined,
  })
}

export async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'The Ident <noreply@theident.me>', to, subject, html }),
  })
  return res.ok
}
