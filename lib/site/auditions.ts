import type { Job } from '@/lib/rc/jobs'

// Landing pages for the searches performers actually type ("dance auditions london", "musical theatre
// auditions manchester"). Each type maps to production types + keywords; each city matches on location.
export type AuditionType = { slug: string; name: string; plural: string; types: string[]; keywords: string[]; blurb: string; tips: [string, string][] }
export type City = { slug: string; name: string; match: string[] }

export const TYPES: AuditionType[] = [
  { slug: 'acting', name: 'Acting', plural: 'acting auditions', types: ['Theatre', 'TV Series', 'Feature Film', 'Film', 'Commercial', 'Web / Digital Content', 'Physical Theatre'], keywords: ['actor', 'actress', 'acting'],
    blurb: 'Stage, screen and commercial acting roles from casting directors, producers and the community — with pay, dates and closing dates up front.',
    tips: [['What should I send for an acting audition?', 'Most casting teams ask for a headshot, CV and showreel, and often a self-tape of a short scene. On The Ident your profile holds all of these, so you apply in a tap.'], ['Are these acting jobs paid?', 'Each listing shows the pay, or says clearly if a role is unpaid. Look for the Fair pay badge on roles that pay at or above typical industry rates.']] },
  { slug: 'musical-theatre', name: 'Musical theatre', plural: 'musical theatre auditions', types: ['Theatre'], keywords: ['musical', 'ensemble', 'swing', 'cover', 'triple threat', 'singer'],
    blurb: 'Ensemble, swing, cover and principal roles in West End, touring and regional musicals and pantomime.',
    tips: [['What do I need for a musical theatre audition?', 'Usually 16–32 bars of a song in the style of the show, a contrasting piece, and sometimes a dance call. Your showreel and vocal clips help you get seen first.'], ['What is a swing?', 'A swing covers several ensemble tracks and goes on when someone is off. Swing roles are a common way into West End and touring companies.']] },
  { slug: 'dance', name: 'Dance', plural: 'dance auditions', types: ['Dance', 'Music Video'], keywords: ['dancer', 'dance', 'choreograph', 'commercial dance'],
    blurb: 'Commercial, contemporary, music video, tour and stage dance jobs — plus dance calls for musicals.',
    tips: [['How do dance auditions work?', 'Many start with a self-tape or an open call where you learn a combination. Bring the right shoes and kit for the style, and keep a recent dance reel on your profile.'], ['Can I find spare dance class spaces too?', 'Yes — The Ident has a Classes board where dancers pass on spare class spaces and teachers list workshops.']] },
  { slug: 'tv-and-film', name: 'TV & film', plural: 'TV and film castings', types: ['TV Series', 'Feature Film', 'Film'], keywords: ['film', 'tv', 'series', 'short film', 'feature'],
    blurb: 'Castings for TV dramas, feature films and short films, from supporting artists to leads.',
    tips: [['How do I get TV and film auditions?', 'Keep a strong headshot and a short showreel on your profile, set your playing age and location, and apply with a self-tape when asked.'], ['Do I need an agent?', 'Not to apply on The Ident. Many roles are open to performers with or without representation — the listing will say if an agent is required.']] },
  { slug: 'theatre', name: 'Theatre', plural: 'theatre auditions', types: ['Theatre', 'Physical Theatre'], keywords: ['theatre', 'stage', 'play', 'panto', 'tour'],
    blurb: 'Plays, tours, pantomime, physical theatre and fringe — paid stage work across the UK.',
    tips: [['What happens at a theatre audition?', 'Usually a prepared speech or sides from the play, sometimes a workshop. Recalls may be in person or by video call — The Ident shows which.'], ['Where can I stay on tour?', 'The Ident lists theatre digs near the stage door, and links to Airbnb, Booking.com and SpareRoom for your tour dates.']] },
  { slug: 'commercials', name: 'Commercial', plural: 'commercial castings', types: ['Commercial'], keywords: ['commercial', 'advert', 'campaign', 'brand'],
    blurb: 'TV adverts, online campaigns and brand shoots — usually short, well-paid days.',
    tips: [['How much do commercials pay?', 'Pay varies by usage (where and how long the ad runs). Each listing on The Ident shows the day rate or buyout where the casting team has shared it.'], ['What do commercial castings ask for?', 'Often a quick self-tape or an ident — your name, agent, height and profiles — plus a short improvisation.']] },
  { slug: 'voice-over', name: 'Voice over', plural: 'voice over jobs', types: ['Voice Over'], keywords: ['voice', 'voiceover', 'voice over', 'audiobook'],
    blurb: 'Voice over, audiobook, animation and game voice work — many recorded remotely.',
    tips: [['Do I need a home studio?', 'Not always, but many voice jobs are recorded remotely. A clean voice reel on your profile is the most important thing.'], ['What should a voice reel include?', 'Short, varied clips (commercial, narration, character) — 60–90 seconds in total is plenty.']] },
]

export const CITIES: City[] = [
  { slug: 'london', name: 'London', match: ['london', 'west end', 'shoreditch', 'soho', 'camden', 'hackney', 'brixton'] },
  { slug: 'manchester', name: 'Manchester', match: ['manchester', 'salford'] },
  { slug: 'birmingham', name: 'Birmingham', match: ['birmingham'] },
  { slug: 'leeds', name: 'Leeds', match: ['leeds'] },
  { slug: 'glasgow', name: 'Glasgow', match: ['glasgow'] },
  { slug: 'edinburgh', name: 'Edinburgh', match: ['edinburgh'] },
  { slug: 'bristol', name: 'Bristol', match: ['bristol'] },
  { slug: 'liverpool', name: 'Liverpool', match: ['liverpool'] },
  { slug: 'cardiff', name: 'Cardiff', match: ['cardiff'] },
  { slug: 'belfast', name: 'Belfast', match: ['belfast'] },
  { slug: 'newcastle', name: 'Newcastle', match: ['newcastle'] },
  { slug: 'brighton', name: 'Brighton', match: ['brighton'] },
]

export const typeBySlug = (s: string) => TYPES.find(t => t.slug === s)
export const cityBySlug = (s: string) => CITIES.find(c => c.slug === s)

const text = (j: Job) => [j.project_in, j.project_role, j.job_title, j.short_summary, j.description].filter(Boolean).join(' ').toLowerCase()
export function matchesType(j: Job, t: AuditionType) {
  if (j.is_side_hustle) return false
  if (j.production_types?.name && t.types.includes(j.production_types.name)) {
    // Musical theatre is a subset of Theatre: require a musical keyword too
    if (t.slug === 'musical-theatre') return t.keywords.some(k => text(j).includes(k))
    return true
  }
  return t.keywords.some(k => text(j).includes(k))
}
export const matchesCity = (j: Job, c: City) => c.match.some(m => (j.location || '').toLowerCase().includes(m))
