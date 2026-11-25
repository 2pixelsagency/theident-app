import { PLANS, TRIAL_DAYS, price } from '@/lib/rc/plans'

// Long-form SEO guides for the searches performers make when looking for work and platforms.
// Rules: practical and accurate; describe The Ident's own features only; never state other platforms'
// prices, rules or features; no invented statistics.
export type GuideSection = { h: string; p?: string[]; list?: string[] }
export type Guide = { slug: string; keyword: string; title: string; h1: string; description: string; intro: string; sections: GuideSection[]; faq: [string, string][]; related: string[] }

const PERF = price(PLANS.performer.pence), GRAD = price(PLANS.graduate.pence), CAST = price(PLANS.casting.pence)
const COST = `Browsing roles on The Ident is free. To apply, performers pay ${PERF} a month (${GRAD} for recent graduates) after a ${TRIAL_DAYS}-day free trial, and you can cancel any time. We never take commission on work you book.`
const OPEN = 'Anyone can join The Ident — you don’t need an agent or drama school training to create a profile and apply for roles.'

export const GUIDES: Guide[] = [
  {
    slug: 'spotlight-alternatives', keyword: 'Spotlight alternatives',
    title: 'Best Spotlight alternatives in the UK (2026 guide) | The Ident',
    h1: 'The best Spotlight alternatives for UK performers',
    description: 'Looking for alternatives to Spotlight? How to choose a casting platform in the UK, what to look for, and how The Ident works for actors, dancers and singers.',
    intro: 'Spotlight is one of the best-known casting directories in the UK, and many performers use it alongside other services. If you’re looking for alternatives — or something to use as well — here’s how to choose, and what The Ident offers.',
    sections: [
      { h: 'What to look for in a casting platform', list: ['Real roles you can apply to, with the pay, dates and closing date shown up front.', 'A profile casting can read quickly: headshots, showreel, credits, skills and playing age.', 'Fast applications that send your reel and CV with one tap.', 'Clear tracking of every application — self-tape requested, recall, pencil, booked.', 'Simple, affordable pricing and no commission on your earnings.'] },
      { h: 'Types of alternatives', p: ['Most performers combine a few routes to work: a casting platform or two, an agent if they have one, open calls posted by theatres and companies, and their own network. There’s no single right answer — the best set-up is the one you keep up to date.'] },
      { h: 'How The Ident works', list: ['Castings, auditions and paid work with the pay and closing date up front.', 'Apply with your reel, headshots and CV in a tap.', 'Every self-tape, recall and booking tracked in one place, with dates in your diary.', 'Build your profile from your existing CV — including the PDF you download from Spotlight.', 'Get found in talent search by casting directors and producers.'] },
      { h: 'Who it’s for', p: [OPEN + ' Actors, dancers, singers, musical theatre performers, voice artists and presenters all use it.'] },
      { h: 'What it costs', p: [COST] },
    ],
    faq: [
      ['What is the best alternative to Spotlight?', 'It depends on what you need. Many performers use more than one platform. The Ident is built for finding paid work and tracking every casting, it’s open to everyone, and it costs ' + PERF + ' a month after a free trial.'],
      ['Can I use The Ident and Spotlight together?', 'Yes. The Ident works on its own, so you can use it alongside Spotlight or instead of it. You can even import your Spotlight CV to fill in your profile.'],
      ['Is The Ident free?', COST],
      ['Do I need an agent to join?', OPEN],
    ],
    related: ['casting-websites-uk', 'casting-platforms-for-emerging-actors', 'find-acting-jobs'],
  },
  {
    slug: 'casting-websites-uk', keyword: 'Casting websites UK',
    title: 'Best casting websites for actors in the UK | The Ident',
    h1: 'Casting websites for actors in the UK: how to choose',
    description: 'A practical guide to UK casting websites for actors, dancers and singers — what matters, how to spot real paid work, and affordable options like The Ident.',
    intro: 'There are lots of casting websites in the UK, and they’re not all the same. Some are directories casting directors search; others are job boards you apply through. Here’s how to choose the right ones for you — and keep costs down.',
    sections: [
      { h: 'Directories vs job boards', p: ['A directory is where casting looks for you — your profile needs to be complete and current. A job board is where you look for roles and apply. Many performers want both, and The Ident does both: talent search for casting, and a board of roles you can apply to.'] },
      { h: 'Checks before you sign up', list: ['Can you see real roles (and the pay) before you pay anything?', 'Is it clear who posts the roles — casting directors, producers, companies?', 'Can you cancel easily?', 'Does it take a cut of your fee? (The Ident never does.)', 'Be wary of anything that charges you to audition.'] },
      { h: 'Affordable casting websites', p: ['Cost matters when you’re building a career. ' + COST + ' Recent graduates can verify their graduation for the lower price.'] },
      { h: 'Getting the most from any casting website', list: ['Keep headshots current and your reel short, starting with your best clip.', 'Fill in skills, accents and playing age honestly — casting filters by them.', 'Apply quickly to roles that genuinely fit you, rather than everything.', 'Track your applications so you can follow up and learn what works.'] },
    ],
    faq: [
      ['What are the best casting websites in the UK?', 'The best ones show real, paid roles clearly, let casting find you, and fit your budget. Many performers use more than one. The Ident combines a role board with talent search, from ' + GRAD + ' a month for recent graduates.'],
      ['Are there affordable casting websites in the UK?', COST],
      ['Are there free casting websites for actors?', 'On The Ident you can browse every role for free and try the full app free for ' + TRIAL_DAYS + ' days before paying. Be cautious of sites that ask you to pay to audition.'],
      ['Can beginners use casting websites?', OPEN],
    ],
    related: ['spotlight-alternatives', 'acting-auditions-uk', 'casting-platforms-for-emerging-actors'],
  },
  {
    slug: 'acting-auditions-uk', keyword: 'Acting auditions UK',
    title: 'Where to find acting auditions in the UK | The Ident',
    h1: 'Where to find acting auditions in the UK',
    description: 'Where UK actors find auditions — casting platforms, open calls, agents and your network — plus how to prepare and get noticed by casting directors.',
    intro: 'Auditions come from a few places: casting platforms, open calls from theatres and companies, your agent if you have one, and people you’ve worked with. Here’s how to find more of them — and make each one count.',
    sections: [
      { h: 'Where auditions come from', list: ['Casting platforms like The Ident, where roles are posted with the pay and closing date.', 'Open calls from theatres, schools and companies — often shared on their websites and social channels.', 'Agents, who put you forward for roles you may not see yourself.', 'Your network: directors, choreographers and performers you’ve worked with.'] },
      { h: 'Auditions by city and type', p: ['On The Ident you can browse open auditions by type — theatre, musical theatre, TV and film, dance, commercials — and by city, including London and Manchester. Each listing shows the pay, dates and closing date.'] },
      { h: 'How to get noticed by casting directors', list: ['A complete, current profile: recent headshots, a short reel, credits and skills.', 'Apply only for roles that genuinely suit you, and follow the brief exactly.', 'Send clean, well-lit self-tapes on time.', 'Be easy to work with — punctual, prepared and open to direction.'] },
      { h: 'Preparing for the audition', p: ['Read the breakdown, learn your sides well enough to take direction, and prepare a self-tape set-up you can use at short notice. For musicals, have your sheet music clearly marked in the right key.'] },
    ],
    faq: [
      ['Where can I find acting auditions in the UK?', 'On casting platforms like The Ident, through open calls from theatres and companies, from an agent, and through your network. The Ident lists auditions by type and city with the pay shown up front.'],
      ['How do I get noticed by casting directors?', 'Keep your profile complete and current, apply only for roles that fit, follow every brief exactly and send strong self-tapes on time.'],
      ['Can I find auditions without an agent?', OPEN],
      ['How much does it cost to apply?', COST],
    ],
    related: ['find-acting-jobs', 'casting-websites-uk', 'casting-platforms-for-emerging-actors'],
  },
  {
    slug: 'casting-platforms-for-emerging-actors', keyword: 'Casting platforms',
    title: 'Casting platforms for emerging actors and beginners | The Ident',
    h1: 'Casting platforms for emerging actors',
    description: 'Starting out? How emerging and beginner actors can use casting platforms open to everyone, build a profile casting notices, and find their first paid roles.',
    intro: 'When you’re starting out, the hardest part is getting seen. A good casting platform is open to everyone, affordable, and helps you look professional from day one. Here’s what to look for — and how to make it work for you.',
    sections: [
      { h: 'Open to everyone', p: [OPEN + ' Whether you’re a recent graduate, self-taught or changing career, you can build a profile and apply for roles.'] },
      { h: 'A profile that looks professional', list: ['A clear, recent headshot — natural and current.', 'A short reel. No footage yet? A couple of well-filmed self-taped scenes are a strong start.', 'Training, skills, accents and playing age, filled in honestly.', 'Upload your CV and The Ident fills your credits, skills and training for you.'] },
      { h: 'Affordable while you build', p: [COST + ' The graduate price applies once your graduation is verified.'] },
      { h: 'Build momentum', list: ['Set weekly goals — classes, a new self-tape, updated headshots.', 'Try side hustles that fit around castings.', 'Track every application, so you can see what’s working.', 'Connect with other performers and casting teams.'] },
    ],
    faq: [
      ['What are the best websites for emerging actors?', 'Look for platforms that are open to everyone, show real paid roles and are affordable. The Ident is built for this: anyone can join, roles show the pay up front, and recent graduates pay ' + GRAD + ' a month.'],
      ['Are there casting platforms open to everyone?', OPEN],
      ['Is there a casting website for beginner actors?', 'Yes — The Ident works for beginners and working professionals alike. You can import your CV, add self-tapes and apply from day one.'],
      ['Do recent graduates get a discount?', 'Yes. Performers who graduated in the last two years pay ' + GRAD + ' a month once their graduation is verified.'],
    ],
    related: ['spotlight-alternatives', 'acting-auditions-uk', 'find-acting-jobs'],
  },
  {
    slug: 'find-acting-jobs', keyword: 'Find acting jobs',
    title: 'How to find acting jobs and casting opportunities | The Ident',
    h1: 'A guide to finding casting opportunities',
    description: 'How to find acting jobs and casting opportunities in the UK — where to look, how to apply, and how to keep track of every audition, recall and booking.',
    intro: 'Finding acting work is a mix of looking in the right places, applying well, and staying organised. This guide covers all three — whether you’re after theatre, screen, commercials, dance or voice work.',
    sections: [
      { h: 'Where to look', list: ['Casting platforms with real roles and clear pay.', 'Open calls from theatres, companies and drama schools.', 'Your agent, if you have one.', 'Your network — people you’ve trained or worked with.', 'Side hustles that keep you performing between jobs.'] },
      { h: 'Applying well', list: ['Read the breakdown and only apply for roles that suit you.', 'Send exactly what’s asked for — reel, CV, self-tape.', 'Keep your profile current so casting sees the real you.', 'Follow up politely when it’s appropriate.'] },
      { h: 'Stay organised', p: ['Keep track of every application, deadline, self-tape and recall. On The Ident, each casting moves from applied to self-tape, recall, pencil and booked, and dates go into your diary automatically.'] },
      { h: 'Who it’s for, and what it costs', p: [OPEN, COST] },
    ],
    faq: [
      ['How do I find acting jobs in the UK?', 'Use casting platforms with real, paid roles, watch for open calls, work with an agent if you have one, and use your network. The Ident lists castings and paid work with the pay and closing date up front.'],
      ['How do I get noticed by casting directors?', 'Keep a complete, current profile, apply for roles that genuinely fit, follow briefs exactly and send strong self-tapes on time.'],
      ['Is The Ident free?', COST],
      ['How do I register?', 'Go to theident.me, choose Performer or Casting, create your account and answer a few quick questions. You can import your CV to fill in your profile.'],
    ],
    related: ['acting-auditions-uk', 'casting-websites-uk', 'spotlight-alternatives'],
  },
]

export const guideBySlug = (slug: string) => GUIDES.find(g => g.slug === slug)
export const CASTING_COST = `Casting teams pay ${CAST} a month after a ${TRIAL_DAYS}-day free trial.`
