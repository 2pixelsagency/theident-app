import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const brand = request.nextUrl.searchParams.get('brand')
  if (!brand) return NextResponse.json({ logo: null })

  try {
    const domain = brand.toLowerCase().replace(/\s+/g, '') + '.com'
    const res = await fetch(`https://api.brandfetch.io/v2/brands/${domain}`, {
      headers: { 'Authorization': `Bearer ${process.env.BRANDFETCH_API_KEY}` },
    })
    if (!res.ok) return NextResponse.json({ logo: null })
    const data = await res.json()
    const logo = data.logos?.[0]?.formats?.[0]?.src || null
    return NextResponse.json({ logo })
  } catch {
    return NextResponse.json({ logo: null })
  }
}
