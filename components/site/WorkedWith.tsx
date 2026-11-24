// "Used by professionals around the world" — logo strip.
// Logos supplied by the companies' agreement (black SVGs in /public/logos). RBO shown as its wordmark only, without the Royal Arms.
const LOGOS: { name: string; src: string; h: number; covers: string[] }[] = [
  { name: 'Royal Ballet & Opera', src: '/logos/royal-ballet-opera.svg', h: 56, covers: ['royal opera house', 'royal ballet', 'royal ballet & opera', 'royal ballet and opera'] },
  { name: 'Grindrod Burton Casting', src: '/logos/grindrod-burton.svg', h: 44, covers: ['grindrod burton', 'grindrod burton casting'] },
  { name: 'Stuart Burt Casting', src: '/logos/stuart-burt.svg', h: 44, covers: ['stuart burt', 'stuart burt casting'] },
  { name: 'Pearson Casting', src: '/logos/pearson-casting.svg', h: 58, covers: ['pearson casting'] },
  { name: 'The Place', src: '/logos/the-place.svg', h: 40, covers: ['the place', 'the place london'] },
  { name: 'Dee Bee Phunky International Casting', src: '/logos/dee-bee-phunky.svg', h: 64, covers: ['dee bee phunky', 'dee bee phunky casting'] },
  { name: 'Bloomcasting', src: '/logos/bloomcasting.svg', h: 17, covers: ['bloomcasting', 'bloom casting'] },
]

export default function WorkedWith() {
  return (
    <section>
      <div className="mx-auto max-w-[1248px] px-6 pb-20 pt-2 text-center md:pb-28">
        <p className="eyebrow text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Used by professionals around the world</p>
        {/* Mobile: an endless, non-scrollable marquee (the list twice, so the loop is seamless) */}
        <div data-no-reveal className="marquee-fade -mx-6 mt-10 overflow-hidden md:hidden" aria-hidden="true">
          <ul className="marquee items-center" style={{ '--speed': '28s' } as React.CSSProperties}>
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <li key={i} className="flex shrink-0 items-center px-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.src} alt="" style={{ height: Math.round(l.h * 0.6) }} className="w-auto max-w-none" loading="lazy" />
              </li>
            ))}
          </ul>
        </div>
        <ul className="mt-10 hidden items-center md:flex md:flex-wrap md:justify-center md:gap-x-16 md:gap-y-8 lg:gap-x-20">
          {LOGOS.map(l => (
            <li key={l.name} className="flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.src} alt={l.name} title={l.name} style={{ height: Math.round(l.h * 0.68) }} className="w-auto" loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
