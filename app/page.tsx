import MarketingHome from '@/components/site/MarketingHome'
import { SiteShell } from '@/components/site/Chrome'

// The website homepage, on every domain (theident.me and app.theident.me).
// The job board lives at /jobs; the installed app starts at /home (see manifest).
export const metadata = {
  title: 'The Ident — castings, auditions & paid work for performers',
  description: 'Find castings, auditions and paid work. Apply with your reel, track every self-tape and recall, and get found by casting directors. Performers £1.99/month, 7 days free.',
  alternates: { canonical: '/' },
}

export default function Home() {
  return <SiteShell><MarketingHome /></SiteShell>
}
