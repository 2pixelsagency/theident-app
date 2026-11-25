// "Worked with" as a looping marquee (pauses on hover; static row for reduced motion).
// The list is repeated so short lists still fill the strip; the second half is a hidden copy for the seamless loop.
export default function BrandMarquee({ brands }: { brands: { id: string | number; brand_name: string }[] }) {
  const set = Array.from({ length: Math.max(1, Math.ceil(8 / brands.length)) }, () => brands).flat()
  const tile = (b: { brand_name: string }, k: string) => (
    <div key={k} title={b.brand_name} className="mr-2 flex min-h-[64px] w-[150px] shrink-0 items-center justify-center rounded-xl border border-line bg-surface px-3 py-3 text-center">
      <span className="line-clamp-2 font-display text-[15px] font-bold leading-tight tracking-[-0.01em]">{b.brand_name}</span>
    </div>
  )
  return (
    <div className="marquee-wrap marquee-fade -mx-4 overflow-hidden px-4">
      <div className="marquee" style={{ '--speed': set.length * 4 + 's' } as React.CSSProperties}>
        <ul className="flex" aria-label="Worked with">{set.map((b, i) => <li key={'a' + i}>{tile(b, 't' + i)}</li>)}</ul>
        <ul className="flex" aria-hidden="true">{set.map((b, i) => <li key={'b' + i}>{tile(b, 'u' + i)}</li>)}</ul>
      </div>
    </div>
  )
}
