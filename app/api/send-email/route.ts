import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { to, subject, html } = await req.json()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + process.env.RESEND_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'The Ident <notifications@theident.me>',
      to,
      subject,
      html,
    }),
  })

  const data = await res.json()
  return NextResponse.json(data)
}
