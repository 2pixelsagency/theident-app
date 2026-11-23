import { supabaseServer } from '@/lib/supabaseServer'

// "Our performers have worked with" — real names from members' own profiles ("Worked with" + credits'
// production companies). Text wordmarks only: no third-party logos, and no claim that these companies use The Ident.
// Recognisable organisations go first when members list them (never shown unless a member does)
const FEATURED = ['Royal Opera House', 'National Theatre', 'Royal Shakespeare Company', 'BBC', 'Netflix', 'Channel 4', 'ITV', 'Sky', 'Amazon Studios', 'Film4', 'BBC Films', 'Sky Atlantic', 'Sony Pictures TV', 'Almeida Theatre', 'Young Vic', 'Royal Lyceum Theatre', 'Disney', 'Warner Bros', 'Apple TV']
const FEATURED_KEYS = FEATURED.map(f => f.toLowerCase())
const rank = (k: string) => { const i = FEATURED_KEYS.indexOf(k); return i < 0 ? 999 : i }
// 'Amazon' and 'Amazon Studios' are the same company on the strip
const ALIAS: Record<string, string> = { amazon: 'amazon studios', 'bbc one': 'bbc', 'sky one': 'sky' }

// Logos supplied by the companies' agreement (black SVGs in /public/logos). RBO shown as its wordmark only, without the Royal Arms.
const LOGOS: { name: string; src: string; h: number; covers: string[] }[] = [
  { name: 'Royal Ballet & Opera', src: '/logos/royal-ballet-opera.svg', h: 56, covers: ['royal opera house', 'royal ballet', 'royal ballet & opera', 'royal ballet and opera'] },
  { name: 'Grindrod Burton Casting', src: '/logos/grindrod-burton.svg', h: 44, covers: ['grindrod burton', 'grindrod burton casting'] },
  { name: 'Pearson Casting', src: '/logos/pearson-casting.svg', h: 58, covers: ['pearson casting'] },
  { name: 'Bloomcasting', src: '/logos/bloomcasting.svg', h: 17, covers: ['bloomcasting', 'bloom casting'] },
]
const COVERED = new Set(LOGOS.flatMap(l => l.covers))

export default async function WorkedWith({ max = 8 }: { max?: number }) {
  const [{ data: brands }, { data: credits }] = await Promise.all([
    supabaseServer.from('profile_brands').select('brand_name, profiles!inner(is_demo, show_talent)').eq('profiles.is_demo', false).limit(500),
    supabaseServer.from('credits').select('production_company, profiles!inner(is_demo, show_talent)').eq('profiles.is_demo', false).not('production_company', 'is', null).limit(500),
  ])
  type Row = { brand_name?: string | null; production_company?: string | null; profiles: { show_talent: boolean | null } | null }
  const names = [...((brands || []) as unknown as Row[]), ...((credits || []) as unknown as Row[])]
    .filter(r => r.profiles?.show_talent !== false)
    .map(r => (r.brand_name || r.production_company || '').trim()).filter(n => n.length > 1)
  // De-duplicate case-insensitively, keep the best-cased spelling (BBC over Bbc), most-mentioned first
  const byKey = new Map<string, { name: string; n: number }>()
  for (let name of names) {
    const raw = name.toLowerCase().replace(/\s+/g, ' ')
    const k = ALIAS[raw] || raw
    if (rank(k) < 999) name = FEATURED[rank(k)]
    const caps = (s: string) => (s.match(/[A-Z]/g) || []).length
    const cur = byKey.get(k)
    if (!cur) byKey.set(k, { name, n: 1 })
    else byKey.set(k, { name: caps(name) > caps(cur.name) ? name : cur.name, n: cur.n + 1 })
  }
  const list = [...byKey.entries()].filter(([k]) => !COVERED.has(k)).sort(([ka, a], [kb, b]) => rank(ka) - rank(kb) || b.n - a.n || a.name.localeCompare(b.name)).map(([, v]) => v).slice(0, Math.max(0, max - LOGOS.length))

  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 py-12 text-center md:px-8 md:py-14">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Our performers have worked with</p>
        <ul className="scrollbar-none -mx-5 mt-7 flex items-center gap-x-8 overflow-x-auto whitespace-nowrap px-5 md:mx-0 md:justify-between md:gap-x-6 md:overflow-visible md:px-0">
          {LOGOS.map(l => (
            <li key={l.name} className="flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.src} alt={l.name} title={l.name} style={{ height: l.h }} className="w-auto" loading="lazy" />
            </li>
          ))}
          {list.map(b => (
            <li key={b.name} className="shrink-0 font-display text-[18px] font-bold tracking-[-0.02em] text-ink md:text-[clamp(16px,1.6vw,22px)]">{b.name}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
