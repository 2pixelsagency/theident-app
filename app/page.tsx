import { headers } from 'next/headers'
import PublicBoard from '@/components/rc/PublicBoard'
import MarketingHome from '@/components/site/MarketingHome'
import { SiteShell } from '@/components/site/Chrome'

// One deployment, two front doors:
//   app.theident.me → every live role (the installed app starts at /home instead — see manifest)
//   theident.me / www.theident.me → the marketing homepage
export const metadata = {
  title: 'The Ident — castings, auditions & paid work for performers',
  description: 'Find castings, auditions and paid work. Apply with your reel, track every self-tape and recall, and get found by casting directors. Performers £1.99/month, 7 days free.',
  alternates: { canonical: '/' },
}

export default async function Home() {
  const host = ((await headers()).get('host') || '').toLowerCase()
  if (host.startsWith('app.')) return <PublicBoard />
  return <SiteShell><MarketingHome /></SiteShell>
}
