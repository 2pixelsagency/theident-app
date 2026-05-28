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

    let logo: string | null = null

    // Priority 1 — icon type, dark theme (black symbol on transparent)
    for (const logoObj of data.logos || []) {
      if (logoObj.type === 'icon' && logoObj.theme === 'dark') {
        for (const format of logoObj.formats || []) {
          if (format.src && (format.format === 'png' || format.format === 'svg')) {
            logo = format.src; break
          }
        }
      }
      if (logo) break
    }

    // Priority 2 — icon type any theme
    if (!logo) {
      for (const logoObj of data.logos || []) {
        if (logoObj.type === 'icon') {
          for (const format of logoObj.formats || []) {
            if (format.src && (format.format === 'png' || format.format === 'svg')) {
              logo = format.src; break
            }
          }
        }
        if (logo) break
      }
    }

    // Priority 3 — dark theme logo (white/transparent bg)
    if (!logo) {
      for (const logoObj of data.logos || []) {
        if (logoObj.theme === 'dark') {
          for (const format of logoObj.formats || []) {
            if (format.src) { logo = format.src; break }
          }
        }
        if (logo) break
      }
    }

    // Fallback
    if (!logo) {
      logo = data.logos?.[0]?.formats?.[0]?.src || null
    }

    return NextResponse.json({ logo })
  } catch {
    return NextResponse.json({ logo: null })
  }
}
