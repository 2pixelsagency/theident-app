// Server-only: branded HTML for the app's only two emails (verify account, password changed).
// Password-reset emails come from Supabase itself (custom SMTP + template, see the PR notes).
// Hex values are inlined because email clients don't support CSS variables; they mirror tokens.css.
const C = { paper: '#F6F4EE', ink: '#15211C', forest: '#123127', lime: '#CBF24C', muted: '#5C6862' }

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export function brandedEmail({ title, body, button, footer }: { title: string; body: string[]; button?: { label: string; href: string }; footer?: string }) {
  return (
    `<div style="background:${C.paper};padding:32px 16px;font-family:Inter,Helvetica,Arial,sans-serif;color:${C.ink};">` +
    `<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px 28px;">` +
    `<p style="margin:0 0 24px;font-family:'Bricolage Grotesque',Helvetica,Arial,sans-serif;font-weight:700;font-size:18px;letter-spacing:-0.02em;color:${C.forest};">The Ident</p>` +
    `<h1 style="margin:0 0 12px;font-family:'Bricolage Grotesque',Helvetica,Arial,sans-serif;font-weight:700;font-size:24px;line-height:1.15;letter-spacing:-0.03em;">${esc(title)}</h1>` +
    body.map(p => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.muted};">${esc(p)}</p>`).join('') +
    (button ? `<a href="${esc(button.href)}" style="display:inline-block;margin-top:8px;background:${C.forest};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:14px;font-weight:600;font-size:15px;">${esc(button.label)}</a>` : '') +
    (footer ? `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${C.muted};">${esc(footer)}</p>` : '') +
    `</div></div>`
  )
}

export async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || 'The Ident <noreply@theident.me>', to, subject, html }),
  })
  return res.ok
}
