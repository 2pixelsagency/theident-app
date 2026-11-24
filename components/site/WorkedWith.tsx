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
      <div className="mx-auto max-w-[1248px] px-6 py-20 text-center md:py-28">
        <p className="eyebrow text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Used by professionals around the world</p>
        <ul className="scrollbar-none -mx-6 mt-10 flex items-center gap-x-12 overflow-x-auto px-6 md:mx-0 md:flex-wrap md:justify-center md:gap-x-16 md:gap-y-8 md:overflow-visible md:px-0 lg:gap-x-20">
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
