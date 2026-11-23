// "Used by professionals around the world" — logo strip.
// Logos supplied by the companies' agreement (black SVGs in /public/logos). RBO shown as its wordmark only, without the Royal Arms.
const LOGOS: { name: string; src: string; h: number; covers: string[] }[] = [
  { name: 'Royal Ballet & Opera', src: '/logos/royal-ballet-opera.svg', h: 56, covers: ['royal opera house', 'royal ballet', 'royal ballet & opera', 'royal ballet and opera'] },
  { name: 'Grindrod Burton Casting', src: '/logos/grindrod-burton.svg', h: 44, covers: ['grindrod burton', 'grindrod burton casting'] },
  { name: 'Pearson Casting', src: '/logos/pearson-casting.svg', h: 58, covers: ['pearson casting'] },
  { name: 'The Place', src: '/logos/the-place.svg', h: 40, covers: ['the place', 'the place london'] },
  { name: 'Bloomcasting', src: '/logos/bloomcasting.svg', h: 17, covers: ['bloomcasting', 'bloom casting'] },
]

export default function WorkedWith() {
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-[1180px] px-5 py-12 text-center md:px-8 md:py-14">
        <p className="eyebrow text-[13px] font-semibold uppercase tracking-[0.12em] text-muted">Used by professionals around the world</p>
        <ul className="scrollbar-none -mx-5 mt-8 flex items-center gap-x-12 overflow-x-auto px-5 md:mx-0 md:justify-center md:gap-x-16 md:overflow-visible md:px-0">
          {LOGOS.map(l => (
            <li key={l.name} className="flex shrink-0 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.src} alt={l.name} title={l.name} style={{ height: l.h }} className="w-auto" loading="lazy" />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
