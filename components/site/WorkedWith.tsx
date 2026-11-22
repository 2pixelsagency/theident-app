import { supabaseServer } from '@/lib/supabaseServer'

// "Our performers have worked with" — real names from members' own profiles ("Worked with" + credits'
// production companies). Text wordmarks only: no third-party logos, and no claim that these companies use The Ident.
// Recognisable organisations go first when members list them (never shown unless a member does)
const FEATURED = ['Royal Opera House', 'National Theatre', 'Royal Shakespeare Company', 'BBC', 'Netflix', 'Channel 4', 'ITV', 'Sky', 'Amazon Studios', 'Film4', 'BBC Films', 'Sky Atlantic', 'Sony Pictures TV', 'Almeida Theatre', 'Young Vic', 'Royal Lyceum Theatre', 'Disney', 'Warner Bros', 'Apple TV']
const FEATURED_KEYS = FEATURED.map(f => f.toLowerCase())
const rank = (k: string) => { const i = FEATURED_KEYS.indexOf(k); return i < 0 ? 999 : i }
// 'Amazon' and 'Amazon Studios' are the same company on the strip
const ALIAS: Record<string, string> = { amazon: 'amazon studios', 'bbc one': 'bbc', 'sky one': 'sky' }

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
  const list = [...byKey.entries()].sort(([ka, a], [kb, b]) => rank(ka) - rank(kb) || b.n - a.n || a.name.localeCompare(b.name)).map(([, v]) => v).slice(0, max)
  if (list.length < 5) return null

  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 py-12 text-center md:px-8 md:py-14">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Our performers have worked with</p>
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
          {list.map(b => (
            <li key={b.name} className="font-display text-[20px] font-bold tracking-[-0.02em] text-ink/45 transition hover:text-ink md:text-[24px]">{b.name}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
