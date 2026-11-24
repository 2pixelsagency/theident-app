import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Two front doors, one deployment:
//   www.theident.me → the website (what Google indexes)
//   app.theident.me → the app only
//   theident.me     → redirects to www
// Previews (*.vercel.app) and localhost are left alone so everything can be tested on one host.
const WWW = 'https://www.theident.me'
const APP = 'https://app.theident.me'

// Pages that belong to the website
const SITE = /^\/(performers|casting|pricing|contact|privacy|terms|people|jobs|auditions|blog|casting-calls|spotlight-alternative|mandy-alternative)(\/|$)/
// Pages that belong to the app (signed-in screens, auth and onboarding)
const APP_PATHS = /^\/(home|welcome|start|auth|login|forgot-password|reset-password|verify|find|castings|chats|me|talent|postings|settings|inbox|todo|blocks|diary|pay|tax|plan|menu|join|admin|classes|digs|whats-on)(\/|$)/

export function proxy(request: NextRequest) {
  const host = (request.headers.get('host') || '').toLowerCase().split(':')[0]
  const { pathname, search } = request.nextUrl

  if (host === 'theident.me') return NextResponse.redirect(WWW + pathname + search, 308)

  if (host === 'www.theident.me' && APP_PATHS.test(pathname)) {
    return NextResponse.redirect(APP + pathname + search, 307)
  }

  if (host === 'app.theident.me') {
    if (pathname === '/') return NextResponse.redirect(APP + '/home' + search, 307)
    if (SITE.test(pathname)) return NextResponse.redirect(WWW + pathname + search, 308)
  }

  return NextResponse.next()
}

export const config = {
  // Skip Next internals, API routes and static files (anything with a file extension)
  matcher: ['/((?!_next/|api/|.*\\.[a-zA-Z0-9]+$).*)'],
}
