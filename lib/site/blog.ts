// The Ident blog: practical guides for performers and casting teams. Written by The Ident team.
// Keep posts accurate and general; no made-up stats, quotes or stories.
export type Block = { h?: string; p?: string[]; list?: string[] }
export type Post = { slug: string; title: string; description: string; date: string; readMins: number; tag: string; tone: string; blocks: Block[] }

export const POSTS: Post[] = [
  {
    slug: 'how-to-film-a-self-tape',
    title: 'How to film a self-tape at home',
    description: 'A simple setup for clean, well-lit self-tapes — framing, sound, readers and what to send.',
    date: '2026-11-24', readMins: 5, tag: 'Self-tapes', tone: 'bg-butter',
    blocks: [
      { p: ['Most first-round castings now start with a self-tape. You don’t need expensive kit — you need a tape that lets casting see and hear you clearly, and that follows the brief.'] },
      { h: 'Read the brief first', p: ['Check exactly what’s been asked for: which scenes, whether to slate, any accent, and the deadline. If the brief asks for something specific, do that before anything else.'] },
      { h: 'Set up your space', list: ['Stand in front of a plain, light, uncluttered wall.', 'Face a window for soft daylight, or put a lamp either side of the camera.', 'Film landscape, with the camera at eye level and steady (a tripod or a pile of books).', 'Frame from mid-chest up unless the brief says otherwise.'] },
      { h: 'Get the sound right', p: ['Sound matters as much as picture. Choose a quiet, soft room (curtains, carpet and cushions help), turn off fans and notifications, and keep the phone close enough to pick you up clearly.'] },
      { h: 'Use a reader', p: ['Have someone read the other lines from just beside the camera, slightly quieter than you. Look at your reader, not into the lens, unless you’re told to.'] },
      { h: 'Slate and send', list: ['Slate only if asked: name, height and location are typical.', 'Keep each scene as its own clip and name files clearly (name-role-scene).', 'Watch it back once before you send — check sound and framing.'] },
      { h: 'On The Ident', p: ['When casting asks for a tape, upload it straight to the casting card from your phone. You’ll see when it’s been sent, and any recall lands in your diary.'] },
    ],
  },
  {
    slug: 'what-happens-at-a-recall',
    title: 'What happens at a recall',
    description: 'Recalls, callbacks and chemistry reads explained — and how to prepare for each kind.',
    date: '2026-11-24', readMins: 4, tag: 'Auditions', tone: 'bg-mint',
    blocks: [
      { p: ['A recall (or callback) means casting want to see more. It’s a good sign — but it’s a new audition, not a formality.'] },
      { h: 'The kinds of recall', list: ['Another self-tape: new scenes or a different direction.', 'A video call: usually short, with the casting team and sometimes the director.', 'In person: often with the director or producers, and sometimes other actors for a chemistry read.'] },
      { h: 'How to prepare', list: ['Re-read the breakdown and any notes from the first round.', 'Learn the new sides well enough to take direction.', 'Keep what worked in your first audition, unless you’re asked to change it.', 'For video calls, test your camera, sound and connection beforehand.'] },
      { h: 'Taking direction', p: ['Expect to be redirected. Casting often want to see that you can adjust quickly. Listen, ask a short question if something isn’t clear, and try the new note fully.'] },
      { h: 'After the recall', p: ['You may be pencilled (dates held) before an offer. Keep the dates free if you can, and don’t take it as a booking until you’ve had a confirmed offer.'] },
    ],
  },
  {
    slug: 'showreel-tips',
    title: 'Showreel tips: what casting want to see',
    description: 'Keep it short, start strong and show your range — a practical checklist for actors’ and dancers’ reels.',
    date: '2026-11-24', readMins: 4, tag: 'Profile', tone: 'bg-blossom',
    blocks: [
      { p: ['Casting often watch only the first few seconds of a reel. Make those seconds count.'] },
      { h: 'Keep it short', p: ['One to two minutes is plenty. If you have lots of material, make separate reels (screen, comedy, dance) rather than one long one.'] },
      { h: 'Start with your best', list: ['Open on a clip where you’re clearly the focus — no long titles or montages.', 'Lead with your strongest, most recent work.', 'Show your face early and clearly.'] },
      { h: 'Quality over quantity', p: ['A short, well-shot scene beats a long, muddy one. If you don’t have much footage yet, a couple of well-filmed self-recorded scenes are better than nothing.'] },
      { h: 'Keep it current', p: ['Update your reel when you look noticeably different or have newer work. Make sure your headshots match how you look now.'] },
      { h: 'On The Ident', p: ['Add your reel to your profile once and it goes with every application, alongside your headshots, CV and credits.'] },
    ],
  },
  {
    slug: 'self-employed-performer-tax-basics',
    title: 'Tax basics for self-employed performers in the UK',
    description: 'Self Assessment, records and setting money aside — the essentials for freelance performers.',
    date: '2026-11-24', readMins: 5, tag: 'Money', tone: 'bg-lime',
    blocks: [
      { p: ['Many performers work on a self-employed basis. This is a general overview, not tax advice — for your own situation, check GOV.UK or speak to an accountant.'] },
      { h: 'Register for Self Assessment', p: ['If you’re self-employed and earn over the trading allowance, you’ll need to register with HMRC for Self Assessment and file a tax return each year.'] },
      { h: 'Key dates', list: ['The UK tax year runs from 6 April to 5 April.', 'Online tax returns are due by 31 January after the end of the tax year.', 'Any tax you owe for that year is also due by 31 January.'] },
      { h: 'Keep good records', list: ['Log every payment you receive, with the date and who paid.', 'Keep receipts for work costs.', 'Send invoices with clear dates and payment terms.'] },
      { h: 'Set money aside', p: ['Put a share of each payment aside as you go, so the tax bill isn’t a surprise. How much depends on your income — an accountant can help you work out the right amount.'] },
      { h: 'On The Ident', p: ['Pay & tax lets you log payments, send invoices and see a suggested amount to set aside — a helpful guide, not a replacement for professional advice.'] },
    ],
  },
]

export const postBySlug = (slug: string) => POSTS.find(p => p.slug === slug)
